<script setup lang="ts">
import { ref } from 'vue'
import { usePanelDialogs } from '../../composables/usePanelDialogs'

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
    text: `印记「${m.name}」变为失能（提示61第3条目）？你必须寻求凡人的帮助。`,
    onOk: () => store.crippleMark(m.id),
  }
}
</script>

<template>
  <div>
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
</template>
