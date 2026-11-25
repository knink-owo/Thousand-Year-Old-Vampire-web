<script setup lang="ts">
import { ref } from 'vue'
import { usePanelDialogs } from '../../composables/usePanelDialogs'

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
  confirmAsk.value = { text: `将「${r.name}」降级为废墟吗？（提示2第3条目）`, onOk: () => store.degradeResource(r.id) }
}

function retrieveRes(r: { id: string; name: string }) {
  confirmAsk.value = { text: `找回「${r.name}」吗？（提示65第2条目等）`, onOk: () => store.retrieveResource(r.id) }
}

function convertRes(r: { id: string; name: string }) {
  ask.value = {
    title: '固定资源转为便携财宝',
    text: `将固定资源「${r.name}」转为便携现金或财宝（提示46第1条目）。给它一个新名字（可留空）？`,
    initial: r.name,
    allowEmpty: true,
    okLabel: '转便携',
    onOk: (v) => store.convertFixedResource(r.id, v.trim() || undefined),
  }
}

function swapRes(r: { id: string; name: string }) {
  ask.value = {
    title: '以旧换新',
    text: `用「${r.name}」换取一项新的资源（提示65第1条目）。新的资源是？`,
    initial: '',
    okLabel: '交换',
    onOk: (v) => {
      if (v.trim()) store.swapResource(r.id, v.trim())
    },
  }
}

function renameDiary(r: { id: string; name: string }) {
  ask.value = {
    title: '为日记改名',
    text: '规则书："请给它一个简短的描述"。',
    initial: r.name,
    okLabel: '改名',
    onOk: (v) => {
      if (v.trim()) store.renameResource(r.id, v.trim())
    },
  }
}
</script>

<template>
  <div>
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
</template>
