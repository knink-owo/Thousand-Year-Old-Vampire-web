<script setup lang="ts">
import { ref } from 'vue'
import { usePanelDialogs } from '../../composables/usePanelDialogs'
import { t } from '../../i18n'

defineProps<{ lockMemoryOps?: boolean }>()

const { store, s, ask, confirmAsk, pendingConfirm } = usePanelDialogs()

const newMemoryText = ref('')
const editingExp = ref<{ id: string; text: string } | null>(null)
const editingExpText = ref('')

function addMemory() {
  const text = newMemoryText.value.trim()
  if (!text) return
  const res = store.addExperience(null, text, s.value.currentPromptNumber, 1)
  if (res.status === 'mustForget') {
    confirmAsk.value = { okOnly: true, text: t('memory.full') }
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
  const text = editingExpText.value.trim()
  if (text) store.editExperience(editingExp.value.id, text)
  editingExp.value = null
}

function removeExp(exp: { id: string; text: string }) {
  confirmAsk.value = {
    text: t('memory.removeConfirm', {
      text: exp.text.slice(0, 40) + (exp.text.length > 40 ? '…' : ''),
    }),
    onOk: () => store.removeExperience(exp.id),
  }
}

function randomLoseExp() {
  confirmAsk.value = {
    text: t('memory.randomLose'),
    onOk: () => store.randomLoseExperience(),
  }
}

function changeSlot(delta: number) {
  confirmAsk.value = {
    text: delta > 0 ? t('memory.addSlot') : t('memory.removeSlot'),
    onOk: () => store.changeMemorySlots(delta),
  }
}

function stabilizeMem(memoryId: string) {
  confirmAsk.value = {
    text: t('memory.stabilize'),
    onOk: () => store.stabilizeMemory(memoryId),
  }
}

function nameMemory(m: { id: string; title?: string }) {
  ask.value = {
    title: t('memory.nameTitle'),
    text: t('memory.nameText'),
    initial: m.title ?? '',
    allowEmpty: true,
    okLabel: t('memory.nameOk'),
    onOk: (v) => store.renameMemory(m.id, v.trim()),
  }
}

function moveToDiary(memoryId: string) {
  if (!store.state!.diaryResourceId) {
    ask.value = {
      title: t('memory.diaryCreateTitle'),
      text: t('memory.diaryCreateText', { examples: t('memory.diaryExamples') }),
      initial: t('memory.diaryDefaultName'),
      allowEmpty: true,
      okLabel: t('memory.diaryCreateOk'),
      onOk: (v) => store.moveMemoryToDiary(memoryId, v.trim() || undefined),
    }
    return
  }
  const inDiaryCount = store.state!.memories.filter(x => x.inDiary).length
  if (inDiaryCount >= 4) {
    confirmAsk.value = { okOnly: true, text: t('memory.diaryFull') }
    return
  }
  store.moveMemoryToDiary(memoryId)
}

function restoreMem(memoryId: string) {
  confirmAsk.value = { text: t('memory.restoreConfirm'), onOk: () => store.restoreMemory(memoryId) }
}

function skillFromMemory(mem: { id: string; title?: string; experiences: { text: string }[] }) {
  const hint = mem.title || mem.experiences[0]?.text?.slice(0, 12) || t('memory.toSkillDefault')
  ask.value = {
    title: t('memory.toSkillTitle'),
    text: t('memory.toSkillText'),
    initial: hint,
    okLabel: t('memory.toSkillOk'),
    onOk: (v) => {
      if (v.trim()) store.memoryToSkill(mem.id, v.trim())
    },
  }
}
</script>

<template>
  <div>
    <div v-if="lockMemoryOps" class="mb-3 p-2.5 rounded border border-red-900/60 bg-red-950/20 text-xs text-red-300 leading-relaxed">
      {{ t('memory.lockBefore') }}<b>{{ t('memory.lockForget') }}</b>{{ t('memory.lockMid') }}<b>{{ t('memory.lockDiary') }}</b>{{ t('memory.lockAfter') }}
    </div>
    <div class="flex gap-2 mb-2">
      <input v-model="newMemoryText" class="input" :placeholder="t('memory.newPh')" @keyup.enter="addMemory" />
      <button class="btn btn-gold shrink-0" @click="addMemory">{{ t('memory.write') }}</button>
    </div>
    <div class="flex items-center gap-2 mb-3 flex-wrap">
      <button class="text-xs px-2 py-0.5 rounded border border-amber-700/40 text-amber-200/70" :title="t('memory.addSlot')" @click="changeSlot(1)">{{ t('memory.addSlotBtn') }}</button>
      <button class="text-xs px-2 py-0.5 rounded border border-red-900/60 text-red-300/80" :title="t('memory.removeSlot')" @click="changeSlot(-1)">{{ t('memory.removeSlotBtn') }}</button>
      <button class="text-xs px-2 py-0.5 rounded border border-amber-700/40 text-amber-200/70" @click="randomLoseExp">{{ t('memory.randomBtn') }}</button>
    </div>
    <p class="text-xs opacity-50 mb-3">{{ t('memory.intro') }}</p>
    <div class="space-y-3 max-h-96 overflow-y-auto pr-1">
      <div
        v-for="m in s.memories"
        :key="m.id"
        class="border border-amber-900/40 rounded p-3"
        :class="{ 'opacity-45': m.forgotten }"
      >
        <div class="flex items-center justify-between gap-2">
          <span class="text-sm title-serif" :class="{ struck: m.forgotten }">
            {{ m.title || t('panel.unnamedMemory') }}
            <span v-if="m.inDiary" class="ml-2 text-xs text-cyan-300/80">{{ t('memory.inDiary') }}</span>
            <span v-if="m.stabilized" class="ml-2 text-xs text-amber-300">{{ t('memory.stabilizedBadge') }}</span>
          </span>
          <div class="flex gap-1.5 shrink-0 flex-wrap justify-end">
            <button v-if="!m.stabilized" class="text-xs px-2 py-0.5 rounded border border-amber-700/40 text-amber-200/70" :title="t('memory.btnNameTip')" @click="nameMemory(m)">{{ t('memory.btnName') }}</button>
            <button v-if="!m.forgotten && !m.inDiary && !m.stabilized" class="text-xs px-2 py-0.5 rounded border border-amber-600/60 text-amber-200/90" :title="t('memory.btnStabilizeTip')" :disabled="lockMemoryOps" :class="lockMemoryOps ? 'opacity-30 cursor-not-allowed' : ''" @click="stabilizeMem(m.id)">{{ t('memory.btnStabilize') }}</button>
            <button v-if="!m.forgotten && !m.inDiary && !m.stabilized" class="text-xs px-2 py-0.5 rounded border border-cyan-900/60 text-cyan-200/80" :disabled="lockMemoryOps" :class="lockMemoryOps ? 'opacity-30 cursor-not-allowed' : ''" :title="lockMemoryOps ? t('memory.btnDiaryLocked') : t('memory.btnDiaryTip')" @click="moveToDiary(m.id)">{{ t('memory.btnDiary') }}</button>
            <button v-if="!m.forgotten && !m.inDiary && !m.stabilized" class="text-xs px-2 py-0.5 rounded border border-purple-900/60 text-purple-300/80" :title="t('memory.btnToSkillTip')" :disabled="lockMemoryOps" :class="lockMemoryOps ? 'opacity-30 cursor-not-allowed' : ''" @click="skillFromMemory(m)">{{ t('memory.btnToSkill') }}</button>
            <button v-if="m.forgotten" class="text-xs px-2 py-0.5 rounded border border-emerald-900/60 text-emerald-300/80" :title="t('memory.btnRestoreTip')" @click="restoreMem(m.id)">{{ t('memory.btnRestore') }}</button>
            <button v-if="!m.forgotten && !m.inDiary && !m.stabilized" class="text-xs px-2 py-0.5 rounded border border-red-900/60 text-red-300/90" :disabled="lockMemoryOps" :class="lockMemoryOps ? 'opacity-30 cursor-not-allowed' : ''" :title="lockMemoryOps ? t('memory.btnDiaryLocked') : ''" @click="pendingConfirm = { kind: 'forget', id: m.id }">{{ t('memory.btnForget') }}</button>
          </div>
        </div>
        <ul class="mt-2 space-y-1 text-sm opacity-90">
          <li v-for="(ex, i) in m.experiences" :key="ex.id" class="flex gap-2 items-start" :class="{ 'opacity-55': ex.lost }">
            <span class="text-red-400/80 shrink-0 mt-0.5" :class="{ 'opacity-60': ex.lost }">{{ i + 1 }}.</span>
            <template v-if="editingExp?.id === ex.id">
              <textarea v-model="editingExpText" class="input text-sm flex-1" rows="2"></textarea>
              <button class="text-xs px-2 py-0.5 rounded border border-emerald-900/60 text-emerald-300/90 shrink-0" @click="saveEditEx">{{ t('memory.save') }}</button>
              <button class="text-xs px-2 py-0.5 rounded border border-amber-900/60 text-amber-200/80 shrink-0" @click="editingExp = null">{{ t('memory.cancel') }}</button>
            </template>
            <template v-else>
              <span class="flex-1 whitespace-pre-wrap" :class="{ struck: ex.lost }">{{ ex.text }}</span>
              <span v-if="!m.forgotten && !m.stabilized" class="flex gap-1 shrink-0">
                <button v-if="ex.lost" class="text-xs px-1.5 py-0.5 rounded border border-emerald-900/60 text-emerald-300/80" :title="t('memory.restoreExpTip')" @click="store.restoreExperience(ex.id)">{{ t('memory.btnRestore') }}</button>
                <template v-else>
                  <button class="text-xs px-1.5 py-0.5 rounded border border-amber-900/60 text-amber-200/70" :title="t('memory.editExpTip')" @click="startEditEx(ex)">✎</button>
                  <button class="text-xs px-1.5 py-0.5 rounded border border-red-900/60 text-red-300/80" @click="removeExp(ex)">✕</button>
                </template>
              </span>
            </template>
          </li>
        </ul>
      </div>
      <p v-if="s.memories.length === 0" class="text-sm opacity-40 italic">{{ t('memory.empty') }}</p>
    </div>
  </div>
</template>
