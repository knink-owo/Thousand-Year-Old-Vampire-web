# -*- coding: utf-8 -*-
"""Verify trait panel tabs: characters/skills/resources"""
from playwright.sync_api import sync_playwright

EDGE = r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=EDGE, headless=True)
    page = browser.new_page(viewport={'width': 1400, 'height': 1000})
    page.goto('http://127.0.0.1:5199/')
    page.wait_for_load_state('networkidle')
    page.wait_for_timeout(600)

    if page.locator('button:has-text("继续旅程")').count() > 0:
        page.locator('button:has-text("继续旅程")').click()
        page.wait_for_timeout(500)
    else:
        page.fill('input[placeholder*="亨利，乔恩之子"]', '亨利')
        page.fill('textarea[placeholder*="出生于公元13世纪"]', '我是亨利，乔恩之子，出生于公元13世纪的卢瓦尔河谷附近；我是一名被骗取了遗产的贫穷骑士。')
        page.fill('input[placeholder*="姓名 · 一句话描述"] >> nth=0', '贡德尔，维京人')
        page.fill('input[placeholder*="击剑、骑术"]', '击剑')
        page.fill('input[placeholder*="长船博克苏登"]', '长船博克苏登')
        page.fill('input[placeholder*="姓名 · 身份"]', '巴伦·霍尔穆勒，吸血鬼')
        page.locator('button:has-text("成为黑夜的生物")').click()
        page.wait_for_timeout(500)

    # tab 按钮
    tabs = page.locator('div.card button.px-3.py-1\\.5')
    print('tab 数:', tabs.count())
    for i in range(tabs.count()):
        print('  tab:', tabs.nth(i).inner_text().strip())

    # 技能 tab
    page.locator('button:has-text("技能")').click()
    page.wait_for_timeout(300)
    skills = page.locator('div.border.border-amber-900\\/40.rounded.px-3.py-2')
    print('\n技能列表:')
    for i in range(skills.count()):
        print('  -', skills.nth(i).inner_text().replace('\n', ' | ')[:60])

    # 角色 tab
    page.locator('button:has-text("角色")').click()
    page.wait_for_timeout(300)
    chars = page.locator('div.border.border-amber-900\\/40.rounded.px-3.py-2')
    print('\n角色列表:')
    for i in range(chars.count()):
        print('  -', chars.nth(i).inner_text().replace('\n', ' | ')[:60])

    # 资源 tab
    page.locator('button:has-text("资源")').click()
    page.wait_for_timeout(300)
    ress = page.locator('div.border.border-amber-900\\/40.rounded.px-3.py-2')
    print('\n资源列表:')
    for i in range(ress.count()):
        print('  -', ress.nth(i).inner_text().replace('\n', ' | ')[:60])

    browser.close()
    print('\nTrait 面板验证完成')