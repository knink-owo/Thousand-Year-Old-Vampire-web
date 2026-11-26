/**
 * 效果文案：把结构化 Effect 渲染为可读的一行说明。
 * PromptCard（提示卡）与 EffectActions（效果执行清单）共用。
 *
 * 文案键集中在 i18n 字典的 fx.* 命名空间；本模块只保留类型到键的映射。
 */
import type { Effect } from '../types/game'
import { t, type MsgKey } from '../i18n'

export const effectLabel: Record<Effect['type'], MsgKey> = {
  gainMemorySlot: 'fx.gainMemorySlot',
  loseMemorySlot: 'fx.loseMemorySlot',
  loseMemory: 'fx.loseMemory',
  loseTwoMemories: 'fx.loseTwoMemories',
  loseMemoryRandom: 'fx.loseMemoryRandom',
  memoryToSkill: 'fx.memoryToSkill',
  memoryToDiary: 'fx.memoryToDiary',
  stabilizeMemory: 'fx.stabilizeMemory',
  removeMemorySentence: 'fx.removeMemorySentence',
  editMemory: 'fx.editMemory',
  swapProperNouns: 'fx.swapProperNouns',
  restoreMemory: 'fx.restoreMemory',
  gainSkill: 'fx.gainSkill',
  checkSkill: 'fx.checkSkill',
  checkSkill2: 'fx.checkSkill2',
  checkSkill3: 'fx.checkSkill3',
  uncheckSkill: 'fx.uncheckSkill',
  loseSkill: 'fx.loseSkill',
  loseCheckedSkill: 'fx.loseCheckedSkill',
  loseUncheckedSkill: 'fx.loseUncheckedSkill',
  changeSkill: 'fx.changeSkill',
  rewriteSkill: 'fx.rewriteSkill',
  gainResource: 'fx.gainResource',
  gainTwoResources: 'fx.gainTwoResources',
  gainFixedResource: 'fx.gainFixedResource',
  loseResource: 'fx.loseResource',
  loseResource2: 'fx.loseResource2',
  loseResource3: 'fx.loseResource3',
  loseAllFixedResources: 'fx.loseAllFixedResources',
  loseFixedResource: 'fx.loseFixedResource',
  convertFixedResources: 'fx.convertFixedResources',
  degradeResource: 'fx.degradeResource',
  swapResource: 'fx.swapResource',
  destroyResource: 'fx.destroyResource',
  retrieveResource: 'fx.retrieveResource',
  resourceToMemory: 'fx.resourceToMemory',
  gainMark: 'fx.gainMark',
  loseMark: 'fx.loseMark',
  crippleMark: 'fx.crippleMark',
  createMortal: 'fx.createMortal',
  createImmortal: 'fx.createImmortal',
  createImmortalHostile: 'fx.createImmortalHostile',
  createCharacter: 'fx.createCharacter',
  killCharacter: 'fx.killCharacter',
  deleteCharacter: 'fx.deleteCharacter',
  killAllMortals: 'fx.killAllMortals',
  mortalToHostileImmortal: 'fx.mortalToHostileImmortal',
  mortalToImmortal: 'fx.mortalToImmortal',
  reviveCharacter: 'fx.reviveCharacter',
  characterToResource: 'fx.characterToResource',
  returnGhost: 'fx.returnGhost',
  dieByAge: 'fx.dieByAge',
  changeAllegiance: 'fx.changeAllegiance',
  dreamWorld: 'fx.dreamWorld',
  gameOver: 'fx.gameOver',
  note: 'fx.note',
}

export function effectText(e: Effect): string {
  if (e.type === 'gainSkill' && e.name) return t('fx.gainSkillNamed', { name: e.name })
  if (e.type === 'gainResource' && e.name) return t('fx.gainResourceNamed', { name: e.name })
  if (e.type === 'note' && 'text' in e && e.text) return e.text
  return t(effectLabel[e.type] ?? 'fx.note')
}
