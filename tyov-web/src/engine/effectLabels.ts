/**
 * 效果文案：把结构化 Effect 渲染为可读的一行说明。
 * PromptCard（提示卡）与 GameView（效果执行清单）共用。
 */
import type { Effect } from '../types/game'

export const effectLabel: Record<string, string> = {
  gainMemorySlot: '获得一个额外记忆槽',
  loseMemorySlot: '永久失去一个记忆槽',
  loseMemory: '失去一段记忆（选择一段划掉）',
  loseTwoMemories: '失去最早与最新的记忆',
  loseMemoryRandom: '随机失去一段经历',
  memoryToSkill: '将一段记忆转化为技能（划掉该记忆）',
  memoryToDiary: '将一段记忆移入日记',
  stabilizeMemory: '在记忆旁画星号（永不丢失、不再占槽）',
  removeMemorySentence: '删除任意两段记忆的第一句话',
  editMemory: '修改/重塑一段记忆',
  swapProperNouns: '在两个记忆之间交换专有名词',
  restoreMemory: '恢复一段被遗忘的记忆',
  gainSkill: '获得技能',
  checkSkill: '勾选一项技能',
  checkSkill2: '勾选两项技能',
  checkSkill3: '勾选三项技能',
  uncheckSkill: '取消勾选一项技能',
  loseSkill: '失去一项技能',
  loseCheckedSkill: '失去一项已勾选的技能',
  loseUncheckedSkill: '失去一项未勾选的技能',
  changeSkill: '更改一项技能',
  rewriteSkill: '将未勾选技能重写为新技能',
  gainResource: '获得资源',
  gainTwoResources: '获得两项资源',
  gainFixedResource: '创建固定资源',
  loseResource: '失去一项资源',
  loseResource2: '失去两项资源',
  loseResource3: '失去三项资源',
  loseAllFixedResources: '失去所有固定资源',
  loseFixedResource: '失去一项固定资源',
  convertFixedResources: '固定资源转为便携财宝',
  degradeResource: '将一项资源降级为废墟',
  swapResource: '以旧资源换取当代资源',
  destroyResource: '扔掉一件资源',
  retrieveResource: '找回一项失去的资源',
  resourceToMemory: '资源引发一段被遗忘的记忆',
  gainMark: '获得印记',
  loseMark: '移除印记',
  crippleMark: '一项印记变为失能',
  createMortal: '创造凡人角色',
  createImmortal: '创造不朽者角色',
  createImmortalHostile: '创造敌对不朽者',
  createCharacter: '创造角色',
  killCharacter: '杀死一个角色',
  deleteCharacter: '删除一个凡人角色',
  killAllMortals: '划掉所有凡人角色',
  mortalToHostileImmortal: '凡人转化为敌对不朽者',
  mortalToImmortal: '凡人转化为不朽者',
  reviveCharacter: '带回一个已死角色',
  characterToResource: '角色转为资源',
  returnGhost: '亡者以幽灵归来',
  dieByAge: '角色因年老而死',
  changeAllegiance: '敌人变朋友 / 朋友变敌人',
  dreamWorld: '踏入梦境之地（清空特征、返回提示10）',
  gameOver: '游戏结束',
  note: '注意',
}

export function effectText(e: Effect): string {
  if (e.type === 'gainSkill' && e.name) return `获得技能：${e.name}`
  if (e.type === 'gainResource' && e.name) return `获得资源：${e.name}`
  if (e.type === 'note' && 'text' in e && e.text) return e.text
  return effectLabel[e.type] ?? e.type
}