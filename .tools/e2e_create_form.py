# -*- coding: utf-8 -*-
"""E2E: 建卡表单新交互（×清空不删除、全填才可开始、逐格placeholder）"""
from playwright.sync_api import sync_playwright

EDGE = r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
URL = 'http://127.0.0.1:5199/'

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=EDGE, headless=True)
    page = browser.new_page(viewport={'width': 1500, 'height': 1400})
    errors = []
    page.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None)
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.goto(URL)
    page.wait_for_load_state('networkidle')
    page.wait_for_timeout(600)
    page.evaluate('localStorage.clear(); location.reload()')
    page.wait_for_load_state('networkidle')
    page.wait_for_timeout(600)
    page.locator('button:has-text("开始旅程")').click()
    page.wait_for_timeout(500)

    print('=== 1. 无"加"按钮 ===')
    for txt in ['＋ 加一项', '＋ 加一位凡人', '＋ 加一段经历']:
        n = page.locator(f'button:has-text("{txt}")').count()
        print(f'   {txt}: {n} (预期 0)')
        assert n == 0, f'{txt} 应被删除'

    print('\n=== 2. × 清空而非删除 ===')
    skills = page.locator('input[placeholder="例如：击剑"]')
    assert skills.count() == 1, '技能格1不存在'
    skills.fill('剑术')
    page.locator('input[placeholder="例如：击剑"] ~ button, div.flex.gap-2.mb-2 >> nth=0').click() if False else None
    # 点击技能第一格的 ×（其所在行的最后一个 button）
    row = page.locator('input[placeholder="例如：击剑"]').locator('xpath=ancestor::div[contains(@class,"flex gap-2")][1]')
    row.locator('button').click()
    page.wait_for_timeout(200)
    val = page.locator('input[placeholder="例如：击剑"]').input_value()
    print(f'   点击×后技能格1内容: "{val}" (应为空)')
    assert val == '', '× 应清空内容'
    cnt = page.locator('input[placeholder="例如：击剑"]').count()
    print(f'   技能格1仍存在: {cnt == 1}')
    assert cnt == 1, '× 不应删除输入框'

    print('\n=== 3. 逐格 placeholder ===')
    print('   技能:',
          page.locator('input[placeholder="例如：击剑"]').count(),
          page.locator('input[placeholder="例如：骑术"]').count(),
          page.locator('input[placeholder="例如：宫廷礼节"]').count())
    print('   资源:',
          page.locator('input[placeholder="例如：长船博克苏登"]').count(),
          page.locator('input[placeholder="例如：祖传宝剑"]').count(),
          page.locator('input[placeholder="例如：一块耕地"]').count())
    print('   凡人:',
          page.locator('input[placeholder="例如：贡德尔，维京人"]').count(),
          page.locator('input[placeholder="例如：劳伦斯·霍尔穆勒，男爵的后裔"]').count(),
          page.locator('input[placeholder="例如：米内尔家的女儿，出色的决斗者"]').count())
    assert page.locator('input[placeholder="例如：骑术"]').count() == 1

    print('\n=== 4. 全填才可开始 ===')
    btn = page.locator('button:has-text("成为黑夜的生物")')
    assert btn.is_disabled(), '未填完时应禁用'
    print('   初始禁用 OK')
    # 只填姓名+概述，仍禁用
    page.fill('input[placeholder*="亨利，乔恩之子"]', '艾德里克')
    page.fill('textarea[placeholder*="出生于公元13世纪"]', '我是艾德里克，卢瓦尔河谷的贫穷骑士；我的领地被夺走。')
    page.wait_for_timeout(200)
    assert btn.is_disabled(), '只填部分时应仍禁用'
    print('   部分填写仍禁用 OK')
    # 填写全部
    page.fill('input[placeholder="例如：贡德尔，维京人"]', '贡德尔')
    page.fill('input[placeholder="例如：劳伦斯·霍尔穆勒，男爵的后裔"]', '劳伦斯')
    page.fill('input[placeholder="例如：米内尔家的女儿，出色的决斗者"]', '米内尔之女')
    page.fill('input[placeholder="例如：击剑"]', '击剑')
    page.fill('input[placeholder="例如：骑术"]', '骑术')
    page.fill('input[placeholder="例如：宫廷礼节"]', '宫廷礼节')
    page.fill('input[placeholder="例如：长船博克苏登"]', '长船')
    page.fill('input[placeholder="例如：祖传宝剑"]', '宝剑')
    page.fill('input[placeholder="例如：一块耕地"]', '耕地')
    for i, ph in enumerate(['例如：贡德尔带我第一次乘坐长船博克苏登出海；当我们首次航行到看不见陆地时，他的触碰让我感到安心。',
                            '例如：我在荒野中醒来；风带来了故土的气息。',
                            '例如：我向领主复仇，火焰吞没了他的庄园。']):
        page.fill(f'textarea[placeholder="{ph}"]', f'经历{i+1}文字')
    page.fill('input[placeholder="姓名 · 身份"]', '巴伦·霍尔穆勒')
    page.fill('input[placeholder*="我的脖子永久破裂"]', '脖子永久破裂')
    page.fill('textarea[placeholder*="修道院的屋顶上与阴森的巴伦"]', '我在屋顶决斗差点死去。')
    page.wait_for_timeout(300)
    print(f'   全部填完可点击: {not btn.is_disabled()}')
    assert not btn.is_disabled(), '全部填完后应可点击'

    # 清空一项后应重新禁用
    row = page.locator('input[placeholder="例如：骑术"]').locator('xpath=ancestor::div[contains(@class,"flex gap-2")][1]')
    row.locator('button').click()
    page.wait_for_timeout(200)
    print(f'   清空一项后禁用: {btn.is_disabled()}')
    assert btn.is_disabled(), '清空任意一项后应重新禁用'

    print('\n=== 5. 控制台错误 ===')
    print(errors if errors else '无')

    browser.close()
    print('\n建卡新交互 E2E 全部通过')