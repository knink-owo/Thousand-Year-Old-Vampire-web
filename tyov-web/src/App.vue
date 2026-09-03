<script setup lang="ts">
import { ref, watch } from 'vue'
import { useGameStore } from './stores/game'
import CreateView from './views/CreateView.vue'
import GameView from './views/GameView.vue'
import FinishView from './views/FinishView.vue'

const store = useGameStore()
const view = ref<'create' | 'game' | 'finish'>('create')

watch(
  () => store.state,
  (s) => {
    if (!s) view.value = 'create'
    else if (s.finished) view.value = 'finish'
    else view.value = 'game'
  },
  { immediate: true, deep: true },
)
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <!-- 顶部题铭 -->
    <header class="pt-10 pb-6 text-center px-4">
      <h1 class="title-serif text-3xl md:text-4xl gold-text tracking-[0.15em] m-0">
        千年<span class="blood-text">吸血鬼</span>
      </h1>
      <p class="mt-3 text-sm opacity-60 tracking-[0.3em]">THOUSAND YEAR OLD VAMPIRE · 单人日记式 TRPG</p>
      <div class="blood-divider mt-6 mx-auto w-2/3"></div>
    </header>

    <main class="flex-1 w-full max-w-6xl mx-auto px-4 pb-16 box-border">
      <CreateView v-if="view === 'create'" />
      <GameView v-else-if="view === 'game'" />
      <FinishView v-else />
    </main>

    <footer class="pb-8 text-center text-xs opacity-40 px-4">
      依据规则书《千年老吸血鬼》中文翻译版制作 · 仅供个人游玩使用的数字工具
    </footer>
  </div>
</template>