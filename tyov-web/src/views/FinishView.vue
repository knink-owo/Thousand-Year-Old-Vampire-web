<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '../stores/game'
import { t } from '../i18n'

const store = useGameStore()
const s = computed(() => store.state!)

const emit = defineEmits<{ (e: 'navigate', to: 'home'): void }>()

const diaryCount = computed(() => s.value.diaries.length)
const memoryCount = computed(() => s.value.memories.length)
const skillCount = computed(() => s.value.skills.filter(x => !x.lost).length)
const deadChars = computed(() => s.value.characters.filter(x => x.dead))
const artifactHeld = computed(() => s.value.resources.filter(r => r.artifact && !r.lost))
const artifactList = computed(() =>
  t('finish.artifactList', { names: artifactHeld.value.map(r => r.name).join(t('finish.artifactSep')) }),
)

function exportMd() {
  const md = store.exportDiaryMarkdown()
  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = t('finish.exportName', { name: s.value.name })
  a.click()
  URL.revokeObjectURL(a.href)
}
</script>

<template>
  <div class="fade-in space-y-6">
    <div class="card p-8 text-center">
      <p class="text-xs tracking-[0.4em] opacity-50 mb-4">{{ t('finish.epilogue') }}</p>
      <h2 class="title-serif text-3xl blood-text m-0">{{ t('finish.title', { name: s.name }) }}</h2>
      <p class="mt-4 opacity-80 max-w-xl mx-auto leading-relaxed">
        {{ s.finishReason }}
      </p>
      <p class="mt-3 text-sm opacity-60">{{ t('finish.moves', { n: s.moves }) }}</p>
    </div>

    <!-- 神器可改写结局（提示10第2条目） -->
    <div v-if="artifactHeld.length" class="card p-5 border-amber-700/60">
      <p class="text-xs tracking-[0.3em] opacity-60 mb-2">{{ t('finish.artifactTitle') }}</p>
      <p class="text-sm leading-relaxed opacity-85">
        {{ t('finish.artifactText', { list: artifactList }) }}
      </p>
    </div>

    <!-- 数字回顾 -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div class="card p-5 text-center">
        <div class="text-3xl gold-text title-serif">{{ memoryCount }}</div>
        <div class="text-xs opacity-60 mt-1">{{ t('finish.stat.memories', { n: s.memories.filter(m => m.inDiary).length }) }}</div>
      </div>
      <div class="card p-5 text-center">
        <div class="text-3xl gold-text title-serif">{{ skillCount }}</div>
        <div class="text-xs opacity-60 mt-1">{{ t('finish.stat.skills') }}</div>
      </div>
      <div class="card p-5 text-center">
        <div class="text-3xl gold-text title-serif">{{ s.resources.filter(r => !r.lost).length }}</div>
        <div class="text-xs opacity-60 mt-1">{{ t('finish.stat.resources') }}</div>
      </div>
      <div class="card p-5 text-center">
        <div class="text-3xl blood-text title-serif">{{ deadChars.length }}</div>
        <div class="text-xs opacity-60 mt-1">{{ t('finish.stat.dead', { n: s.characters.length }) }}</div>
      </div>
    </div>

    <!-- 日记回顾 -->
    <div v-if="diaryCount > 0" class="card p-6">
      <h3 class="title-serif text-lg gold-text mb-4">{{ t('finish.diaryTitle', { n: Math.min(diaryCount, 5) }) }}</h3>
      <div class="space-y-4 max-h-96 overflow-y-auto pr-2">
        <div v-for="d in [...s.diaries].reverse().slice(0, 5)" :key="d.id" class="border-l-2 border-blood pl-4">
          <p class="text-xs opacity-50 mb-1">{{ t('diary.meta', { prompt: d.promptNumber, n: d.entryIndex, time: '' }) }}</p>
          <p class="text-sm whitespace-pre-wrap leading-relaxed">{{ d.content }}</p>
        </div>
      </div>
    </div>

    <div class="flex justify-center gap-4 flex-wrap">
      <button class="btn btn-gold" @click="exportMd()">{{ t('finish.exportMd') }}</button>
      <button class="btn" @click="emit('navigate', 'home')">{{ t('finish.home') }}</button>
    </div>
  </div>
</template>
