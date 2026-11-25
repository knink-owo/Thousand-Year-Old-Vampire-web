<script setup lang="ts">
import { ref } from 'vue'
import { usePanelDialogs } from '../../composables/usePanelDialogs'

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
    title: sk.checked ? '更改这项技能' : '重写这项技能',
    text: sk.checked ? '规则书（提示62第1条目）：更改任意技能。' : '规则书（提示11第2条目）：重写未勾选的技能。',
    initial: sk.name,
    okLabel: sk.checked ? '更改' : '重写',
    onOk: (v) => {
      if (v.trim()) store.rewriteSkill(sk.id, v.trim())
    },
  }
}
</script>

<template>
  <div>
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
</template>
