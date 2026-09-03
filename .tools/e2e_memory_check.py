# -*- coding: utf-8 -*-
"""Inspect memory panel after playthrough"""
from playwright.sync_api import sync_playwright

EDGE = r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=EDGE, headless=True)
    page = browser.new_page(viewport={'width': 1400, 'height': 1000})
    page.goto('http://127.0.0.1:5199/')
    page.wait_for_load_state('networkidle')
    page.wait_for_timeout(600)

    # 如果已有存档则继续，否则重新建卡
    if page.locator('button:has-text("继续旅程")').count() > 0:
        print('检测到已有存档，继续')
        page.locator('button:has-text("继续旅程")').click()
        page.wait_for_timeout(500)
    else:
        print('新建游戏')
        page.fill('input[placeholder*="亨利，乔恩之子"]', '亨利')
        page.fill('textarea[placeholder*="出生于公元13世纪"]', '我是亨利，乔恩之子，出生于公元13世纪的卢瓦尔河谷附近；我是一名被骗取了遗产的贫穷骑士。')
        page.locator('button:has-text("成为黑夜的生物")').click()
        page.wait_for_timeout(500)

    page.fill('textarea[placeholder*="好的经历格式"]', '我在沙漠中徘徊；沙下的梦里有查尔斯的触碰。')
    page.locator('button:has-text("完成这一回合")').click()
    page.wait_for_timeout(800)

    # 记忆 tab 内容
    panel = page.locator('div.card').last
    memories = panel.locator('div.border.border-amber-900\\/40.rounded.p-3')
    print(f'记忆卡片数: {memories.count()}')
    for i in range(memories.count()):
        title = memories.nth(i).locator('span.text-sm.title-serif').inner_text() if memories.nth(i).locator('span.text-sm.title-serif').count() else '(无标题)'
        exps = memories.nth(i).locator('ul li').count()
        print(f'  记忆{i}: {title} | 经历数={exps}')
        for j in range(exps):
            print(f'    - {memories.nth(i).locator("ul li").nth(j).inner_text()[:50]}')

    # 判断每段经历的来源
    print('\n=== 检查 addExperience 逻辑 ===')
    # 通过页面访问 store? 不行。用 localStorage 直接看
    save = page.evaluate('localStorage.getItem("tyov:save:v1")')
    import json
    g = json.loads(save)
    print('memories:', len(g['memories']))
    for m in g['memories']:
        print(f"  记忆 id={m['id'][:8]} exp数={len(m['experiences'])} title={m.get('title')}")
        for e in m['experiences']:
            print(f"    exp: {e['text'][:40]}")

    browser.close()