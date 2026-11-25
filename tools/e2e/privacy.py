# -*- coding: utf-8 -*-
"""Verify live site: localStorage-only, no unexpected network egress.

若站点启用了可选统计（Umami），把统计主机名放进环境变量再跑：
    UMAMI_HOST=analytics.example.com python tools/e2e/privacy.py
未设置时，任何非静态资源请求都视为异常。
"""
import os
from playwright.sync_api import sync_playwright
from _common import EDGE, LIVE_URL

ALLOW = os.environ.get('UMAMI_HOST', '').strip()

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=EDGE, headless=True)
    page = browser.new_page(viewport={'width': 1400, 'height': 1000})

    # 捕获所有网络请求
    requests = []
    page.on('request', lambda r: requests.append(f"{r.method} {r.url}"))

    page.goto(LIVE_URL, timeout=45000)
    page.wait_for_load_state('networkidle')
    page.wait_for_timeout(800)

    # 玩一局：建卡 + 一回合（数据会写入 localStorage）
    page.locator('button:has-text("开始旅程")').click()
    page.wait_for_timeout(500)
    page.fill('input[placeholder*="亨利，乔恩之子"]', '线上验证者')
    page.fill('textarea[placeholder*="出生于公元13世纪"]', '我是线上验证者，出生在数据之海的彼岸；我的记忆只属于我自己的浏览器。')
    page.locator('button:has-text("成为黑夜的生物")').click()
    page.wait_for_timeout(600)
    page.fill('textarea[placeholder*="好的经历格式"]', '夜色里我写下一行字；它没有被发送到任何地方。')
    page.locator('button:has-text("完成这一回合")').click()
    page.wait_for_timeout(700)

    # 检查 localStorage（这是所有数据的家）
    keys = page.evaluate('Object.keys(localStorage)')
    sizes = page.evaluate('''Object.fromEntries(Object.keys(localStorage).map(k => [k, localStorage.getItem(k).length]))''')
    print('=== localStorage 键与大小 ===')
    for k in keys:
        print(f'  {k}: {sizes[k]} 字符')

    # 过滤静态资源与（可选的）统计请求
    static = ['/assets/', '/favicon', '/manifest', 'registerSW', 'sw.js', 'workbox']
    interesting = [
        r for r in requests
        if not any(x in r for x in static) and not (ALLOW and ALLOW in r)
    ]
    print('\n=== 非静态资源请求（应为空；启用统计时仅允许 UMAMI_HOST） ===')
    if interesting:
        for r in interesting:
            print(f'  {r}')
    else:
        print('  （无——没有向任何服务器发送玩家数据）')

    # IndexedDB 检查
    idb = page.evaluate('''new Promise(res=>{const r=indexedDB.databases?indexedDB.databases():Promise.resolve([]);r.then(d=>res(d.map(x=>x.name).join(', ')||'(空)')).catch(()=>res('(空)'))})''')
    print(f'\nIndexedDB: {idb}')

    print('\n结论: localStorage 为唯一数据存储；' + ('除统计请求外无数据外发' if ALLOW else '无任何网络数据外发'))
    if interesting:
        raise SystemExit(1)
    browser.close()
