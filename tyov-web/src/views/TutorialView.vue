<script setup lang="ts">
import { computed, ref } from 'vue'
import { chapters as zhChapters } from '../content/tutorial.zh'
import { chapters as enChapters } from '../content/tutorial.en'
import type { Chapter } from '../content/types'
import { locale, t } from '../i18n'

const emit = defineEmits<{ (e: 'navigate', to: 'home'): void }>()

/** 两种语言的章节结构一一对应，切换语言时保持当前展开项 */
const chapters = computed<Chapter[]>(() => (locale.value === 'zh' ? zhChapters : enChapters))

const open = ref<string | null>('intro')
function toggle(id: string) {
  open.value = open.value === id ? null : id
}
</script>

<template>
  <div class="fade-in max-w-3xl mx-auto">
    <div class="flex items-center justify-between mb-6">
      <h2 class="title-serif text-2xl gold-text m-0">{{ t('tutorial.title') }}</h2>
      <button class="btn btn-ghost text-sm" @click="emit('navigate', 'home')">{{ t('tutorial.back') }}</button>
    </div>

    <div class="space-y-3">
      <div v-for="ch in chapters" :key="ch.id" class="card overflow-hidden">
        <button
          class="w-full flex items-center gap-3 px-5 py-4 text-left"
          :class="open === ch.id ? 'border-b border-amber-900/40' : ''"
          @click="toggle(ch.id)"
        >
          <span class="text-xl">{{ ch.icon }}</span>
          <span class="flex-1 title-serif text-lg text-parchment">{{ ch.title }}</span>
          <span class="text-amber-400/70 text-sm">{{ open === ch.id ? '▾' : '▸' }}</span>
        </button>
        <div v-if="open === ch.id" class="px-5 py-4 fade-in">
          <div v-for="(sec, i) in ch.sections" :key="i" class="mb-4 last:mb-0">
            <p v-if="sec.heading" class="title-serif text-base gold-text mb-2">{{ sec.heading }}</p>
            <div class="space-y-3">
              <p v-for="(para, j) in sec.paras" :key="j" class="text-sm leading-relaxed opacity-90">
                {{ para }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <p class="text-center text-xs opacity-40 mt-8">
      {{ t('tutorial.footer') }}
    </p>
  </div>
</template>
