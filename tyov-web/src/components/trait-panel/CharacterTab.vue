<script setup lang="ts">
import { ref } from 'vue'
import { usePanelDialogs } from '../../composables/usePanelDialogs'

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
  confirmAsk.value = { text: `「${c.name}」不可思议地活了过来（提示48第2条目）？`, onOk: () => store.reviveCharacter(c.id) }
}

function ghostChar(c: { id: string; name: string }) {
  confirmAsk.value = { text: `让「${c.name}」以幽灵之身归来（提示41第3条目）？`, onOk: () => store.returnGhost(c.id) }
}

function charToRes(c: { id: string; name: string }) {
  ask.value = {
    title: '角色化为资源',
    text: `将「${c.name}」转化为一件由你供养的不死物件（提示3第3条目）。它作为资源的名称是？`,
    initial: c.name,
    allowEmpty: true,
    okLabel: '化为资源',
    onOk: (v) => store.characterToResource(c.id, v.trim() || undefined),
  }
}

function mortalToImmortal(c: { id: string; name: string }) {
  confirmAsk.value = {
    text: `将凡人「${c.name}」转化为不朽者吗？（提示1第2条目、26第1条目等）`,
    onOk: () => store.mortalToImmortal(c.id),
  }
}
</script>

<template>
  <div>
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
</template>
