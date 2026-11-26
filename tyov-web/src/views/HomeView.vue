<script setup lang="ts">
import { computed, ref } from 'vue'
import { useGameStore } from '../stores/game'
import ConfirmDialog, { type ConfirmState } from '../components/ConfirmDialog.vue'
import LangSwitch from '../components/LangSwitch.vue'
import { t } from '../i18n'

const store = useGameStore()

const hasOngoing = computed(() => !!store.state && !store.state.finished)
const totalTales = computed(() => store.records.length)

// ---- P2-2：应用内确认弹层（替代 window.confirm） ----
const confirmAsk = ref<ConfirmState | null>(null)

const emit = defineEmits<{
  (e: 'navigate', to: 'create' | 'tutorial' | 'history'): void
}>()

function continueJourney() {
  emit('navigate', 'create') // 由 App 层检测状态后直接进入 game
}

function abandonJourney() {
  const s = store.state
  if (!s) return
  confirmAsk.value = {
    text: t('home.abandonConfirm', { name: s.name }),
    onOk: () => store.abandonCurrent(),
  }
}
</script>

<template>
  <div class="fade-in max-w-3xl mx-auto">
    <!-- 题铭 -->
    <div class="text-center pt-6 pb-10">
      <h2 class="title-serif text-5xl md:text-6xl gold-text tracking-[0.12em] m-0 leading-tight">
        {{ t('app.brand1') }}<span class="blood-text">{{ t('app.brand2') }}</span>
      </h2>
      <p class="mt-4 text-sm md:text-base opacity-70 leading-relaxed tracking-widest">
        {{ t('home.tagline') }}
      </p>
      <p class="mt-2 text-xs opacity-40 tracking-[0.25em]">
        {{ t('home.sub') }}
      </p>
      <!-- 语言切换：首页直接可见 -->
      <div class="mt-6 flex justify-center">
        <LangSwitch />
      </div>
    </div>

    <!-- 进行中的旅程 -->
    <div v-if="hasOngoing" class="card p-6 mb-8 border-red-900/60">
      <p class="text-xs tracking-[0.3em] opacity-50 mb-2">{{ t('home.ongoing') }}</p>
      <p class="text-lg title-serif text-red-200/90">{{ store.state?.name }}</p>
      <p class="text-sm opacity-60 mt-1">
        {{ t('home.ongoingMeta', { moves: store.state?.moves ?? 0, prompt: store.state?.currentPromptNumber ?? 1 }) }}
      </p>
      <div class="flex gap-3 mt-4">
        <button class="btn flex-1" @click="abandonJourney">{{ t('home.abandon') }}</button>
        <button class="btn btn-gold flex-1" @click="continueJourney">{{ t('home.continue') }}</button>
      </div>
    </div>

    <!-- 主按钮 -->
    <div class="grid gap-4">
      <button class="btn btn-gold text-xl py-5 tracking-widest" @click="emit('navigate', 'create')">
        {{ t('home.start') }}
      </button>
      <button class="btn text-lg py-4" @click="emit('navigate', 'tutorial')">
        {{ t('home.tutorial') }}
      </button>
      <button class="btn btn-ghost text-lg py-4" @click="emit('navigate', 'history')">
        {{ t('home.history') }}
        <span v-if="totalTales" class="ml-2 text-xs opacity-60">{{ t('home.historyCount', { n: totalTales }) }}</span>
      </button>
    </div>

    <!-- P2-2：应用内确认弹层 -->
    <ConfirmDialog
      :state="confirmAsk"
      @ok="() => { confirmAsk?.onOk?.(); confirmAsk = null }"
      @cancel="confirmAsk = null"
    />
  </div>
</template>
