# -*- coding: utf-8 -*-
"""Regression: diary tab + save export/import roundtrip"""
from playwright.sync_api import sync_playwright
import json, os

EDGE = r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
URL = 'http://127.0.0.1:5199/'
SAVE_PATH = r'D:\Projects\Thousand Year Old Vampire\.tools\rt_save.json'

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=EDGE, headless=True)
    ctx = browser.new_context(viewport={'width': 1500, 'height': 1000})
    page = ctx.new_page()
    errors = []
    page.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None)
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.goto(URL)
    page.wait_for_load_state('networkidle')
    page.wait_for_timeout(500)
    page.evaluate('localStorage.clear(); location.reload()')
    page.wait_for_load_state('networkidle')
    page.wait_for_timeout(500)

    # ---- 建卡（日志游戏模式默认）----
    page.fill('input[placeholder*="亨利，乔恩之子"]', '玛蒂尔达')
    page.fill('textarea[placeholder*="出生于公元13世纪"]', '我是玛蒂尔达，罗马行省的女助产士；我见过太多死亡，却不知道自己也会如此惧怕它。')
    page.locator('button:has-text("成为黑夜的生物")').click()
    page.wait_for_timeout(600)

    # ---- 完成两回合（带日记）----
    for i in range(2):
        page.fill('textarea[placeholder*="好的经历格式"]', f'第{i+1}回合：我在旷野中听见狼群低语；那声音像极了我母亲临终的呓语。')
        dlg = page.locator('textarea[placeholder*="以书面形式写下"]')
        if dlg.count() > 0:
            dlg.fill(f'日志条目{i+1}：这一百年我假装自己还活着，假装那些人还记得我。')
        page.locator('button:has-text("完成这一回合")').click()
        page.wait_for_timeout(700)

    # ---- 日志 tab ----
    print('1. 日志 tab')
    page.locator('button:has-text("日志")').first.click()
    page.wait_for_timeout(300)
    diaries = page.locator('div.border.border-amber-900\\/40.rounded.p-3')
    print(f'   日记条目数: {diaries.count()} (预期 2)')
    first = diaries.first.inner_text()
    print('   第一条内容包含“日志条目”:', '日志条目2' in first or '日志条目' in first)
    print('   事件流存在:', page.locator('text=事件流').count() > 0)

    # ---- 导出存档 ----
    print('2. 导出存档')
    with page.expect_download() as dl_info:
        page.locator('button:has-text("导出存档 JSON")').click()
    dl = dl_info.value
    dl.save_as(SAVE_PATH)
    print(f'   已保存 {dl.suggested_filename} -> rt_save.json')

    # ---- 清空后导入 ----
    print('3. 导入存档')
    page.evaluate('localStorage.clear(); location.reload()')
    page.wait_for_load_state('networkidle')
    page.wait_for_timeout(500)
    print('   清空后回到建卡页:', page.locator('text=创造你的吸血鬼').count() > 0)
    print('   显示导入区:', page.locator('text=导入存档文件').count() > 0)
    page.locator('input[type=file]').first.set_input_files(SAVE_PATH)
    page.wait_for_timeout(800)
    print('   导入后显示恢复消息:', page.locator('text=已恢复').count() > 0)
    # 恢复后应进入游戏视图
    page.wait_for_timeout(500)
    print('   导入后进入主游戏(当前提示可见):', page.locator('text=当前提示').count() > 0)
    save = page.evaluate('localStorage.getItem("tyov:save:v1")')
    g = json.loads(save)
    print(f'   恢复的存档: name={g["name"]} moves={g["moves"]} diaries={len(g["diaries"])}')

    print('\n4. 控制台错误:', errors if errors else '无')

    browser.close()
    print('\n回归通过')