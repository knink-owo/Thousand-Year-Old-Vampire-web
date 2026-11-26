<script setup lang="ts">
import { ref } from 'vue'
import { usePanelDialogs } from '../../composables/usePanelDialogs'
import { t } from '../../i18n'

const { store, s, ask, confirmAsk, pendingConfirm } = usePanelDialogs()

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
  confirmAsk.value = { text: t('char.reviveConfirm', { name: c.name }), onOk: () => store.reviveCharacter(c.id) }
}

function ghostChar(c: { id: string; name: string }) {
  confirmAsk.value = { text: t('char.ghostConfirm', { name: c.name }), onOk: () => store.returnGhost(c.id) }
}

function charToRes(c: { id: string; name: string }) {
  ask.value = {
    title: t('char.toResourceTitle'),
    text: t('char.toResourceText', { name: c.name }),
    initial: c.name,
    allowEmpty: true,
    okLabel: t('char.toResourceOk'),
    onOk: (v) => store.characterToResource(c.id, v.trim() || undefined),
  }
}

function mortalToImmortal(c: { id: string; name: string }) {
  confirmAsk.value = {
    text: t('char.toImmortalConfirm', { name: c.name }),
    onOk: () => store.mortalToImmortal(c.id),
  }
}
</script>

<template>
  <div>
    <div class="grid gap-2 mb-4 sm:grid-cols-[1fr_1fr_auto]">
      <input v-model="newCharName" class="input" :placeholder="t('char.namePh')" @keyup.enter="addCharacter" />
      <input v-model="newCharDesc" class="input" :placeholder="t('char.descPh')" />
      <button class="btn btn-gold shrink-0" @click="addCharacter">{{ t('char.add') }}</button>
    </div>
    <label class="flex items-center gap-1.5 text-xs opacity-70 mb-3"><input type="checkbox" v-model="newCharImmortal" /> {{ t('char.immortal') }}</label>
    <div class="space-y-2 max-h-96 overflow-y-auto pr-1">
      <div v-for="c in s.characters" :key="c.id" class="border border-amber-900/40 rounded px-3 py-2" :class="{ 'opacity-40': c.dead }">
        <div class="flex items-center gap-2">
          <span class="text-sm title-serif" :class="{ struck: c.dead }">{{ c.name }}</span>
          <span class="text-xs px-1.5 py-0.5 rounded" :class="c.immortal ? 'bg-purple-950/70 text-purple-300' : 'bg-amber-950/50 text-amber-200/80'">
            {{ c.immortal ? t('char.immortal') : t('char.mortal') }}
          </span>
          <span v-if="c.isGhost" class="text-xs text-cyan-300/70">{{ t('char.ghost') }}</span>
          <div class="ml-auto flex gap-1.5 shrink-0 flex-wrap justify-end">
            <button v-if="c.dead && !c.isGhost" class="text-xs px-2 py-0.5 rounded border border-emerald-900/60 text-emerald-300/80" :title="t('char.reviveTip')" @click="reviveChar(c)">{{ t('char.revive') }}</button>
            <button v-if="c.dead && !c.isGhost" class="text-xs px-2 py-0.5 rounded border border-cyan-900/60 text-cyan-200/80" :title="t('char.ghostTip')" @click="ghostChar(c)">{{ t('char.ghostBack') }}</button>
            <button v-if="!c.dead && !c.immortal" class="text-xs px-2 py-0.5 rounded border border-purple-900/60 text-purple-300/80" :title="t('char.toImmortalTip')" @click="mortalToImmortal(c)">{{ t('char.toImmortal') }}</button>
            <button v-if="!c.dead" class="text-xs px-2 py-0.5 rounded border border-amber-700/40 text-amber-200/70" :title="t('char.toResourceTip')" @click="charToRes(c)">{{ t('char.toResource') }}</button>
            <button v-if="!c.dead" class="text-xs px-2 py-0.5 rounded border border-red-900/60 text-red-300/90" @click="pendingConfirm = { kind: 'kill', id: c.id }">{{ t('char.kill') }}</button>
          </div>
        </div>
        <p v-if="c.description" class="text-xs opacity-70 mt-1">{{ c.description }}</p>
      </div>
      <p v-if="s.characters.length === 0" class="text-sm opacity-40 italic">{{ t('char.empty') }}</p>
    </div>
  </div>
</template>
