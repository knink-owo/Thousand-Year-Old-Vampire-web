<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '../stores/game'
import type { GameState } from '../types/game'

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
  return `${d.getFullYear()} 年 ${pad(d.getMonth() + 1)} 月 ${pad(d.getDate())} 日`
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
  a.download = `${target.name}-的日记.md`
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
        <p class="opacity-80">这段旅程尚未终结。</p>
        <p class="text-sm opacity-50 mt-2">只有摘要被保留了下来——未完结的千年没有完整回顾。</p>
        <p class="text-sm opacity-50 mt-1">让它继续，或是选择在途中终结它。</p>
      </template>
      <template v-else>
        <p class="opacity-80">这段往事的详细记录未能留存。</p>
        <p class="text-sm opacity-50 mt-2">只有摘要被保留了下来——记忆也会随岁月佚失。</p>
      </template>
      <button class="btn mt-6" @click="emit('navigate', 'history')">← 返回历史</button>
    </div>

    <template v-else>
      <!-- 头部 -->
      <div class="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h2 class="title-serif text-2xl gold-text m-0">回顾 · {{ snap.name }}</h2>
        <div class="flex gap-2 flex-wrap">
          <button v-if="snap.diaries.length" class="btn btn-ghost text-sm" @click="exportDiary">导出日记 Markdown</button>
          <button class="btn btn-ghost text-sm" @click="emit('navigate', 'history')">← 返回历史</button>
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
            {{ snap.finished ? '已终结' : snap.moves === 0 ? '尚未启程' : '仍在旅途' }}
          </span>
          <span v-if="snap.usesFastMode" class="text-xs opacity-50">快速游戏</span>
        </div>
        <p class="text-xs opacity-60 mt-2">
          {{ fmtDate(snap.createdAt) }} 启程
          <template v-if="snap.finished"> · {{ fmtDate(snap.finishedAt) }} 终结</template>
          · 历经 {{ snap.moves }} 次提示触达 · 止步于提示 {{ snap.currentPromptNumber }}
        </p>
        <p v-if="snap.finishReason" class="mt-4 text-sm leading-relaxed opacity-85 border-l-2 border-blood pl-3 italic">
          “{{ snap.finishReason }}”
        </p>
      </div>

      <!-- 记忆 -->
      <section v-if="snap.memories.length > 0" class="card p-6 mb-6">
        <h3 class="title-serif text-lg gold-text mb-1">记忆 <span class="text-xs opacity-50">（{{ snap.memorySlots }} 槽）</span></h3>
        <p class="text-xs opacity-50 mb-4">记忆是吸血鬼自我的核心。共 {{ snap.memories.length }} 段，其中 {{ snap.memories.filter(m => m.inDiary).length }} 段已入日记、{{ snap.memories.filter(m => m.forgotten).length }} 段被遗忘。</p>
        <div class="space-y-3">
          <div
            v-for="m in snap.memories"
            :key="m.id"
            class="border border-amber-900/40 rounded p-3"
            :class="{ 'opacity-45': m.forgotten }"
          >
            <div class="flex items-center gap-2 flex-wrap">
              <span class="text-sm title-serif" :class="{ struck: m.forgotten }">{{ m.title || '未命名的记忆' }}</span>
              <span v-if="m.inDiary" class="text-xs text-cyan-300/80">📖 已入日记</span>
              <span v-if="m.stabilized" class="text-xs text-amber-300">★ 恒存</span>
              <span v-if="m.forgotten" class="text-xs text-red-300/70">已遗忘</span>
            </div>
            <ul class="mt-2 space-y-1 text-sm opacity-90">
              <li v-for="(ex, i) in m.experiences" :key="ex.id" class="flex gap-2 items-start" :class="{ 'opacity-55': ex.lost }">
                <span class="text-red-400/80 shrink-0 mt-0.5" :class="{ 'opacity-60': ex.lost }">{{ i + 1 }}.</span>
                <span class="flex-1 whitespace-pre-wrap" :class="{ struck: ex.lost }">{{ ex.text }}</span>
                <span v-if="ex.lost" class="text-xs text-red-300/60 shrink-0">已划去</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      <!-- 技能 -->
      <section v-if="snap.skills.length > 0" class="card p-6 mb-6">
        <h3 class="title-serif text-lg gold-text mb-1">技能</h3>
        <p class="text-xs opacity-50 mb-4">未勾选是“能够做到的”，勾选是“已经做过的”。共 {{ snap.skills.length }} 项，{{ snap.skills.filter(x => x.checked).length }} 项已使用、{{ snap.skills.filter(x => x.lost).length }} 项已失去。</p>
        <div class="space-y-2">
          <div v-for="sk in snap.skills" :key="sk.id" class="flex items-center gap-3 border border-amber-900/40 rounded px-3 py-2" :class="{ 'opacity-40': sk.lost }">
            <span class="text-lg w-6 text-center" :class="sk.checked ? 'text-amber-400' : 'text-amber-900/50'">{{ sk.checked ? '☑' : '☐' }}</span>
            <span class="flex-1 text-sm" :class="{ struck: sk.lost || sk.checked }">{{ sk.name }}</span>
            <span v-if="sk.lost" class="text-xs text-red-300/60 shrink-0">已失去</span>
          </div>
        </div>
      </section>

      <!-- 资源 -->
      <section v-if="snap.resources.length > 0" class="card p-6 mb-6">
        <h3 class="title-serif text-lg gold-text mb-1">资源</h3>
        <p class="text-xs opacity-50 mb-4">固定资源是你离开该区域时无法随身携带的财产。共 {{ snap.resources.length }} 项。</p>
        <div class="space-y-2">
          <div v-for="r in snap.resources" :key="r.id" class="flex items-center gap-3 border border-amber-900/40 rounded px-3 py-2" :class="{ 'opacity-40': r.lost }">
            <span class="text-base w-6 text-center">{{ r.isDiary ? '📖' : r.fixed ? '🏰' : '◆' }}</span>
            <span class="flex-1 text-sm" :class="{ struck: r.lost }">
              {{ r.name }}
              <span v-if="r.isDiary" class="text-xs text-cyan-300/80 ml-1">日记（{{ snap.memories.filter(m => m.inDiary).length }}/4 记忆）</span>
              <span v-else-if="r.fixed" class="text-xs text-amber-300/70 ml-1">固定</span>
            </span>
            <span v-if="r.isDiary && r.lost" class="text-xs text-red-300/60 shrink-0">已毁灭</span>
            <span v-else-if="r.lost" class="text-xs text-red-300/60 shrink-0">已失去</span>
          </div>
        </div>
      </section>

      <!-- 角色 -->
      <section v-if="snap.characters.length > 0" class="card p-6 mb-6">
        <h3 class="title-serif text-lg gold-text mb-1">角色</h3>
        <p class="text-xs opacity-50 mb-4">他们是吸血鬼世界中的锚。共 {{ snap.characters.length }} 位，{{ snap.characters.filter(c => c.dead).length }} 位已死去。</p>
        <div class="space-y-2">
          <div v-for="c in snap.characters" :key="c.id" class="border border-amber-900/40 rounded px-3 py-2" :class="{ 'opacity-40': c.dead }">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="text-sm title-serif" :class="{ struck: c.dead }">{{ c.name }}</span>
              <span class="text-xs px-1.5 py-0.5 rounded" :class="c.immortal ? 'bg-purple-950/70 text-purple-300' : 'bg-amber-950/50 text-amber-200/80'">
                {{ c.immortal ? '不朽者' : '凡人' }}
              </span>
              <span v-if="c.isGhost" class="text-xs text-cyan-300/70">幽灵</span>
              <span v-if="c.dead" class="text-xs text-red-300/60">已死亡</span>
            </div>
            <p v-if="c.description" class="text-xs opacity-70 mt-1">{{ c.description }}</p>
          </div>
        </div>
      </section>

      <!-- 印记 -->
      <section v-if="snap.marks.length > 0" class="card p-6 mb-6">
        <h3 class="title-serif text-lg gold-text mb-1">印记</h3>
        <p class="text-xs opacity-50 mb-4">吸血鬼不死状态的可见标志。共 {{ snap.marks.length }} 道。</p>
        <div class="space-y-2">
          <div v-for="m in snap.marks" :key="m.id" class="flex items-center gap-3 border border-amber-900/40 rounded px-3 py-2" :class="{ 'opacity-40': m.removed }">
            <span class="text-base w-6 text-center">✠</span>
            <span class="flex-1 text-sm" :class="{ struck: m.removed }">{{ m.name }}</span>
            <span v-if="m.crippled" class="text-xs text-red-300/80 shrink-0">已失能</span>
            <span v-if="m.removed" class="text-xs text-red-300/60 shrink-0">已移除</span>
          </div>
        </div>
      </section>

      <!-- 日记与事件流 -->
      <section class="card p-6 mb-6">
        <h3 class="title-serif text-lg gold-text mb-1">日志与事件流</h3>
        <p v-if="snap.usesFastMode" class="text-xs opacity-50 mb-4">快速游戏模式：未书写日志条目，仅记录事件。</p>
        <p v-else class="text-xs opacity-50 mb-4">你在日志游戏中写下的每一个条目。共 {{ snap.diaries.length }} 条，时间从新到旧。</p>

        <div v-if="snap.diaries.length > 0" class="space-y-3 max-h-96 overflow-y-auto pr-2 mb-5">
          <div v-for="d in [...snap.diaries].reverse()" :key="d.id" class="border border-amber-900/40 rounded p-3">
            <p class="text-xs opacity-60 mb-1">提示 {{ d.promptNumber }} · 第 {{ d.entryIndex }} 次触达 · {{ fmtTime(d.createdAt) }}</p>
            <p class="text-xs italic opacity-70 mb-2 border-l-2 border-blood pl-2">“{{ truncate(d.promptText, 60) }}”</p>
            <p class="text-sm leading-relaxed whitespace-pre-wrap">{{ d.content }}</p>
          </div>
        </div>

        <div class="pt-4 border-t border-amber-900/40">
          <p class="text-xs tracking-widest opacity-50 mb-2">▸ 事件流 <span class="opacity-40 normal-case tracking-normal">（共 {{ snap.log.length }} 条，从新到旧）</span></p>
          <div class="space-y-1.5 max-h-64 overflow-y-auto pr-1">
            <p v-for="e in [...snap.log].reverse()" :key="e.id" class="text-xs leading-relaxed opacity-75">
              <span class="opacity-40 mr-1">[提示{{ e.atPrompt || '—' }}]</span>{{ e.text }}
            </p>
            <p v-if="snap.log.length === 0" class="text-xs opacity-40 italic">旅程尚未留下足迹。</p>
          </div>
        </div>
      </section>

      <p class="text-center text-xs opacity-40 mb-4">此为只读回顾 —— 逝去的千年无法更改。</p>
    </template>
  </div>
</template>