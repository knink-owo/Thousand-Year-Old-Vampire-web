<script setup lang="ts">
/**
 * 应用内输入弹层（替代 window.prompt）：P2-2
 * 用法：父组件维护 `ask: PromptState | null`，@ok 收到确认值后自行执行并置空，@cancel 置空。
 */
import { ref, watch, nextTick } from 'vue'

export interface PromptState {
  title: string
  text?: string
  placeholder?: string
  initial?: string
  okLabel?: string
  /** 留空该字段表示允许空值提交（由调用方决定）；缺省时不执行 onOk */
  allowEmpty?: boolean
  onOk: (value: string) => void
}

const props = defineProps<{ state: PromptState | null }>()
const emit = defineEmits<{ (e: 'ok', value: string): void; (e: 'cancel'): void }>()

const input = ref('')
const inputEl = ref<HTMLInputElement | null>(null)

watch(
  () => props.state,
  (st) => {
    input.value = st?.initial ?? ''
    if (st) void nextTick(() => inputEl.value?.focus())
  },
  { immediate: true },
)

function submit() {
  const st = props.state
  if (!st) return
  const v = input.value
  if (!st.allowEmpty && !v.trim()) return
  emit('ok', v)
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter') submit()
  else if (e.key === 'Escape') emit('cancel')
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="state"
      class="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      @click.self="emit('cancel')"
      @keydown="onKeydown"
    >
      <div class="card p-6 w-full max-w-sm border-amber-900/60" role="dialog" aria-modal="true" aria-label="输入">
        <h4 class="title-serif text-xl gold-text mb-2">{{ state.title }}</h4>
        <p v-if="state.text" class="text-sm leading-relaxed opacity-80 mb-4">{{ state.text }}</p>
        <input
          ref="inputEl"
          v-model="input"
          class="input"
          :placeholder="state.placeholder"
          @keydown.enter.prevent="submit"
        />
        <div class="flex gap-3 justify-end mt-5">
          <button class="btn btn-ghost" @click="emit('cancel')">取消</button>
          <button class="btn btn-gold" :disabled="!state.allowEmpty && !input.trim()" @click="submit">
            {{ state.okLabel || '确定' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>