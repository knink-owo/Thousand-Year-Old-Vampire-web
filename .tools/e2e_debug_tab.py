# -*- coding: utf-8 -*-
"""Debug resource tab buttons"""
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

    # 列出重叠 tab 按钮类名
    tabs = page.locator('div.card button')
    for i in range(tabs.count()):
        t = tabs.nth(i)
        print(f"button[{i}]: '{t.inner_text().strip()}' class='{t.get_attribute('class')}'")

    # 点击资源 tab（用确切文本匹配）
    page.locator('button', has_text='资源').first.click()
    page.wait_for_timeout(400)
    print('\n点击“资源 (1)”后, 面板内按钮:')
    btns = page.locator('div.card button')
    for i in range(btns.count()):
        b = btns.nth(i)
        print(f"  button[{i}]: '{b.inner_text().strip()}'")

    browser.close()