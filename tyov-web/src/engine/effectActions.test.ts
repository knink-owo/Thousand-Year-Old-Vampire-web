import { describe, it, expect } from 'vitest';
import {
  effectActionSpec, requiredCount, isAutoAction, manualTabOf, fallbackOf, defaultInputOf,
} from './effectActions';
import type { Effect } from '../types/game';

function e(type: Effect['type']): Effect {
  return { type } as Effect;
}
function withName(type: 'gainSkill' | 'gainResource', name: string): Effect {
  return { type, name } as Effect;
}

describe('effectActionSpec', () => {
  it('auto 类：无歧义直接执行', () => {
    expect(effectActionSpec(e('gainMemorySlot')).mode).toBe('auto');
    expect(effectActionSpec(e('loseMemoryRandom')).mode).toBe('auto');
    expect(isAutoAction(e('gainMemorySlot'))).toBe(true);
  });

  it('select 类：需要选择目标', () => {
    expect(effectActionSpec(e('loseResource')).mode).toBe('select');
    expect(effectActionSpec(e('loseResource')).target).toBe('resource');
    expect(effectActionSpec(e('checkSkill')).target).toBe('skill');
    expect(effectActionSpec(e('checkSkill')).filter).toBe('unchecked');
    expect(effectActionSpec(e('killCharacter')).target).toBe('character');
    expect(effectActionSpec(e('killCharacter')).confirmText).toBeTruthy();
  });

  it('input 类：需要输入命名', () => {
    expect(effectActionSpec(e('gainSkill')).mode).toBe('input');
    expect(effectActionSpec(e('gainResource')).mode).toBe('input');
    expect(effectActionSpec(e('createMortal')).mode).toBe('input');
  });

  it('manual 类：引导去面板', () => {
    expect(effectActionSpec(e('editMemory')).mode).toBe('manual');
    expect(manualTabOf(e('editMemory'))).toBe('memory');
    expect(manualTabOf(e('destroyResource')) ?? 'resource').toBe('resource');
  });

  it('read 类：游戏结束与笔记', () => {
    expect(effectActionSpec(e('gameOver')).mode).toBe('read');
    expect(effectActionSpec(e('note')).mode).toBe('read');
  });

  it('repeat：勾选两项/三项技能需要重复次数', () => {
    expect(requiredCount(e('checkSkill'))).toBe(1);
    expect(requiredCount(e('checkSkill2'))).toBe(2);
    expect(requiredCount(e('checkSkill3'))).toBe(3);
    expect(requiredCount(e('loseResource3'))).toBe(3);
  });

  it('未知类型安全回退为 manual', () => {
    const unknown = effectActionSpec({ type: 'note', text: 'x' } as Effect);
    expect(unknown.mode).toBe('read');
  });

  it('fallback：无可杀角色时建议改而创造角色/印记（规则书互斥句式）', () => {
    const fbs = fallbackOf(e('killCharacter'));
    expect(fbs).toContain('createMortal');
    expect(fbs).toContain('gainMark'); // 提示34："如果没有，则创建一项印记"
    expect(fallbackOf(e('gainSkill'))).toEqual([]);
  });

  it('defaultInputOf：预设技能/资源名自动填入（如"获得技能嗜血"）', () => {
    expect(defaultInputOf(withName('gainSkill', '嗜血'))).toBe('嗜血');
    expect(defaultInputOf(withName('gainResource', '秘密阴谋集团'))).toBe('秘密阴谋集团');
    expect(defaultInputOf(e('createMortal'))).toBe('');
  });
});