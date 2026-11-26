<script setup lang="ts">
import { ref } from 'vue'
import { usePanelDialogs } from '../../composables/usePanelDialogs'
import { t } from '../../i18n'

const { store, s, ask, confirmAsk, pendingConfirm } = usePanelDialogs()

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
  confirmAsk.value = { text: t('resource.degradeConfirm', { name: r.name }), onOk: () => store.degradeResource(r.id) }
}

function retrieveRes(r: { id: string; name: string }) {
  confirmAsk.value = { text: t('resource.retrieveConfirm', { name: r.name }), onOk: () => store.retrieveResource(r.id) }
}

function convertRes(r: { id: string; name: string }) {
  ask.value = {
    title: t('resource.toPortableTitle'),
    text: t('resource.toPortableText', { name: r.name }),
    initial: r.name,
    allowEmpty: true,
    okLabel: t('resource.toPortableOk'),
    onOk: (v) => store.convertFixedResource(r.id, v.trim() || undefined),
  }
}

function swapRes(r: { id: string; name: string }) {
  ask.value = {
    title: t('resource.swapTitle'),
    text: t('resource.swapText', { name: r.name }),
    initial: '',
    okLabel: t('resource.swapOk'),
    onOk: (v) => {
      if (v.trim()) store.swapResource(r.id, v.trim())
    },
  }
}

function renameDiary(r: { id: string; name: string }) {
  ask.value = {
    title: t('resource.renameTitle'),
    text: t('resource.renameText'),
    initial: r.name,
    okLabel: t('resource.renameOk'),
    onOk: (v) => {
      if (v.trim()) store.renameResource(r.id, v.trim())
    },
  }
}
</script>

<template>
  <div>
    <div class="flex gap-2 mb-4">
      <input v-model="newResourceName" class="input" :placeholder="t('resource.addPh')" @keyup.enter="addResource" />
      <label class="flex items-center gap-1.5 text-xs opacity-70 shrink-0"><input type="checkbox" v-model="newResourceFixed" /> {{ t('resource.fixed') }}</label>
      <button class="btn btn-gold shrink-0" @click="addResource">{{ t('resource.add') }}</button>
    </div>
    <p class="text-xs opacity-50 mb-3">{{ t('resource.intro') }}</p>
    <div class="space-y-2 max-h-96 overflow-y-auto pr-1">
      <div v-for="r in s.resources" :key="r.id" class="flex items-center gap-3 border border-amber-900/40 rounded px-3 py-2" :class="{ 'opacity-40': r.lost }">
        <span class="text-base w-6 text-center">{{ r.isDiary ? '📖' : r.fixed ? '🏰' : '◆' }}</span>
        <span class="flex-1 text-sm" :class="{ struck: r.lost }">
          {{ r.name }}
          <span v-if="r.isDiary" class="text-xs text-cyan-300/80 ml-1">{{ t('resource.diaryBadge', { n: s.memories.filter(m => m.inDiary).length }) }}</span>
          <span v-else-if="r.artifact" class="text-xs text-amber-300/90 ml-1">{{ t('resource.artifactBadge') }}</span>
          <span v-else-if="r.fixed" class="text-xs text-amber-300/70 ml-1">{{ t('resource.fixedBadge') }}</span>
        </span>
        <div class="flex gap-1.5 shrink-0 flex-wrap justify-end">
          <button v-if="!r.lost && !r.isDiary" class="text-xs px-2 py-0.5 rounded border" :class="r.artifact ? 'border-amber-400/70 text-amber-300' : 'border-amber-900/40 text-amber-200/60'" :title="t('resource.artifactTip')" @click="store.toggleArtifact(r.id)">{{ r.artifact ? t('resource.artifactOn') : t('resource.artifactOff') }}</button>
          <button v-if="r.isDiary && !r.lost" class="text-xs px-2 py-0.5 rounded border border-amber-700/40 text-amber-200/70" :title="t('resource.renameTip')" @click="renameDiary(r)">{{ t('resource.rename') }}</button>
          <button v-if="!r.lost && !r.isDiary && r.fixed" class="text-xs px-2 py-0.5 rounded border border-cyan-900/60 text-cyan-200/80" :title="t('resource.toPortableTip')" @click="convertRes(r)">{{ t('resource.toPortable') }}</button>
          <button v-if="!r.lost && !r.isDiary && !r.fixed" class="text-xs px-2 py-0.5 rounded border border-purple-900/60 text-purple-300/80" :title="t('resource.swapTip')" @click="swapRes(r)">{{ t('resource.swap') }}</button>
          <button v-if="!r.lost && !r.isDiary" class="text-xs px-2 py-0.5 rounded border border-amber-700/40 text-amber-200/70" :title="t('resource.degradeTip')" @click="degradeRes(r)">{{ t('resource.degrade') }}</button>
          <button v-if="r.lost && !r.isDiary" class="text-xs px-2 py-0.5 rounded border border-emerald-900/60 text-emerald-300/80" :title="t('resource.retrieveTip')" @click="retrieveRes(r)">{{ t('resource.retrieve') }}</button>
          <button v-if="!r.lost" class="text-xs px-2 py-0.5 rounded border border-red-900/60 text-red-300/90 shrink-0" @click="pendingConfirm = { kind: 'loseResource', id: r.id }">{{ t('resource.lose') }}</button>
        </div>
      </div>
      <p v-if="s.resources.length === 0" class="text-sm opacity-40 italic">{{ t('resource.empty') }}</p>
    </div>
  </div>
</template>
