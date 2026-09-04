# -*- coding: utf-8 -*-
"""Verify P2 features live on GitHub Pages"""
from playwright.sync_api import sync_playwright

EDGE = r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
URL = 'https://knink-owo.github.io/tyov-vampire/'

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=EDGE, headless=True)
    page = browser.new_page(viewport={'width': 1500, 'height': 1100})
    errs = []
    page.on('pageerror', lambda e: errs.append(str(e)[:150]))

    page.goto(URL, timeout=45000)
    page.wait_for_load_state('networkidle')
    page.wait_for_timeout(800)

    print('标题:', page.title())
    page.locator('button:has-text("开始旅程")').click()
    page.wait_for_timeout(500)
    page.fill('input[placeholder*="亨利，乔恩之子"]', '线上验证者')
    page.fill('textarea[placeholder*="出生于公元13世纪"]', '我是线上验证者；我检查新版本。')
    mm = page.locator('input[placeholder="例如：贡德尔，维京人"], input[placeholder="例如：劳伦斯·霍尔穆勒，男爵的后裔"], input[placeholder="例如：米内尔家的女儿，出色的决斗者"]')
    for i in range(mm.count()): mm.nth(i).fill(f'凡人{i+1}')
    ss = page.locator('input[placeholder="例如：击剑"], input[placeholder="例如：骑术"], input[placeholder="例如：宫廷礼节"]')
    for i in range(ss.count()): ss.nth(i).fill(f'技能{i+1}')
    rr = page.locator('input[placeholder="例如：长船博克苏登"], input[placeholder="例如：祖传宝剑"], input[placeholder="例如：一块耕地"]')
    for i in range(rr.count()): rr.nth(i).fill(f'资源{i+1}')
    ee = page.locator('textarea[placeholder^="例如：贡德尔带我"], textarea[placeholder^="例如：我在荒野"], textarea[placeholder^="例如：我向领主"]')
    for i in range(ee.count()): ee.nth(i).fill(f'经历{i+1}；风带来故土气息。')
    page.fill('input[placeholder="姓名 · 身份"]', '巴伦')
    page.fill('input[placeholder*="我的脖子永久破裂"]', '脖子永久破裂')
    page.fill('textarea[placeholder*="修道院的屋顶"]', '我决斗。')
    page.locator('button:has-text("成为黑夜的生物")').click()
    page.wait_for_timeout(900)

    # P2-① 效果执行区
    effect_panel = page.locator('text=效 果 执 行').count()
    input_btn = page.locator('button:has-text("填写 ▾")').count()
    select_btn = page.locator('button:has-text("选择 ▾")').count()
    print(f'效果执行区: {effect_panel > 0} / 填写按钮: {input_btn} / 选择按钮: {select_btn}')

    # 结束旅程文案
    page.on('dialog', lambda d: print('确认弹窗:', d.message[:40]) or d.accept())
    page.locator('button:has-text("结束旅程")').first.click()
    page.wait_for_timeout(1500)
    print('页面错误:', errs if errs else '无')
    browser.close()