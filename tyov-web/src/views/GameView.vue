<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useGameStore } from '../stores/game'
import PromptCard from '../components/PromptCard.vue'
import TraitPanel from '../components/TraitPanel.vue'
import EffectActions from '../components/EffectActions.vue'
import PromptDialog, { type PromptState } from '../components/PromptDialog.vue'
import ConfirmDialog, { type ConfirmState } from '../components/ConfirmDialog.vue'
import { placeExperienceDecision, entrySkipsExperience } from '../engine/core'
import type { Memory } from '../types/game'
import { t } from '../i18n'

const store = useGameStore()
const s = computed(() => store.state!)

const emit = defineEmits<{ (e: 'navigate', to: 'home'): void }>()

const experienceText = ref('')
const diaryText = ref('')

// ---- P2-2：应用内输入/确认弹层（替代 window.prompt / confirm / alert） ----
const ask = ref<PromptState | null>(null)
const confirmAsk = ref<ConfirmState | null>(null)

// ---- 是否创建经历：系统自动判定（规则书：部分提示明确要求"不要为此创建经历"）----
const bypassExperience = computed(() => {
  const entry = store.currentPrompt?.entries[store.currentEntryIndex - 1]
  return entry ? entrySkipsExperience(entry) : false
})

const rollResult = ref<{ d10: number; d6: number; delta: number; from: number; to: number; actualTo: number } | null>(null)
const lastMessage = ref('')

// ---- P3-2：效果处理进度（EffectActions 上报） ----
const effectStatus = ref<{ done: number; total: number }>({ done: 0, total: 0 })

// ---- 当前条目效果（梦境之地分支判定用）----
const entryEffects = computed(() => store.currentPrompt?.entries[store.currentEntryIndex - 1]?.effects ?? [])
watch(
  () => [store.state?.currentPromptNumber, store.currentEntryIndex],
  () => {
    // 进入条目即锁定终局结论（此后玩家照做效果也不会被误判为"做不到"）
    store.syncEntryVerdict()
    refreshAging()
  },
)

// ---- 梦境之地（提示48第3条目）----
const dreamWorldEntry = computed(() => entryEffects.value.some(e => e.type === 'dreamWorld'))
function enterDream() {
  confirmAsk.value = {
    text: t('game.dream.confirm'),
    onOk: () => store.enterDreamWorld(),
  }
}
function takeDreamBook() {
  const book = t('game.dream.bookName')
  if (!s.value.resources.some(r => r.name === book)) {
    store.addResource(book)
  }
}

// ---- 岁月流逝（P1-3：提醒随存档持久化——刷新/重进补弹，仍由玩家选择执行或暂缓） ----
const showAging = ref(false)
const livingMortals = computed(() => s.value.characters.filter(c => !c.dead && !c.immortal))
/**
 * 跨会话判定：自上次响应（执行或暂缓）以来已跨过 4 次回答，且有在世凡人 → 补弹提醒。
 * 响应时刻记入 `agingAcknowledgedAt`，因此刷新丢失不了提醒，暂缓也不会在同段内重复打扰。
 */
function refreshAging() {
  const st = store.state
  if (!st || st.finished) { showAging.value = false; return }
  showAging.value = livingMortals.value.length > 0 && (st.agingAcknowledgedAt ?? 0) + 4 <= st.moves
}
watch(() => store.state?.moves, () => {
  // 挂载/读档时也补一次条目判定（不依赖提示是否变化）
  store.syncEntryVerdict()
  refreshAging()
}, { immediate: true })
watch(livingMortals, (lm) => {
  if (lm.length === 0) showAging.value = false
})
function ageIt(id: string) {
  store.ageCharacter(id)
  store.acknowledgeAging()
  if (livingMortals.value.length === 0) showAging.value = false
}
function postponeAging() {
  store.acknowledgeAging()
  showAging.value = false
}

const showDiaryEditor = computed(() => {
  return !s.value.usesFastMode && !s.value.finished
})

// ---- 经历放置抉择（规则书"记忆"节：放进相关记忆，或新建记忆；满了必须先遗忘/入日记） ----
const placementChoice = ref<string>('') // 'new' = 新建记忆；memory id = 追加到该记忆；'' = 未选定

const placement = computed(() => {
  const dec = placeExperienceDecision(s.value)
  const appendable = s.value.memories.filter(m => dec.appendable.includes(m.id))
  return { appendable, freeSlots: dec.freeSlots, canCreateNew: dec.canCreateNew, mustResolve: dec.mustResolve }
})

const forgettableMemories = computed(() =>
  s.value.memories.filter(m => !m.forgotten && !m.stabilized && !m.inDiary),
)

function memoryLabel(m: Memory): string {
  if (m.title) return m.title
  const first = m.experiences[0]?.text ?? ''
  return first ? (first.length > 26 ? first.slice(0, 26) + '…' : first) : t('panel.unnamedMemory')
}

function resetPlacement() {
  const p = placement.value
  if (p.appendable.length > 0) placementChoice.value = p.appendable[0].id
  else if (p.canCreateNew) placementChoice.value = 'new'
  else placementChoice.value = ''
}
watch(() => store.state?.currentPromptNumber, resetPlacement, { immediate: true })
// 放置选项变化（如满槽化解后出现空槽/可追加记忆）时，保持选择有效
watch(
  () => [
    placement.value.mustResolve,
    placement.value.canCreateNew,
    placement.value.appendable.map(m => m.id).join(','),
  ],
  () => {
    if (placementChoice.value === 'new' && !placement.value.canCreateNew) resetPlacement()
    else if (placementChoice.value && !placement.value.appendable.some(m => m.id === placementChoice.value)) resetPlacement()
    else if (!placementChoice.value && !placement.value.mustResolve) resetPlacement()
  },
)

const placementValid = computed(() => {
  if (bypassExperience.value) return true
  if (placementChoice.value === 'new') return placement.value.canCreateNew
  if (placementChoice.value) return placement.value.appendable.some(m => m.id === placementChoice.value)
  return false
})

const canComplete = computed(() => {
  if (s.value.finished) return false
  if (bypassExperience.value) return true
  return experienceText.value.trim().length > 0 && placementValid.value
})

function forgetFromGameView(memoryId: string) {
  const m = s.value.memories.find(x => x.id === memoryId)
  if (!m) return
  confirmAsk.value = {
    text: t('game.forgetConfirm', { name: memoryLabel(m) }),
    onOk: () => store.forgetMemory(memoryId),
  }
}

function moveToDiaryFromGame(memoryId: string) {
  if (!s.value.diaryResourceId) {
    ask.value = {
      title: t('memory.diaryCreateTitle'),
      text: t('memory.diaryCreateText', { examples: t('memory.diaryExamples') }),
      initial: t('memory.diaryDefaultName'),
      allowEmpty: true,
      okLabel: t('memory.diaryCreateOk'),
      onOk: (v) => store.moveMemoryToDiary(memoryId, v.trim() || undefined),
    }
    return
  }
  const inDiaryCount = s.value.memories.filter(x => x.inDiary).length
  if (inDiaryCount >= 4) {
    confirmAsk.value = { okOnly: true, text: t('memory.diaryFull') }
    return
  }
  store.moveMemoryToDiary(memoryId)
}

function endGameNow() {
  confirmAsk.value = {
    text: t('game.endConfirm'),
    onOk: () => store.endGame(t('game.endReason', { name: s.value.name })),
  }
}

function exportGameJson() {
  const json = store.exportGameJson()
  const blob = new Blob([json], { type: 'application/json;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = t('game.saveFileName', { name: store.state?.name ?? t('app.fallbackName') })
  a.click()
  URL.revokeObjectURL(a.href)
}

// ---- 效果执行引导：跳转到特征面板 tab ----
const traitPanelRef = ref<InstanceType<typeof TraitPanel> | null>(null)
function gotoPanelTab(tab: string) {
  // 桌面端直接切；移动端打开抽屉并设定初始 tab
  if (window.innerWidth >= 1024) {
    traitPanelRef.value?.setTab(tab)
  } else {
    drawerTab.value = tab as 'memory' | 'diary'
    drawerOpen.value = true
  }
}

// ---- 移动端抽屉 ----
const drawerOpen = ref(false)
const drawerTab = ref<'memory' | 'diary'>('memory')
function openDrawer(tab: 'memory' | 'diary') {
  drawerTab.value = tab
  drawerOpen.value = true
}

// ---- 骰子文案 ----
const rollMoveText = computed(() => {
  const r = rollResult.value
  if (!r) return ''
  if (r.delta === 0) return t('game.roll.zero')
  return r.delta > 0 ? t('game.roll.forward', { n: r.delta }) : t('game.roll.back', { n: Math.abs(r.delta) })
})
const rollLine = computed(() => {
  const r = rollResult.value
  if (!r) return ''
  if (r.actualTo !== r.to) return rollMoveText.value + t('game.roll.exhausted', { from: r.from, to: r.actualTo })
  if (r.delta === 0) return t('game.roll.staySame')
  return t('game.roll.moveTo', { move: rollMoveText.value, to: r.actualTo })
})

function completeTurn() {
  const s0 = s.value
  const prevPrompt = s0.currentPromptNumber
  // 若无提示文本，直接返回
  if (!store.currentPrompt) return

  // 1. 创建经历（除非明确跳过）——先安放进所选记忆，放不下则必须化解
  if (!bypassExperience.value && experienceText.value.trim()) {
    const res = store.addExperience(
      placementChoice.value === 'new' ? null : (placementChoice.value || null),
      experienceText.value.trim(),
      prevPrompt,
      store.currentEntryIndex,
    )
    if (res.status === 'mustForget') {
      lastMessage.value = t('game.memoryFull')
      return
    }
  }

  // 2. 日志游戏写入日记
  let diary = ''
  if (showDiaryEditor.value && diaryText.value.trim()) {
    diary = diaryText.value.trim()
  }

  // 3. 完成回合（掷骰、推进）
  const result = store.completeTurn(diary || null)
  // 条目用尽时 store 会强制前往下一提示（骰子指向不作数）——以实际落点为准
  const actualTo = s0.finished ? result.roll.to : s0.currentPromptNumber
  rollResult.value = { ...result.roll, actualTo }

  if (s0.finished) {
    lastMessage.value = ''
    return
  }

  // 4. 构造提示文案
  const roll = result.roll

  // 5. 生成下一轮的信息卡
  lastMessage.value = actualTo !== roll.to
    ? t('game.nextAllAnswered', { from: prevPrompt, to: actualTo })
    : roll.delta === 0
      ? t('game.nextSame')
      : t('game.nextMove', { to: actualTo })
  // 清空输入
  experienceText.value = ''
  diaryText.value = ''
  resetPlacement()
  // 滚回页面顶部：让玩家一眼看到本轮骰子与下一提示
  window.scrollTo({ top: 0, behavior: 'smooth' })
}
</script>

<template>
  <div class="fade-in grid lg:grid-cols-[1fr_380px] gap-6 items-start">
    <!-- 左列：回合流程 -->
    <div class="space-y-6 min-w-0">
      <!-- 顶部状态 -->
      <div class="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 class="title-serif text-xl gold-text m-0">{{ s.name }}</h2>
          <p class="text-xs opacity-50 mt-1">
            {{ t('game.answerCount', { moves: s.moves, prompt: s.currentPromptNumber }) }}
            <span class="ml-2">{{ s.usesFastMode ? t('game.mode.fast') : t('game.mode.journal') }}</span>
          </p>
        </div>
        <div class="flex gap-2 flex-wrap">
          <button class="btn btn-ghost text-xs" @click="exportGameJson">{{ t('game.export') }}</button>
          <button class="btn btn-ghost text-xs" @click="endGameNow">{{ t('game.end') }}</button>
        </div>
      </div>

      <!-- 掷骰结果（置于提示之上：完成回合后一屏可见提示与骰子） -->
      <div v-if="rollResult" class="card p-5 text-center">
        <p class="text-xs tracking-[0.3em] opacity-50 mb-3">{{ t('game.roll.title') }}</p>
        <div class="flex items-center justify-center gap-8">
          <div class="die-roll">
            <div class="text-4xl gold-text title-serif">{{ rollResult.d10 }}</div>
            <div class="text-xs opacity-50 mt-1">D10</div>
          </div>
          <div class="text-2xl opacity-40">−</div>
          <div class="die-roll">
            <div class="text-4xl gold-text title-serif">{{ rollResult.d6 }}</div>
            <div class="text-xs opacity-50 mt-1">D6</div>
          </div>
          <div class="text-2xl opacity-40">=</div>
          <div class="die-roll">
            <div class="text-4xl blood-text title-serif">{{ rollResult.delta > 0 ? '+' : '' }}{{ rollResult.delta }}</div>
            <div class="text-xs opacity-50 mt-1">{{ t('game.roll.delta') }}</div>
          </div>
        </div>
        <p class="mt-4 text-sm opacity-80">{{ rollLine }}</p>
      </div>

      <!-- 提示卡 -->
      <PromptCard :entry-index="store.currentEntryIndex" />

      <!-- 效果执行引导 -->
      <EffectActions
        v-if="!s.finished"
        :entry-index="store.currentEntryIndex"
        @goto-tab="gotoPanelTab"
        @progress="effectStatus = $event"
      />

      <!-- 岁月流逝：凡人会老去（规则书"角色"节） -->
      <div v-if="showAging && livingMortals.length > 0 && !s.finished" class="card p-5 border-amber-900/40">
        <p class="text-xs tracking-[0.3em] opacity-50 mb-2">{{ t('game.aging.title') }}</p>
        <p class="text-sm opacity-85 leading-relaxed mb-3">
          {{ t('game.aging.text') }}
        </p>
        <div class="space-y-2">
          <div v-for="c in livingMortals" :key="c.id" class="flex items-center gap-3 text-sm">
            <span class="flex-1 truncate">{{ c.name }}</span>
            <span class="text-xs opacity-50 shrink-0">{{ c.description || t('game.aging.mortal') }}</span>
            <button class="btn btn-ghost text-xs shrink-0" @click="ageIt(c.id)">{{ t('game.aging.die') }}</button>
          </div>
        </div>
        <div class="mt-3">
          <button class="btn btn-ghost text-xs opacity-60" @click="postponeAging">{{ t('game.aging.postpone') }}</button>
        </div>
      </div>

      <!-- 梦境之地（提示48第3条目） -->
      <div v-if="dreamWorldEntry && !s.finished" class="card p-5 border-purple-900/60">
        <p class="text-xs tracking-[0.3em] opacity-50 mb-2">{{ t('game.dream.title') }}</p>
        <template v-if="!s.dreamWorld">
          <p class="text-sm opacity-85 leading-relaxed mb-3">
            {{ t('game.dream.text') }}
            <span class="text-purple-300/80">{{ t('game.dream.warn') }}</span>
          </p>
          <div class="flex flex-wrap gap-3">
            <button class="btn btn-gold text-sm" @click="enterDream">{{ t('game.dream.enter') }}</button>
            <button class="btn btn-ghost text-sm" @click="takeDreamBook">{{ t('game.dream.stay') }}</button>
          </div>
        </template>
        <template v-else>
          <p class="text-sm opacity-85">{{ t('game.dream.again') }}</p>
        </template>
      </div>

      <!-- 回答面板 -->
      <div v-if="!s.finished" class="card p-5">
        <p class="text-xs tracking-[0.3em] opacity-50 mb-3">{{ t('game.answer.title') }}</p>

        <div v-if="bypassExperience" class="mb-3 p-3 rounded border border-amber-900/40 bg-black/20 text-sm opacity-80">
          {{ t('game.bypass') }}
        </div>

        <div v-if="!bypassExperience">
          <label class="block text-sm mb-2 opacity-80">{{ t('game.expLabel') }}</label>
          <textarea
            v-model="experienceText"
            class="input mb-3"
            :placeholder="t('game.expPh')"
          ></textarea>

          <!-- 经历放置抉择：追加到现有记忆，或新建一段记忆 -->
          <div class="mb-3 p-3 rounded border border-amber-900/40 bg-black/20">
            <p class="text-xs tracking-widest opacity-50 mb-2">{{ t('game.place.title') }}</p>
            <label class="flex items-center gap-2 text-sm mb-1.5 opacity-90 cursor-pointer">
              <input type="radio" v-model="placementChoice" value="new" :disabled="!placement.canCreateNew" />
              <span :class="{ 'opacity-40': !placement.canCreateNew }">{{ t('game.place.new') }}</span>
              <span class="text-xs opacity-50">{{ t('game.place.slots', { n: placement.freeSlots }) }}</span>
            </label>
            <label v-for="m in placement.appendable" :key="m.id" class="flex items-center gap-2 text-sm mb-1.5 opacity-90 cursor-pointer">
              <input type="radio" v-model="placementChoice" :value="m.id" />
              <span class="truncate">{{ memoryLabel(m) }}</span>
              <span class="text-xs opacity-50 shrink-0">{{ t('game.place.count', { n: m.experiences.length }) }}</span>
            </label>

            <!-- 满槽化解：必须遗忘或移入日记 -->
            <div v-if="placement.mustResolve" class="mt-2 p-3 rounded border border-red-900/60 bg-red-950/20">
              <p class="text-xs text-red-300 mb-2">{{ t('game.place.full') }}</p>
              <div class="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                <div v-for="m in forgettableMemories" :key="m.id" class="flex items-center gap-2 text-xs">
                  <span class="flex-1 truncate">{{ memoryLabel(m) }}</span>
                  <button class="px-2 py-0.5 rounded border border-cyan-900/60 text-cyan-200/80 shrink-0" @click="moveToDiaryFromGame(m.id)">{{ t('game.place.toDiary') }}</button>
                  <button class="px-2 py-0.5 rounded border border-red-900/60 text-red-300/90 shrink-0" @click="forgetFromGameView(m.id)">{{ t('game.place.forget') }}</button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-if="showDiaryEditor">
          <label class="block text-sm mb-2 opacity-80">{{ t('game.diaryLabel') }}</label>
          <textarea
            v-model="diaryText"
            class="input mb-4"
            :placeholder="t('game.diaryPh')"
          ></textarea>
        </div>

        <button class="btn btn-gold w-full" :disabled="!canComplete" @click="completeTurn">
          {{ t('game.complete') }}
        </button>

        <!-- P3-2：存在未处理效果时给出轻提示（引导而非强制） -->
        <p
          v-if="!s.finished && effectStatus.total > 0 && effectStatus.done < effectStatus.total"
          class="mt-2 text-xs opacity-70 text-center italic"
        >
          {{ t('game.pending', { n: effectStatus.total - effectStatus.done }) }}
        </p>

        <!-- 回合后信息 -->
        <p v-if="lastMessage" class="mt-4 text-sm opacity-80 text-center italic">{{ lastMessage }}</p>
      </div>

      <!-- 游戏结束 -->
      <div v-else class="card p-6 text-center border-red-900">
        <h3 class="title-serif text-2xl blood-text m-0 mb-4">{{ t('game.finishedTitle') }}</h3>
        <p class="opacity-80">{{ s.finishReason }}</p>
        <button class="btn mt-6" @click="emit('navigate', 'home')">{{ t('game.backHome') }}</button>
      </div>
    </div>

    <!-- 右列：特征面板（桌面端） -->
    <div class="lg:sticky lg:top-6 min-w-0 hidden lg:block">
      <TraitPanel ref="traitPanelRef" :lock-memory-ops="placement.mustResolve && !bypassExperience" />
    </div>
  </div>

  <!-- 移动端底部工具条 -->
  <div v-if="!s.finished" class="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-amber-900/50 bg-[#14100e]/95 backdrop-blur px-4 py-2.5">
    <div class="flex items-center justify-center gap-6 text-sm">
      <button class="btn btn-ghost text-xs px-5" @click="openDrawer('memory')">{{ t('game.mobile.traits') }}</button>
      <button class="btn btn-ghost text-xs px-5" @click="openDrawer('diary')">{{ t('game.mobile.diary') }}</button>
    </div>
  </div>

  <!-- 移动端特征抽屉 -->
  <Teleport to="body">
    <div
      v-if="drawerOpen"
      class="lg:hidden fixed inset-0 z-50"
    >
      <div class="absolute inset-0 bg-black/60" @click="drawerOpen = false"></div>
      <div class="absolute bottom-0 inset-x-0 max-h-[70svh] overflow-y-auto rounded-t-2xl border-t border-amber-900/50 bg-[#1a120e] shadow-2xl">
        <div class="sticky top-0 bg-[#1a120e]/95 backdrop-blur px-4 py-2.5 flex items-center justify-between border-b border-amber-900/40 z-10">
          <span class="text-xs tracking-[0.3em] opacity-60">{{ drawerTab === 'diary' ? t('game.drawer.diary') : t('game.drawer.traits') }}</span>
          <button class="btn btn-ghost text-xs" @click="drawerOpen = false">{{ t('game.drawer.close') }}</button>
        </div>
        <div class="p-3 pb-8">
          <TraitPanel :initial-tab="drawerTab" :lock-memory-ops="placement.mustResolve && !bypassExperience" />
        </div>
      </div>
    </div>
  </Teleport>

  <!-- P2-2：应用内输入/确认弹层（替代 window.prompt / confirm / alert） -->
  <PromptDialog
    :state="ask"
    @ok="(v: string) => { ask?.onOk(v); ask = null }"
    @cancel="ask = null"
  />
  <ConfirmDialog
    :state="confirmAsk"
    @ok="() => { confirmAsk?.onOk?.(); confirmAsk = null }"
    @cancel="confirmAsk = null"
  />
</template>
