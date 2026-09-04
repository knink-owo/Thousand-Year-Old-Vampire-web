<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useGameStore } from '../stores/game'
import PromptCard from '../components/PromptCard.vue'
import TraitPanel from '../components/TraitPanel.vue'
import { placeExperienceDecision, entrySkipsExperience } from '../engine/core'
import type { Memory } from '../types/game'

const store = useGameStore()
const s = computed(() => store.state!)

const emit = defineEmits<{ (e: 'navigate', to: 'home'): void }>()

const experienceText = ref('')
const diaryText = ref('')

// ---- 是否创建经历：系统自动判定（规则书：部分提示明确要求"不要为此创建经历"）----
const bypassExperience = computed(() => {
  const entry = store.currentPrompt?.entries[store.currentEntryIndex - 1]
  return entry ? entrySkipsExperience(entry) : false
})

const rollResult = ref<{ d10: number; d6: number; delta: number; to: number } | null>(null)
const lastMessage = ref('')

// ---- 当前条目效果（梦境之地分支判定用）----
const entryEffects = computed(() => store.currentPrompt?.entries[store.currentEntryIndex - 1]?.effects ?? [])
watch(
  () => [store.state?.currentPromptNumber, store.currentEntryIndex],
  () => {
    showAging.value = false
  },
)

// ---- 梦境之地（提示48第3条目）----
const dreamWorldEntry = computed(() => entryEffects.value.some(e => e.type === 'dreamWorld'))
function enterDream() {
  if (window.confirm('确定踏入梦境之地吗？所有角色、印记与资源将被留下（唯保留一把银剑），并回到提示 10，成为无印记的吸血鬼。')) {
    store.enterDreamWorld()
  }
}
function takeDreamBook() {
  if (!s.value.resources.some(r => r.name.includes('手写书'))) {
    store.addResource('一本奇幻梦境的手写书')
  }
}

// ---- 岁月流逝（规则书"角色"节：每隔四五个提示，一位凡人会因年老而去世）----
const showAging = ref(false)
const livingMortals = computed(() => s.value.characters.filter(c => !c.dead && !c.immortal))
watch(
  () => s.value.moves,
  (moves, prev) => {
    if (typeof prev === 'number' && moves > 0 && moves % 4 === 0 && showAging.value === false) {
      showAging.value = livingMortals.value.length > 0
    }
  },
)
function ageIt(id: string) {
  store.ageCharacter(id)
  if (livingMortals.value.length === 0) showAging.value = false
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
  return first ? (first.length > 26 ? first.slice(0, 26) + '…' : first) : '未命名的记忆'
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
  if (window.confirm(`确定要遗忘记忆「${memoryLabel(m)}」吗？记忆将被划掉，其中的经历不再占用记忆槽。`)) {
    store.forgetMemory(memoryId)
  }
}

function moveToDiaryFromGame(memoryId: string) {
  if (!s.value.diaryResourceId) {
    const n = window.prompt(
      '创建你的日记（规则书："请给它一个简短的描述"）。例如：一本结实的皮革装订书；一组饰有象形文字图案的罐子；镶嵌金丝边框的可怕仪式面具；一个古老网站上的密码保护论坛。',
      '一本结实的皮革装订书',
    )
    if (n === null) return
    store.moveMemoryToDiary(memoryId, n.trim() || undefined)
    return
  }
  const inDiaryCount = s.value.memories.filter(x => x.inDiary).length
  if (inDiaryCount >= 4) {
    window.alert('日记已经写满 4 段记忆，无法再移入（规则书："一本日记最多可以容纳四段吸血鬼的记忆"）。\n你可以：① 改为遗忘这段记忆；② 到资源页「失去」现有日记（其中包含的记忆将一并划掉），之后再另立一本新日记。')
    return
  }
  store.moveMemoryToDiary(memoryId)
}

function endGameNow() {
  if (window.confirm(`确认在此终结「${s.value.name}」的千年之旅吗？故事将画上句号，五位特征化作碑文。`)) {
    store.endGame(`你选择在此终结自己的千年——${s.value.name}的故事就此合上。`)
  }
}

function exportGameJson() {
  const json = store.exportGameJson()
  const blob = new Blob([json], { type: 'application/json;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `${store.state?.name ?? 'vampire'}-存档.json`
  a.click()
  URL.revokeObjectURL(a.href)
}

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
      lastMessage.value = '记忆已满：请先遗忘一段记忆或将一段记忆移入日记，再安放这段经历。'
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
  rollResult.value = result.roll

  if (s0.finished) {
    lastMessage.value = ''
    return
  }

  // 4. 构造提示文案
  const roll = result.roll
  const repeats = roll.delta === 0

  // 5. 生成下一轮的信息卡
  lastMessage.value = repeats
    ? `你再次面对同一提示——命运让你停在原地。`
    : `骰子将你带向提示 ${roll.to}。`
  // 清空输入
  experienceText.value = ''
  diaryText.value = ''
  resetPlacement()
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
            第 {{ s.moves }} 次回答 · 当前提示 {{ s.currentPromptNumber }}
            <span class="ml-2">{{ s.usesFastMode ? '快速游戏' : '日志游戏' }}</span>
          </p>
        </div>
        <div class="flex gap-2 flex-wrap">
          <button class="btn btn-ghost text-xs" @click="exportGameJson">导出存档 JSON</button>
          <button class="btn btn-ghost text-xs" @click="endGameNow">结束旅程</button>
        </div>
      </div>

      <!-- 提示卡 -->
      <PromptCard :entry-index="store.currentEntryIndex" />

      <!-- 岁月流逝：凡人会老去（规则书"角色"节） -->
      <div v-if="showAging && livingMortals.length > 0 && !s.finished" class="card p-5 border-amber-900/40">
        <p class="text-xs tracking-[0.3em] opacity-50 mb-2">岁 月 流 逝</p>
        <p class="text-sm opacity-85 leading-relaxed mb-3">
          数个春秋在指尖流逝。你认识的一位凡人正在衰老——每隔四五个提示，便有一位凡人会因年老而去世。让哪段生命落幕，或让岁月暂缓？
        </p>
        <div class="space-y-2">
          <div v-for="c in livingMortals" :key="c.id" class="flex items-center gap-3 text-sm">
            <span class="flex-1 truncate">{{ c.name }}</span>
            <span class="text-xs opacity-50 shrink-0">{{ c.description || '凡人' }}</span>
            <button class="btn btn-ghost text-xs shrink-0" @click="ageIt(c.id)">因年老而去</button>
          </div>
        </div>
        <div class="mt-3">
          <button class="btn btn-ghost text-xs opacity-60" @click="showAging = false">岁月暂缓（忽略）</button>
        </div>
      </div>

      <!-- 梦境之地（提示48第3条目） -->
      <div v-if="dreamWorldEntry && !s.finished" class="card p-5 border-purple-900/60">
        <p class="text-xs tracking-[0.3em] opacity-50 mb-2">梦 境 之 地</p>
        <template v-if="!s.dreamWorld">
          <p class="text-sm opacity-85 leading-relaxed mb-3">
            你可以抛弃现实，踏入梦境之地——留下所有角色、印记与资源（除一把银剑），回到提示 10，成为无印记的吸血鬼。
            <span class="text-purple-300/80">若日后再度抵达此提示，你将醒来，永远无法返回。</span>
          </p>
          <div class="flex flex-wrap gap-3">
            <button class="btn btn-gold text-sm" @click="enterDream">🌙 踏入梦境之地</button>
            <button class="btn btn-ghost text-sm" @click="takeDreamBook">留在现实 · 获得《一本奇幻梦境的手写书》</button>
          </div>
        </template>
        <template v-else>
          <p class="text-sm opacity-85">你再次抵达此处——随即醒来，再也无法返回梦境。</p>
        </template>
      </div>

      <!-- 掷骰结果 -->
      <div v-if="rollResult" class="card p-5 text-center">
        <p class="text-xs tracking-[0.3em] opacity-50 mb-3">骰 子 之 判</p>
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
            <div class="text-xs opacity-50 mt-1">差</div>
          </div>
        </div>
        <p class="mt-4 text-sm opacity-80">
          {{ rollResult.delta > 0 ? `向后移动 ${rollResult.delta}，前往提示 ${rollResult.to}` : rollResult.delta < 0 ? `向前移动 ${Math.abs(rollResult.delta)}，前往提示 ${rollResult.to}` : '差为 0——停留在相同的提示' }}
        </p>
      </div>

      <!-- 回答面板 -->
      <div v-if="!s.finished" class="card p-5">
        <p class="text-xs tracking-[0.3em] opacity-50 mb-3">回 答 提 示</p>

        <div v-if="bypassExperience" class="mb-3 p-3 rounded border border-amber-900/40 bg-black/20 text-sm opacity-80">
          ⚙ 系统裁定：本提示明确要求不创建经历——已自动跳过经历书写与记忆放置。
        </div>

        <div v-if="!bypassExperience">
          <label class="block text-sm mb-2 opacity-80">这段经历（请写入某段记忆）</label>
          <textarea
            v-model="experienceText"
            class="input mb-3"
            placeholder="好的经历格式——“[事件的描述]；[我对此的感受或做出的反应]”&#10;例如：我检查了荒野中被遗弃的白骨；我没有找到查尔斯，但我确实发现了武器和宝藏。"
          ></textarea>

          <!-- 经历放置抉择：追加到现有记忆，或新建一段记忆 -->
          <div class="mb-3 p-3 rounded border border-amber-900/40 bg-black/20">
            <p class="text-xs tracking-widest opacity-50 mb-2">放 进 哪 段 记 忆</p>
            <label class="flex items-center gap-2 text-sm mb-1.5 opacity-90 cursor-pointer">
              <input type="radio" v-model="placementChoice" value="new" :disabled="!placement.canCreateNew" />
              <span :class="{ 'opacity-40': !placement.canCreateNew }">新建一段记忆</span>
              <span class="text-xs opacity-50">（剩余 {{ placement.freeSlots }} 槽）</span>
            </label>
            <label v-for="m in placement.appendable" :key="m.id" class="flex items-center gap-2 text-sm mb-1.5 opacity-90 cursor-pointer">
              <input type="radio" v-model="placementChoice" :value="m.id" />
              <span class="truncate">{{ memoryLabel(m) }}</span>
              <span class="text-xs opacity-50 shrink-0">（{{ m.experiences.length }}/3）</span>
            </label>

            <!-- 满槽化解：必须遗忘或移入日记 -->
            <div v-if="placement.mustResolve" class="mt-2 p-3 rounded border border-red-900/60 bg-red-950/20">
              <p class="text-xs text-red-300 mb-2">记忆已满——必须先遗忘一段记忆或将一段记忆移入日记，才能安放新的经历。</p>
              <div class="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                <div v-for="m in forgettableMemories" :key="m.id" class="flex items-center gap-2 text-xs">
                  <span class="flex-1 truncate">{{ memoryLabel(m) }}</span>
                  <button class="px-2 py-0.5 rounded border border-cyan-900/60 text-cyan-200/80 shrink-0" @click="moveToDiaryFromGame(m.id)">入日记</button>
                  <button class="px-2 py-0.5 rounded border border-red-900/60 text-red-300/90 shrink-0" @click="forgetFromGameView(m.id)">遗忘</button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-if="showDiaryEditor">
          <label class="block text-sm mb-2 opacity-80">日记条目（日志游戏）</label>
          <textarea
            v-model="diaryText"
            class="input mb-4"
            placeholder="以书面形式写下这一回合你的吸血鬼的遭遇……"
          ></textarea>
        </div>

        <button class="btn btn-gold w-full" :disabled="!canComplete" @click="completeTurn">
          完成这一回合，掷出命运之骰
        </button>

        <!-- 回合后信息 -->
        <p v-if="lastMessage" class="mt-4 text-sm opacity-80 text-center italic">{{ lastMessage }}</p>
      </div>

      <!-- 游戏结束 -->
      <div v-else class="card p-6 text-center border-red-900">
        <h3 class="title-serif text-2xl blood-text m-0 mb-4">故事终结</h3>
        <p class="opacity-80">{{ s.finishReason }}</p>
        <button class="btn mt-6" @click="emit('navigate', 'home')">返回首页</button>
      </div>
    </div>

    <!-- 右列：特征面板 -->
    <div class="lg:sticky lg:top-6 min-w-0">
      <TraitPanel />
    </div>
  </div>
</template>