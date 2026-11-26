<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '../stores/game'
import type { GameState } from '../types/game'
import { t } from '../i18n'

const props = defineProps<{ recordId: string }>()
const emit = defineEmits<{ (e: 'navigate', to: 'home' | 'history'): void }>()

const store = useGameStore()
// 只读快照：绝不写入 store.state，避免污染当前存档
const snap = computed<GameState | null>(() => store.getRecordSnapshot(props.recordId))

// 该记录是否已终结（决定"无快照"时的提示语义：未终结 vs 未留存）
const recordFinished = computed(() => {
  const rec = store.records.find(r => r.id === props.recordId)
  return rec?.finished ?? false
})

function fmtDate(ts?: number): string {
  if (!ts) return '—'
  const d = new Date(ts)
  const pad = (x: number) => String(x).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
function fmtTime(ts: number): string {
  const d = new Date(ts)
  const pad = (x: number) => String(x).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}
function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n) + '…' : s
}

function exportDiary() {
  const target = snap.value
  if (!target) return
  const md = store.exportDiaryMarkdown(target)
  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = t('finish.exportName', { name: target.name })
  a.click()
  URL.revokeObjectURL(a.href)
}
</script>

<template>
  <div class="fade-in max-w-4xl mx-auto">
    <!-- 无快照状态：区分"尚未终结"与"未留存" -->
    <div v-if="!snap" class="card p-10 text-center">
      <p class="text-3xl mb-4 opacity-50">🕯️</p>
      <template v-if="!recordFinished">
        <p class="opacity-80">{{ t('review.unsaved') }}</p>
        <p class="text-sm opacity-50 mt-2">{{ t('review.unsavedHint') }}</p>
        <p class="text-sm opacity-50 mt-1">{{ t('review.unsavedHint2') }}</p>
      </template>
      <template v-else>
        <p class="opacity-80">{{ t('review.lost') }}</p>
        <p class="text-sm opacity-50 mt-2">{{ t('review.lostHint') }}</p>
      </template>
      <button class="btn mt-6" @click="emit('navigate', 'history')">{{ t('review.back') }}</button>
    </div>

    <template v-else>
      <!-- 头部 -->
      <div class="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h2 class="title-serif text-2xl gold-text m-0">{{ t('review.title', { name: snap.name }) }}</h2>
        <div class="flex gap-2 flex-wrap">
          <button v-if="snap.diaries.length" class="btn btn-ghost text-sm" @click="exportDiary">{{ t('review.export') }}</button>
          <button class="btn btn-ghost text-sm" @click="emit('navigate', 'history')">{{ t('review.back') }}</button>
        </div>
      </div>

      <!-- 概览 -->
      <div class="card p-6 mb-6">
        <div class="flex items-center gap-3 flex-wrap">
          <span class="title-serif text-xl text-parchment">{{ snap.name }}</span>
          <span
            class="text-xs px-2 py-0.5 rounded"
            :class="snap.finished ? 'bg-red-950/70 text-red-300' : snap.moves === 0 ? 'bg-amber-950/50 text-amber-200/70' : 'bg-amber-950/70 text-amber-200'"
          >
            {{ snap.finished ? t('history.stageEnded') : snap.moves === 0 ? t('history.stageIdle') : t('history.stageOngoing') }}
          </span>
          <span v-if="snap.usesFastMode" class="text-xs opacity-50">{{ t('game.mode.fast') }}</span>
        </div>
        <p class="text-xs opacity-60 mt-2">
          {{ t('history.origin', { date: fmtDate(snap.createdAt) }) }}{{ snap.finished ? t('review.endedOn', { date: fmtDate(snap.finishedAt) }) : '' }}{{ t('review.meta', { n: snap.moves, p: snap.currentPromptNumber }) }}
        </p>
        <p v-if="snap.finishReason" class="mt-4 text-sm leading-relaxed opacity-85 border-l-2 border-blood pl-3 italic">
          “{{ snap.finishReason }}”
        </p>
      </div>

      <!-- 记忆 -->
      <section v-if="snap.memories.length > 0" class="card p-6 mb-6">
        <h3 class="title-serif text-lg gold-text mb-1">{{ t('review.memoriesTitle') }} <span class="text-xs opacity-50">{{ t('review.memoriesSlots', { n: snap.memorySlots }) }}</span></h3>
        <p class="text-xs opacity-50 mb-4">{{ t('review.memoriesDesc', {
          total: snap.memories.length,
          diary: snap.memories.filter(m => m.inDiary).length,
          forgotten: snap.memories.filter(m => m.forgotten).length,
        }) }}</p>
        <div class="space-y-3">
          <div
            v-for="m in snap.memories"
            :key="m.id"
            class="border border-amber-900/40 rounded p-3"
            :class="{ 'opacity-45': m.forgotten }"
          >
            <div class="flex items-center gap-2 flex-wrap">
              <span class="text-sm title-serif" :class="{ struck: m.forgotten }">{{ m.title || t('panel.unnamedMemory') }}</span>
              <span v-if="m.inDiary" class="text-xs text-cyan-300/80">{{ t('memory.inDiary') }}</span>
              <span v-if="m.stabilized" class="text-xs text-amber-300">{{ t('memory.stabilizedBadge') }}</span>
              <span v-if="m.forgotten" class="text-xs text-red-300/70">{{ t('review.forgotten') }}</span>
            </div>
            <ul class="mt-2 space-y-1 text-sm opacity-90">
              <li v-for="(ex, i) in m.experiences" :key="ex.id" class="flex gap-2 items-start" :class="{ 'opacity-55': ex.lost }">
                <span class="text-red-400/80 shrink-0 mt-0.5" :class="{ 'opacity-60': ex.lost }">{{ i + 1 }}.</span>
                <span class="flex-1 whitespace-pre-wrap" :class="{ struck: ex.lost }">{{ ex.text }}</span>
                <span v-if="ex.lost" class="text-xs text-red-300/60 shrink-0">{{ t('review.expLost') }}</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      <!-- 技能 -->
      <section v-if="snap.skills.length > 0" class="card p-6 mb-6">
        <h3 class="title-serif text-lg gold-text mb-1">{{ t('review.skillsTitle') }}</h3>
        <p class="text-xs opacity-50 mb-4">{{ t('review.skillsDesc', {
          total: snap.skills.length,
          checked: snap.skills.filter(x => x.checked).length,
          lost: snap.skills.filter(x => x.lost).length,
        }) }}</p>
        <div class="space-y-2">
          <div v-for="sk in snap.skills" :key="sk.id" class="flex items-center gap-3 border border-amber-900/40 rounded px-3 py-2" :class="{ 'opacity-40': sk.lost }">
            <span class="text-lg w-6 text-center" :class="sk.checked ? 'text-amber-400' : 'text-amber-900/50'">{{ sk.checked ? '☑' : '☐' }}</span>
            <span class="flex-1 text-sm" :class="{ struck: sk.lost || sk.checked }">{{ sk.name }}</span>
            <span v-if="sk.lost" class="text-xs text-red-300/60 shrink-0">{{ t('review.skillLost') }}</span>
          </div>
        </div>
      </section>

      <!-- 资源 -->
      <section v-if="snap.resources.length > 0" class="card p-6 mb-6">
        <h3 class="title-serif text-lg gold-text mb-1">{{ t('review.resourcesTitle') }}</h3>
        <p class="text-xs opacity-50 mb-4">{{ t('review.resourcesDesc', { n: snap.resources.length }) }}</p>
        <div class="space-y-2">
          <div v-for="r in snap.resources" :key="r.id" class="flex items-center gap-3 border border-amber-900/40 rounded px-3 py-2" :class="{ 'opacity-40': r.lost }">
            <span class="text-base w-6 text-center">{{ r.isDiary ? '📖' : r.fixed ? '🏰' : '◆' }}</span>
            <span class="flex-1 text-sm" :class="{ struck: r.lost }">
              {{ r.name }}
              <span v-if="r.isDiary" class="text-xs text-cyan-300/80 ml-1">{{ t('review.resDiary', { n: snap.memories.filter(m => m.inDiary).length }) }}</span>
              <span v-else-if="r.fixed" class="text-xs text-amber-300/70 ml-1">{{ t('resource.fixedBadge') }}</span>
            </span>
            <span v-if="r.isDiary && r.lost" class="text-xs text-red-300/60 shrink-0">{{ t('review.diaryLost') }}</span>
            <span v-else-if="r.lost" class="text-xs text-red-300/60 shrink-0">{{ t('review.resLost') }}</span>
          </div>
        </div>
      </section>

      <!-- 角色 -->
      <section v-if="snap.characters.length > 0" class="card p-6 mb-6">
        <h3 class="title-serif text-lg gold-text mb-1">{{ t('review.charactersTitle') }}</h3>
        <p class="text-xs opacity-50 mb-4">{{ t('review.charactersDesc', {
          n: snap.characters.length,
          dead: snap.characters.filter(c => c.dead).length,
        }) }}</p>
        <div class="space-y-2">
          <div v-for="c in snap.characters" :key="c.id" class="border border-amber-900/40 rounded px-3 py-2" :class="{ 'opacity-40': c.dead }">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="text-sm title-serif" :class="{ struck: c.dead }">{{ c.name }}</span>
              <span class="text-xs px-1.5 py-0.5 rounded" :class="c.immortal ? 'bg-purple-950/70 text-purple-300' : 'bg-amber-950/50 text-amber-200/80'">
                {{ c.immortal ? t('char.immortal') : t('char.mortal') }}
              </span>
              <span v-if="c.isGhost" class="text-xs text-cyan-300/70">{{ t('char.ghost') }}</span>
              <span v-if="c.dead" class="text-xs text-red-300/60">{{ t('review.dead') }}</span>
            </div>
            <p v-if="c.description" class="text-xs opacity-70 mt-1">{{ c.description }}</p>
          </div>
        </div>
      </section>

      <!-- 印记 -->
      <section v-if="snap.marks.length > 0" class="card p-6 mb-6">
        <h3 class="title-serif text-lg gold-text mb-1">{{ t('review.marksTitle') }}</h3>
        <p class="text-xs opacity-50 mb-4">{{ t('review.marksDesc', { n: snap.marks.length }) }}</p>
        <div class="space-y-2">
          <div v-for="m in snap.marks" :key="m.id" class="flex items-center gap-3 border border-amber-900/40 rounded px-3 py-2" :class="{ 'opacity-40': m.removed }">
            <span class="text-base w-6 text-center">✠</span>
            <span class="flex-1 text-sm" :class="{ struck: m.removed }">{{ m.name }}</span>
            <span v-if="m.crippled" class="text-xs text-red-300/80 shrink-0">{{ t('mark.crippled') }}</span>
            <span v-if="m.removed" class="text-xs text-red-300/60 shrink-0">{{ t('review.markRemoved') }}</span>
          </div>
        </div>
      </section>

      <!-- 日记与事件流 -->
      <section class="card p-6 mb-6">
        <h3 class="title-serif text-lg gold-text mb-1">{{ t('review.logTitle') }}</h3>
        <p v-if="snap.usesFastMode" class="text-xs opacity-50 mb-4">{{ t('review.fastNote') }}</p>
        <p v-else class="text-xs opacity-50 mb-4">{{ t('review.diaryDesc', { n: snap.diaries.length }) }}</p>

        <div v-if="snap.diaries.length > 0" class="space-y-3 max-h-96 overflow-y-auto pr-2 mb-5">
          <div v-for="d in [...snap.diaries].reverse()" :key="d.id" class="border border-amber-900/40 rounded p-3">
            <p class="text-xs opacity-60 mb-1">{{ t('diary.meta', { prompt: d.promptNumber, n: d.entryIndex, time: fmtTime(d.createdAt) }) }}</p>
            <p class="text-xs italic opacity-70 mb-2 border-l-2 border-blood pl-2">“{{ truncate(d.promptText, 60) }}”</p>
            <p class="text-sm leading-relaxed whitespace-pre-wrap">{{ d.content }}</p>
          </div>
        </div>

        <div class="pt-4 border-t border-amber-900/40">
          <p class="text-xs tracking-widest opacity-50 mb-2">{{ t('diary.events') }} <span class="opacity-40 normal-case tracking-normal">{{ t('review.eventCount', { n: snap.log.length }) }}</span></p>
          <div class="space-y-1.5 max-h-64 overflow-y-auto pr-1">
            <p v-for="e in [...snap.log].reverse()" :key="e.id" class="text-xs leading-relaxed opacity-75">
              <span class="opacity-40 mr-1">{{ t('diary.eventPrompt', { prompt: e.atPrompt || '—' }) }}</span>{{ e.text }}
            </p>
            <p v-if="snap.log.length === 0" class="text-xs opacity-40 italic">{{ t('diary.noEvents') }}</p>
          </div>
        </div>
      </section>

      <p class="text-center text-xs opacity-40 mb-4">{{ t('review.readonly') }}</p>
    </template>
  </div>
</template>
