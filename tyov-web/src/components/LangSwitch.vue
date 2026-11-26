<script setup lang="ts">
import { locale, setLocale, t } from '../i18n'

const options = [
  { value: 'zh', label: 'lang.zh' },
  { value: 'en', label: 'lang.en' },
] as const
</script>

<template>
  <div
    class="inline-flex items-stretch rounded-sm border border-red-900/50 overflow-hidden bg-black/20"
    role="group"
    :aria-label="t('lang.label')"
  >
    <button
      v-for="o in options"
      :key="o.value"
      class="px-2.5 py-1 text-xs transition-colors bg-transparent border-none cursor-pointer"
      :class="locale === o.value ? 'text-amber-200 bg-red-950/70' : 'text-stone-400 hover:text-stone-200'"
      :aria-pressed="locale === o.value"
      :title="t('lang.label')"
      @click="setLocale(o.value)"
    >
      {{ t(o.label) }}
    </button>
  </div>
</template>
