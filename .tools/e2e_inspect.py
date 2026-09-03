# -*- coding: utf-8 -*-
"""Inspect rendered DOM structure of create view"""
from playwright.sync_api import sync_playwright

EDGE = r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=EDGE, headless=True)
    page = browser.new_page(viewport={'width': 1400, 'height': 1000})
    page.goto('http://127.0.0.1:5199/')
    page.wait_for_load_state('networkidle')
    page.wait_for_timeout(800)

    # 列出所有 input/textarea
    for el in page.locator('input, textarea').all():
        ph = el.get_attribute('placeholder') or ''
        cls = el.get_attribute('class') or ''
        print(f"<{el.evaluate('e => e.tagName')}> placeholder='{ph}' class='{cls[:50]}'")
    print('---')
    for b in page.locator('button').all():
        print('button:', b.inner_text().strip()[:40])
    browser.close()