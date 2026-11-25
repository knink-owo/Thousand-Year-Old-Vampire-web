/** 角色域动作（凡人 / 不朽者 / 幽灵 / 角色转资源） */
import type { GameCtx } from './context';
import { logText, uid } from './context';

export function createCharacterActions(ctx: GameCtx) {
  const { state, persist } = ctx;

  function addCharacter(name: string, description: string, immortal: boolean) {
    const s = state.value!;
    s.characters.push({ id: uid(), name, description, immortal, dead: false });
    s.log.push(logText('character', `${immortal ? '不朽者' : '凡人'}登场：${name}`, s.currentPromptNumber));
    persist();
  }

  function killCharacter(id: string) {
    const s = state.value!;
    const c = s.characters.find(x => x.id === id);
    if (!c || c.dead) return;
    c.dead = true;
    s.log.push(logText('character', `${c.name} 死了。`, s.currentPromptNumber));
    persist();
  }

  /** 凡人在岁月中老去（规则书"角色"节：每隔四五个提示，一个凡人会因年老而去世） */
  function ageCharacter(id: string) {
    const s = state.value!;
    const c = s.characters.find(x => x.id === id);
    if (!c || c.dead || c.immortal) return;
    c.dead = true;
    s.log.push(logText('character', `岁月带走了 ${c.name}——他们已老去、死去，化为尘土。`, s.currentPromptNumber));
    persist();
  }

  /** 带回一个最近划掉的凡人角色（提示48第2条目） */
  function reviveCharacter(id: string) {
    const s = state.value!;
    const c = s.characters.find(x => x.id === id);
    if (!c || !c.dead) return;
    c.dead = false;
    c.isGhost = false;
    s.log.push(logText('character', `${c.name} 不可思议地活了下来。`, s.currentPromptNumber));
    persist();
  }

  /** 亡者以幽灵归来（提示41第3条目） */
  function returnGhost(id: string) {
    const s = state.value!;
    const c = s.characters.find(x => x.id === id);
    if (!c || !c.dead) return;
    c.dead = false;
    c.isGhost = true;
    s.log.push(logText('character', `${c.name} 的幽灵缠绕着你。`, s.currentPromptNumber));
    persist();
  }

  /** 角色转为资源（提示3第3条目） */
  function characterToResource(id: string, resourceName?: string) {
    const s = state.value!;
    const c = s.characters.find(x => x.id === id);
    if (!c || c.dead) return;
    ctx.addResource(resourceName?.trim() || `${c.name}（被转化）`);
    killCharacter(id);
  }

  /** 凡人转化为不朽者（提示1第2条目、26第1条目等） */
  function mortalToImmortal(id: string) {
    const s = state.value!;
    const c = s.characters.find(x => x.id === id);
    if (!c || c.dead || c.immortal) return;
    c.immortal = true;
    s.log.push(logText('character', `${c.name} 不再老去——成为了不朽者。`, s.currentPromptNumber));
    persist();
  }

  return {
    addCharacter, killCharacter, ageCharacter, reviveCharacter,
    returnGhost, characterToResource, mortalToImmortal,
  };
}
