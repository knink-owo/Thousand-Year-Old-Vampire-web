# -*- coding: utf-8 -*-
"""审查冒烟 E2E：核心规则路径验证（dev server http://127.0.0.1:5199）"""
from playwright.sync_api import sync_playwright
import json

EDGE = r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
URL = 'http://127.0.0.1:5199/'

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=EDGE, headless=True)
    page = browser.new_page(viewport={'width': 1500, 'height': 1200})
    errors = []
    page.on('console', lambda m: errors.append(f"{m.type}: {m.text[:120]}") if m.type in ('error', 'warning') else None)
    page.on('pageerror', lambda e: errors.append(f"pageerror: {str(e)[:150]}"))

    page.goto(URL)
    page.wait_for_load_state('networkidle')
    page.wait_for_timeout(600)
    page.evaluate('localStorage.clear()')
    page.reload()
    page.wait_for_load_state('networkidle')
    page.wait_for_timeout(600)

    # ---- 建卡 ----
    print('=== 1. 建卡 ===')
    page.locator('button:has-text("开始旅程")').click()
    page.wait_for_timeout(500)
    page.fill('input[placeholder*="亨利，乔恩之子"]', '审查者')
    page.fill('textarea[placeholder*="出生于公元13世纪"]', '我是审查者；我横跨千年来检查这段代码。')
    for i in range(3):
        page.fill(f'input[placeholder="例如：贡德尔，维京人"] >> nth={i}' if i == 0 else f'input[placeholder="例如：劳伦斯·霍尔穆勒，男爵的后裔"] >> nth={0}', f'凡人{i+1}') if False else None
    # 用通用方式：三个凡人占位符各不相同，依序填
    mm = page.locator('input[placeholder="例如：贡德尔，维京人"], input[placeholder="例如：劳伦斯·霍尔穆勒，男爵的后裔"], input[placeholder="例如：米内尔家的女儿，出色的决斗者"]')
    for i in range(mm.count()):
        mm.nth(i).fill(f'凡人{i+1}')
    ss = page.locator('input[placeholder="例如：击剑"], input[placeholder="例如：骑术"], input[placeholder="例如：宫廷礼节"]')
    for i in range(ss.count()):
        ss.nth(i).fill(f'技能{i+1}')
    rr = page.locator('input[placeholder="例如：长船博克苏登"], input[placeholder="例如：祖传宝剑"], input[placeholder="例如：一块耕地"]')
    for i in range(rr.count()):
        rr.nth(i).fill(f'资源{i+1}')
    ee = page.locator('textarea[placeholder^="例如：贡德尔带我"], textarea[placeholder^="例如：我在荒野"], textarea[placeholder^="例如：我向领主"]')
    for i in range(ee.count()):
        ee.nth(i).fill(f'经历{i+1}；风带来了故土的气息。')
    page.fill('input[placeholder="姓名 · 身份"]', '巴伦')
    page.fill('input[placeholder*="我的脖子永久破裂"]', '脖子永久破裂')
    page.fill('textarea[placeholder*="修道院的屋顶"]', '我在屋顶与他决斗；几乎死去。')
    page.locator('button:has-text("成为黑夜的生物")').click()
    page.wait_for_timeout(800)
    assert '提示 1' in page.locator('body').inner_text(), '未进入游戏'
    print('   进入游戏 OK')

    # ---- 玩一回合（提示1:第一条目要求经历）----
    print('=== 2. 回合推进（4回合，触发岁月流逝） ===')
    for i in range(4):
        t = page.locator('textarea[placeholder*="好的经历格式"]')
        if t.count():
            t.fill(f'第{i+1}回合经历；我以沉默回应。')
            page.locator('button:has-text("完成这一回合，掷出命运之骰")').click()
            page.wait_for_timeout(600)
        else:
            print(f'   !! 第{i+1}回合未找到经历框（可能提示要求跳过或界面异常）')
            break
    aging_panel = page.locator('text=岁 月 流 逝').count()
    print(f'   4回合后"岁月流逝"面板: {aging_panel > 0}')

    # ---- 检查 localstorage 各键规模（全量快照膨胀检查）----
    print('=== 3. localStorage 规模 ===')
    info = page.evaluate('''Object.fromEntries(Object.keys(localStorage).map(k => [k, localStorage.getItem(k).length]))''')
    for k, v in info.items():
        print(f'   {k}: {v} 字符')

    # ---- 历史回顾页（快照）----
    print('=== 4. 历史 → 回顾 ===')
    page.locator('button:has-text("历史")').first.click()
    page.wait_for_timeout(600)
    review_btn = page.locator('button:has-text("回顾")')
    print(f'   回顾按钮: {review_btn.count()} (禁用=旧记录无快照)')
    if review_btn.count() and not review_btn.first.is_disabled():
        review_btn.first.click()
        page.wait_for_timeout(800)
        snapshot_view = page.locator('text=回顾 · 审查者').count()
        print(f'   回顾页显示: {snapshot_view > 0}')
        # 只读性：回顾页无“遗忘/勾选”操作按钮
        mutating = page.locator('button:has-text("遗忘"), button:has-text("勾选"), button:has-text("失去")').count()
        print(f'   回顾页变异按钮数(应为0): {mutating}')
    else:
        print('   !! 回顾按钮缺失或禁用（快照未生成）')

    print('\n=== 控制台错误 ===')
    print(errors if errors else '无')
    browser.close()
    print('\n审查冒烟完成')