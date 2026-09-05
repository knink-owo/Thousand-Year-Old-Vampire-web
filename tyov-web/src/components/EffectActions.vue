<script setup lang="ts">
import { computed, ref, watch, nextTick } from 'vue'
import { useGameStore } from '../stores/game'
import { effectText } from '../engine/effectLabels'
import {
  effectActionSpec, requiredCount, manualTabOf, fallbackOf, defaultInputOf,
} from '../engine/effectActions'
import PromptDialog, { type PromptState } from './PromptDialog.vue'
import type { Memory, Skill, Resource, Character, Mark } from '../types/game'

const store = useGameStore()
const props = defineProps<{ entryIndex: number }>()
const emit = defineEmits<{
  (e: 'gotoTab', tab: string): void
  (e: 'progress', p: { done: number; total: number }): void
}>()

const entry = computed(() => {
  const p = store.currentPrompt
  return p?.entries[props.entryIndex - 1]
})
const effects = computed(() => entry.value?.effects ?? [])

// ---- 处理状态（P1-1：持久化到 GameState.effectProgress，刷新/重进不丢失） ----
const openPanel = ref<number>(-1) // 当前展开交互浮层的效果下标；-1 = 无
const inputText = ref('')
const ask = ref<PromptState | null>(null) // 应用内输入弹层（P2-2）

/** 进度键：`提示号:条目号:效果下标`（按键隔离，换提示/换条目天然重置） */
const pkey = (idx: number) => `${store.state?.currentPromptNumber ?? 0}:${props.entryIndex}:${idx}`
function progressOf(idx: number): number {
  return store.state?.effectProgress?.[pkey(idx)] ?? 0
}
function setProgress(idx: number, n: number) {
  const st = store.state
  if (!st) return
  st.effectProgress = st.effectProgress ?? {}
  if (n <= 0) delete st.effectProgress[pkey(idx)]
  else st.effectProgress[pkey(idx)] = n
  store.persist()
}

// ---- 行级撤回快照：每条效果执行前保存状态；该行"撤回"仅撤销自己 ----
const rowSnapshots = ref<Record<number, unknown>>({}) // GameState 深拷贝

function saveRowSnapshot(idx: number) {
  if (store.state) {
    rowSnapshots.value[idx] = JSON.parse(JSON.stringify(store.state))
  }
}
function undoRow(idx: number) {
  const snap = rowSnapshots.value[idx] as ({ id: string } & Record<string, unknown>) | undefined
  if (!snap) return
  const mode = effectActionSpec(effects.value[idx]).mode
  store.restoreSnapshot(snap as never)
  // 该行撤销一次（repeat 效果可逐步回溯）——进度一并回退（P1-1）
  const cur = progressOf(idx)
  if (cur <= 1) {
    setProgress(idx, 0)
    delete rowSnapshots.value[idx]
  } else {
    setProgress(idx, cur - 1)
  }
  // 融合"重写"：input 类撤回后自动展开输入浮层（带预设值）重新填写。
  // restoreSnapshot 替换 state 引用会触发一轮渲染，故在 nextTick 后再展开，
  // 避免被该轮响应式更新中的状态覆盖。
  if (mode === 'input') {
    void nextTick(() => {
      openPanel.value = idx
      inputText.value = defaultInputOf(effects.value[idx])
    })
  } else if (openPanel.value === -1) {
    inputText.value = ''
  }
}

// 换提示时重置 UI 状态（进度按键持久化，无需重置；清空跨提示的撤回快照，防止误回滚到旧提示）
watch(
  () => [store.state?.currentPromptNumber, entry.value?.text],
  () => {
    openPanel.value = -1
    inputText.value = ''
    ask.value = null
    rowSnapshots.value = {}
  },
)

function isDone(idx: number): boolean {
  return progressOf(idx) >= requiredCount(effects.value[idx])
}
function markOne(idx: number) {
  setProgress(idx, progressOf(idx) + 1)
  openPanel.value = -1
  inputText.value = ''
}

/** 效果执行统一入口：先保存行级撤回点，再执行 */
function perform(idx: number, fn: () => void) {
  saveRowSnapshot(idx)
  fn()
}

// ---- 候选列表（按 filter） ----
type CandidateRow = { id: string; label: string; sub?: string }

/** 计算某个效果下标当前的可选候选（不依赖 openPanel） */
function candidatesFor(idx: number): CandidateRow[] {
  const s = store.state!
  const fx = effects.value[idx]
  if (!fx) return []
  const sp = effectActionSpec(fx)
  switch (sp.target) {
    case 'memory': {
      const ms = s.memories
      const list = ms.filter((m: Memory) => {
        switch (sp.filter) {
          case 'forgotten': return !!m.forgotten
          case 'forgettable': return !m.forgotten && !m.stabilized && !m.inDiary
          case 'convertible': return !m.forgotten && !m.inDiary
          case 'stabilizable': return !m.forgotten && !m.inDiary && !m.stabilized
          case 'diaryable': return !m.forgotten && !m.inDiary && !m.stabilized && !s.diaryResourceId
          default: return !m.forgotten
        }
      })
      return list.map((m, i) => ({ id: m.id, label: m.title || m.experiences[0]?.text?.slice(0, 26) || `记忆${i + 1}`, sub: m.experiences.length + '/3' }))
    }
    case 'skill': {
      const list = s.skills.filter((sk: Skill) => {
        switch (sp.filter) {
          case 'unchecked': return !sk.checked && !sk.lost
          case 'checked': return sk.checked && !sk.lost
          case 'kept': return !sk.lost
          default: return !sk.lost
        }
      })
      return list.map(sk => ({ id: sk.id, label: sk.name, sub: sk.checked ? '☑' : '☐' }))
    }
    case 'resource': {
      const list = s.resources.filter((r: Resource) => {
        switch (sp.filter) {
          case 'fixed': return r.fixed && !r.lost
          case 'lost': return r.lost
          case 'kept': return !r.lost
          default: return !r.lost
        }
      })
      return list.map(r => ({ id: r.id, label: r.name, sub: r.fixed ? '固定' : r.lost ? '已失去' : undefined }))
    }
    case 'character': {
      const list = s.characters.filter((c: Character) => {
        switch (sp.filter) {
          case 'alive': return !c.dead
          case 'aliveMortal': return !c.dead && !c.immortal
          case 'dead': return c.dead
          case 'mortal': return !c.dead && !c.immortal
          default: return !c.dead
        }
      })
      return list.map(c => ({ id: c.id, label: c.name, sub: c.immortal ? '不朽者' : '凡人' }))
    }
    case 'mark': {
      const list = s.marks.filter((m: Mark) => (sp.filter === 'kept' ? !m.removed : true))
      return list.map(m => ({ id: m.id, label: m.name }))
    }
    default:
      return []
  }
}

const candidates = computed<CandidateRow[]>(() => {
  const idx = openPanel.value
  if (idx < 0) return []
  return candidatesFor(idx)
})

/**
 * 互斥淘汰：规则书"如果没有X，就Y"是条件分支而非并列操作。
 * 当条目内存在"杀死凡人角色"（killCharacter/deleteCharacter）且有活角色候选时，
 * 其 fallback 目标（如 createMortal）应自动跳过——显示为"不适用"，
 * 不参与完成计数。
 */
const excludedIdx = computed<Set<number>>(() => {
  const out = new Set<number>()
  effects.value.forEach((fx, i) => {
    if (fx.type === 'killCharacter' || fx.type === 'deleteCharacter') {
      const hasCandidates = candidatesFor(i).length > 0
      if (hasCandidates) {
        const fbs = fallbackOf(fx)
        effects.value.forEach((other, j) => {
          if (j !== i && fbs.includes(other.type)) out.add(j)
        })
      }
    }
  })
  return out
})

function isExcluded(i: number): boolean {
  return excludedIdx.value.has(i)
}

// ---- 互斥替代（候选为空时按规则书提示改执行其它效果） ----
const fallbackTargets = computed(() => {
  const idx = openPanel.value
  if (idx < 0) return []
  const fx = effects.value[idx]
  const fbs = fallbackOf(fx)
  return fbs
    .map(t => ({ type: t, index: effects.value.findIndex(e => e.type === t) }))
    .filter(x => x.index >= 0 && x.type !== fx.type)
})
function jumpToFallback(fbIdx: number) {
  // 展开替代效果的输入/选择浮层（其模式由映射表决定）
  openPanel.value = fbIdx
  inputText.value = defaultInputOf(effects.value[fbIdx])
}

// ---- 执行 ----
function runAuto(idx: number) {
  const fx = effects.value[idx]
  perform(idx, () => {
    switch (fx.type) {
      case 'gainMemorySlot': store.changeMemorySlots(1); break
      case 'loseMemorySlot': store.changeMemorySlots(-1); break
      case 'loseMemoryRandom': store.randomLoseExperience(); break
      default: break
    }
    markOne(idx)
  })
}

function onSelect(idx: number, id: string) {
  const s = store.state!
  const fx = effects.value[idx]
  // ---- 需要额外输入的：先弹应用内输入框（P2-2），确认后才执行 ----
  if (fx.type === 'memoryToSkill') {
    const m = s.memories.find(x => x.id === id)!
    ask.value = {
      title: '将一段记忆转化为技能',
      text: `「${m.title || '未命名的记忆'}」将被划掉，不再占用记忆槽。技能叫什么？`,
      placeholder: '新技能名',
      initial: m.title ?? '',
      onOk: (v) => {
        if (!v.trim()) return
        perform(idx, () => { store.memoryToSkill(id, v.trim()); markOne(idx) })
      },
    }
    return
  }
  if (fx.type === 'rewriteSkill') {
    const sk = s.skills.find(x => x.id === id)!
    ask.value = {
      title: '重写这项技能',
      text: `将「${sk.name}」重写为一项新技能。新名字是？`,
      placeholder: '新技能名',
      initial: sk.name,
      onOk: (v) => {
        if (!v.trim()) return
        perform(idx, () => { store.rewriteSkill(id, v.trim()); markOne(idx) })
      },
    }
    return
  }
  if (fx.type === 'swapResource') {
    const r = s.resources.find(x => x.id === id)
    ask.value = {
      title: '以旧换新',
      text: `放弃「${r?.name ?? ''}」，换入一项当代资源。新的资源是？`,
      placeholder: '新资源名',
      initial: '',
      onOk: (v) => {
        if (!v.trim()) return
        perform(idx, () => { store.swapResource(id, v.trim()); markOne(idx) })
      },
    }
    return
  }
  if (fx.type === 'characterToResource') {
    const c = s.characters.find(x => x.id === id)!
    ask.value = {
      title: '角色化为资源',
      text: `「${c.name}」将变为一件由你供养的不死之物。它作为资源的名称是？`,
      placeholder: '资源名',
      initial: `${c.name}（被转化）`,
      allowEmpty: true,
      onOk: (v) => {
        const t = v.trim()
        perform(idx, () => { store.characterToResource(id, t || undefined); markOne(idx) })
      },
    }
    return
  }
  const doIt = () => {
    switch (fx.type) {
      case 'loseMemory': store.forgetMemory(id); break
      case 'memoryToDiary': store.moveMemoryToDiary(id); break
      case 'stabilizeMemory': store.stabilizeMemory(id); break
      case 'restoreMemory': store.restoreMemory(id); break
      case 'checkSkill': case 'checkSkill2': case 'checkSkill3': store.checkSkill(id); break
      case 'uncheckSkill': store.uncheckSkill(id); break
      case 'loseSkill': case 'loseCheckedSkill': case 'loseUncheckedSkill': store.loseSkill(id); break
      case 'loseResource': case 'loseResource2': case 'loseResource3': store.loseResource(id); break
      case 'loseFixedResource': store.loseResource(id); break
      case 'convertFixedResources': store.convertFixedResource(id); break
      case 'degradeResource': store.degradeResource(id); break
      case 'destroyResource': store.loseResource(id); break
      case 'retrieveResource': store.retrieveResource(id); break
      case 'loseMark': store.removeMark(id); break
      case 'crippleMark': store.crippleMark(id); break
      case 'killCharacter': case 'deleteCharacter': store.killCharacter(id); break
      case 'mortalToHostileImmortal': case 'mortalToImmortal': store.mortalToImmortal(id); break
      case 'reviveCharacter': store.reviveCharacter(id); break
      case 'returnGhost': store.returnGhost(id); break
      case 'dieByAge': store.ageCharacter(id); break
      default: break
    }
    markOne(idx)
  }
  perform(idx, doIt)
}

function submitInput(idx: number) {
  const fx = effects.value[idx]
  const val = inputText.value.trim()
  if (!val) return
  perform(idx, () => {
    switch (fx.type) {
      case 'gainSkill': store.addSkill(val); break
      case 'gainResource': store.addResource(val); break
      case 'gainTwoResources': store.addResource(val); break
      case 'gainFixedResource': store.addResource(val, undefined, true); break
      case 'gainMark': store.addMark(val); break
      case 'createMortal': store.addCharacter(val, '', false); break
      case 'createImmortal': case 'createImmortalHostile': store.addCharacter(val, '', true); break
      case 'createCharacter': store.addCharacter(val, '', false); break
      default: break
    }
    inputText.value = ''
    markOne(idx)
  })
}

function togglePanel(idx: number) {
  if (openPanel.value === idx) { openPanel.value = -1; return }
  openPanel.value = idx
  inputText.value = defaultInputOf(effects.value[idx]) // 预设值（如"嗜血"）
}

const allDone = computed(() =>
  effects.value.every((_, i) => isExcluded(i) || isDone(i)),
)

// ---- P3-2：向 GameView 上报未处理数量（用于"完成回合"旁的提示） ----
const doneTotal = computed(() => {
  const total = effects.value.filter((_, i) => !isExcluded(i)).length
  const done = effects.value.filter((_, i) => isDone(i) && !isExcluded(i)).length
  return { done, total }
})
watch(doneTotal, (p) => emit('progress', p), { immediate: true })
</script>

<template>
  <div v-if="effects.length" class="card p-5 border-amber-900/40">
    <div class="flex items-center justify-between mb-3">
      <p class="text-xs tracking-[0.3em] opacity-50">效 果 执 行</p>
      <span v-if="allDone" class="text-xs text-emerald-300/90">✓ 已全部处理</span>
      <span v-else class="text-xs opacity-40">{{ effects.filter((_, i) => isDone(i) && !isExcluded(i)).length }}/{{ effects.filter((_, i) => !isExcluded(i)).length }}</span>
    </div>

    <ul class="space-y-2.5 text-sm">
      <li v-for="(fx, i) in effects" :key="i" class="flex items-start gap-2">
        <span class="blood-text mt-0.5">✠</span>
        <div class="flex-1 min-w-0">
          <div class="flex items-center justify-between gap-2 flex-wrap">
            <!-- 互斥淘汰：不适用（有可用角色时"创造凡人角色"按规则书跳过） -->
            <span v-if="isExcluded(i)" class="opacity-40 italic">「{{ effectText(fx) }}」不适用（规则书：有可用目标时无需执行）</span>
            <span v-else :class="{ 'opacity-50 line-through': isDone(i) }">{{ effectText(fx) }}</span>
            <span v-if="!isExcluded(i)" class="flex items-center gap-2 shrink-0">
              <span v-if="isDone(i) && !isExcluded(i)" class="text-emerald-300/80 text-xs">✓</span>
              <template v-if="isDone(i)">
                <!-- 该行已处理：单个"撤回"——撤销这一条；input 类撤回后自动展开重填 -->
                <button
                  v-if="rowSnapshots[i]"
                  class="text-xs opacity-60 hover:opacity-100 border border-amber-900/40 rounded px-1.5 py-0.5"
                  title="撤销这一条效果（可重新执行）"
                  @click="undoRow(i)"
                >撤回</button>
              </template>
              <template v-else-if="effectActionSpec(fx).mode === 'auto'">
                <button class="btn btn-ghost text-xs" @click="runAuto(i)">执行</button>
              </template>
              <template v-else-if="effectActionSpec(fx).mode === 'select'">
                <button class="btn btn-ghost text-xs" @click="togglePanel(i)">
                  {{ openPanel === i ? '收起' : '选择 ▾' }}
                </button>
              </template>
              <template v-else-if="effectActionSpec(fx).mode === 'input'">
                <button class="btn btn-ghost text-xs" @click="togglePanel(i)">
                  {{ openPanel === i ? '收起' : '填写 ▾' }}
                </button>
              </template>
              <template v-else-if="effectActionSpec(fx).mode === 'manual'">
                <button class="btn btn-ghost text-xs" @click="emit('gotoTab', manualTabOf(fx) ?? 'memory')">去面板</button>
                <button class="text-xs opacity-50 hover:opacity-90" @click="markOne(i)">已了解</button>
              </template>
              <template v-else-if="effectActionSpec(fx).mode === 'read'">
                <button class="text-xs opacity-50 hover:opacity-90" @click="markOne(i)">已知晓</button>
              </template>
            </span>
          </div>
          <p v-if="effectActionSpec(fx).hint && !isDone(i)" class="text-xs opacity-50 mt-0.5">{{ effectActionSpec(fx).hint }}</p>

          <!-- 候选浮层（在内容列内纵向展开） -->
          <div v-if="openPanel === i && effectActionSpec(fx).mode === 'select'" class="mt-2">
            <div class="space-y-1 max-h-44 overflow-y-auto pr-1 border border-amber-900/40 rounded p-2 bg-black/25">
              <button
                v-for="c in candidates"
                :key="c.id"
                class="w-full text-left px-2 py-1.5 rounded hover:bg-amber-950/40 text-sm flex justify-between gap-2 items-center"
                @click="onSelect(i, c.id)"
              >
                <span class="truncate">{{ c.label }}</span>
                <span v-if="c.sub" class="text-xs opacity-50 shrink-0">{{ c.sub }}</span>
              </button>
              <p v-if="candidates.length === 0" class="text-xs italic opacity-50 px-2 py-1">
                没有可选的{{ { memory: '记忆', skill: '技能', resource: '资源', character: '角色', mark: '印记' }[effectActionSpec(fx).target!] }}。
              </p>
            </div>

            <!-- 互斥替代建议（规则书"如果没有X，就Y"） -->
            <div v-if="candidates.length === 0 && fallbackTargets.length" class="mt-2 p-2 rounded border border-amber-700/50 bg-amber-950/20">
              <p class="text-xs opacity-80 mb-1.5">规则书指示：无可用目标时改而——</p>
              <button
                v-for="fb in fallbackTargets"
                :key="fb.type"
                class="btn btn-ghost text-xs mr-2 mb-1"
                @click="jumpToFallback(fb.index)"
              >
                {{ effectText(effects[fb.index]) }}
              </button>
            </div>

            <!-- P1-2：无任何适用目标（且无替代建议）时，允许按规则跳过并标记完成 -->
            <div v-if="candidates.length === 0 && fallbackTargets.length === 0" class="mt-2">
              <button class="btn btn-ghost text-xs" @click="markOne(i)">无适用目标，跳过此效果</button>
            </div>
          </div>

          <!-- 输入浮层（在内容列内纵向展开） -->
          <div v-if="openPanel === i && effectActionSpec(fx).mode === 'input'" class="mt-2 flex gap-2">
            <input v-model="inputText" class="input text-sm flex-1 min-w-0" :placeholder="effectActionSpec(fx).inputPlaceholder" @keyup.enter="submitInput(i)" />
            <button class="btn btn-ghost text-xs shrink-0" :disabled="!inputText.trim()" @click="submitInput(i)">确认</button>
          </div>
        </div>
      </li>
    </ul>

    <!-- P2-2：应用内输入弹层（替代 window.prompt） -->
    <PromptDialog
      :state="ask"
      @ok="(v: string) => { ask?.onOk(v); ask = null }"
      @cancel="ask = null"
    />
  </div>
</template>