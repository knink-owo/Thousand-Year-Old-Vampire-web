/**
 * 效果执行引导：把结构化 Effect 归类为五种可交互的处理模式。
 * 纯逻辑层（无 Vue/store 依赖），供 EffectActions.vue 渲染交互、单测验证。
 *
 * 定位：引导而非强制——游戏保留玩家的自由裁量权，
 * 因此"模式"只决定 UI 提供什么快捷入口，不自动越权执行。
 * 文案以 MsgKey 形式给出（fxh.* / fxp.* / fxc.*），由组件用 t() 解析。
 */
import type { Effect } from '../types/game'
import type { MsgKey } from '../i18n'

export type EffectActionMode =
  | 'auto'    // 点击直接执行（可带 confirm）
  | 'select'  // 打开候选浮层选择目标后执行
  | 'input'   // 弹出输入表单后执行
  | 'manual'  // 本质是面板手工操作：只引导去对应 tab，标记"已了解"
  | 'read'    // 纯告知（note/gameOver 等）：一键"已知晓"

/** 选择目标的实体类别（决定候选列表来源） */
export type TargetKind = 'memory' | 'skill' | 'resource' | 'character' | 'mark'

export interface EffectActionSpec {
  mode: EffectActionMode
  /** 操作提示（附加在效果文案后的小字） */
  hintKey?: MsgKey
  /** 需要选择的目标类别 */
  target?: TargetKind
  /** 目标子集过滤：如仅未勾选技能/仅固定资源/仅已死角色 */
  filter?: string
  /** 需要输入的占位提示 */
  placeholderKey?: MsgKey
  /** 执行前需要 confirm（破坏性操作） */
  confirmKey?: MsgKey
  /** 需要执行的次数（如勾选两项技能 → 2），完成计数后才算已处理 */
  repeat?: number
  /** 手动模式的指引目标 tab（TraitPanel 的 tab 名） */
  manualTab?: 'memory' | 'skill' | 'resource' | 'character' | 'mark'
  /**
   * 互斥条件：本效果无可选目标时，规则书指示"改而执行替代效果"
   * （如提示1"杀死一个凡人角色，如果没有可用的角色，请创造一个"）。
   * 值为替代效果的 type 数组；组件在候选为空时据此提供替代建议。
   */
  fallback?: string[]
}

const spec: Record<string, EffectActionSpec> = {
  // ---------- 记忆 ----------
  gainMemorySlot: { mode: 'auto', hintKey: 'fxh.gainMemorySlot' },
  loseMemorySlot: { mode: 'auto', confirmKey: 'fxc.loseMemorySlot', hintKey: 'fxh.loseMemorySlot' },
  loseMemory: { mode: 'select', target: 'memory', filter: 'forgettable', hintKey: 'fxh.loseMemory' },
  loseTwoMemories: { mode: 'manual', manualTab: 'memory', hintKey: 'fxh.loseTwoMemories' },
  loseMemoryRandom: { mode: 'auto', hintKey: 'fxh.loseMemoryRandom' },
  memoryToSkill: { mode: 'select', target: 'memory', filter: 'convertible', hintKey: 'fxh.memoryToSkill', manualTab: 'memory' },
  memoryToDiary: { mode: 'select', target: 'memory', filter: 'diaryable', hintKey: 'fxh.memoryToDiary', manualTab: 'memory' },
  stabilizeMemory: { mode: 'select', target: 'memory', filter: 'stabilizable', hintKey: 'fxh.stabilizeMemory', manualTab: 'memory' },
  removeMemorySentence: { mode: 'manual', manualTab: 'memory', hintKey: 'fxh.removeMemorySentence' },
  editMemory: { mode: 'manual', manualTab: 'memory', hintKey: 'fxh.editMemory' },
  swapProperNouns: { mode: 'manual', manualTab: 'memory', hintKey: 'fxh.swapProperNouns' },
  restoreMemory: { mode: 'select', target: 'memory', filter: 'forgotten', hintKey: 'fxh.restoreMemory', manualTab: 'memory' },

  // ---------- 技能 ----------
  gainSkill: { mode: 'input', placeholderKey: 'fxp.gainSkill', hintKey: 'fxh.gainSkill' },
  checkSkill: { mode: 'select', target: 'skill', filter: 'unchecked', hintKey: 'fxh.checkSkill' },
  checkSkill2: { mode: 'select', target: 'skill', filter: 'unchecked', repeat: 2, hintKey: 'fxh.checkSkill2' },
  checkSkill3: { mode: 'select', target: 'skill', filter: 'unchecked', repeat: 3, hintKey: 'fxh.checkSkill3' },
  uncheckSkill: { mode: 'select', target: 'skill', filter: 'checked', hintKey: 'fxh.uncheckSkill' },
  loseSkill: { mode: 'select', target: 'skill', filter: 'kept', hintKey: 'fxh.loseSkill' },
  loseCheckedSkill: { mode: 'select', target: 'skill', filter: 'checked', hintKey: 'fxh.loseCheckedSkill' },
  loseUncheckedSkill: { mode: 'select', target: 'skill', filter: 'unchecked', hintKey: 'fxh.loseUncheckedSkill' },
  changeSkill: { mode: 'manual', manualTab: 'skill', hintKey: 'fxh.changeSkill' },
  rewriteSkill: { mode: 'select', target: 'skill', filter: 'kept', hintKey: 'fxh.rewriteSkill', manualTab: 'skill' },

  // ---------- 资源 ----------
  gainResource: { mode: 'input', placeholderKey: 'fxp.gainResource', hintKey: 'fxh.gainResource' },
  gainTwoResources: { mode: 'input', placeholderKey: 'fxp.gainTwoResources', repeat: 2, hintKey: 'fxh.gainTwoResources' },
  gainFixedResource: { mode: 'input', placeholderKey: 'fxp.gainFixedResource', hintKey: 'fxh.gainFixedResource' },
  loseResource: { mode: 'select', target: 'resource', filter: 'kept', hintKey: 'fxh.loseResource' },
  loseResource2: { mode: 'select', target: 'resource', filter: 'kept', repeat: 2, hintKey: 'fxh.loseResource2' },
  loseResource3: { mode: 'select', target: 'resource', filter: 'kept', repeat: 3, hintKey: 'fxh.loseResource3' },
  loseAllFixedResources: { mode: 'manual', manualTab: 'resource', hintKey: 'fxh.loseAllFixedResources' },
  loseFixedResource: { mode: 'select', target: 'resource', filter: 'fixed', hintKey: 'fxh.loseFixedResource' },
  convertFixedResources: { mode: 'select', target: 'resource', filter: 'fixed', hintKey: 'fxh.convertFixedResources' },
  degradeResource: { mode: 'select', target: 'resource', filter: 'kept', hintKey: 'fxh.degradeResource' },
  swapResource: { mode: 'select', target: 'resource', filter: 'kept', hintKey: 'fxh.swapResource', manualTab: 'resource' },
  destroyResource: { mode: 'select', target: 'resource', filter: 'kept', hintKey: 'fxh.destroyResource' },
  retrieveResource: { mode: 'select', target: 'resource', filter: 'lost', hintKey: 'fxh.retrieveResource' },
  resourceToMemory: { mode: 'manual', manualTab: 'resource', hintKey: 'fxh.resourceToMemory' },

  // ---------- 印记 ----------
  gainMark: { mode: 'input', placeholderKey: 'fxp.gainMark', hintKey: 'fxh.gainMark' },
  loseMark: { mode: 'select', target: 'mark', filter: 'kept', hintKey: 'fxh.loseMark' },
  crippleMark: { mode: 'select', target: 'mark', filter: 'kept', hintKey: 'fxh.crippleMark' },

  // ---------- 角色 ----------
  createMortal: { mode: 'input', placeholderKey: 'fxp.createMortal', hintKey: 'fxh.createMortal' },
  createImmortal: { mode: 'input', placeholderKey: 'fxp.createImmortal', hintKey: 'fxh.createImmortal' },
  createImmortalHostile: { mode: 'input', placeholderKey: 'fxp.createImmortalHostile', hintKey: 'fxh.createImmortalHostile' },
  createCharacter: { mode: 'input', placeholderKey: 'fxp.createCharacter', hintKey: 'fxh.createCharacter' },
  // 规则书互斥："杀死一个凡人角色。如果没有可用的角色，请创造一个"（提示1/3/5/34）
  // 候选限定为"活着的凡人"——不朽者不是可杀目标，且互斥分支只针对凡人
  killCharacter: {
    mode: 'select', target: 'character', filter: 'aliveMortal', confirmKey: 'fxc.killCharacter',
    hintKey: 'fxh.killCharacter', fallback: ['createMortal', 'createImmortal', 'createCharacter', 'gainMark'],
  },
  deleteCharacter: {
    mode: 'select', target: 'character', filter: 'alive', confirmKey: 'fxc.deleteCharacter',
    hintKey: 'fxh.deleteCharacter', fallback: ['createMortal'],
  },
  killAllMortals: { mode: 'manual', manualTab: 'character', hintKey: 'fxh.killAllMortals' },
  mortalToHostileImmortal: { mode: 'select', target: 'character', filter: 'mortal', hintKey: 'fxh.mortalToHostileImmortal' },
  mortalToImmortal: { mode: 'select', target: 'character', filter: 'mortal', hintKey: 'fxh.mortalToImmortal' },
  reviveCharacter: { mode: 'select', target: 'character', filter: 'dead', hintKey: 'fxh.reviveCharacter' },
  characterToResource: { mode: 'select', target: 'character', filter: 'alive', hintKey: 'fxh.characterToResource', manualTab: 'resource' },
  returnGhost: { mode: 'select', target: 'character', filter: 'dead', hintKey: 'fxh.returnGhost' },
  dieByAge: { mode: 'select', target: 'character', filter: 'mortal', hintKey: 'fxh.dieByAge' },
  changeAllegiance: { mode: 'manual', manualTab: 'character', hintKey: 'fxh.changeAllegiance' },

  // ---------- 特殊 ----------
  // dreamWorld：GameView 有专属"梦境之地"操作区，效果卡只做告知，不重复引导
  dreamWorld: { mode: 'read', hintKey: 'fxh.dreamWorld' },
  gameOver: { mode: 'read', hintKey: 'fxh.gameOver' },
  note: { mode: 'read' },
}

/** 获取效果的处理模式（未知类型安全回退为 manual） */
export function effectActionSpec(e: Effect): EffectActionSpec {
  return spec[e.type] ?? { mode: 'manual', hintKey: 'fxh.unknown' }
}

/** 该条目是否"全部处理完毕"的判断由组件层维护（done 集合） */
export function requiredCount(e: Effect): number {
  return effectActionSpec(e).repeat ?? 1
}

/** 是否属于可以"一键直执行"的简单操作 */
export function isAutoAction(e: Effect): boolean {
  return effectActionSpec(e).mode === 'auto'
}

/** 手动模式的指引 tab */
export function manualTabOf(e: Effect): EffectActionSpec['manualTab'] {
  return effectActionSpec(e).manualTab
}

/** 互斥替代效果类型（候选为空时给玩家的建议） */
export function fallbackOf(e: Effect): string[] {
  return effectActionSpec(e).fallback ?? []
}

/** 输入模式的预设默认值（如"获得技能嗜血"→ 自动填入"嗜血"） */
export function defaultInputOf(e: Effect): string {
  if (e.type === 'gainSkill' && e.name) return e.name
  if (e.type === 'gainResource' && e.name) return e.name
  return ''
}
