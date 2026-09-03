# -*- coding: utf-8 -*-
"""E2E: 刷新后首页展示未竟之旅 + 继续旅程续玩"""
from playwright.sync_api import sync_playwright

EDGE = r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
URL = 'http://127.0.0.1:5199/'

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=EDGE, headless=True)
    page = browser.new_page(viewport={'width': 1400, 'height': 1000})
    errors = []
    page.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None)
    page.on('pageerror', lambda e: errors.append(str(e)))

    ctx = page.context
    # 用有存档的存储环境：先建一个存档（复用之前 e2e_home 留下的 localStorage 会共享？headless 每次新 context 是隔离的）
    # 因此：先走一遍建卡流程，然后刷新，验证首页。
    page.goto(URL)
    page.wait_for_load_state('networkidle')
    page.wait_for_timeout(500)
    # 清空并建卡
    page.evaluate('localStorage.clear()')
    page.reload()
    page.wait_for_load_state('networkidle')
    page.wait_for_timeout(500)
    page.locator('button:has-text("开始旅程")').click()
    page.wait_for_timeout(400)
    page.fill('input[placeholder*="亨利，乔恩之子"]', '沃尔特')
    page.fill('textarea[placeholder*="出生于公元13世纪"]', '我是沃尔特，十字军东征时期的随军铁匠；马鞍下压着我母亲的银十字。')
    page.locator('button:has-text("成为黑夜的生物")').click()
    page.wait_for_timeout(600)
    page.fill('textarea[placeholder*="好的经历格式"]', '第一夜的狩猎让我战栗；我饮下了第一个人的血。')
    page.locator('button:has-text("完成这一回合")').click()
    page.wait_for_timeout(700)

    print('=== 刷新（模拟重新打开应用） ===')
    page.reload()
    page.wait_for_load_state('networkidle')
    page.wait_for_timeout(600)
    assert page.locator('text=未 竟 之 旅').count() > 0, '刷新后首页未显示未竟之旅'
    assert page.locator('text=沃尔特').count() > 0, '未显示名字'
    print('首页展示未竟之旅 OK')

    print('=== 继续旅程 ===')
    page.locator('button:has-text("继续旅程")').first.click()
    page.wait_for_timeout(600)
    assert page.locator('text=提示 1').count() > 0 or page.locator('text=当前提示').count() > 0, '未能进入游戏继续'
    print('继续旅程 OK')

    print('=== 顶部导航可用 ===')
    page.locator('button:has-text("历史")').first.click()
    page.wait_for_timeout(500)
    assert page.locator('text=沃尔特').count() > 0, '历史页丢失'
    print('历史导航 OK')

    print('\n控制台错误:', errors if errors else '无')
    browser.close()
    print('\n续玩 E2E 通过')