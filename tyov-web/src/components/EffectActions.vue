<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useGameStore } from '../stores/game'
import { effectText } from '../engine/effectLabels'
import { effectActionSpec, requiredCount, manualTabOf } from '../engine/effectActions'
import type { Memory, Skill, Resource, Character, Mark } from '../types/game'

const store = useGameStore()
const props = defineProps<{ entryIndex: number }>()
const emit = defineEmits<{ (e: 'gotoTab', tab: string): void }>()

const entry = computed(() => {
  const p = store.currentPrompt
  return p?.entries[props.entryIndex - 1]
})
const effects = computed(() => entry.value?.effects ?? [])

// ---- 处理状态（UI 级，不持久化：按 提示号+条目 键控） ----
const doneCount = ref<Record<number, number>>({})
const openPanel = ref<number>(-1) // 当前展开交互浮层的效果下标；-1 = 无
const inputText = ref('')

// 换提示时重置
watch(
  () => [store.state?.currentPromptNumber, props.entryIndex],
  () => {
    doneCount.value = {}
    openPanel.value = -1
    inputText.value = ''
  },
)

function isDone(idx: number): boolean {
  return (doneCount.value[idx] ?? 0) >= requiredCount(effects.value[idx])
}
function markOne(idx: number) {
  doneCount.value[idx] = (doneCount.value[idx] ?? 0) + 1
  openPanel.value = -1
  inputText.value = ''
}

// ---- 候选列表（按 filter） ----
type CandidateRow = { id: string; label: string; sub?: string }
const candidates = computed<CandidateRow[]>(() => {
  const s = store.state!
  const idx = openPanel.value
  if (idx < 0) return []
  const sp = effectActionSpec(effects.value[idx])
  const pick = (rows: CandidateRow[]) => rows
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
      return pick(list.map((m, i) => ({ id: m.id, label: m.title || m.experiences[0]?.text?.slice(0, 26) || `记忆${i + 1}`, sub: m.experiences.length + '/3' })))
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
      return pick(list.map(sk => ({ id: sk.id, label: sk.name, sub: sk.checked ? '☑' : '☐' })))
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
      return pick(list.map(r => ({ id: r.id, label: r.name, sub: r.fixed ? '固定' : r.lost ? '已失去' : undefined })))
    }
    case 'character': {
      const list = s.characters.filter((c: Character) => {
        switch (sp.filter) {
          case 'alive': return !c.dead
          case 'dead': return c.dead
          case 'mortal': return !c.dead && !c.immortal
          default: return !c.dead
        }
      })
      return pick(list.map(c => ({ id: c.id, label: c.name, sub: c.immortal ? '不朽者' : '凡人' })))
    }
    case 'mark': {
      const list = s.marks.filter((m: Mark) => (sp.filter === 'kept' ? !m.removed : true))
      return pick(list.map(m => ({ id: m.id, label: m.name })))
    }
    default:
      return []
  }
})

// ---- 执行 ----
function runAuto(idx: number) {
  const fx = effects.value[idx]
  const sp = effectActionSpec(fx)
  if (sp.confirmText && !window.confirm(sp.confirmText)) return
  switch (fx.type) {
    case 'gainMemorySlot': store.changeMemorySlots(1); break
    case 'loseMemorySlot': store.changeMemorySlots(-1); break
    case 'loseMemoryRandom': store.randomLoseExperience(); break
    default: break
  }
  markOne(idx)
  // 内存槽变化后游离的"新记忆"按钮状态在 GameView 也有，这里无需联动
}

function onSelect(idx: number, id: string) {
  const s = store.state!
  const fx = effects.value[idx]
  switch (fx.type) {
    case 'loseMemory': store.forgetMemory(id); break
    case 'memoryToSkill': {
      const m = s.memories.find(x => x.id === id)!
      const n = window.prompt('将这段记忆转化为技能——技能叫什么？', m.title)
      if (n === null) return
      store.memoryToSkill(id, n)
      break
    }
    case 'memoryToDiary': store.moveMemoryToDiary(id); break
    case 'stabilizeMemory': store.stabilizeMemory(id); break
    case 'restoreMemory': store.restoreMemory(id); break
    case 'checkSkill': case 'checkSkill2': case 'checkSkill3': store.checkSkill(id); break
    case 'uncheckSkill': store.uncheckSkill(id); break
    case 'loseSkill': case 'loseCheckedSkill': case 'loseUncheckedSkill': store.loseSkill(id); break
    case 'rewriteSkill': {
      const sk = s.skills.find(x => x.id === id)!
      const n = window.prompt('重写这项技能——新名字？', sk.name)
      if (n === null) return
      store.rewriteSkill(id, n)
      break
    }
    case 'loseResource': case 'loseResource2': case 'loseResource3': store.loseResource(id); break
    case 'loseFixedResource': store.loseResource(id); break
    case 'convertFixedResources': store.convertFixedResource(id); break
    case 'degradeResource': store.degradeResource(id); break
    case 'swapResource': {
      const n = window.prompt('换入的当代资源是什么？')
      if (n === null || !n.trim()) return
      store.swapResource(id, n)
      break
    }
    case 'destroyResource': store.loseResource(id); break
    case 'retrieveResource': store.retrieveResource(id); break
    case 'loseMark': store.removeMark(id); break
    case 'crippleMark': store.crippleMark(id); break
    case 'killCharacter': case 'deleteCharacter': store.killCharacter(id); break
    case 'mortalToHostileImmortal': case 'mortalToImmortal': store.mortalToImmortal(id); break
    case 'reviveCharacter': store.reviveCharacter(id); break
    case 'characterToResource': {
      const c = s.characters.find(x => x.id === id)!
      const n = window.prompt('化为资源——名字？', `${c.name}（被转化）`)
      if (n === null) return
      store.characterToResource(id, n)
      break
    }
    case 'returnGhost': store.returnGhost(id); break
    case 'dieByAge': store.ageCharacter(id); break
    default: break
  }
  // select 模式（含 repeat）按实际次数记录；若没有可选项则提示玩家
  markOne(idx)
}

function submitInput(idx: number) {
  const fx = effects.value[idx]
  const val = inputText.value.trim()
  if (!val) return
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
}

const allDone = computed(() => effects.value.every((_, i) => isDone(i)))
</script>

<template>
  <div v-if="effects.length" class="card p-5 border-amber-900/40">
    <div class="flex items-center justify-between mb-3">
      <p class="text-xs tracking-[0.3em] opacity-50">效 果 执 行</p>
      <span v-if="allDone" class="text-xs text-emerald-300/90">✓ 已全部处理</span>
      <span v-else class="text-xs opacity-40">{{ effects.filter((_, i) => isDone(i)).length }}/{{ effects.length }}</span>
    </div>

    <ul class="space-y-2.5 text-sm">
      <li v-for="(fx, i) in effects" :key="i" class="flex items-start gap-2">
        <span class="blood-text mt-0.5">✠</span>
        <div class="flex-1 min-w-0">
          <div class="flex items-center justify-between gap-2 flex-wrap">
            <span :class="{ 'opacity-50 line-through': isDone(i) }">{{ effectText(fx) }}</span>
            <span class="flex items-center gap-2 shrink-0">
              <span v-if="isDone(i)" class="text-emerald-300/80 text-xs">✓</span>
              <!-- 交互按钮 -->
              <template v-if="effectActionSpec(fx).mode === 'auto' && !isDone(i)">
                <button class="btn btn-ghost text-xs" @click="runAuto(i)">执行</button>
              </template>
              <template v-else-if="effectActionSpec(fx).mode === 'select' && !isDone(i)">
                <button class="btn btn-ghost text-xs" @click="openPanel = openPanel === i ? -1 : i">
                  {{ openPanel === i ? '收起' : '选择 ▾' }}
                </button>
              </template>
              <template v-else-if="effectActionSpec(fx).mode === 'input' && !isDone(i)">
                <button class="btn btn-ghost text-xs" @click="openPanel = openPanel === i ? -1 : i">
                  {{ openPanel === i ? '收起' : '填写 ▾' }}
                </button>
              </template>
              <template v-else-if="effectActionSpec(fx).mode === 'manual' && !isDone(i)">
                <button class="btn btn-ghost text-xs" @click="emit('gotoTab', manualTabOf(fx) ?? 'memory')">去面板</button>
                <button class="text-xs opacity-50 hover:opacity-90" @click="markOne(i)">已了解</button>
              </template>
              <template v-else-if="effectActionSpec(fx).mode === 'read' && !isDone(i)">
                <button class="text-xs opacity-50 hover:opacity-90" @click="markOne(i)">已知晓</button>
              </template>
            </span>
          </div>
          <p v-if="effectActionSpec(fx).hint && !isDone(i)" class="text-xs opacity-50 mt-0.5">{{ effectActionSpec(fx).hint }}</p>
        </div>

        <!-- 候选浮层 -->
        <div v-if="openPanel === i && effectActionSpec(fx).mode === 'select'" class="mt-2 w-full">
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
              没有可选的{{ { memory: '记忆', skill: '技能', resource: '资源', character: '角色', mark: '印记' }[effectActionSpec(fx).target!] }}——按规则书执行替代规则（技能↔资源），或视为"无法完成"。
            </p>
          </div>
        </div>

        <!-- 输入浮层 -->
        <div v-if="openPanel === i && effectActionSpec(fx).mode === 'input'" class="mt-2 w-full flex gap-2">
          <input v-model="inputText" class="input text-sm" :placeholder="effectActionSpec(fx).inputPlaceholder" @keyup.enter="submitInput(i)" />
          <button class="btn btn-ghost text-xs shrink-0" :disabled="!inputText.trim()" @click="submitInput(i)">确认</button>
        </div>
      </li>
    </ul>
  </div>
</template>