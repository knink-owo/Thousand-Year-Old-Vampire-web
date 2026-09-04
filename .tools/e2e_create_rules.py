# -*- coding: utf-8 -*-
"""E2E: 建卡依规则书结构（1概述+3经历+1印记经历=5记忆）+ footer 版权信息"""
from playwright.sync_api import sync_playwright
import json

EDGE = r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
URL = 'http://127.0.0.1:5199/'

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=EDGE, headless=True)
    page = browser.new_page(viewport={'width': 1500, 'height': 1200})
    errors = []
    page.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None)
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.goto(URL)
    page.wait_for_load_state('networkidle')
    page.wait_for_timeout(600)
    page.evaluate('localStorage.clear(); location.reload()')
    page.wait_for_load_state('networkidle')
    page.wait_for_timeout(600)

    print('=== 1. 首页 footer ===')
    footer = page.locator('footer').inner_text()
    assert 'Tim Hutchings' in footer, 'footer 缺原作者'
    assert '侵删' in footer, 'footer 缺侵删'
    assert 'itch.io' in footer and 'thousandyearoldvampire.com' in footer, 'footer 缺官方链接'
    print('   OK: 原作者 + 侵删 + 官方链接')

    print('\n=== 2. 建卡：规则书结构 ===')
    page.locator('button:has-text("开始旅程")').click()
    page.wait_for_timeout(500)
    # 游戏风格描述
    style_desc = page.locator('text=快速模式适合速览一段人生').count()
    print('   游戏风格描述:', 'OK' if style_desc else '缺失!')
    # 默认输入框数量
    mortals = page.locator('input[placeholder*="姓名 · 一句话描述"]').count()
    skills = page.locator('input[placeholder*="击剑、骑术"]').count()
    resources = page.locator('input[placeholder*="长船博克苏登"]').count()
    exps = page.locator('textarea[placeholder*="贡德尔带我第一次乘坐长船"]').count()
    print(f'   默认: 凡人={mortals} 技能={skills} 资源={resources} 经历={exps} (规则书要求 3/3/3/3)')
    assert mortals == 3 and skills == 3 and resources == 3 and exps == 3, '默认数量不符'

    # 填写完整表单
    page.fill('input[placeholder*="亨利，乔恩之子"]', '艾德里克')
    page.fill('textarea[placeholder*="出生于公元13世纪"]', '我是艾德里克，卢瓦尔河谷的贫穷骑士；我的领地被夺走，我的姓氏被遗忘。')
    for i in range(3):
        page.fill(f'input[placeholder*="姓名 · 一句话描述"] >> nth={i}', f'凡人{i + 1}号')
    for i in range(3):
        page.fill(f'input[placeholder*="击剑、骑术"] >> nth={i}', f'技能{i + 1}')
    for i in range(3):
        page.fill(f'input[placeholder*="长船博克苏登"] >> nth={i}', f'资源{i + 1}')
    for i in range(3):
        page.fill(f'textarea[placeholder*="贡德尔带我第一次乘坐长船"] >> nth={i}', f'经历{i + 1}：我在荒野中醒来；风带来了故土的气息。')
    page.fill('input[placeholder*="姓名 · 身份"]', '巴伦·霍尔穆勒，奥地利贵族及吸血鬼')
    page.fill('input[placeholder*="我的脖子永久破裂"]', '我的脖子永久破裂')
    page.fill('textarea[placeholder*="修道院的屋顶上与阴森的巴伦"]', '我在修道院的屋顶上与巴伦决斗；他几乎砍掉我的头，但我没有死。')
    page.locator('button:has-text("成为黑夜的生物")').click()
    page.wait_for_timeout(700)

    save = page.evaluate('localStorage.getItem("tyov:save:v1")')
    g = json.loads(save)
    print('\n   建卡结果:')
    print(f'   记忆数 = {len(g["memories"])} (预期 5: 概述+3经历+印记经历)')
    print(f'   凡人   = {len(g["characters"].__class__.__name__) if False else sum(1 for c in g["characters"] if not c["immortal"])} / 不朽者 = {sum(1 for c in g["characters"] if c["immortal"])}')
    print(f'   技能   = {len(g["skills"])} / 资源 = {len(g["resources"])} / 印记 = {len(g["marks"])}')
    assert len(g['memories']) == 5, '记忆数应为 5'
    assert sum(1 for c in g['characters'] if not c['immortal']) >= 3, '凡人应 ≥3'
    assert len(g['marks']) == 1, '印记应为 1'

    print('\n=== 3. 游戏内角色面板佐证 ===')
    page.locator('button:has-text("角色")').first.click()
    page.wait_for_timeout(300)
    print('   角色 tab 显示:', page.locator('div.card button:has-text("角色")').first.inner_text())

    print('\n=== 4. 控制台错误 ===')
    print(errors if errors else '无')

    browser.close()
    print('\n建卡规则书结构 E2E 全部通过')