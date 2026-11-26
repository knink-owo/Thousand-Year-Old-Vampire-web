<script setup lang="ts">
import { usePanelDialogs } from '../../composables/usePanelDialogs'
import { t } from '../../i18n'

const { s } = usePanelDialogs()

function fmtTime(ts: number): string {
  const d = new Date(ts)
  const pad = (x: number) => String(x).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n) + '…' : s
}
</script>

<template>
  <div>
    <p class="text-xs opacity-50 mb-3">
      {{ t('diary.introBefore') }}<strong>{{ t('diary.introStrong') }}</strong>{{ t('diary.introAfter') }}
    </p>
    <div class="space-y-3 max-h-96 overflow-y-auto pr-1">
      <div v-for="d in [...s.diaries].reverse()" :key="d.id" class="border border-amber-900/40 rounded p-3">
        <p class="text-xs opacity-60 mb-1">{{ t('diary.meta', { prompt: d.promptNumber, n: d.entryIndex, time: fmtTime(d.createdAt) }) }}</p>
        <p class="text-xs italic opacity-70 mb-2 border-l-2 border-blood pl-2">“{{ truncate(d.promptText, 60) }}”</p>
        <p class="text-sm leading-relaxed whitespace-pre-wrap">{{ d.content }}</p>
      </div>
      <div v-if="s.diaries.length === 0" class="text-center py-6">
        <p class="text-sm opacity-40 italic">{{ t('diary.empty') }}</p>
        <p class="text-xs opacity-30 mt-1">{{ t('diary.emptyHint') }}</p>
      </div>
    </div>
    <!-- 事件流 -->
    <div class="mt-5 pt-4 border-t border-amber-900/40">
      <p class="text-xs tracking-widest opacity-50 mb-2">{{ t('diary.events') }}</p>
      <div class="space-y-1.5 max-h-40 overflow-y-auto pr-1">
        <p v-for="e in [...s.log].reverse().slice(0, 30)" :key="e.id" class="text-xs leading-relaxed opacity-75">
          <span class="opacity-40 mr-1">{{ t('diary.eventPrompt', { prompt: e.atPrompt || '—' }) }}</span>{{ e.text }}
        </p>
        <p v-if="s.log.length === 0" class="text-xs opacity-40 italic">{{ t('diary.noEvents') }}</p>
      </div>
    </div>
  </div>
</template>
