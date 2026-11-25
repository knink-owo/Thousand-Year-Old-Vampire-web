<script setup lang="ts">
/**
 * 五特征面板（壳）：Tab 栏 + 六个子面板 + 应用内弹层宿主。
 *
 * 各 tab 的实现见 ./trait-panel/*.vue；弹层状态由 usePanelDialogs 提供（模块级单例）。
 */
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { usePanelDialogs } from '../composables/usePanelDialogs'
import PromptDialog from './PromptDialog.vue'
import ConfirmDialog from './ConfirmDialog.vue'
import MemoryTab from './trait-panel/MemoryTab.vue'
import SkillTab from './trait-panel/SkillTab.vue'
import ResourceTab from './trait-panel/ResourceTab.vue'
import CharacterTab from './trait-panel/CharacterTab.vue'
import MarkTab from './trait-panel/MarkTab.vue'
import DiaryTab from './trait-panel/DiaryTab.vue'

const props = defineProps<{
  initialTab?: 'memory' | 'skill' | 'resource' | 'character' | 'mark' | 'diary'
  /** P2-1：记忆槽已满（mustResolve）时禁用在面板内直接处置记忆，统一由回答面板引导 */
  lockMemoryOps?: boolean
}>()

const { store, ask, confirmAsk, pendingConfirm, confirmKindLabel, confirmDesc, doConfirm, onKeydown } = usePanelDialogs()

const s = computed(() => store.state!)
const tab = ref<'memory' | 'skill' | 'resource' | 'character' | 'mark' | 'diary'>(props.initialTab ?? 'memory')

const tabs = computed(() => [
  { key: 'memory', label: `记忆 (${s.value.memorySlots}槽)` },
  { key: 'skill', label: `技能 (${s.value.skills.length})` },
  { key: 'resource', label: `资源 (${s.value.resources.length})` },
  { key: 'character', label: `角色 (${s.value.characters.length})` },
  { key: 'mark', label: `印记 (${s.value.marks.length})` },
  { key: 'diary', label: `日志 (${s.value.diaries.length})` },
] as const)

// 供外部（效果执行引导）切换 tab
function setTab(t: string) {
  if (tabs.value.some(x => x.key === t)) tab.value = t as typeof tab.value
}
defineExpose({ setTab })

onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <div class="card p-5">
    <!-- Tab 栏 -->
    <div class="flex flex-wrap gap-2 mb-5">
      <button
        v-for="t in tabs"
        :key="t.key"
        class="px-3 py-1.5 text-sm rounded-sm border transition-colors"
        :class="tab === t.key ? 'border-blood-bright bg-red-950/50 text-red-200' : 'border-amber-900/40 opacity-70 hover:opacity-100'"
        @click="tab = t.key"
      >
        {{ t.label }}
      </button>
    </div>

    <MemoryTab v-if="tab === 'memory'" :lock-memory-ops="lockMemoryOps" />
    <SkillTab v-else-if="tab === 'skill'" />
    <ResourceTab v-else-if="tab === 'resource'" />
    <CharacterTab v-else-if="tab === 'character'" />
    <DiaryTab v-else-if="tab === 'diary'" />
    <MarkTab v-else />

    <!-- 二次确认弹层 -->
    <Teleport to="body">
      <div
        v-if="pendingConfirm"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
        @click.self="pendingConfirm = null"
      >
        <div class="card p-6 w-full max-w-sm border-red-900/60" role="alertdialog" aria-modal="true" aria-label="确认操作">
          <h4 class="title-serif text-xl blood-text mb-3">你确定吗？</h4>
          <p class="text-sm leading-relaxed opacity-85 mb-5">{{ confirmDesc }}</p>
          <div class="flex gap-3 justify-end">
            <button class="btn btn-ghost" @click="pendingConfirm = null">取消</button>
            <button class="btn btn-danger" @click="doConfirm">{{ confirmKindLabel }}</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- P2-2：应用内输入/确认弹层（替代 window.prompt / confirm / alert） -->
    <PromptDialog
      :state="ask"
      @ok="(v: string) => { ask?.onOk(v); ask = null }"
      @cancel="ask = null"
    />
    <ConfirmDialog
      :state="confirmAsk"
      @ok="() => { confirmAsk?.onOk?.(); confirmAsk = null }"
      @cancel="confirmAsk = null"
    />
  </div>
</template>
