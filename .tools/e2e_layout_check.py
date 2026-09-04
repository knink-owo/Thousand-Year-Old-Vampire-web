# -*- coding: utf-8 -*-
"""验证：效果执行"填写"浮层布局（不再拉长竖过来）"""
from playwright.sync_api import sync_playwright

EDGE = r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
URL = 'http://127.0.0.1:5199/'

with sync_playwright() as p:
    b = p.chromium.launch(executable_path=EDGE, headless=True)
    ctx = b.new_context(viewport={'width': 1400, 'height': 1100})
    page = ctx.new_page()
    page.goto(URL)
    page.wait_for_load_state('networkidle')
    page.wait_for_timeout(600)
    page.evaluate('localStorage.clear()')
    page.reload()
    page.wait_for_load_state('networkidle')
    page.wait_for_timeout(600)
    page.locator('button:has-text("开始旅程")').click()
    page.wait_for_timeout(500)
    page.fill('input[placeholder*="亨利，乔恩之子"]', '布局验证者')
    page.fill('textarea[placeholder*="出生于公元13世纪"]', '我是布局验证者。')
    mm = page.locator('input[placeholder="例如：贡德尔，维京人"], input[placeholder="例如：劳伦斯·霍尔穆勒，男爵的后裔"], input[placeholder="例如：米内尔家的女儿，出色的决斗者"]')
    for i in range(mm.count()): mm.nth(i).fill(f'凡人{i+1}')
    ss = page.locator('input[placeholder="例如：击剑"], input[placeholder="例如：骑术"], input[placeholder="例如：宫廷礼节"]')
    for i in range(ss.count()): ss.nth(i).fill(f'技能{i+1}')
    rr = page.locator('input[placeholder="例如：长船博克苏登"], input[placeholder="例如：祖传宝剑"], input[placeholder="例如：一块耕地"]')
    for i in range(rr.count()): rr.nth(i).fill(f'资源{i+1}')
    ee = page.locator('textarea[placeholder^="例如：贡德尔带我"], textarea[placeholder^="例如：我在荒野"], textarea[placeholder^="例如：我向领主"]')
    for i in range(ee.count()): ee.nth(i).fill(f'经历{i+1}')
    page.fill('input[placeholder="姓名 · 身份"]', '巴伦')
    page.fill('input[placeholder*="我的脖子永久破裂"]', '脖子破裂')
    page.fill('textarea[placeholder*="修道院的屋顶"]', '我决斗。')
    page.locator('button:has-text("成为黑夜的生物")').click()
    page.wait_for_timeout(900)

    # 点击第一个"填写"按钮（获得技能：嗜血 → input 模式）
    fill_btn = page.locator('button:has-text("填写 ▾")').first
    fill_btn.click()
    page.wait_for_timeout(400)

    # 测量：输入框与效果区卡片的几何关系
    box = page.evaluate('''() => {
      const input = document.querySelector('input[placeholder*="技能名"]');
      if (!input) return null;
      const card = input.closest('.card');
      const r1 = input.getBoundingClientRect();
      const r2 = card.getBoundingClientRect();
      return {
        inputW: Math.round(r1.width),
        cardW: Math.round(r2.width),
        ratio: (r1.width / r2.width).toFixed(2),
        inputTop: Math.round(r1.top),
        inputLeft: Math.round(r1.left),
        cardTop: Math.round(r2.top),
      };
    }''')
    print('输入框几何:', box)
    if box:
        print(f'输入框宽度/卡片宽度 = {box["ratio"]}（应 ≈0.8~0.95，即横向正常）')
        # 输入框应在卡片内部且宽度占卡片主体（排除 ✠ 图标列宽度）
        assert 0.6 <= float(box['ratio']) <= 0.98, f'宽度比例异常: {box["ratio"]}'
        print('✓ 输入浮层横跨内容列，未被拉长/竖排')
    else:
        print('!! 输入框未找到')

    # 输入并确认，验证功能仍正常
    page.fill('input[placeholder*="技能名"]', '测试技能')
    page.locator('button:has-text("确认")').click()
    page.wait_for_timeout(500)
    has_skill = page.evaluate('localStorage.getItem("tyov:save:v1")').find('测试技能') >= 0
    print(f'确认后技能添加: {has_skill}')
    assert has_skill, '布局修复后功能应正常'

    print('页面错误: ', end='')
    ctx.close()
    b.close()
    print('布局验证完成')