/**
 * 《千年吸血鬼》核心领域类型
 * 依据规则书（中文翻译版 ver 1.04）建模
 */

/** 特征（Character sheet 上五种特征） */
export type TraitKind = 'memory' | 'skill' | 'resource' | 'character' | 'mark';

/** 一条经历（experience）：提示回答的浓缩句 */
export interface Experience {
  id: string;
  text: string;
  promptNumber: number | null; // 来源提示编号
  promptEntry: number | null;  // 条目序号 1..3
  createdAt: number;
  lost?: boolean;              // 被划去（如提示51第1条目随机失去）——保留可读，可恢复
}

/** 记忆：容纳最多 3 条经历 */
export interface Memory {
  id: string;
  title?: string;       // 玩家可选命名
  experiences: Experience[];
  inDiary: boolean;     // 已移入日记（不能再添加经历）
  stabilized: boolean;  // 记忆旁画星号（永不丢失、不再占槽）
  forgotten?: boolean;  // 已被划掉（遗忘）
  note?: string;
}

/** 技能：可勾选（已使用）、可被划掉（失去） */
export interface Skill {
  id: string;
  name: string;
  description?: string;
  checked: boolean;     // 勾选 = 已使用过
  lost: boolean;        // 划掉 = 失去，不再影响世界
}

/** 资源：资产/结构；fixed = 固定资源（离开区域无法携带） */
export interface Resource {
  id: string;
  name: string;
  description?: string;
  fixed: boolean;
  lost: boolean;
  isDiary: boolean;     // 是否为"日记"实体（≤4 记忆）
  artifact?: boolean;   // 特殊神器（提示10第2条目）：失去资源时须首先失去它；结局时可改写结局
}

/** 角色：凡人（会老死）或不朽者；可被划掉（死亡） */
export interface Character {
  id: string;
  name: string;
  description: string;
  immortal: boolean;
  dead: boolean;
  isGhost?: boolean;
}

/** 印记：吸血鬼不死状态的可见标志 */
export interface Mark {
  id: string;
  name: string;
  description?: string;
  removed: boolean;
  crippled?: boolean;   // 已失能（提示61第3条目）：不再作为可战斗/自立的标志
}

/** 效果指令：提示条目的结构化效果（由规则引擎从文本提取，玩家可确认/调整） */
export type Effect =
  | { type: 'gainMemorySlot' }
  | { type: 'loseMemorySlot' }
  | { type: 'loseMemory' }             // 玩家选择一段记忆划掉
  | { type: 'loseTwoMemories' }
  | { type: 'loseMemoryRandom' }
  | { type: 'memoryToSkill' }          // 划掉记忆，转化为技能
  | { type: 'memoryToDiary' }
  | { type: 'stabilizeMemory' }        // 星号：记忆永不丢失、不占槽
  | { type: 'removeMemorySentence' }   // 删除任意两段记忆的第一句话
  | { type: 'editMemory' }             // 修改/重塑一段记忆
  | { type: 'swapProperNouns' }        // 在两个记忆之间交换专有名词
  | { type: 'restoreMemory' }
  | { type: 'gainSkill'; name?: string }
  | { type: 'checkSkill' }             // 勾选一项技能
  | { type: 'checkSkill2' }
  | { type: 'checkSkill3' }
  | { type: 'uncheckSkill' }
  | { type: 'loseSkill' }              // 失去一项技能（已勾选或未勾选皆可）
  | { type: 'loseCheckedSkill' }       // 失去一项已勾选的技能（提示62第2条目）
  | { type: 'loseUncheckedSkill' }     // 失去一项未勾选的技能（提示66/70）
  | { type: 'changeSkill' }
  | { type: 'rewriteSkill' }
  | { type: 'gainResource'; name?: string }
  | { type: 'gainTwoResources' }
  | { type: 'gainFixedResource' }
  | { type: 'loseResource' }
  | { type: 'loseResource2' }
  | { type: 'loseResource3' }
  | { type: 'loseAllFixedResources' }
  | { type: 'loseFixedResource' }
  | { type: 'convertFixedResources' }
  | { type: 'degradeResource' }
  | { type: 'swapResource' }
  | { type: 'destroyResource' }
  | { type: 'retrieveResource' }
  | { type: 'resourceToMemory' }
  | { type: 'gainMark' }
  | { type: 'loseMark' }
  | { type: 'crippleMark' }
  | { type: 'createMortal' }
  | { type: 'createImmortal' }
  | { type: 'createImmortalHostile' }
  | { type: 'createCharacter' }
  | { type: 'killCharacter' }
  | { type: 'deleteCharacter' }
  | { type: 'killAllMortals' }
  | { type: 'mortalToHostileImmortal' }
  | { type: 'mortalToImmortal' }
  | { type: 'reviveCharacter' }
  | { type: 'characterToResource' }
  | { type: 'returnGhost' }
  | { type: 'dieByAge' }
  | { type: 'changeAllegiance' }
  | { type: 'dreamWorld' }             // 特殊：提示48第3条目——踏入梦境之地（清空特征、返回提示10）
  | { type: 'gameOver' }
  | { type: 'note'; text: string };    // 仅提示性效果

/** 提示条目（第 1/2/3 次触发） */
export interface PromptEntry {
  text: string;
  effects: Effect[];
}

/** 提示 */
export interface Prompt {
  number: number;
  entries: PromptEntry[];
}

/** 提示包（数据层，可导入导出） */
export interface PromptPack {
  meta: {
    name: string;
    source: string;
    language: 'zh' | 'en';
    version: string;
    promptCount: number;
  };
  prompts: Prompt[];
}

/** 日记条目（日志游戏中写下的段落） */
export interface DiaryEntry {
  id: string;
  promptNumber: number;
  entryIndex: number;   // 1..3
  promptText: string;   // 引用的提示文本
  content: string;      // 玩家写的日志
  createdAt: number;
  editedAt?: number;
}

/** 游戏事件时间线记录 */
export interface GameLogEntry {
  id: string;
  kind: 'memory' | 'skill' | 'resource' | 'character' | 'mark' | 'system' | 'diary';
  text: string;
  atPrompt: number;
  createdAt: number;
}

/** 历史记录摘要（首页"翻阅历史"用）——不保存全量状态，仅概览 */
export interface GameRecord {
  id: string;
  name: string;
  createdAt: number;
  finished: boolean;
  finishReason?: string;
  finishedAt?: number;
  moves: number;          // 已回答提示次数
  currentPrompt: number;  // 当前/结束提示编号
  memoryCount: number;
  skillCount: number;
  resourceCount: number;
}

/** 游戏状态 */
export interface GameState {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;

  // 记分表五种特征
  memories: Memory[];
  memorySlots: number;        // 默认 5，可被永久减少/增加
  skills: Skill[];
  resources: Resource[];
  characters: Character[];
  marks: Mark[];
  diaryResourceId?: string;   // 日记实体的资源 id

  // 流程
  currentPromptNumber: number; // 当前提示编号（1..80）
  promptVisits: Record<number, number>; // 每个提示已触发次数（决定用第几条目）
  usesFastMode: boolean;       // 快速游戏 vs 日志游戏
  diaries: DiaryEntry[];       // 日志条目（日志游戏模式）
  log: GameLogEntry[];
  started: boolean;
  finished: boolean;
  finishReason?: string;
  finishedAt?: number;
  dreamWorld?: boolean; // 提示48第3条目：已踏入梦境之地（无印记的吸血鬼，第二次抵达即醒来）
  moves: number;               // 已移动次数（≈ 已回答提示数）

  /** 效果执行进度（持久化）：`提示号:条目号:效果下标` → 已完成次数；刷新/重进不丢失，避免重复执行 */
  effectProgress: Record<string, number>;
  /** 岁月流逝：上次玩家对"凡人老去"作出响应（执行或暂缓）时的 moves；`moves - 该值 >= 4` 时补弹老化提醒 */
  agingAcknowledgedAt?: number;
}