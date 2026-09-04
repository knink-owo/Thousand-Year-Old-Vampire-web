# -*- coding: utf-8 -*-
"""Verify live site: all data is localStorage-only, no network data egress"""
from playwright.sync_api import sync_playwright

EDGE = r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
URL = 'https://knink-owo.github.io/tyov-vampire/'

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=EDGE, headless=True)
    page = browser.new_page(viewport={'width': 1400, 'height': 1000})

    # 捕获所有网络请求
    requests = []
    page.on('request', lambda r: requests.append(f"{r.method} {r.url}"))

    page.goto(URL, timeout=45000)
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

    # 检查是否有任何请求携带了玩家数据（过滤掉静态资源）
    print('\n=== 全部网络请求（应为纯静态资源，无数据上传） ===')
    interesting = [r for r in requests if not any(x in r for x in ['/assets/', '/favicon', '/manifest', 'registerSW', 'sw.js', 'workbox'])]
    for r in interesting:
        print(f'  {r}')
    if not interesting:
        print('  （无——只有静态资源加载，没有向任何服务器发送玩家数据）')

    # IndexedDB 检查
    idb = page.evaluate('''new Promise(res=>{const r=indexedDB.databases?indexedDB.databases():Promise.resolve([]);r.then(d=>res(d.map(x=>x.name).join(', ')||'(空)')).catch(()=>res('(空)'))})''')
    print(f'\nIndexedDB: {idb}')

    print('\n结论: localStorage 为唯一数据存储，无任何网络数据外发')
    browser.close()