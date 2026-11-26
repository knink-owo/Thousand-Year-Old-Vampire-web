<script setup lang="ts">
import { ref } from 'vue'
import { usePanelDialogs } from '../../composables/usePanelDialogs'
import { t } from '../../i18n'

const { store, s, confirmAsk, pendingConfirm } = usePanelDialogs()

const newMarkName = ref('')

function addMark() {
  const n = newMarkName.value.trim()
  if (!n) return
  store.addMark(n)
  newMarkName.value = ''
}

function crippleMarkFn(m: { id: string; name: string }) {
  confirmAsk.value = {
    text: t('mark.crippleConfirm', { name: m.name }),
    onOk: () => store.crippleMark(m.id),
  }
}
</script>

<template>
  <div>
    <div class="flex gap-2 mb-4">
      <input v-model="newMarkName" class="input" :placeholder="t('mark.addPh')" @keyup.enter="addMark" />
      <button class="btn btn-gold shrink-0" @click="addMark">{{ t('mark.add') }}</button>
    </div>
    <p class="text-xs opacity-50 mb-3">{{ t('mark.intro') }}</p>
    <div class="space-y-2 max-h-96 overflow-y-auto pr-1">
      <div v-for="m in s.marks" :key="m.id" class="flex items-center gap-3 border border-amber-900/40 rounded px-3 py-2" :class="{ 'opacity-40': m.removed }">
        <span class="text-base w-6 text-center">✠</span>
        <span class="flex-1 text-sm" :class="{ struck: m.removed }">
          {{ m.name }}
          <span v-if="m.crippled" class="ml-1 text-xs text-red-300/80">{{ t('mark.crippled') }}</span>
        </span>
        <div class="flex gap-1.5 shrink-0">
          <button v-if="!m.removed && !m.crippled" class="text-xs px-2 py-0.5 rounded border border-amber-700/40 text-amber-200/70" :title="t('mark.crippleTip')" @click="crippleMarkFn(m)">{{ t('mark.cripple') }}</button>
          <button v-if="!m.removed" class="text-xs px-2 py-0.5 rounded border border-red-900/60 text-red-300/90 shrink-0" @click="pendingConfirm = { kind: 'removeMark', id: m.id }">{{ t('mark.remove') }}</button>
        </div>
      </div>
      <p v-if="s.marks.length === 0" class="text-sm opacity-40 italic">{{ t('mark.empty') }}</p>
    </div>
  </div>
</template>
