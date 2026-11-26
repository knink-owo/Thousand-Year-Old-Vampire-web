/**
 * 提示包加载器：把 raw JSON 数据文件转换为类型化的 PromptPack。
 * 数据层与引擎/UI 解耦 —— 玩家可导入自定义/社区提示包。
 */
import type { PromptPack, Prompt, PromptEntry, Effect } from '../types/game';
import officialZhRaw from '../data/official-pack.json';
import officialEnRaw from '../data/official-pack.en.json';
import type { Locale } from '../i18n';

interface RawPrompt {
  number: number;
  entries: { text: string; effects: RawEffect[] }[];
}
interface RawEffect {
  type: string;
  [key: string]: unknown;
}
interface RawPack {
  meta?: {
    name?: string;
    source?: string;
    language?: 'zh' | 'en';
    version?: string;
    promptCount?: number;
  };
  prompts: RawPrompt[];
}

function normalizeEffect(e: RawEffect): Effect {
  const known: Record<string, Effect['type']> = {
    gainMemorySlot: 'gainMemorySlot',
    loseMemorySlot: 'loseMemorySlot',
    loseMemory: 'loseMemory',
    loseTwoMemories: 'loseTwoMemories',
    loseMemoryRandom: 'loseMemoryRandom',
    memoryToSkill: 'memoryToSkill',
    memoryToDiary: 'memoryToDiary',
    stabilizeMemory: 'stabilizeMemory',
    removeMemorySentence: 'removeMemorySentence',
    editMemory: 'editMemory',
    swapProperNouns: 'swapProperNouns',
    restoreMemory: 'restoreMemory',
    gainSkill: 'gainSkill',
    gainSkillNamed: 'gainSkill',
    checkSkill: 'checkSkill',
    checkSkill2: 'checkSkill2',
    checkSkill3: 'checkSkill3',
    checkCountSkill: 'checkSkill',
    uncheckSkill: 'uncheckSkill',
    loseSkill: 'loseSkill',
    loseCheckedSkill: 'loseCheckedSkill',
    loseUncheckedSkill: 'loseUncheckedSkill',
    changeSkill: 'changeSkill',
    rewriteSkill: 'rewriteSkill',
    gainResource: 'gainResource',
    gainResourceNamed: 'gainResource',
    gainTwoResources: 'gainTwoResources',
    gainFixedResource: 'gainFixedResource',
    loseResource: 'loseResource',
    loseResource2: 'loseResource2',
    loseResource3: 'loseResource3',
    loseAllFixedResources: 'loseAllFixedResources',
    loseFixedResource: 'loseFixedResource',
    convertFixedResources: 'convertFixedResources',
    degradeResource: 'degradeResource',
    swapResource: 'swapResource',
    destroyResource: 'destroyResource',
    retrieveResource: 'retrieveResource',
    resourceToMemory: 'resourceToMemory',
    gainMark: 'gainMark',
    loseMark: 'loseMark',
    crippleMark: 'crippleMark',
    createMortal: 'createMortal',
    createImmortal: 'createImmortal',
    createImmortalHostile: 'createImmortalHostile',
    createCharacter: 'createCharacter',
    killCharacter: 'killCharacter',
    deleteCharacter: 'deleteCharacter',
    killAllMortals: 'killAllMortals',
    mortalToHostileImmortal: 'mortalToHostileImmortal',
    mortalToImmortal: 'mortalToImmortal',
    reviveCharacter: 'reviveCharacter',
    characterToResource: 'characterToResource',
    returnGhost: 'returnGhost',
    dieByAge: 'dieByAge',
    changeAllegiance: 'changeAllegiance',
    dreamWorld: 'dreamWorld',
    gameOver: 'gameOver',
    note: 'note',
  };
  const t = known[e.type] ?? 'note';
  const base: Record<string, unknown> = { type: t };
  if (t === 'gainSkill' && typeof e.skill === 'string') base.name = e.skill;
  if (t === 'gainResource' && typeof e.resource === 'string') base.name = e.resource;
  if (t === 'note' && typeof e.text === 'string') base.text = e.text;
  if (t === 'note' && e.type !== 'note') base.text = `（未识别效果：${e.type}）`;
  return base as Effect;
}

function normalizePack(raw: RawPack): PromptPack {
  const prompts: Prompt[] = raw.prompts.map(rp => ({
    number: rp.number,
    visits: 0,
    entries: rp.entries.map((e): PromptEntry => ({
      text: e.text,
      effects: (e.effects ?? []).map(normalizeEffect),
    })),
  }));
  prompts.sort((a, b) => a.number - b.number);
  return {
    meta: {
      name: raw.meta?.name ?? '未命名提示包',
      source: raw.meta?.source ?? '',
      language: raw.meta?.language ?? 'zh',
      version: raw.meta?.version ?? '1.0',
      promptCount: prompts.length,
    },
    prompts,
  };
}

const zhPack: PromptPack = normalizePack(officialZhRaw as unknown as RawPack);
const enPack: PromptPack = normalizePack(officialEnRaw as unknown as RawPack);

/** 内置提示包（按语言）；两包结构完全对等，见 pack.parity.test.ts */
export const officialPacks: Record<Locale, PromptPack> = { zh: zhPack, en: enPack };

export function officialPackFor(locale: Locale): PromptPack {
  return officialPacks[locale] ?? zhPack;
}

/** 从 JSON 字符串导入提示包 */
export function parsePromptPack(json: string): PromptPack {
  const raw = JSON.parse(json) as RawPack;
  if (!Array.isArray(raw.prompts) || raw.prompts.length === 0) {
    throw new Error('提示包格式无效：缺少 prompts 数组');
  }
  return normalizePack(raw);
}

/** 导出提示包为 JSON 字符串 */
export function serializePromptPack(pack: PromptPack): string {
  return JSON.stringify(
    {
      meta: pack.meta,
      prompts: pack.prompts.map(p => ({
        number: p.number,
        entries: p.entries.map(e => ({
          text: e.text,
          effects: e.effects,
        })),
      })),
    },
    null,
    2,
  );
}

/** 按编号查询提示 */
export function findPrompt(pack: PromptPack, number: number): Prompt | undefined {
  return pack.prompts.find(p => p.number === number);
}