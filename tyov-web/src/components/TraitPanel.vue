<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useGameStore } from '../stores/game'

const store = useGameStore()
const s = computed(() => store.state!)
const props = defineProps<{ initialTab?: 'memory' | 'skill' | 'resource' | 'character' | 'mark' | 'diary' }>()
const tab = ref<'memory' | 'skill' | 'resource' | 'character' | 'mark' | 'diary'>(props.initialTab ?? 'memory')

// ---- 二次确认（破坏性操作） ----
type ConfirmKind = 'forget' | 'loseSkill' | 'loseResource' | 'kill' | 'removeMark'

const pendingConfirm = ref<{ kind: ConfirmKind; id: string } | null>(null)
const confirmActionLabel: Record<ConfirmKind, string> = {
  forget: '遗忘',
  loseSkill: '失去技能',
  loseResource: '失去资源',
  kill: '死亡',
  removeMark: '移除印记',
}
const confirmKindLabel = computed(() => {
  const p = pendingConfirm.value
  return p ? confirmActionLabel[p.kind] : ''
})
const confirmDesc = computed(() => {
  const p = pendingConfirm.value
  if (!p) return ''
  switch (p.kind) {
    case 'forget': {
      const m = s.value.memories.find(x => x.id === p.id)
      return `确定要忘掉记忆「${m?.title || '未命名的记忆'}」吗？记忆将被划掉，其中的经历不再占用记忆槽。`
    }
    case 'loseSkill': {
      const sk = s.value.skills.find(x => x.id === p.id)
      return `确定要失去技能「${sk?.name ?? ''}」吗？技能将被划掉，无法再使用。`
    }
    case 'loseResource': {
      const r = s.value.resources.find(x => x.id === p.id)
      const artifact = s.value.resources.find(x => x.artifact && !x.lost)
      let text = `确定要失去资源「${r?.name ?? ''}」吗？它将从你的资源中划掉。`
      if (artifact && artifact.id !== p.id) {
        text += `\n\n⚠ 你还持有神器「${artifact.name}」——规则书（提示10）：与不朽者遭遇失去资源时，必须首先失去这件物品。`
      }
      return text
    }
    case 'kill': {
      const c = s.value.characters.find(x => x.id === p.id)
      return `确定要让「${c?.name ?? ''}」死亡吗？这位${c?.immortal ? '不朽者' : '凡人'}将被划掉（除非后续提示将其带回）。`
    }
    case 'removeMark': {
      const m = s.value.marks.find(x => x.id === p.id)
      return `确定要移除印记「${m?.name ?? ''}」吗？印记将从你身上消失。`
    }
  }
})

function doConfirm() {
  const p = pendingConfirm.value
  if (!p) return
  switch (p.kind) {
    case 'forget': store.forgetMemory(p.id); break
    case 'loseSkill': store.loseSkill(p.id); break
    case 'loseResource': store.loseResource(p.id); break
    case 'kill': store.killCharacter(p.id); break
    case 'removeMark': store.removeMark(p.id); break
  }
  pendingConfirm.value = null
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') pendingConfirm.value = null
}
onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => window.removeEventListener('keydown', onKeydown))

// 记忆操作
const newMemoryText = ref('')
const editingExp = ref<{ id: string; text: string } | null>(null)
const editingExpText = ref('')

function addMemory() {
  const t = newMemoryText.value.trim()
  if (!t) return
  const res = store.addExperience(null, t, s.value.currentPromptNumber, 1)
  if (res.status === 'mustForget') {
    window.alert('记忆已满：请先遗忘一段记忆或将一段记忆移入日记，再安放新的经历。')
    return
  }
  newMemoryText.value = ''
}

function startEditEx(exp: { id: string; text: string }) {
  editingExp.value = { id: exp.id, text: exp.text }
  editingExpText.value = exp.text
}

function saveEditEx() {
  if (!editingExp.value) return
  const t = editingExpText.value.trim()
  if (t) store.editExperience(editingExp.value.id, t)
  editingExp.value = null
}

function removeExp(exp: { id: string; text: string }) {
  if (window.confirm(`确定要抹去这段经历吗？\n“${exp.text.slice(0, 40)}${exp.text.length > 40 ? '…' : ''}”`)) {
    store.removeExperience(exp.id)
  }
}

function randomLoseExp() {
  if (window.confirm('随机划去一段经历（提示51第1条目：从记忆列表中间的记忆里随机划去一段经历，划线保留可读）？')) {
    store.randomLoseExperience()
  }
}

function changeSlot(delta: number) {
  const msg = delta > 0 ? '增加一个记忆槽（提示52第1条目）？' : '永久失去一个记忆槽（提示22/41）？此操作不可撤销。'
  if (window.confirm(msg)) store.changeMemorySlots(delta)
}

function stabilizeMem(memoryId: string) {
  if (window.confirm('为这段记忆画上星号（提示33第2条目）？它将永不丢失、不再更改，也不再占用记忆槽。')) {
    store.stabilizeMemory(memoryId)
  }
}

function nameMemory(m: { id: string; title?: string }) {
  const n = window.prompt('为这段记忆命名（规则书："每个记忆应通过一个主题来定义"）。留空可移除名字：', m.title ?? '')
  if (n !== null) store.renameMemory(m.id, n.trim())
}

const DIARY_EXAMPLES = '一本结实的皮革装订书；一组饰有象形文字图案的罐子；镶嵌金丝边框的可怕仪式面具；一个古老网站上的密码保护论坛'

function moveToDiary(memoryId: string) {
  if (!store.state!.diaryResourceId) {
    const n = window.prompt(`创建你的日记（规则书："请给它一个简短的描述"）。例如：${DIARY_EXAMPLES}`, '一本结实的皮革装订书')
    if (n === null) return
    store.moveMemoryToDiary(memoryId, n.trim() || undefined)
    return
  }
  const inDiaryCount = store.state!.memories.filter(x => x.inDiary).length
  if (inDiaryCount >= 4) {
    window.alert('日记已经写满 4 段记忆，无法再移入（规则书："一本日记最多可以容纳四段吸血鬼的记忆"）。\n你可以：① 改为遗忘这段记忆；② 到资源页「失去」现有日记（其中包含的记忆将一并划掉），之后再另立一本新日记。')
    return
  }
  store.moveMemoryToDiary(memoryId)
}

function restoreMem(memoryId: string) {
  if (window.confirm('恢复这段被遗忘的记忆吗？')) store.restoreMemory(memoryId)
}

// 技能操作
const newSkillName = ref('')
function addSkill() {
  const n = newSkillName.value.trim()
  if (!n) return
  store.addSkill(n)
  newSkillName.value = ''
}
function renameSkill(sk: { id: string; name: string; checked: boolean }) {
  const n = window.prompt(sk.checked ? '更改这项技能（提示62第1条目）' : '重写这项未勾选的技能（提示11第2条目）', sk.name)
  if (n?.trim()) store.rewriteSkill(sk.id, n.trim())
}
function skillFromMemory(mem: { id: string; title?: string; experiences: { text: string }[] }) {
  const hint = mem.title || mem.experiences[0]?.text?.slice(0, 12) || '记忆'
  const n = window.prompt(`将这段记忆转化为技能（提示8第2条目）——记忆将被划掉。给技能命名：`, hint)
  if (n?.trim()) store.memoryToSkill(mem.id, n.trim())
}

// 资源操作
const newResourceName = ref('')
const newResourceFixed = ref(false)
function addResource() {
  const n = newResourceName.value.trim()
  if (!n) return
  store.addResource(n, undefined, newResourceFixed.value)
  newResourceName.value = ''
  newResourceFixed.value = false
}
function degradeRes(r: { id: string; name: string }) {
  if (window.confirm(`将「${r.name}」降级为废墟吗？（提示2第3条目）`)) store.degradeResource(r.id)
}
function retrieveRes(r: { id: string; name: string }) {
  if (window.confirm(`找回「${r.name}」吗？（提示65第2条目等）`)) store.retrieveResource(r.id)
}
function convertRes(r: { id: string; name: string }) {
  const n = window.prompt(`将固定资源「${r.name}」转为便携现金或财宝（提示46第1条目）。给它一个新名字（可留空）：`, r.name)
  if (n !== null) store.convertFixedResource(r.id, n.trim() || undefined)
}
function swapRes(r: { id: string; name: string }) {
  const n = window.prompt(`用「${r.name}」换取一项新的资源（提示65第1条目）。新的资源是：`, '')
  if (n?.trim()) store.swapResource(r.id, n.trim())
}
function renameDiary(r: { id: string; name: string }) {
  const n = window.prompt('为你的日记写一段新的描述（规则书："请给它一个简短的描述"）：', r.name)
  if (n?.trim()) store.renameResource(r.id, n.trim())
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
  newCharImmortal.value = false
}
function reviveChar(c: { id: string; name: string }) {
  if (window.confirm(`「${c.name}」不可思议地活了过来（提示48第2条目）？`)) store.reviveCharacter(c.id)
}
function ghostChar(c: { id: string; name: string }) {
  if (window.confirm(`让「${c.name}」以幽灵之身归来（提示41第3条目）？`)) store.returnGhost(c.id)
}
function charToRes(c: { id: string; name: string }) {
  const n = window.prompt(`将「${c.name}」转化为一件由你供养的不死物件（提示3第3条目）。它作为资源的名称：`, c.name)
  if (n !== null) store.characterToResource(c.id, n.trim() || undefined)
}
function mortalToImmortal(c: { id: string; name: string }) {
  if (window.confirm(`将凡人「${c.name}」转化为不朽者吗？（提示1第2条目、26第1条目等）`)) store.mortalToImmortal(c.id)
}

// 印记操作
const newMarkName = ref('')
function addMark() {
  const n = newMarkName.value.trim()
  if (!n) return
  store.addMark(n)
  newMarkName.value = ''
}
function crippleMarkFn(m: { id: string; name: string }) {
  if (window.confirm(`印记「${m.name}」变为失能（提示61第3条目）？你必须寻求凡人的帮助。`)) store.crippleMark(m.id)
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

const tabs = computed(() => [
  { key: 'memory', label: `记忆 (${s.value.memorySlots}槽)` },
  { key: 'skill', label: `技能 (${s.value.skills.length})` },
  { key: 'resource', label: `资源 (${s.value.resources.length})` },
  { key: 'character', label: `角色 (${s.value.characters.length})` },
  { key: 'mark', label: `印记 (${s.value.marks.length})` },
  { key: 'diary', label: `日志 (${s.value.diaries.length})` },
] as const)

// 供外部（效果执行引导）切换 tab
function setTab(t: string) {
  if (tabs.value.some(x => x.key === t)) tab.value = t as typeof tab.value
}
defineExpose({ setTab })
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
      <div class="flex gap-2 mb-2">
        <input v-model="newMemoryText" class="input" placeholder="新增记忆（写入一段经历）" @keyup.enter="addMemory" />
        <button class="btn btn-gold shrink-0" @click="addMemory">写入</button>
      </div>
      <div class="flex items-center gap-2 mb-3">
        <button class="text-xs px-2 py-0.5 rounded border border-amber-700/40 text-amber-200/70" title="获得一个记忆槽（提示52第1条目）" @click="changeSlot(1)">＋记忆槽</button>
        <button class="text-xs px-2 py-0.5 rounded border border-red-900/60 text-red-300/80" title="永久失去一个记忆槽（提示22第3条目、41第1条目）" @click="changeSlot(-1)">－记忆槽</button>
        <button class="text-xs px-2 py-0.5 rounded border border-amber-700/40 text-amber-200/70" title="提示51第1条目" @click="randomLoseExp">随机失去一段经历</button>
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
            <div class="flex gap-1.5 shrink-0 flex-wrap justify-end">
              <button v-if="!m.stabilized" class="text-xs px-2 py-0.5 rounded border border-amber-700/40 text-amber-200/70" title="为这段记忆命名（规则书：记忆通过主题定义）" @click="nameMemory(m)">命名</button>
              <button v-if="!m.forgotten && !m.inDiary && !m.stabilized" class="text-xs px-2 py-0.5 rounded border border-amber-600/60 text-amber-200/90" title="画星号：永不丢失、不再占槽（提示33第2条目）" @click="stabilizeMem(m.id)">★恒存</button>
              <button v-if="!m.forgotten && !m.inDiary && !m.stabilized" class="text-xs px-2 py-0.5 rounded border border-cyan-900/60 text-cyan-200/80" @click="moveToDiary(m.id)">入日记</button>
              <button v-if="!m.forgotten && !m.inDiary && !m.stabilized" class="text-xs px-2 py-0.5 rounded border border-purple-900/60 text-purple-300/80" title="将这段记忆转化为技能（提示8第2条目、54第1条目）" @click="skillFromMemory(m)">转为技能</button>
              <button v-if="m.forgotten" class="text-xs px-2 py-0.5 rounded border border-emerald-900/60 text-emerald-300/80" title="恢复一段被遗忘的记忆（提示31第3条目等）" @click="restoreMem(m.id)">恢复</button>
              <button v-if="!m.forgotten && !m.inDiary && !m.stabilized" class="text-xs px-2 py-0.5 rounded border border-red-900/60 text-red-300/90" @click="pendingConfirm = { kind: 'forget', id: m.id }">遗忘</button>
            </div>
          </div>
          <ul class="mt-2 space-y-1 text-sm opacity-90">
            <li v-for="(ex, i) in m.experiences" :key="ex.id" class="flex gap-2 items-start" :class="{ 'opacity-55': ex.lost }">
              <span class="text-red-400/80 shrink-0 mt-0.5" :class="{ 'opacity-60': ex.lost }">{{ i + 1 }}.</span>
              <template v-if="editingExp?.id === ex.id">
                <textarea v-model="editingExpText" class="input text-sm flex-1" rows="2"></textarea>
                <button class="text-xs px-2 py-0.5 rounded border border-emerald-900/60 text-emerald-300/90 shrink-0" @click="saveEditEx">保存</button>
                <button class="text-xs px-2 py-0.5 rounded border border-amber-900/60 text-amber-200/80 shrink-0" @click="editingExp = null">取消</button>
              </template>
              <template v-else>
                <span class="flex-1 whitespace-pre-wrap" :class="{ struck: ex.lost }">{{ ex.text }}</span>
                <span v-if="!m.forgotten && !m.stabilized" class="flex gap-1 shrink-0">
                  <button v-if="ex.lost" class="text-xs px-1.5 py-0.5 rounded border border-emerald-900/60 text-emerald-300/80" title="恢复这段被划去的经历" @click="store.restoreExperience(ex.id)">恢复</button>
                  <template v-else>
                    <button class="text-xs px-1.5 py-0.5 rounded border border-amber-900/60 text-amber-200/70" title="编辑这段经历（如删去第一句话、修改文本）" @click="startEditEx(ex)">✎</button>
                    <button class="text-xs px-1.5 py-0.5 rounded border border-red-900/60 text-red-300/80" @click="removeExp(ex)">✕</button>
                  </template>
                </span>
              </template>
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
            <button v-if="!sk.lost" class="text-xs px-2 py-0.5 rounded border border-purple-900/60 text-purple-300/80" :title="sk.checked ? '更改技能（提示62第1条目）' : '重写技能（提示11第2条目）'" @click="renameSkill(sk)">{{ sk.checked ? '更改' : '重写' }}</button>
            <button v-if="!sk.lost" class="text-xs px-2 py-0.5 rounded border border-red-900/60 text-red-300/90" @click="pendingConfirm = { kind: 'loseSkill', id: sk.id }">失去</button>
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
            <span v-else-if="r.artifact" class="text-xs text-amber-300/90 ml-1">◈ 神器</span>
            <span v-else-if="r.fixed" class="text-xs text-amber-300/70 ml-1">固定</span>
          </span>
          <div class="flex gap-1.5 shrink-0 flex-wrap justify-end">
            <button v-if="!r.lost && !r.isDiary" class="text-xs px-2 py-0.5 rounded border" :class="r.artifact ? 'border-amber-400/70 text-amber-300' : 'border-amber-900/40 text-amber-200/60'" title="神器（提示10第2条目）：失去资源时必须首先失去它；达成结局仍持有时可改写结局" @click="store.toggleArtifact(r.id)">{{ r.artifact ? '◈ 神器' : '标记神器' }}</button>
            <button v-if="r.isDiary && !r.lost" class="text-xs px-2 py-0.5 rounded border border-amber-700/40 text-amber-200/70" title="规则书：请给日记一个简短的描述" @click="renameDiary(r)">改名</button>
            <button v-if="!r.lost && !r.isDiary && r.fixed" class="text-xs px-2 py-0.5 rounded border border-cyan-900/60 text-cyan-200/80" title="固定资源转为便携现金/财宝（提示46第1条目）" @click="convertRes(r)">转便携</button>
            <button v-if="!r.lost && !r.isDiary && !r.fixed" class="text-xs px-2 py-0.5 rounded border border-purple-900/60 text-purple-300/80" title="用这件资源换取一项新资源（提示65第1条目）" @click="swapRes(r)">交换</button>
            <button v-if="!r.lost && !r.isDiary" class="text-xs px-2 py-0.5 rounded border border-amber-700/40 text-amber-200/70" title="降级为废墟（提示2第3条目）" @click="degradeRes(r)">降级废墟</button>
            <button v-if="r.lost && !r.isDiary" class="text-xs px-2 py-0.5 rounded border border-emerald-900/60 text-emerald-300/80" title="找回一项失去的资源（提示65第2条目等）" @click="retrieveRes(r)">找回</button>
            <button v-if="!r.lost" class="text-xs px-2 py-0.5 rounded border border-red-900/60 text-red-300/90 shrink-0" @click="pendingConfirm = { kind: 'loseResource', id: r.id }">失去</button>
          </div>
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
            <div class="ml-auto flex gap-1.5 shrink-0 flex-wrap justify-end">
              <button v-if="c.dead && !c.isGhost" class="text-xs px-2 py-0.5 rounded border border-emerald-900/60 text-emerald-300/80" title="带回一个最近被划掉的凡人角色（提示48第2条目）" @click="reviveChar(c)">复活</button>
              <button v-if="c.dead && !c.isGhost" class="text-xs px-2 py-0.5 rounded border border-cyan-900/60 text-cyan-200/80" title="亡者以幽灵归来（提示41第3条目）" @click="ghostChar(c)">幽灵归来</button>
              <button v-if="!c.dead && !c.immortal" class="text-xs px-2 py-0.5 rounded border border-purple-900/60 text-purple-300/80" title="凡人转化为不朽者（提示1第2条目、26第1条目等）" @click="mortalToImmortal(c)">转不朽者</button>
              <button v-if="!c.dead" class="text-xs px-2 py-0.5 rounded border border-amber-700/40 text-amber-200/70" title="角色转化为资源（提示3第3条目）" @click="charToRes(c)">化为资源</button>
              <button v-if="!c.dead" class="text-xs px-2 py-0.5 rounded border border-red-900/60 text-red-300/90" @click="pendingConfirm = { kind: 'kill', id: c.id }">死亡</button>
            </div>
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
          <span class="flex-1 text-sm" :class="{ struck: m.removed }">
            {{ m.name }}
            <span v-if="m.crippled" class="ml-1 text-xs text-red-300/80">已失能</span>
          </span>
          <div class="flex gap-1.5 shrink-0">
            <button v-if="!m.removed && !m.crippled" class="text-xs px-2 py-0.5 rounded border border-amber-700/40 text-amber-200/70" title="印记变为失能（提示61第3条目）" @click="crippleMarkFn(m)">失能</button>
            <button v-if="!m.removed" class="text-xs px-2 py-0.5 rounded border border-red-900/60 text-red-300/90 shrink-0" @click="pendingConfirm = { kind: 'removeMark', id: m.id }">移除</button>
          </div>
        </div>
        <p v-if="s.marks.length === 0" class="text-sm opacity-40 italic">尚无印记。</p>
      </div>
    </div>

    <!-- 二次确认弹层 -->
    <Teleport to="body">
      <div
        v-if="pendingConfirm"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
        @click.self="pendingConfirm = null"
      >
        <div class="card p-6 w-full max-w-sm border-red-900/60" role="alertdialog" aria-modal="true" aria-label="确认操作">
          <h4 class="title-serif text-xl blood-text mb-3">你确定吗？</h4>
          <p class="text-sm leading-relaxed opacity-85 mb-5">{{ confirmDesc }}</p>
          <div class="flex gap-3 justify-end">
            <button class="btn btn-ghost" @click="pendingConfirm = null">取消</button>
            <button class="btn btn-danger" @click="doConfirm">{{ confirmKindLabel }}</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>