# -*- coding: utf-8 -*-
"""Verify trait interactions: check skill, kill character, lose resource"""
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
        page.locator('button:has-text("成为黑夜的生物")').click()
        page.wait_for_timeout(500)

    # 技能：勾选
    page.locator('button:has-text("技能")').first.click()
    page.wait_for_timeout(200)
    page.locator('button:has-text("勾选")').first.click()
    page.wait_for_timeout(200)
    save = page.evaluate('localStorage.getItem("tyov:save:v1")')
    import json
    g = json.loads(save)
    sk = g['skills'][0]
    print('勾选后 checked =', sk['checked'])

    # 角色：杀死
    page.locator('button:has-text("角色")').first.click()
    page.wait_for_timeout(200)
    page.locator('button:has-text("死亡")').first.click()
    page.wait_for_timeout(200)
    g = json.loads(page.evaluate('localStorage.getItem("tyov:save:v1")'))
    print('角色死亡 dead =', g['characters'][0]['dead'])

    # 资源：失去（点击资源 tab 后点面板中的失去按钮——注意 tab 按钮自己也含"资源"字样，用面板内定位）
    page.locator('button:has-text("资源")').first.click()
    page.wait_for_timeout(300)
    # 面板中"失去"按钮
    page.locator('div.card div:has-text("长船博克苏登") button:has-text("失去")').first.click()
    page.wait_for_timeout(200)
    g = json.loads(page.evaluate('localStorage.getItem("tyov:save:v1")'))
    print('资源失去 lost =', g['resources'][0]['lost'])

    # 检查事件日志
    print('\n=== 游戏日志（最后4条）===')
    for e in g['log'][-4:]:
        print(f"  [{e['kind']}] {e['text'][:60]}")

    # 刷新页面确认持久化
    page.reload()
    page.wait_for_load_state('networkidle')
    page.wait_for_timeout(500)
    print('\n刷新后自动恢复: 当前提示', page.locator('text=当前提示').first.inner_text() if page.locator('text=当前提示').count() else '?')
    print('刷新后页面仍有“继续旅程”按钮?:', page.locator('button:has-text("继续旅程")').count() > 0)

    browser.close()
    print('\n交互验证完成')