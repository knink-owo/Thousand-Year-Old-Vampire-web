<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '../stores/game'

const store = useGameStore()

const hasOngoing = computed(() => !!store.state && !store.state.finished)
const totalTales = computed(() => store.records.length)

const emit = defineEmits<{
  (e: 'navigate', to: 'create' | 'tutorial' | 'history'): void
}>()

function continueJourney() {
  emit('navigate', 'create') // 由 App 层检测状态后直接进入 game
}
</script>

<template>
  <div class="fade-in max-w-3xl mx-auto">
    <!-- 题铭 -->
    <div class="text-center pt-6 pb-10">
      <h2 class="title-serif text-5xl md:text-6xl gold-text tracking-[0.12em] m-0 leading-tight">
        千年<span class="blood-text">吸血鬼</span>
      </h2>
      <p class="mt-4 text-sm md:text-base opacity-70 leading-relaxed tracking-widest">
        你永生不死。你将遗忘一切。
      </p>
      <p class="mt-2 text-xs opacity-40 tracking-[0.25em]">
        单人日记式角色扮演 · 记录你的千年
      </p>
    </div>

    <!-- 进行中的旅程 -->
    <div v-if="hasOngoing" class="card p-6 mb-8 border-red-900/60">
      <p class="text-xs tracking-[0.3em] opacity-50 mb-2">未 竟 之 旅</p>
      <p class="text-lg title-serif text-red-200/90">{{ store.state?.name }}</p>
      <p class="text-sm opacity-60 mt-1">
        已历经 {{ store.state?.moves }} 次提示 · 此刻徘徊于提示 {{ store.state?.currentPromptNumber }}
      </p>
      <button class="btn btn-gold w-full mt-4" @click="continueJourney">继续旅程</button>
    </div>

    <!-- 主按钮 -->
    <div class="grid gap-4">
      <button class="btn btn-gold text-xl py-5 tracking-widest" @click="emit('navigate', 'create')">
        🩸 开始旅程
      </button>
      <button class="btn text-lg py-4" @click="emit('navigate', 'tutorial')">
        📜 阅读教程
      </button>
      <button class="btn btn-ghost text-lg py-4" @click="emit('navigate', 'history')">
        🕯️ 翻阅历史
        <span v-if="totalTales" class="ml-2 text-xs opacity-60">（{{ totalTales }} 段往事）</span>
      </button>
    </div>
  </div>
</template>