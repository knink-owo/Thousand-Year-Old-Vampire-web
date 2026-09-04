<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '../stores/game'

const store = useGameStore()
const emit = defineEmits<{ (e: 'navigate', to: 'home' | 'create' | 'review', recordId?: string): void }>()

const records = computed(() => [...store.records].sort((a, b) => b.createdAt - a.createdAt))

function fmtDate(ts: number): string {
  const d = new Date(ts)
  const pad = (x: number) => String(x).padStart(2, '0')
  return `${d.getFullYear()} 年 ${pad(d.getMonth() + 1)} 月 ${pad(d.getDate())} 日`
}

function stage(rec: { finished: boolean; moves: number }): string {
  if (rec.finished) return '已终结'
  if (rec.moves === 0) return '尚未启程'
  return '仍在旅途'
}

function canContinue(id: string): boolean {
  // 只能继续"当前存档"对应的未完结旅程
  return !!store.state && store.state.id === id && !store.state.finished
}

function canReview(id: string): boolean {
  return store.getRecordSnapshot(id) !== null
}
</script>

<template>
  <div class="fade-in max-w-3xl mx-auto">
    <div class="flex items-center justify-between mb-6">
      <h2 class="title-serif text-2xl gold-text m-0">翻阅历史</h2>
      <button class="btn btn-ghost text-sm" @click="emit('navigate', 'home')">← 返回</button>
    </div>

    <!-- 空状态 -->
    <div v-if="records.length === 0" class="card p-10 text-center">
      <p class="text-3xl mb-4 opacity-50">🕯️</p>
      <p class="opacity-80">这里还没有任何往事。</p>
      <p class="text-sm opacity-50 mt-2">当你开始第一段千年，它会被记录于此。</p>
      <button class="btn btn-gold mt-6" @click="emit('navigate', 'create')">开始旅程</button>
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
            {{ fmtDate(r.createdAt) }} 启程 ·
            {{ r.moves === 0 ? '尚未回答任何提示' : `历经 ${r.moves} 次提示` }} ·
            止步于提示 {{ r.currentPrompt }}
          </p>
          <p class="text-xs opacity-40 mt-0.5">
            记忆 {{ r.memoryCount }} · 技能 {{ r.skillCount }} · 资源 {{ r.resourceCount }}
          </p>
        </div>
        <div class="shrink-0 flex flex-wrap gap-2 justify-end">
          <button v-if="canContinue(r.id)" class="btn btn-gold text-sm" @click="emit('navigate', 'create')">继续</button>
          <button
            class="btn text-sm"
            :class="{ 'opacity-40 cursor-not-allowed': !canReview(r.id) }"
            :disabled="!canReview(r.id)"
            :title="canReview(r.id) ? '以只读方式回顾这段旅程的完整内容' : '该段往事的详细记录未留存于本机'"
            @click="emit('navigate', 'review', r.id)"
          >
            回顾
          </button>
          <button class="btn btn-ghost text-sm" @click="store.removeRecord(r.id)">遗忘</button>
        </div>
      </div>

      <div class="flex justify-end">
        <button class="btn btn-ghost text-xs opacity-70" @click="store.clearRecords()">抹去全部历史</button>
      </div>
      <p class="text-xs opacity-40 text-center">每段旅程的完整记录都保存在本机 · 「回顾」以只读方式展开逝去的千年</p>
    </div>
  </div>
</template>