<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '../stores/game'

const store = useGameStore()

const props = defineProps<{ entryIndex: number }>()

const entry = computed(() => {
  const p = store.currentPrompt
  return p?.entries[props.entryIndex - 1]
})
</script>

<template>
  <div class="card p-6 md:p-8 relative overflow-hidden">
    <!-- 提示编号水印 -->
    <div class="absolute -right-3 -top-6 text-[96px] font-bold opacity-[0.06] select-none pointer-events-none title-serif">
      {{ store.state?.currentPromptNumber }}
    </div>

    <div class="flex items-center gap-3 mb-4">
      <span class="px-3 py-1 rounded-sm text-sm tracking-widest" :class="entryIndex === 1 ? 'bg-red-950/60 text-red-300 border border-red-900' : 'bg-amber-950/40 text-amber-200 border border-amber-900'">
        {{ entryIndex === 1 ? '首次触达' : `第 ${entryIndex} 次触达` }}
      </span>
      <span class="text-sm opacity-60">提示 {{ store.state?.currentPromptNumber }}</span>
    </div>

    <p class="text-lg md:text-xl leading-relaxed title-serif whitespace-pre-wrap">
      {{ entry?.text }}
    </p>
  </div>
</template>