# -*- coding: utf-8 -*-
"""E2E: 首页 → 建卡 → 游戏 → 历史 全流程"""
from playwright.sync_api import sync_playwright

EDGE = r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
URL = 'http://127.0.0.1:5199/'

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=EDGE, headless=True)
    page = browser.new_page(viewport={'width': 1400, 'height': 1000})
    errors = []
    page.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None)
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.goto(URL)
    page.wait_for_load_state('networkidle')
    page.wait_for_timeout(600)

    # 清数据，确保从空历史开始
    page.evaluate('localStorage.clear()')
    page.reload()
    page.wait_for_load_state('networkidle')
    page.wait_for_timeout(600)

    print('=== 1. 首页 ===')
    assert page.locator('text=千年吸血鬼').count() > 0, '首页标题缺失'
    print('标题 OK')
    for btn in ['开始旅程', '阅读教程', '翻阅历史']:
        assert page.locator(f'button:has-text("{btn}")').count() > 0, f'{btn} 按钮缺失'
    print('三个主按钮 OK')

    print('\n=== 2. 教程页 ===')
    page.locator('button:has-text("阅读教程")').click()
    page.wait_for_timeout(500)
    assert page.locator('text=游戏简介与游玩所需').count() > 0, '教程第一章缺失'
    assert page.locator('text=五种特征').count() > 0
    assert page.locator('text=游玩游戏').count() > 0
    assert page.locator('text=两种游戏风格').count() > 0
    assert page.locator('text=提示：简单回顾').count() > 0
    print('章节 OK（严格依规则书）')
    page.locator('button:has-text("你的吸血鬼：五种特征")').click()
    page.wait_for_timeout(300)
    assert page.locator('text=五个记忆槽，每段记忆可以包含至多三个经历').count() > 0, '特征展开失败'
    print('折叠展开 OK（含原文内容）')
    page.locator('button:has-text("← 返回")').click()
    page.wait_for_timeout(400)
    assert page.locator('text=开始旅程').count() > 0, '未能返回首页'
    print('返回首页 OK')

    print('\n=== 3. 建卡 ===')
    page.locator('button:has-text("开始旅程")').click()
    page.wait_for_timeout(500)
    assert page.locator('text=始于凡尘').count() > 0, '建卡页标题缺失'
    page.fill('input[placeholder*="亨利，乔恩之子"]', '艾德里克')
    page.fill('textarea[placeholder*="出生于公元13世纪"]', '我是艾德里克，卢瓦尔河谷的贫穷骑士；我的领地被夺走，我的姓氏被遗忘。')
    page.fill('input[placeholder*="姓名 · 一句话描述"] >> nth=0', '贡德尔，维京人')
    page.fill('input[placeholder*="击剑、骑术"]', '击剑')
    page.locator('button:has-text("成为黑夜的生物")').click()
    page.wait_for_timeout(600)
    assert page.locator('text=提示 1').count() > 0, '未进入游戏'
    print('建卡→游戏 OK')

    print('\n=== 4. 玩一回合 ===')
    page.fill('textarea[placeholder*="好的经历格式"]', '我在月下登船远行；贡德尔的触碰让我感到安心。')
    page.locator('button:has-text("完成这一回合")').click()
    page.wait_for_timeout(700)
    assert page.locator('text=骰 子 之 判').count() > 0, '骰子结果缺失'
    print('回合 OK')

    print('\n=== 5. 导航回首页（应显示未竟之旅） ===')
    page.locator('button:has-text("首页")').first.click()
    page.wait_for_timeout(500)
    assert page.locator('text=未 竟 之 旅').count() > 0, '未显示进行中旅程'
    assert page.locator('button:has-text("继续旅程")').count() > 0, '缺少继续按钮'
    print('首页显示进行中旅程 OK')

    print('\n=== 6. 历史记录 ===')
    page.locator('button:has-text("翻阅历史")').click()
    page.wait_for_timeout(500)
    assert page.locator('text=艾德里克').count() > 0, '历史中未见艾德里克'
    assert page.locator('text=仍在旅途').count() > 0, '状态标签错误'
    print('历史记录条目 OK')
    page.screenshot(path='D:/Projects/Thousand Year Old Vampire/.tools/shot_home_history.png', full_page=False)

    print('\n=== 7. 控制台错误 ===')
    print(errors if errors else '无')

    browser.close()
    print('\n首页流程 E2E 全部通过')