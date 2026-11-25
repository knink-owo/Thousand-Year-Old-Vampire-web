/**
 * 特征面板共用的应用内弹层状态（输入 / 确认 / 二次确认）。
 *
 * 面板在页面上唯一，因此弹层状态放模块级单例：六个 tab 共用同一套弹层，
 * 由 TraitPanel.vue 壳统一渲染。若未来同页出现多个面板，应改为 provide/inject。
 */
import { computed, ref } from 'vue'
import { useGameStore } from '../stores/game'
import type { PromptState } from '../components/PromptDialog.vue'
import type { ConfirmState } from '../components/ConfirmDialog.vue'

export type ConfirmKind = 'forget' | 'loseSkill' | 'loseResource' | 'kill' | 'removeMark'

const pendingConfirm = ref<{ kind: ConfirmKind; id: string } | null>(null)
const ask = ref<PromptState | null>(null)
const confirmAsk = ref<ConfirmState | null>(null)

const confirmActionLabel: Record<ConfirmKind, string> = {
  forget: '遗忘',
  loseSkill: '失去技能',
  loseResource: '失去资源',
  kill: '死亡',
  removeMark: '移除印记',
}

export function usePanelDialogs() {
  const store = useGameStore()
  const s = computed(() => store.state!)

  const confirmKindLabel = computed(() => {
    const p = pendingConfirm.value
    return p ? confirmActionLabel[p.kind] : ''
  })

  const confirmDesc = computed(() => {
    const p = pendingConfirm.value
    if (!p) return ''
    switch (p.kind) {
      case 'forget': {
        const m = s.value.memories.find(x => x.id === p.id)
        return `确定要忘掉记忆「${m?.title || '未命名的记忆'}」吗？记忆将被划掉，其中的经历不再占用记忆槽。`
      }
      case 'loseSkill': {
        const sk = s.value.skills.find(x => x.id === p.id)
        return `确定要失去技能「${sk?.name ?? ''}」吗？技能将被划掉，无法再使用。`
      }
      case 'loseResource': {
        const r = s.value.resources.find(x => x.id === p.id)
        const artifact = s.value.resources.find(x => x.artifact && !x.lost)
        let text = `确定要失去资源「${r?.name ?? ''}」吗？它将从你的资源中划掉。`
        if (artifact && artifact.id !== p.id) {
          text += `\n\n⚠ 你还持有神器「${artifact.name}」——规则书（提示10）：与不朽者遭遇失去资源时，必须首先失去这件物品。`
        }
        return text
      }
      case 'kill': {
        const c = s.value.characters.find(x => x.id === p.id)
        return `确定要让「${c?.name ?? ''}」死亡吗？这位${c?.immortal ? '不朽者' : '凡人'}将被划掉（除非后续提示将其带回）。`
      }
      case 'removeMark': {
        const m = s.value.marks.find(x => x.id === p.id)
        return `确定要移除印记「${m?.name ?? ''}」吗？印记将从你身上消失。`
      }
    }
    return ''
  })

  function doConfirm() {
    const p = pendingConfirm.value
    if (!p) return
    switch (p.kind) {
      case 'forget': store.forgetMemory(p.id); break
      case 'loseSkill': store.loseSkill(p.id); break
      case 'loseResource': store.loseResource(p.id); break
      case 'kill': store.killCharacter(p.id); break
      case 'removeMark': store.removeMark(p.id); break
    }
    pendingConfirm.value = null
  }

  function onKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') pendingConfirm.value = null
  }

  return { store, s, ask, confirmAsk, pendingConfirm, confirmKindLabel, confirmDesc, doConfirm, onKeydown }
}
