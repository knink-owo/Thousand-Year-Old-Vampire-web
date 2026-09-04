# -*- coding: utf-8 -*-
"""E2E on live GitHub Pages deployment"""
from playwright.sync_api import sync_playwright

EDGE = r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
URL = 'https://knink-owo.github.io/tyov-vampire/'

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=EDGE, headless=True, proxy={'server': 'http://127.0.0.1:7890'} if True else None)
    # 尝试不带代理直连（Edge 走系统代理）——Playwright 用系统代理更稳
    browser.close()
    browser = p.chromium.launch(executable_path=EDGE, headless=True)
    page = browser.new_page(viewport={'width': 1400, 'height': 1000})
    errors = []
    page.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None)
    page.on('pageerror', lambda e: errors.append(str(e)))
    try:
        page.goto(URL, timeout=45000)
        page.wait_for_load_state('networkidle')
        page.wait_for_timeout(1200)
        print('标题:', page.title())
        print('首页主按钮:', page.locator('button:has-text("开始旅程")').count(), '/', page.locator('button:has-text("阅读教程")').count(), '/', page.locator('button:has-text("翻阅历史")').count())
        # 走一遍教程（不建卡，避免污染线上）
        page.locator('button:has-text("阅读教程")').click()
        page.wait_for_timeout(600)
        print('教程六章:', page.locator('text=游戏简介与游玩所需').count(), page.locator('text=你的吸血鬼：五种特征').count(), page.locator('text=创建吸血鬼').count(), page.locator('text=两种游戏风格').count())
        page.screenshot(path='D:/Projects/Thousand Year Old Vampire/.tools/live_site.png', full_page=False)
    except Exception as e:
        print('页面加载异常:', str(e)[:200])
    print('\n控制台错误:', errors if errors else '无')
    browser.close()