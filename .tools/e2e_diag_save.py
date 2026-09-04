# -*- coding: utf-8 -*-
"""Diagnose: 线上站点刷新后存档是否保留"""
from playwright.sync_api import sync_playwright
import json

EDGE = r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
URL = 'https://knink-owo.github.io/tyov-vampire/'

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=EDGE, headless=True)
    ctx = browser.new_context(viewport={'width': 1500, 'height': 1000})
    page = ctx.new_page()
    errors = []
    page.on('console', lambda m: errors.append(f"{m.type}: {m.text}") if m.type in ('error', 'warning') else None)
    page.on('pageerror', lambda e: errors.append(f"pageerror: {e}"))

    # 第一步：打开线上站点
    page.goto(URL, timeout=45000)
    page.wait_for_load_state('networkidle')
    page.wait_for_timeout(800)

    # 检查 localStorage 当前状态
    ls0 = page.evaluate('localStorage.length')
    print(f'1. 初始 localStorage 键数: {ls0}')

    # 快速建卡（必须全填才能点）
    page.locator('button:has-text("开始旅程")').click()
    page.wait_for_timeout(500)
    page.fill('input[placeholder*="亨利，乔恩之子"]', '刷新诊断者')
    page.fill('textarea[placeholder*="出生于公元13世纪"]', '我是刷新诊断者；我在测试数据能否跨越刷新。')
    page.fill('input[placeholder="例如：贡德尔，维京人"]', '贡德尔')
    page.fill('input[placeholder="例如：劳伦斯·霍尔穆勒，男爵的后裔"]', '劳伦斯')
    page.fill('input[placeholder="例如：米内尔家的女儿，出色的决斗者"]', '米内尔之女')
    page.fill('input[placeholder="例如：击剑"]', '击剑')
    page.fill('input[placeholder="例如：骑术"]', '骑术')
    page.fill('input[placeholder="例如：宫廷礼节"]', '宫廷礼节')
    page.fill('input[placeholder="例如：长船博克苏登"]', '长船')
    page.fill('input[placeholder="例如：祖传宝剑"]', '宝剑')
    page.fill('input[placeholder="例如：一块耕地"]', '耕地')
    page.fill('textarea[placeholder*="贡德尔带我第一次乘坐长船"]', '经历一；贡德尔的触碰让我安心。')
    page.fill('textarea[placeholder*="我在荒野中醒来"]', '经历二；风带来故土气息。')
    page.fill('textarea[placeholder*="向领主复仇"]', '经历三；火焰吞没庄园。')
    page.fill('input[placeholder="姓名 · 身份"]', '巴伦')
    page.fill('input[placeholder*="我的脖子永久破裂"]', '脖子破裂')
    page.fill('textarea[placeholder*="修道院的屋顶"]', '我在屋顶与他决斗；几乎死去。')
    page.locator('button:has-text("成为黑夜的生物")').click()
    page.wait_for_timeout(800)

    ls1 = page.evaluate('localStorage.length')
    keys1 = page.evaluate('Object.keys(localStorage)')
    print(f'2. 建卡后 localStorage 键数: {ls1} -> {keys1}')
    assert ls1 > 0, '建卡后 localStorage 应为空!'

    # 检查页面是否进入游戏
    in_game = page.locator('text=当前提示').count() > 0
    print(f'3. 已进入游戏视图: {in_game}')

    # 第二步：刷新（同 context，同 origin —— 模拟用户 F5）
    print('4. 刷新页面...')
    page.reload()
    page.wait_for_load_state('networkidle')
    page.wait_for_timeout(1000)

    ls2 = page.evaluate('localStorage.length')
    keys2 = page.evaluate('Object.keys(localStorage)')
    print(f'5. 刷新后 localStorage 键数: {ls2} -> {keys2}')

    # 刷新后应回到首页并显示"未竟之旅"
    ongoing = page.locator('text=未 竟 之 旅').count()
    name_on_home = page.locator('text=刷新诊断者').count()
    print(f'6. 首页显示未竟之旅: {ongoing} / 显示名字: {name_on_home}')

    # 第三步：关闭浏览器，重新打开（模拟完全重开）
    print('7. 关闭浏览器重新打开...')
    await_close = page.context.close()
    ctx2 = browser.new_context(viewport={'width': 1500, 'height': 1000})
    page2 = ctx2.new_page()
    page2.goto(URL, timeout=45000)
    page2.wait_for_load_state('networkidle')
    page2.wait_for_timeout(1000)
    ls3 = page2.evaluate('localStorage.length')
    ongoing2 = page2.locator('text=未 竟 之 旅').count()
    print(f'8. 重开后 localStorage 键数: {ls3}, 未竟之旅显示: {ongoing2}')

    print('\n=== 控制台信息 ===')
    print(errors if errors else '无')

    page2.context.close()
    browser.close()
    print('\n诊断完成')