# -*- coding: utf-8 -*-
"""Diagnose legado (live site current deploy): 刷新后存档是否保留"""
from playwright.sync_api import sync_playwright
import json

EDGE = r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
URL = 'https://knink-owo.github.io/tyov-vampire/'

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=EDGE, headless=True)
    ctx = browser.new_context(viewport={'width': 1500, 'height': 1000})
    page = ctx.new_page()
    errors = []
    page.on('console', lambda m: errors.append(f"{m.type}: {m.text[:120]}") if m.type in ('error', 'warning') else None)
    page.on('pageerror', lambda e: errors.append(f"pageerror: {str(e)[:120]}"))

    page.goto(URL, timeout=45000)
    page.wait_for_load_state('networkidle')
    page.wait_for_timeout(800)

    print(f'1. 初始 localStorage: {page.evaluate("localStorage.length")} 键')

    # 线上旧版：只能看到旧的填写方式（有 +加 按钮）
    add_btns = page.locator('button:has-text("＋ 加")').count()
    print(f'2. 线上版本特征: "＋ 加"按钮数 = {add_btns} (0=新版, >0=旧版)')

    # 尝试填"凡人之名"和"第一段记忆"（两种版本都有的输入）
    page.locator('button:has-text("开始旅程")').click()
    page.wait_for_timeout(500)
    name_input = page.locator('input[placeholder*="亨利，乔恩之子"]')
    if name_input.count() == 0:
        # 旧版可能在首页直接建卡
        name_input = page.locator('input[placeholder*="亨利"]')
    origin_area = page.locator('textarea[placeholder*="出生于公元13世纪"]')
    if origin_area.count() == 0:
        origin_area = page.locator('textarea[placeholder*="我是亨利"]')
    print(f'   找到姓名框: {name_input.count()}, 记忆框: {origin_area.count()}')
    if name_input.count():
        name_input.first.fill('诊断者甲')
    if origin_area.count():
        origin_area.first.fill('我是诊断者甲；测试刷新后数据是否保留。')
    page.wait_for_timeout(200)

    # 点开始按钮（旧版只校验姓名+记忆）
    start_btn = page.locator('button:has-text("成为黑夜的生物")')
    disabled = start_btn.first.is_disabled() if start_btn.count() else None
    print(f'   开始按钮禁用状态: {disabled}')
    if start_btn.count() and not disabled:
        start_btn.first.click()
        page.wait_for_timeout(800)

    ls_after = page.evaluate('localStorage.length')
    keys = page.evaluate('Object.keys(localStorage)')
    print(f'3. 建卡后 localStorage: {ls_after} 键 -> {keys}')
    in_game = page.locator('text=当前提示').count() + page.locator('text=提示 1').count()
    print(f'4. 进入游戏视图: {in_game > 0}')

    if ls_after > 0:
        print('5. 刷新...')
        page.reload()
        page.wait_for_load_state('networkidle')
        page.wait_for_timeout(1000)
        ls2 = page.evaluate('localStorage.length')
        ongoing = page.locator('text=未 竟 之 旅').count() + page.locator('text=诊断者甲').count()
        print(f'6. 刷新后 localStorage: {ls2} 键; 首页未竟之旅/名字显示: {ongoing > 0}')

        print('7. 关闭重开...')
        ctx.close()
        ctx2 = browser.new_context(viewport={'width': 1500, 'height': 1000})
        page2 = ctx2.new_page()
        page2.goto(URL, timeout=45000)
        page2.wait_for_load_state('networkidle')
        page2.wait_for_timeout(1000)
        ls3 = page2.evaluate('localStorage.length')
        ongoing2 = page2.locator('text=未 竟 之 旅').count() + page2.locator('text=诊断者甲').count()
        print(f'8. 重开后 localStorage: {ls3} 键; 未竟之旅/名字: {ongoing2 > 0}')
        page2.context.close()

    print('\n=== 控制台 error/warning ===')
    print(errors if errors else '无')

    browser.close()
    print('\n诊断完成')