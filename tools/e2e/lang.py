# -*- coding: utf-8 -*-
"""E2E: 语言切换（首页 / 教程 / 持久化）。"""
from playwright.sync_api import sync_playwright

from _common import EDGE, BASE_URL as URL, HERE

failures = []


def check(cond, msg):
    if not cond:
        failures.append(msg)


with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=EDGE, headless=True)
    page = browser.new_page(viewport={'width': 1400, 'height': 1000})
    errors = []
    page.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None)
    page.on('pageerror', lambda e: errors.append(str(e)))

    # 1) 强制英文首屏
    page.goto(URL + '?lang=en')
    page.wait_for_load_state('networkidle')
    page.evaluate('localStorage.clear()')
    page.goto(URL + '?lang=en')
    page.wait_for_load_state('networkidle')

    lang = page.evaluate('document.documentElement.lang')
    check(lang == 'en', f'documentElement.lang = {lang!r}, expected en')
    body = page.inner_text('body')
    check('Begin your journey' in body, 'english hero button missing')
    check('开始旅程' not in body, 'chinese leaked into english home')
    page.screenshot(path=str(HERE / 'lang-en-home.png'), full_page=True)

    # 2) 切换到中文
    page.get_by_role('button', name='中文').first.click()
    page.wait_for_timeout(400)
    body = page.inner_text('body')
    check('开始旅程' in body, 'chinese hero button missing after switch')
    check(page.evaluate('document.documentElement.lang') == 'zh-CN', 'html lang not switched to zh-CN')
    check(page.evaluate("localStorage.getItem('tyov:lang:v1')") == 'zh', 'locale preference not persisted')

    # 3) 教程页跟随语言
    page.get_by_role('button', name='阅读教程').first.click()
    page.wait_for_timeout(300)
    check('游戏简介与游玩所需' in page.inner_text('body'), 'chinese tutorial chapter missing')

    # 4) 切回英文并刷新，偏好保持
    page.get_by_role('button', name='EN').first.click()
    page.wait_for_timeout(400)
    check('About the game and what you need' in page.inner_text('body'), 'english tutorial chapter missing')
    page.screenshot(path=str(HERE / 'lang-en-tutorial.png'), full_page=True)

    page.get_by_role('button', name='← Back').first.click()
    page.wait_for_timeout(300)
    page.get_by_role('button', name='Begin your journey').first.click()
    page.wait_for_timeout(400)
    check('Of Mortal Birth' in page.inner_text('body'), 'english create view missing')
    page.screenshot(path=str(HERE / 'lang-en-create.png'), full_page=True)
    page.goto(URL)
    page.wait_for_load_state('networkidle')
    page.reload()
    page.wait_for_load_state('networkidle')
    check('Begin your journey' in page.inner_text('body'), 'english not kept after reload')

    if errors:
        failures.append('console errors: ' + ' | '.join(errors[:5]))

    browser.close()

if failures:
    print('FAILED')
    for f in failures:
        print(' -', f)
    raise SystemExit(1)
print('lang e2e OK')
