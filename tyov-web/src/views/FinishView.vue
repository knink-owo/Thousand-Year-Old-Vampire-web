<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '../stores/game'

const store = useGameStore()
const s = computed(() => store.state!)

const diaryCount = computed(() => s.value.diaries.length)
const memoryCount = computed(() => s.value.memories.length)
const skillCount = computed(() => s.value.skills.filter(x => !x.lost).length)
const deadChars = computed(() => s.value.characters.filter(x => x.dead))

function exportMd() {
  const md = store.exportDiaryMarkdown()
  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `${s.value.name}-的日记.md`
  a.click()
  URL.revokeObjectURL(a.href)
}
</script>

<template>
  <div class="fade-in space-y-6">
    <div class="card p-8 text-center">
      <p class="text-xs tracking-[0.4em] opacity-50 mb-4">E P I L O G U E</p>
      <h2 class="title-serif text-3xl blood-text m-0">{{ s.name }} 的千年结束了</h2>
      <p class="mt-4 opacity-80 max-w-xl mx-auto leading-relaxed">
        {{ s.finishReason }}
      </p>
      <p class="mt-3 text-sm opacity-60">共经历 {{ s.moves }} 次提示触达。</p>
    </div>

    <!-- 数字回顾 -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div class="card p-5 text-center">
        <div class="text-3xl gold-text title-serif">{{ memoryCount }}</div>
        <div class="text-xs opacity-60 mt-1">段记忆（其中 {{ s.memories.filter(m => m.inDiary).length }} 段入日记）</div>
      </div>
      <div class="card p-5 text-center">
        <div class="text-3xl gold-text title-serif">{{ skillCount }}</div>
        <div class="text-xs opacity-60 mt-1">项技能仍伴随</div>
      </div>
      <div class="card p-5 text-center">
        <div class="text-3xl gold-text title-serif">{{ s.resources.filter(r => !r.lost).length }}</div>
        <div class="text-xs opacity-60 mt-1">项资源仍持有</div>
      </div>
      <div class="card p-5 text-center">
        <div class="text-3xl blood-text title-serif">{{ deadChars.length }}</div>
        <div class="text-xs opacity-60 mt-1">位角色死去（共 {{ s.characters.length }} 位）</div>
      </div>
    </div>

    <!-- 日记回顾 -->
    <div v-if="diaryCount > 0" class="card p-6">
      <h3 class="title-serif text-lg gold-text mb-4">日记回顾（最后 {{ Math.min(diaryCount, 5) }} 条）</h3>
      <div class="space-y-4 max-h-96 overflow-y-auto pr-2">
        <div v-for="d in [...s.diaries].reverse().slice(0, 5)" :key="d.id" class="border-l-2 border-blood pl-4">
          <p class="text-xs opacity-50 mb-1">提示 {{ d.promptNumber }} · 第 {{ d.entryIndex }} 次触达</p>
          <p class="text-sm whitespace-pre-wrap leading-relaxed">{{ d.content }}</p>
        </div>
      </div>
    </div>

    <div class="flex justify-center gap-4 flex-wrap">
      <button class="btn btn-gold" @click="exportMd()">导出日记为 Markdown</button>
      <button class="btn" @click="store.newGame(store.state?.name ?? '无名', store.state?.usesFastMode ?? false)">开始新的千年</button>
    </div>
  </div>
</template>