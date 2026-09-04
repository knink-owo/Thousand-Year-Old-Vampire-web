# -*- coding: utf-8 -*-
"""E2E: 提示1互斥淘汰——有活角色时"创造凡人角色"显示不适用；无活角色时恢复可执行"""
from playwright.sync_api import sync_playwright
import json

EDGE = r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
URL = 'http://127.0.0.1:5199/'

def fill_create(page, name='互斥验证者'):
    page.goto(URL)
    page.wait_for_load_state('networkidle')
    page.wait_for_timeout(500)
    page.evaluate('localStorage.clear()')
    page.reload()
    page.wait_for_load_state('networkidle')
    page.wait_for_timeout(500)
    page.locator('button:has-text("开始旅程")').click()
    page.wait_for_timeout(400)
    page.fill('input[placeholder*="亨利，乔恩之子"]', name)
    page.fill('textarea[placeholder*="出生于公元13世纪"]', f'我是{name}。')
    mm = page.locator('input[placeholder="例如：贡德尔，维京人"], input[placeholder="例如：劳伦斯·霍尔穆勒，男爵的后裔"], input[placeholder="例如：米内尔家的女儿，出色的决斗者"]')
    for i in range(mm.count()): mm.nth(i).fill(f'凡人{i+1}')
    ss = page.locator('input[placeholder="例如：击剑"], input[placeholder="例如：骑术"], input[placeholder="例如：宫廷礼节"]')
    for i in range(ss.count()): ss.nth(i).fill(f'技能{i+1}')
    rr = page.locator('input[placeholder="例如：长船博克苏登"], input[placeholder="例如：祖传宝剑"], input[placeholder="例如：一块耕地"]')
    for i in range(rr.count()): rr.nth(i).fill(f'资源{i+1}')
    ee = page.locator('textarea[placeholder^="例如：贡德尔带我"], textarea[placeholder^="例如：我在荒野"], textarea[placeholder^="例如：我向领主"]')
    for i in range(ee.count()): ee.nth(i).fill(f'经历{i+1}；风带来故土气息。')
    page.fill('input[placeholder="姓名 · 身份"]', '巴伦')
    page.fill('input[placeholder*="我的脖子永久破裂"]', '脖子永久破裂')
    page.fill('textarea[placeholder*="修道院的屋顶"]', '我决斗。')
    page.locator('button:has-text("成为黑夜的生物")').click()
    page.wait_for_timeout(900)

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=EDGE, headless=True)
    ctx = browser.new_context(viewport={'width': 1500, 'height': 1100})
    page = ctx.new_page()
    errs = []
    page.on('pageerror', lambda e: errs.append(str(e)[:150]))

    print('=== 1. 有活角色（首次进提示1） ===')
    fill_create(page)
    li_texts = page.evaluate('''() => {
      const card = [...document.querySelectorAll('.card')].find(n => n.innerText.includes('效 果 执 行'));
      if (!card) return [];
      return [...card.querySelectorAll('li')].map(li => li.innerText.replace(/\\n/g, ' | '));
    }''')
    for t in li_texts:
        print('   ', t[:80])
    excl = any('不适用' in t and '创造凡人角色' in t for t in li_texts)
    has_create = any('创造凡人角色' in t and '不适用' not in t and '填写' in t for t in li_texts)
    print(f'   "创造凡人角色"显示不适用: {excl}')
    print(f'   "创造凡人角色"仍显示填写按钮: {has_create}')
    assert excl, '有活角色时创造凡人角色应显示不适用'
    assert not has_create, '有活角色时创造凡人角色不应有填写按钮'
    # 计数应为 2/2（嗜血 + 杀死角色），不适用不计入
    counter = page.evaluate('''() => {
      const card = [...document.querySelectorAll('.card')].find(n => n.innerText.includes('效 果 执 行'));
      const span = card ? [...card.querySelectorAll('span')].find(s => /^\\d+\\/\\d+$/.test(s.innerText)) : null;
      return span ? span.innerText : '(无)';
    }''')
    print(f'   完成计数: {counter}（应 0/2）')

    print('\n=== 2. 无活角色（全部凡人死亡后） ===')
    page.evaluate('''() => {
      const raw = localStorage.getItem('tyov:save:v1');
      const g = JSON.parse(raw);
      for (const c of g.characters) { if (!c.immortal) c.dead = true; }
      localStorage.setItem('tyov:save:v1', JSON.stringify(g));
    }''')
    page.reload()
    page.wait_for_load_state('networkidle')
    page.wait_for_timeout(700)
    if page.locator('button:has-text("继续旅程")').count():
        page.locator('button:has-text("继续旅程")').first.click()
        page.wait_for_timeout(500)
    li_texts2 = page.evaluate('''() => {
      const card = [...document.querySelectorAll('.card')].find(n => n.innerText.includes('效 果 执 行'));
      if (!card) return [];
      return [...card.querySelectorAll('li')].map(li => li.innerText.replace(/\\n/g, ' | '));
    }''')
    for t in li_texts2:
        print('   ', t[:80])
    excl2 = any('不适用' in t for t in li_texts2)
    has_create2 = any('创造凡人角色' in t and '填写' in t for t in li_texts2)
    print(f'   无活角色后"不适用"消失: {not excl2}')
    print(f'   无活角色后"创造凡人角色"恢复可填写: {has_create2}')
    assert not excl2 and has_create2, '无活角色时应恢复创造选项'

    print('\n=== 3. 页面错误 ===')
    print(errs if errs else '无')

    ctx.close()
    browser.close()
    print('\n互斥淘汰 E2E 通过')