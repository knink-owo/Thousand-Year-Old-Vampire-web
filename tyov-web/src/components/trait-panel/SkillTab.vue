<script setup lang="ts">
import { ref } from 'vue'
import { usePanelDialogs } from '../../composables/usePanelDialogs'
import { t } from '../../i18n'

const { store, s, ask, pendingConfirm } = usePanelDialogs()

const newSkillName = ref('')

function addSkill() {
  const n = newSkillName.value.trim()
  if (!n) return
  store.addSkill(n)
  newSkillName.value = ''
}

function renameSkill(sk: { id: string; name: string; checked: boolean }) {
  ask.value = {
    title: sk.checked ? t('skill.editTitleChecked') : t('skill.editTitleUnchecked'),
    text: sk.checked ? t('skill.editTextChecked') : t('skill.editTextUnchecked'),
    initial: sk.name,
    okLabel: sk.checked ? t('skill.edit') : t('skill.rewrite'),
    onOk: (v) => {
      if (v.trim()) store.rewriteSkill(sk.id, v.trim())
    },
  }
}
</script>

<template>
  <div>
    <div class="flex gap-2 mb-4">
      <input v-model="newSkillName" class="input" :placeholder="t('skill.addPh')" @keyup.enter="addSkill" />
      <button class="btn btn-gold shrink-0" @click="addSkill">{{ t('skill.add') }}</button>
    </div>
    <p class="text-xs opacity-50 mb-3">{{ t('skill.intro') }}</p>
    <div class="space-y-2 max-h-96 overflow-y-auto pr-1">
      <div v-for="sk in s.skills" :key="sk.id" class="flex items-center gap-3 border border-amber-900/40 rounded px-3 py-2" :class="{ 'opacity-40': sk.lost }">
        <span class="text-lg w-6 text-center" :class="sk.checked ? 'text-amber-400' : 'text-amber-900/50'">{{ sk.checked ? '☑' : '☐' }}</span>
        <span class="flex-1 text-sm" :class="{ struck: sk.lost || sk.checked }">{{ sk.name }}</span>
        <div class="flex gap-1.5 shrink-0">
          <button v-if="!sk.checked && !sk.lost" class="text-xs px-2 py-0.5 rounded border border-amber-700/60 text-amber-200/90" @click="store.checkSkill(sk.id)">{{ t('skill.check') }}</button>
          <button v-if="sk.checked && !sk.lost" class="text-xs px-2 py-0.5 rounded border border-amber-700/40 text-amber-200/60" @click="store.uncheckSkill(sk.id)">{{ t('skill.uncheck') }}</button>
          <button v-if="!sk.lost" class="text-xs px-2 py-0.5 rounded border border-purple-900/60 text-purple-300/80" :title="sk.checked ? t('skill.tipChecked') : t('skill.tipUnchecked')" @click="renameSkill(sk)">{{ sk.checked ? t('skill.edit') : t('skill.rewrite') }}</button>
          <button v-if="!sk.lost" class="text-xs px-2 py-0.5 rounded border border-red-900/60 text-red-300/90" @click="pendingConfirm = { kind: 'loseSkill', id: sk.id }">{{ t('skill.lose') }}</button>
        </div>
      </div>
      <p v-if="s.skills.length === 0" class="text-sm opacity-40 italic">{{ t('skill.empty') }}</p>
    </div>
  </div>
</template>
