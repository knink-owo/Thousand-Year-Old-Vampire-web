<script setup lang="ts">
import { ref } from 'vue'
import { usePanelDialogs } from '../../composables/usePanelDialogs'

defineProps<{ lockMemoryOps?: boolean }>()

const { store, s, ask, confirmAsk, pendingConfirm } = usePanelDialogs()

const newMemoryText = ref('')
const editingExp = ref<{ id: string; text: string } | null>(null)
const editingExpText = ref('')

function addMemory() {
  const t = newMemoryText.value.trim()
  if (!t) return
  const res = store.addExperience(null, t, s.value.currentPromptNumber, 1)
  if (res.status === 'mustForget') {
    confirmAsk.value = { okOnly: true, text: '记忆已满：请先遗忘一段记忆或将一段记忆移入日记，再安放新的经历。' }
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
  confirmAsk.value = {
    text: `确定要抹去这段经历吗？\n“${exp.text.slice(0, 40)}${exp.text.length > 40 ? '…' : ''}”`,
    onOk: () => store.removeExperience(exp.id),
  }
}

function randomLoseExp() {
  confirmAsk.value = {
    text: '随机划去一段经历（提示51第1条目：从记忆列表中间的记忆里随机划去一段经历，划线保留可读）？',
    onOk: () => store.randomLoseExperience(),
  }
}

function changeSlot(delta: number) {
  const msg = delta > 0 ? '增加一个记忆槽（提示52第1条目）？' : '永久失去一个记忆槽（提示22/41）？此操作不可撤销。'
  confirmAsk.value = { text: msg, onOk: () => store.changeMemorySlots(delta) }
}

function stabilizeMem(memoryId: string) {
  confirmAsk.value = {
    text: '为这段记忆画上星号（提示33第2条目）？它将永不丢失、不再更改，也不再占用记忆槽。',
    onOk: () => store.stabilizeMemory(memoryId),
  }
}

function nameMemory(m: { id: string; title?: string }) {
  ask.value = {
    title: '为记忆命名',
    text: '规则书："每个记忆应通过一个主题来定义"。留空可移除名字。',
    initial: m.title ?? '',
    allowEmpty: true,
    okLabel: '命名',
    onOk: (v) => store.renameMemory(m.id, v.trim()),
  }
}

const DIARY_EXAMPLES = '一本结实的皮革装订书；一组饰有象形文字图案的罐子；镶嵌金丝边框的可怕仪式面具；一个古老网站上的密码保护论坛'

function moveToDiary(memoryId: string) {
  if (!store.state!.diaryResourceId) {
    ask.value = {
      title: '创建你的日记',
      text: `规则书："请给它一个简短的描述"。例如：${DIARY_EXAMPLES}`,
      initial: '一本结实的皮革装订书',
      allowEmpty: true,
      okLabel: '创建日记',
      onOk: (v) => store.moveMemoryToDiary(memoryId, v.trim() || undefined),
    }
    return
  }
  const inDiaryCount = store.state!.memories.filter(x => x.inDiary).length
  if (inDiaryCount >= 4) {
    confirmAsk.value = {
      okOnly: true,
      text: '日记已经写满 4 段记忆，无法再移入（规则书："一本日记最多可以容纳四段吸血鬼的记忆"）。\n你可以：① 改为遗忘这段记忆；② 到资源页「失去」现有日记（其中包含的记忆将一并划掉），之后再另立一本新日记。',
    }
    return
  }
  store.moveMemoryToDiary(memoryId)
}

function restoreMem(memoryId: string) {
  confirmAsk.value = { text: '恢复这段被遗忘的记忆吗？', onOk: () => store.restoreMemory(memoryId) }
}

function skillFromMemory(mem: { id: string; title?: string; experiences: { text: string }[] }) {
  const hint = mem.title || mem.experiences[0]?.text?.slice(0, 12) || '记忆'
  ask.value = {
    title: '将一段记忆转化为技能',
    text: '提示8第2条目、54第1条目：记忆将被划掉，不再占用记忆槽。',
    initial: hint,
    okLabel: '转为技能',
    onOk: (v) => {
      if (v.trim()) store.memoryToSkill(mem.id, v.trim())
    },
  }
}
</script>

<template>
  <div>
    <div v-if="lockMemoryOps" class="mb-3 p-2.5 rounded border border-red-900/60 bg-red-950/20 text-xs text-red-300 leading-relaxed">
      ⚠ 记忆槽已满——请先在回答面板的「放进哪段记忆」处<b>遗忘</b>或<b>移入日记</b>一段记忆，再来处置其余记忆。
    </div>
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
            <button v-if="!m.forgotten && !m.inDiary && !m.stabilized" class="text-xs px-2 py-0.5 rounded border border-amber-600/60 text-amber-200/90" title="画星号：永不丢失、不再占槽（提示33第2条目）" :disabled="lockMemoryOps" :class="lockMemoryOps ? 'opacity-30 cursor-not-allowed' : ''" @click="stabilizeMem(m.id)">★恒存</button>
            <button v-if="!m.forgotten && !m.inDiary && !m.stabilized" class="text-xs px-2 py-0.5 rounded border border-cyan-900/60 text-cyan-200/80" :disabled="lockMemoryOps" :class="lockMemoryOps ? 'opacity-30 cursor-not-allowed' : ''" :title="lockMemoryOps ? '记忆槽已满：请在回答面板处置' : '移入日记（不再占记忆槽）'" @click="moveToDiary(m.id)">入日记</button>
            <button v-if="!m.forgotten && !m.inDiary && !m.stabilized" class="text-xs px-2 py-0.5 rounded border border-purple-900/60 text-purple-300/80" title="将这段记忆转化为技能（提示8第2条目、54第1条目）" :disabled="lockMemoryOps" :class="lockMemoryOps ? 'opacity-30 cursor-not-allowed' : ''" @click="skillFromMemory(m)">转为技能</button>
            <button v-if="m.forgotten" class="text-xs px-2 py-0.5 rounded border border-emerald-900/60 text-emerald-300/80" title="恢复一段被遗忘的记忆（提示31第3条目等）" @click="restoreMem(m.id)">恢复</button>
            <button v-if="!m.forgotten && !m.inDiary && !m.stabilized" class="text-xs px-2 py-0.5 rounded border border-red-900/60 text-red-300/90" :disabled="lockMemoryOps" :class="lockMemoryOps ? 'opacity-30 cursor-not-allowed' : ''" :title="lockMemoryOps ? '记忆槽已满：请在回答面板处置' : ''" @click="pendingConfirm = { kind: 'forget', id: m.id }">遗忘</button>
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
</template>
