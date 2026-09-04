# -*- coding: utf-8 -*-
"""E2E: 撤回融合、删除确认弹窗、骰子置顶、回合后滚动顶部"""
from playwright.sync_api import sync_playwright
import json

EDGE = r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
URL = 'http://127.0.0.1:5199/'

def fill_create(page, name='融合验证者'):
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

def submit_confirm(page):
    return page.evaluate('''() => {
      const input = document.querySelector('input[placeholder*="技能名"], input[placeholder*="凡人角色名"]');
      if (!input) return false;
      const btn = input.parentElement.querySelector('button');
      if (!btn) return false;
      btn.click();
      return true;
    }''')

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=EDGE, headless=True)
    ctx = browser.new_context(viewport={'width': 1500, 'height': 1100})
    page = ctx.new_page()
    errs = []
    page.on('pageerror', lambda e: errs.append(str(e)[:150]))

    fill_create(page)

    print('=== 1. 无确认弹窗 ===')
    page.locator('button:has-text("填写 ▾")').first.click()
    page.wait_for_timeout(300)
    submit_confirm(page)
    page.wait_for_timeout(500)
    modal = page.locator('text=确认执行？').count()
    print(f'   执行后无"确认执行"弹窗: {modal == 0}')
    assert modal == 0, '确认弹窗不应出现'

    print('=== 2. 单一"撤回"按钮（input 类撤回后自动展开重填） ===')
    undo_btns = page.locator('button:has-text("撤回")')
    rewrite_btns = page.locator('button:has-text("重写")')
    print(f'   撤回按钮数: {undo_btns.count()} / 重写按钮数: {rewrite_btns.count()}（重写应移除）')
    assert undo_btns.count() > 0 and rewrite_btns.count() == 0, '应只有撤回'
    g0 = json.loads(page.evaluate('localStorage.getItem("tyov:save:v1")'))
    skill0 = len(g0['skills'])
    undo_btns.first.click()
    page.wait_for_timeout(400)
    # input 类撤回后应自动展开填写浮层（带预设值）
    reopened = page.locator('input[placeholder*="技能名"]').count() > 0
    prefill = page.locator('input[placeholder*="技能名"]').input_value() if reopened else ''
    g1 = json.loads(page.evaluate('localStorage.getItem("tyov:save:v1")'))
    skill1 = len(g1['skills'])
    print(f'   撤回后技能数 {skill0}->{skill1}（应-1）: {skill1 < skill0}')
    print(f'   撤回后自动展开填写浮层: {reopened} / 预设值: "{prefill}"')
    assert skill1 < skill0, '撤回未撤销'
    assert reopened and prefill == '嗜血', '撤回后应展开并预填'

    print('=== 3. 骰子置于提示上方 ===')
    # 完成一回合获得骰子
    t = page.locator('textarea[placeholder*="好的经历格式"]')
    t.fill('回合经历；风带来故土气息。')
    page.locator('button:has-text("完成这一回合，掷出命运之骰")').click()
    page.wait_for_timeout(1200)
    # 检查 DOM 顺序——骰子区块在 PromptCard 前
    order = page.evaluate('''() => {
      const card = [...document.querySelectorAll('.card')].find(n => n.innerText.includes('骰 子 之 判'));
      const prompt = [...document.querySelectorAll('.card')].find(n => n.innerText.includes('首次触达') || n.innerText.includes('第 2 次触达'));
      if (!card || !prompt) return 'notfound';
      const rel = document.compareDocumentPosition(prompt, card);
      return rel & Node.DOCUMENT_POSITION_FOLLOWING ? 'dice-before-prompt' : 'dice-after-prompt';
    }''')
    print(f'   DOM 顺序: {order}（应 dice-before-prompt）')
    assert order == 'dice-before-prompt', '骰子应在提示上方'

    print('=== 4. 完成回合后滚动到顶部 ===')
    scroll_y = page.evaluate('window.scrollY')
    print(f'   完成回合后页面滚动位置: {scroll_y}（应≈0）')
    assert scroll_y < 100, '未滚动到顶部'

    print('\n=== 5. 页面错误 ===')
    print(errs if errs else '无')

    ctx.close()
    browser.close()
    print('\n四项调整 E2E 全部通过')