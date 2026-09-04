/**
 * 效果执行引导：把结构化 Effect 归类为四种可交互的处理模式。
 * 纯逻辑层（无 Vue/store 依赖），供 EffectActions.vue 渲染交互、单测验证。
 *
 * 定位：引导而非强制——游戏保留玩家的自由裁量权，
 * 因此"模式"只决定 UI 提供什么快捷入口，不自动越权执行。
 */
import type { Effect } from '../types/game'

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
  hint?: string
  /** 需要选择的目标类别 */
  target?: TargetKind
  /** 目标子集过滤：如仅未勾选技能/仅固定资源/仅已死角色 */
  filter?: string
  /** 需要输入的占位提示 */
  inputPlaceholder?: string
  /** 执行前需要 confirm（破坏性操作） */
  confirmText?: string
  /** 需要执行的次数（如勾选两项技能 → 2），完成计数后才算已处理 */
  repeat?: number
  /** 手动模式的指引目标 tab（TraitPanel 的 tab 名） */
  manualTab?: 'memory' | 'skill' | 'resource' | 'character' | 'mark'
  /** 输入默认值（如 gainSkill 已从文本提取了技能名） */
  defaultValue?: string
  /**
   * 互斥条件：本效果无可选目标时，规则书指示"改而执行替代效果"
   * （如提示1"杀死一个凡人角色，如果没有可用的角色，请创造一个"）。
   * 值为替代效果的 type 数组；组件在候选为空时据此提供替代建议。
   */
  fallback?: string[]
}

const spec: Record<string, EffectActionSpec> = {
  // ---------- 记忆 ----------
  gainMemorySlot: { mode: 'auto', hint: '记忆槽 +1' },
  loseMemorySlot: { mode: 'auto', confirmText: '永久失去一个记忆槽？这不可逆。', hint: '记忆槽 -1' },
  loseMemory: { mode: 'select', target: 'memory', filter: 'forgettable', hint: '选择要划掉的一段记忆' },
  loseTwoMemories: { mode: 'manual', manualTab: 'memory', hint: '去记忆面板划掉两段记忆' },
  loseMemoryRandom: { mode: 'auto', hint: '从中间记忆随机划去一段经历' },
  memoryToSkill: { mode: 'select', target: 'memory', filter: 'convertible', hint: '划掉该记忆，获得技能', manualTab: 'memory' },
  memoryToDiary: { mode: 'select', target: 'memory', filter: 'diaryable', hint: '写入日记（不再占记忆槽）', manualTab: 'memory' },
  stabilizeMemory: { mode: 'select', target: 'memory', filter: 'stabilizable', hint: '画星：永不丢失、不再占槽', manualTab: 'memory' },
  removeMemorySentence: { mode: 'manual', manualTab: 'memory', hint: '删除任意两段记忆的第一句话' },
  editMemory: { mode: 'manual', manualTab: 'memory', hint: '修改/重塑一段记忆' },
  swapProperNouns: { mode: 'manual', manualTab: 'memory', hint: '在两个记忆之间交换专有名词' },
  restoreMemory: { mode: 'select', target: 'memory', filter: 'forgotten', hint: '一段被遗忘的记忆重新浮现', manualTab: 'memory' },

  // ---------- 技能 ----------
  gainSkill: { mode: 'input', inputPlaceholder: '技能名（如：嗜血）', hint: '获得一项新技能' },
  checkSkill: { mode: 'select', target: 'skill', filter: 'unchecked', hint: '勾选=已使用过' },
  checkSkill2: { mode: 'select', target: 'skill', filter: 'unchecked', repeat: 2, hint: '勾选两项技能' },
  checkSkill3: { mode: 'select', target: 'skill', filter: 'unchecked', repeat: 3, hint: '勾选三项技能' },
  uncheckSkill: { mode: 'select', target: 'skill', filter: 'checked', hint: '取消勾选一项技能' },
  loseSkill: { mode: 'select', target: 'skill', filter: 'kept', hint: '失去一项技能（划掉）' },
  loseCheckedSkill: { mode: 'select', target: 'skill', filter: 'checked', hint: '失去一项已勾选的技能' },
  loseUncheckedSkill: { mode: 'select', target: 'skill', filter: 'unchecked', hint: '失去一项未勾选的技能' },
  changeSkill: { mode: 'manual', manualTab: 'skill', hint: '更改一项技能（在技能面板修改名称）' },
  rewriteSkill: { mode: 'select', target: 'skill', filter: 'kept', hint: '重写/重塑技能', manualTab: 'skill' },

  // ---------- 资源 ----------
  gainResource: { mode: 'input', inputPlaceholder: '资源名（如：一座庄园）', hint: '获得一项资源' },
  gainTwoResources: { mode: 'input', inputPlaceholder: '资源名', repeat: 2, hint: '获得两项资源' },
  gainFixedResource: { mode: 'input', inputPlaceholder: '固定资源名', hint: '创建固定资源（离开区域无法携带）' },
  loseResource: { mode: 'select', target: 'resource', filter: 'kept', hint: '失去一项资源（划掉）' },
  loseResource2: { mode: 'select', target: 'resource', filter: 'kept', repeat: 2, hint: '失去两项资源' },
  loseResource3: { mode: 'select', target: 'resource', filter: 'kept', repeat: 3, hint: '失去三项资源' },
  loseAllFixedResources: { mode: 'manual', manualTab: 'resource', hint: '划掉所有固定资源（在资源面板逐一失去）' },
  loseFixedResource: { mode: 'select', target: 'resource', filter: 'fixed', hint: '失去一项固定资源' },
  convertFixedResources: { mode: 'select', target: 'resource', filter: 'fixed', hint: '固定资源转为便携现金/财宝' },
  degradeResource: { mode: 'select', target: 'resource', filter: 'kept', hint: '将一项资源降级为废墟' },
  swapResource: { mode: 'select', target: 'resource', filter: 'kept', hint: '以旧换新（换成当代资源）', manualTab: 'resource' },
  destroyResource: { mode: 'select', target: 'resource', filter: 'kept', hint: '扔掉一件资源' },
  retrieveResource: { mode: 'select', target: 'resource', filter: 'lost', hint: '找回一项失去的资源' },
  resourceToMemory: { mode: 'manual', manualTab: 'resource', hint: '检查该资源，引发一段被遗忘的记忆' },

  // ---------- 印记 ----------
  gainMark: { mode: 'input', inputPlaceholder: '印记描述', hint: '获得一道印记' },
  loseMark: { mode: 'select', target: 'mark', filter: 'kept', hint: '移除一道印记' },
  crippleMark: { mode: 'select', target: 'mark', filter: 'kept', hint: '印记失能——必须寻求凡人帮助' },

  // ---------- 角色 ----------
  createMortal: { mode: 'input', inputPlaceholder: '凡人角色名 · 一句话描述', hint: '创造凡人角色' },
  createImmortal: { mode: 'input', inputPlaceholder: '不朽者角色名 · 一句话描述', hint: '创造不朽者角色' },
  createImmortalHostile: { mode: 'input', inputPlaceholder: '敌对不朽者名 · 描述', hint: '创造敌对不朽者' },
  createCharacter: { mode: 'input', inputPlaceholder: '角色名 · 一句话描述', hint: '创造角色' },
  // 规则书互斥："杀死一个凡人角色。如果没有可用的角色，请创造一个"（提示1/3/5/34）
  // 候选限定为"活着的凡人"——不朽者不是可杀目标，且互斥分支只针对凡人
  killCharacter: {
    mode: 'select', target: 'character', filter: 'aliveMortal', confirmText: '杀死这位角色？',
    hint: '杀死一个凡人角色', fallback: ['createMortal', 'createImmortal', 'createCharacter', 'gainMark'],
  },
  deleteCharacter: {
    mode: 'select', target: 'character', filter: 'alive', confirmText: '删除这位凡人角色？',
    hint: '删除一个凡人角色', fallback: ['createMortal'],
  },
  killAllMortals: { mode: 'manual', manualTab: 'character', hint: '划掉所有凡人角色（在角色面板逐一点击死亡）' },
  mortalToHostileImmortal: { mode: 'select', target: 'character', filter: 'mortal', hint: '凡人转化为敌对的不朽者' },
  mortalToImmortal: { mode: 'select', target: 'character', filter: 'mortal', hint: '凡人转化为不朽者' },
  reviveCharacter: { mode: 'select', target: 'character', filter: 'dead', hint: '带回一位已死角色' },
  characterToResource: { mode: 'select', target: 'character', filter: 'alive', hint: '角色转为资源', manualTab: 'resource' },
  returnGhost: { mode: 'select', target: 'character', filter: 'dead', hint: '亡者以幽灵归来' },
  dieByAge: { mode: 'select', target: 'character', filter: 'mortal', hint: '这位凡人因年老而去世' },
  changeAllegiance: { mode: 'manual', manualTab: 'character', hint: '敌人变朋友 / 朋友变敌人（角色面板调整）' },

  // ---------- 特殊 ----------
  // dreamWorld：GameView 有专属"梦境之地"操作区，效果卡不重复引导
  gameOver: { mode: 'read', hint: '此提示宣告终结' },
  note: { mode: 'read' },
}

/** 获取效果的处理模式（未知类型安全回退为 manual） */
export function effectActionSpec(e: Effect): EffectActionSpec {
  return spec[e.type] ?? { mode: 'manual', hint: '请对照提示文本自行处理' }
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