<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '../stores/game'
import { t } from '../i18n'

const store = useGameStore()
const emit = defineEmits<{ (e: 'navigate', to: 'home' | 'create' | 'review', recordId?: string): void }>()

const records = computed(() => [...store.records].sort((a, b) => b.createdAt - a.createdAt))

function fmtDate(ts: number): string {
  const d = new Date(ts)
  const pad = (x: number) => String(x).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function stage(rec: { finished: boolean; moves: number }): string {
  if (rec.finished) return t('history.stageEnded')
  if (rec.moves === 0) return t('history.stageIdle')
  return t('history.stageOngoing')
}

function canContinue(id: string): boolean {
  // 只能继续"当前存档"对应的未完结旅程
  return !!store.state && store.state.id === id && !store.state.finished
}
</script>

<template>
  <div class="fade-in max-w-3xl mx-auto">
    <div class="flex items-center justify-between mb-6">
      <h2 class="title-serif text-2xl gold-text m-0">{{ t('history.title') }}</h2>
      <button class="btn btn-ghost text-sm" @click="emit('navigate', 'home')">{{ t('history.back') }}</button>
    </div>

    <!-- 空状态 -->
    <div v-if="records.length === 0" class="card p-10 text-center">
      <p class="text-3xl mb-4 opacity-50">🕯️</p>
      <p class="opacity-80">{{ t('history.empty') }}</p>
      <p class="text-sm opacity-50 mt-2">{{ t('history.emptyHint') }}</p>
      <button class="btn btn-gold mt-6" @click="emit('navigate', 'create')">{{ t('history.start') }}</button>
    </div>

    <!-- 历史列表 -->
    <div v-else class="space-y-3">
      <div v-for="r in records" :key="r.id" class="card p-5 flex items-center gap-4">
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-3 flex-wrap">
            <span class="title-serif text-lg text-parchment truncate">{{ r.name }}</span>
            <span
              class="text-xs px-2 py-0.5 rounded"
              :class="r.finished ? 'bg-red-950/70 text-red-300' : r.moves === 0 ? 'bg-amber-950/50 text-amber-200/70' : 'bg-amber-950/70 text-amber-200'"
            >
              {{ stage(r) }}
            </span>
          </div>
          <p class="text-xs opacity-50 mt-1.5">
            {{ t('history.origin', { date: fmtDate(r.createdAt) }) }}
            {{ r.moves === 0 ? t('history.noAnswers') : t('history.answers', { n: r.moves }) }} ·
            {{ t('history.stoppedAt', { n: r.currentPrompt }) }}
          </p>
          <p class="text-xs opacity-40 mt-0.5">
            {{ t('history.counts', { m: r.memoryCount, s: r.skillCount, r: r.resourceCount }) }}
          </p>
        </div>
        <div class="shrink-0 flex flex-wrap gap-2 justify-end">
          <button v-if="canContinue(r.id)" class="btn btn-gold text-sm" @click="emit('navigate', 'create')">{{ t('history.continue') }}</button>
          <button class="btn text-sm" @click="emit('navigate', 'review', r.id)">
            {{ t('history.review') }}
          </button>
          <button class="btn btn-ghost text-sm" @click="store.removeRecord(r.id)">{{ t('history.forget') }}</button>
        </div>
      </div>

      <div class="flex justify-end">
        <button class="btn btn-ghost text-xs opacity-70" @click="store.clearRecords()">{{ t('history.clear') }}</button>
      </div>
      <p class="text-xs opacity-40 text-center">{{ t('history.footer') }}</p>
    </div>
  </div>
</template>
