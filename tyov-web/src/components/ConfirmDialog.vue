<script setup lang="ts">
/**
 * 应用内确认/告知弹层（替代 window.confirm / window.alert）：P2-2
 * state.okOnly = true 时仅显示"知道了"（替代 alert）。
 */
import { ref, watch, nextTick } from 'vue'

export interface ConfirmState {
  text: string
  okLabel?: string
  okOnly?: boolean
  onOk?: () => void
}

const props = defineProps<{ state: ConfirmState | null }>()
const emit = defineEmits<{ (e: 'ok'): void; (e: 'cancel'): void }>()
const el = ref<HTMLDivElement | null>(null)

watch(
  () => props.state,
  (st) => {
    if (st) void nextTick(() => el.value?.focus())
  },
)

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && !props.state?.okOnly) emit('cancel')
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="state"
      ref="el"
      tabindex="-1"
      class="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      @click.self="state.okOnly ? emit('ok') : emit('cancel')"
      @keydown="onKeydown"
    >
      <div class="card p-6 w-full max-w-sm border-red-900/60" role="alertdialog" aria-modal="true" aria-label="确认操作">
        <h4 class="title-serif text-xl blood-text mb-3">{{ state.okOnly ? '须知' : '你确定吗？' }}</h4>
        <p class="text-sm leading-relaxed opacity-85 mb-5 whitespace-pre-wrap">{{ state.text }}</p>
        <div class="flex gap-3 justify-end">
          <button v-if="!state.okOnly" class="btn btn-ghost" @click="emit('cancel')">取消</button>
          <button class="btn btn-danger" @click="emit('ok')">{{ state.okLabel || (state.okOnly ? '知道了' : '确认') }}</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>