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
import { t, type MsgKey } from '../i18n'

export type ConfirmKind = 'forget' | 'loseSkill' | 'loseResource' | 'kill' | 'removeMark'

const pendingConfirm = ref<{ kind: ConfirmKind; id: string } | null>(null)
const ask = ref<PromptState | null>(null)
const confirmAsk = ref<ConfirmState | null>(null)

const confirmActionLabel: Record<ConfirmKind, MsgKey> = {
  forget: 'panel.confirm.forget',
  loseSkill: 'panel.confirm.loseSkill',
  loseResource: 'panel.confirm.loseResource',
  kill: 'panel.confirm.kill',
  removeMark: 'panel.confirm.removeMark',
}

export function usePanelDialogs() {
  const store = useGameStore()
  const s = computed(() => store.state!)

  const confirmKindLabel = computed(() => {
    const p = pendingConfirm.value
    return p ? t(confirmActionLabel[p.kind]) : ''
  })

  const confirmDesc = computed(() => {
    const p = pendingConfirm.value
    if (!p) return ''
    switch (p.kind) {
      case 'forget': {
        const m = s.value.memories.find(x => x.id === p.id)
        return t('panel.confirmDesc.forget', { name: m?.title || t('panel.unnamedMemory') })
      }
      case 'loseSkill': {
        const sk = s.value.skills.find(x => x.id === p.id)
        return t('panel.confirmDesc.loseSkill', { name: sk?.name ?? '' })
      }
      case 'loseResource': {
        const r = s.value.resources.find(x => x.id === p.id)
        const artifact = s.value.resources.find(x => x.artifact && !x.lost)
        let text = t('panel.confirmDesc.loseResource', { name: r?.name ?? '' })
        if (artifact && artifact.id !== p.id) {
          text += t('panel.confirmDesc.artifact', { name: artifact.name })
        }
        return text
      }
      case 'kill': {
        const c = s.value.characters.find(x => x.id === p.id)
        const key: MsgKey = c?.immortal ? 'panel.confirmDesc.killImmortal' : 'panel.confirmDesc.killMortal'
        return t(key, { name: c?.name ?? '' })
      }
      case 'removeMark': {
        const m = s.value.marks.find(x => x.id === p.id)
        return t('panel.confirmDesc.removeMark', { name: m?.name ?? '' })
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
