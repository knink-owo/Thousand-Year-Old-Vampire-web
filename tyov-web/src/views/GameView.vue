<script setup lang="ts">
import { ref, computed } from 'vue'
import { useGameStore } from '../stores/game'
import PromptCard from '../components/PromptCard.vue'
import TraitPanel from '../components/TraitPanel.vue'

const store = useGameStore()
const s = computed(() => store.state!)

const experienceText = ref('')
const diaryText = ref('')
const bypassExperience = ref(false)

const rollResult = ref<{ d10: number; d6: number; delta: number; to: number } | null>(null)
const lastMessage = ref('')

const showDiaryEditor = computed(() => {
  return !s.value.usesFastMode && !s.value.finished
})

const canComplete = computed(() => {
  if (s.value.finished) return false
  if (bypassExperience.value) return true
  return experienceText.value.trim().length > 0
})

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

  // 1. 创建经历（除非明确跳过）
  if (!bypassExperience.value && experienceText.value.trim()) {
    store.addExperience(null, experienceText.value.trim(), prevPrompt, store.currentEntryIndex)
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
  bypassExperience.value = false
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
        </div>
      </div>

      <!-- 提示卡 -->
      <PromptCard :entry-index="store.currentEntryIndex" />

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

        <div class="flex items-center gap-2 mb-3 text-xs opacity-60">
          <label class="flex items-center gap-1.5 cursor-pointer">
            <input type="checkbox" v-model="bypassExperience" />
            本提示不创建经历（如提示明确要求）
          </label>
        </div>

        <div v-if="!bypassExperience">
          <label class="block text-sm mb-2 opacity-80">这段经历（请写入某段记忆）</label>
          <textarea
            v-model="experienceText"
            class="input mb-4"
            placeholder="好的经历格式——“[事件的描述]；[我对此的感受或做出的反应]”&#10;例如：我检查了荒野中被遗弃的白骨；我没有找到查尔斯，但我确实发现了武器和宝藏。"
          ></textarea>
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
        <button class="btn mt-6" @click="store.newGame(store.state?.name ?? '无名', store.state?.usesFastMode ?? false)">开始新的千年</button>
      </div>
    </div>

    <!-- 右列：特征面板 -->
    <div class="lg:sticky lg:top-6 min-w-0">
      <TraitPanel />
    </div>
  </div>
</template>