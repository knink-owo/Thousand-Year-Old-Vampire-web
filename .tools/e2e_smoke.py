# -*- coding: utf-8 -*-
"""E2E smoke test: 建卡 -> 游玩 -> 掷骰 全流程验证（使用系统 Edge）"""
from playwright.sync_api import sync_playwright

EDGE = r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
URL = 'http://127.0.0.1:5199/'

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=EDGE, headless=True)
    page = browser.new_page(viewport={'width': 1400, 'height': 1000})
    errors = []
    page.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None)
    page.on('pageerror', lambda e: errors.append(str(e)))

    page.goto(URL)
    page.wait_for_load_state('networkidle')
    page.wait_for_timeout(800)

    print('=== 标题 ===')
    print('title:', page.title())
    print('h1:', page.locator('h1').inner_text())

    # ---- 建卡 ----
    print('\n=== 建卡 ===')
    page.fill('input[placeholder*="亨利，乔恩之子"]', '亨利，乔恩之子')
    page.fill('textarea[placeholder*="出生于公元13世纪"]', '我是亨利，乔恩之子，出生于公元13世纪的卢瓦尔河谷附近；我是一名被骗取了遗产的贫穷骑士。')
    # 三个凡人（"姓名 · 一句话描述" 输入框）
    mortal_inputs = page.locator('input[placeholder*="姓名 · 一句话描述"]')
    page.fill('input[placeholder*="姓名 · 一句话描述"] >> nth=0', '贡德尔，像父亲一样对待我的维京人')
    page.locator('button:has-text("＋ 加一位凡人")').click()
    page.wait_for_timeout(100)
    page.fill('input[placeholder*="姓名 · 一句话描述"] >> nth=1', '劳伦斯·霍尔穆勒，霍尔穆勒男爵的后裔')
    page.locator('button:has-text("＋ 加一位凡人")').click()
    page.wait_for_timeout(100)
    page.fill('input[placeholder*="姓名 · 一句话描述"] >> nth=2', '米内尔家族最年轻的女儿，出色的决斗者')
    # 技能
    page.fill('input[placeholder*="击剑、骑术"]', '击剑')
    page.fill('input[placeholder*="长船博克苏登"]', '长船博克苏登')
    # 不朽者
    page.fill('input[placeholder*="姓名 · 身份"]', '巴伦·霍尔穆勒，奥地利贵族及吸血鬼')
    # 印记
    page.fill('input[placeholder*="我的脖子永久破裂"]', '我的脖子永久破裂，我戴上紧围巾并缓慢行走以保持尊严')
    page.screenshot(path='D:/Projects/Thousand Year Old Vampire/.tools/shot1_create.png', full_page=True)
    page.locator('button:has-text("成为黑夜的生物")').click()
    page.wait_for_timeout(600)

    # ---- 主游戏 ----
    print('\n=== 主游戏 ===')
    print('当前提示卡文本:', page.locator('div.card p.text-lg').first.inner_text()[:60], '...')
    print('提示 tab 数:', page.locator('div.card button').count())

    # 填写经历并完成回合
    exp = '我跟随家族逃往东方，长船在风暴中沉没；贡德尔的死让我第一次感到不朽的重量。'
    page.fill('textarea[placeholder*="好的经历格式"]', exp)
    page.locator('button:has-text("完成这一回合")').click()
    page.wait_for_timeout(800)

    # 检查骰子结果区
    roll_visible = page.locator('text=骰 子 之 判').count() > 0
    print('骰子结果面板显示:', roll_visible)
    if roll_visible:
        d10 = page.locator('div.die-roll >> nth=0 >> div.text-4xl').inner_text()
        d6 = page.locator('div.die-roll >> nth=1 >> div.text-4xl').inner_text()
        delta = page.locator('div.die-roll >> nth=2 >> div.text-4xl').inner_text()
        print(f'D10={d10} D6={d6} 差={delta}')

    page.screenshot(path='D:/Projects/Thousand Year Old Vampire/.tools/shot2_game.png', full_page=True)

    # 检查记忆面板
    print('\n记忆中的经历数:', page.locator('div.border-amber-900\\/40 ul li').count())

    # ---- 控制台错误 ----
    print('\n=== 控制台错误 ===')
    print(errors if errors else '无')

    browser.close()
    print('\nE2E 完成')