<script setup lang="ts">
import { ref, computed } from 'vue'
import { useGameStore } from '../stores/game'

const store = useGameStore()
const s = computed(() => store.state!)
const tab = ref<'memory' | 'skill' | 'resource' | 'character' | 'mark' | 'diary'>('memory')

// 记忆操作
const newMemoryText = ref('')

function addMemory() {
  const t = newMemoryText.value.trim()
  if (!t) return
  store.addExperience(null, t, s.value.currentPromptNumber, 1)
  newMemoryText.value = ''
}

// 技能操作
const newSkillName = ref('')
function addSkill() {
  const n = newSkillName.value.trim()
  if (!n) return
  store.addSkill(n)
  newSkillName.value = ''
}

// 资源操作
const newResourceName = ref('')
const newResourceFixed = ref(false)
function addResource() {
  const n = newResourceName.value.trim()
  if (!n) return
  store.addResource(n, undefined, newResourceFixed.value)
  newResourceName.value = ''
}

// 角色操作
const newCharName = ref('')
const newCharDesc = ref('')
const newCharImmortal = ref(false)
function addCharacter() {
  const n = newCharName.value.trim()
  if (!n) return
  store.addCharacter(n, newCharDesc.value.trim(), newCharImmortal.value)
  newCharName.value = ''
  newCharDesc.value = ''
}

// 印记操作
const newMarkName = ref('')
function addMark() {
  const n = newMarkName.value.trim()
  if (!n) return
  store.addMark(n)
  newMarkName.value = ''
}

// 时间格式化与截断
function fmtTime(ts: number): string {
  const d = new Date(ts)
  const pad = (x: number) => String(x).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}
function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n) + '…' : s
}

const tabs = [
  { key: 'memory', label: `记忆 (${s.value.memorySlots}槽)` },
  { key: 'skill', label: `技能 (${s.value.skills.length})` },
  { key: 'resource', label: `资源 (${s.value.resources.length})` },
  { key: 'character', label: `角色 (${s.value.characters.length})` },
  { key: 'mark', label: `印记 (${s.value.marks.length})` },
  { key: 'diary', label: `日志 (${s.value.diaries.length})` },
] as const
</script>

<template>
  <div class="card p-5">
    <!-- Tab 栏 -->
    <div class="flex flex-wrap gap-2 mb-5">
      <button
        v-for="t in tabs"
        :key="t.key"
        class="px-3 py-1.5 text-sm rounded-sm border transition-colors"
        :class="tab === t.key ? 'border-blood-bright bg-red-950/50 text-red-200' : 'border-amber-900/40 opacity-70 hover:opacity-100'"
        @click="tab = t.key"
      >
        {{ t.label }}
      </button>
    </div>

    <!-- 记忆 -->
    <div v-if="tab === 'memory'">
      <div class="flex gap-2 mb-4">
        <input v-model="newMemoryText" class="input" placeholder="新增记忆（写入一段经历）" @keyup.enter="addMemory" />
        <button class="btn btn-gold shrink-0" @click="addMemory">写入</button>
      </div>
      <p class="text-xs opacity-50 mb-3">记忆是吸血鬼自我的核心。每段记忆至多容纳三条经历；记忆槽满时必须遗忘旧记忆——“遗忘是游戏的基础部分，所以接受它。”</p>
      <div class="space-y-3 max-h-96 overflow-y-auto pr-1">
        <div
          v-for="m in s.memories"
          :key="m.id"
          class="border border-amber-900/40 rounded p-3"
          :class="{ 'opacity-45': m.forgotten }"
        >
          <div class="flex items-center justify-between gap-2">
            <span class="text-sm title-serif" :class="{ struck: m.forgotten }">
              {{ m.title || '未命名的记忆' }}
              <span v-if="m.inDiary" class="ml-2 text-xs text-cyan-300/80">📖 已入日记</span>
              <span v-if="m.stabilized" class="ml-2 text-xs text-amber-300">★ 恒存</span>
            </span>
            <div class="flex gap-1.5 shrink-0">
              <button v-if="!m.forgotten && !m.inDiary" class="text-xs px-2 py-0.5 rounded border border-cyan-900/60 text-cyan-200/80" @click="store.moveMemoryToDiary(m.id)">入日记</button>
              <button v-if="!m.forgotten" class="text-xs px-2 py-0.5 rounded border border-red-900/60 text-red-300/90" @click="store.forgetMemory(m.id)">遗忘</button>
            </div>
          </div>
          <ul class="mt-2 space-y-1 text-sm opacity-90">
            <li v-for="(ex, i) in m.experiences" :key="ex.id" class="flex gap-2">
              <span class="text-red-400/80 shrink-0">{{ i + 1 }}.</span>
              <span>{{ ex.text }}</span>
            </li>
          </ul>
        </div>
        <p v-if="s.memories.length === 0" class="text-sm opacity-40 italic">尚无记忆。你的故事从第一段经历开始。</p>
      </div>
    </div>

    <!-- 技能 -->
    <div v-else-if="tab === 'skill'">
      <div class="flex gap-2 mb-4">
        <input v-model="newSkillName" class="input" placeholder="新增技能" @keyup.enter="addSkill" />
        <button class="btn btn-gold shrink-0" @click="addSkill">获得</button>
      </div>
      <p class="text-xs opacity-50 mb-3">未勾选的技能是吸血鬼“能够做到的”；勾选则是“他们已经做过的”。每个技能只能勾选一次。</p>
      <div class="space-y-2 max-h-96 overflow-y-auto pr-1">
        <div v-for="sk in s.skills" :key="sk.id" class="flex items-center gap-3 border border-amber-900/40 rounded px-3 py-2" :class="{ 'opacity-40': sk.lost }">
          <span class="text-lg w-6 text-center" :class="sk.checked ? 'text-amber-400' : 'text-amber-900/50'">{{ sk.checked ? '☑' : '☐' }}</span>
          <span class="flex-1 text-sm" :class="{ struck: sk.lost || sk.checked }">{{ sk.name }}</span>
          <div class="flex gap-1.5 shrink-0">
            <button v-if="!sk.checked && !sk.lost" class="text-xs px-2 py-0.5 rounded border border-amber-700/60 text-amber-200/90" @click="store.checkSkill(sk.id)">勾选</button>
            <button v-if="sk.checked && !sk.lost" class="text-xs px-2 py-0.5 rounded border border-amber-700/40 text-amber-200/60" @click="store.uncheckSkill(sk.id)">取消</button>
            <button v-if="!sk.lost" class="text-xs px-2 py-0.5 rounded border border-red-900/60 text-red-300/90" @click="store.loseSkill(sk.id)">失去</button>
          </div>
        </div>
        <p v-if="s.skills.length === 0" class="text-sm opacity-40 italic">尚无技能。</p>
      </div>
    </div>

    <!-- 资源 -->
    <div v-else-if="tab === 'resource'">
      <div class="flex gap-2 mb-4">
        <input v-model="newResourceName" class="input" placeholder="新增资源" @keyup.enter="addResource" />
        <label class="flex items-center gap-1.5 text-xs opacity-70 shrink-0"><input type="checkbox" v-model="newResourceFixed" /> 固定</label>
        <button class="btn btn-gold shrink-0" @click="addResource">获得</button>
      </div>
      <p class="text-xs opacity-50 mb-3">固定资源是你离开该区域时无法随身携带的财产。失去资源时让它变得明显——不要只是失去你的豪宅，而是烧毁它。</p>
      <div class="space-y-2 max-h-96 overflow-y-auto pr-1">
        <div v-for="r in s.resources" :key="r.id" class="flex items-center gap-3 border border-amber-900/40 rounded px-3 py-2" :class="{ 'opacity-40': r.lost }">
          <span class="text-base w-6 text-center">{{ r.isDiary ? '📖' : r.fixed ? '🏰' : '◆' }}</span>
          <span class="flex-1 text-sm" :class="{ struck: r.lost }">
            {{ r.name }}
            <span v-if="r.isDiary" class="text-xs text-cyan-300/80 ml-1">日记（{{ s.memories.filter(m => m.inDiary).length }}/4 记忆）</span>
            <span v-else-if="r.fixed" class="text-xs text-amber-300/70 ml-1">固定</span>
          </span>
          <button v-if="!r.lost" class="text-xs px-2 py-0.5 rounded border border-red-900/60 text-red-300/90 shrink-0" @click="store.loseResource(r.id)">失去</button>
        </div>
        <p v-if="s.resources.length === 0" class="text-sm opacity-40 italic">尚无资源。</p>
      </div>
    </div>

    <!-- 角色 -->
    <div v-else-if="tab === 'character'">
      <div class="grid gap-2 mb-4 sm:grid-cols-[1fr_1fr_auto]">
        <input v-model="newCharName" class="input" placeholder="姓名" @keyup.enter="addCharacter" />
        <input v-model="newCharDesc" class="input" placeholder="一句话描述" />
        <button class="btn btn-gold shrink-0" @click="addCharacter">登场</button>
      </div>
      <label class="flex items-center gap-1.5 text-xs opacity-70 mb-3"><input type="checkbox" v-model="newCharImmortal" /> 不朽者</label>
      <div class="space-y-2 max-h-96 overflow-y-auto pr-1">
        <div v-for="c in s.characters" :key="c.id" class="border border-amber-900/40 rounded px-3 py-2" :class="{ 'opacity-40': c.dead }">
          <div class="flex items-center gap-2">
            <span class="text-sm title-serif" :class="{ struck: c.dead }">{{ c.name }}</span>
            <span class="text-xs px-1.5 py-0.5 rounded" :class="c.immortal ? 'bg-purple-950/70 text-purple-300' : 'bg-amber-950/50 text-amber-200/80'">
              {{ c.immortal ? '不朽者' : '凡人' }}
            </span>
            <span v-if="c.isGhost" class="text-xs text-cyan-300/70">幽灵</span>
            <button v-if="!c.dead" class="ml-auto text-xs px-2 py-0.5 rounded border border-red-900/60 text-red-300/90" @click="store.killCharacter(c.id)">死亡</button>
          </div>
          <p v-if="c.description" class="text-xs opacity-70 mt-1">{{ c.description }}</p>
        </div>
        <p v-if="s.characters.length === 0" class="text-sm opacity-40 italic">尚无角色。他们是吸血鬼世界中的锚。</p>
      </div>
    </div>

    <!-- 日志（日记时间线） -->
    <div v-else-if="tab === 'diary'">
      <p class="text-xs opacity-50 mb-3">你在<strong>日志游戏</strong>中写下的每一个条目，以及旅程中的事件。时间从新到旧。</p>
      <div class="space-y-3 max-h-96 overflow-y-auto pr-1">
        <div v-for="d in [...s.diaries].reverse()" :key="d.id" class="border border-amber-900/40 rounded p-3">
          <p class="text-xs opacity-60 mb-1">提示 {{ d.promptNumber }} · 第 {{ d.entryIndex }} 次触达 · {{ fmtTime(d.createdAt) }}</p>
          <p class="text-xs italic opacity-70 mb-2 border-l-2 border-blood pl-2">“{{ truncate(d.promptText, 60) }}”</p>
          <p class="text-sm leading-relaxed whitespace-pre-wrap">{{ d.content }}</p>
        </div>
        <div v-if="s.diaries.length === 0" class="text-center py-6">
          <p class="text-sm opacity-40 italic">尚无日志条目。</p>
          <p class="text-xs opacity-30 mt-1">在日志游戏模式下，每回合写完日记后这里会沉淀你的千年。</p>
        </div>
      </div>
      <!-- 事件流 -->
      <div class="mt-5 pt-4 border-t border-amber-900/40">
        <p class="text-xs tracking-widest opacity-50 mb-2">▸ 事件流</p>
        <div class="space-y-1.5 max-h-40 overflow-y-auto pr-1">
          <p v-for="e in [...s.log].reverse().slice(0, 30)" :key="e.id" class="text-xs leading-relaxed opacity-75">
            <span class="opacity-40 mr-1">[提示{{ e.atPrompt || '—' }}]</span>{{ e.text }}
          </p>
          <p v-if="s.log.length === 0" class="text-xs opacity-40 italic">旅程尚未留下足迹。</p>
        </div>
      </div>
    </div>

    <!-- 印记 -->
    <div v-else>
      <div class="flex gap-2 mb-4">
        <input v-model="newMarkName" class="input" placeholder="新的印记" @keyup.enter="addMark" />
        <button class="btn btn-gold shrink-0" @click="addMark">显现</button>
      </div>
      <p class="text-xs opacity-50 mb-3">印记是吸血鬼不死状态的可见标志——一道在喉咙上不断流血的伤口、空洞苍白的眼睛、一个跟在身后的幽灵。</p>
      <div class="space-y-2 max-h-96 overflow-y-auto pr-1">
        <div v-for="m in s.marks" :key="m.id" class="flex items-center gap-3 border border-amber-900/40 rounded px-3 py-2" :class="{ 'opacity-40': m.removed }">
          <span class="text-base w-6 text-center">✠</span>
          <span class="flex-1 text-sm" :class="{ struck: m.removed }">{{ m.name }}</span>
          <button v-if="!m.removed" class="text-xs px-2 py-0.5 rounded border border-red-900/60 text-red-300/90 shrink-0" @click="store.removeMark(m.id)">移除</button>
        </div>
        <p v-if="s.marks.length === 0" class="text-sm opacity-40 italic">尚无印记。</p>
      </div>
    </div>
  </div>
</template>