# -*- coding: utf-8 -*-
"""E2E: 效果执行四项增强（预设值/确认弹窗/互斥建议/行级撤回）"""
from playwright.sync_api import sync_playwright
import json

EDGE = r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
URL = 'http://127.0.0.1:5199/'

def fill_create(page, name='效果验证者'):
    page.goto(URL)
    page.wait_for_load_state('networkidle')
    page.wait_for_timeout(500)
    page.evaluate('localStorage.clear()')
    page.reload()
    page.wait_for_load_state('networkidle')
    page.wait_for_timeout(500)
    page.locator('button:has-text("开始旅程")').click()
    page.wait_for_timeout(400)
    page.fill('input[placeholder*="亨利，乔恩之子"]', name)
    page.fill('textarea[placeholder*="出生于公元13世纪"]', f'我是{name}；效果系统见证我的千年。')
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
        ee.nth(i).fill(f'经历{i+1}；风带来故土气息。')
    page.fill('input[placeholder="姓名 · 身份"]', '巴伦')
    page.fill('input[placeholder*="我的脖子永久破裂"]', '脖子永久破裂')
    page.fill('textarea[placeholder*="修道院的屋顶"]', '我决斗。')
    page.locator('button:has-text("成为黑夜的生物")').click()
    page.wait_for_timeout(900)


def submit_confirm(page):
    """点击当前输入浮层的提交按钮（输入框同行的确认）"""
    return page.evaluate('''() => {
      const input = document.querySelector('input[placeholder*="技能名"], input[placeholder*="凡人角色名"]');
      if (!input) return false;
      const btn = input.parentElement.querySelector('button');
      if (!btn) return false;
      btn.click();
      return true;
    }''')


with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=EDGE, headless=True)
    ctx = browser.new_context(viewport={'width': 1500, 'height': 1100})
    page = ctx.new_page()
    errs = []
    page.on('pageerror', lambda e: errs.append(str(e)[:150]))

    fill_create(page)

    print('=== 1. 预设值自动填充（技能"嗜血"） ===')
    page.locator('button:has-text("填写 ▾")').first.click()
    page.wait_for_timeout(300)
    val = page.locator('input[placeholder*="技能名"]').input_value()
    print(f'   打开"获得技能"浮层后输入框值: "{val}"（应为"嗜血"）')
    assert val == '嗜血', '预设值未自动填充'

    print('\n=== 2. 确认弹窗 + 不再提醒 ===')
    submit_confirm(page)
    page.wait_for_timeout(400)
    modal = page.locator('text=确认执行？').count()
    print(f'   确认弹窗出现: {modal > 0}')
    assert modal > 0, '确认弹窗未出现'
    page.locator('input[type="checkbox"]').check()
    page.locator('div.fixed button.btn-gold:has-text("确认")').click()
    page.wait_for_timeout(500)
    # 第二次打开填写（同一效果类型）→ 应跳过弹窗
    page.locator('button:has-text("填写 ▾")').first.click()
    page.wait_for_timeout(200)
    submit_confirm(page)
    page.wait_for_timeout(400)
    modal2 = page.locator('text=确认执行？').count()
    print(f'   勾选"不再提醒"后再次执行，弹窗被跳过: {modal2 == 0}')
    assert modal2 == 0, '不再提醒未生效'
    skipped_flag = page.evaluate('localStorage.getItem("tyov:confirm:gainSkill")')
    print(f'   记忆标记: {skipped_flag}')

    print('\n=== 3. 互斥条件建议 ===')
    sel = page.locator('li:has-text("杀死一个角色") button:has-text("选择 ▾")').first
    sel.click()
    page.wait_for_timeout(300)
    sugg = page.locator('text=规则书指示：无可用目标时改而').count()
    print(f'   有活角色时无互斥建议: {sugg == 0}')
    assert sugg == 0
    page.locator('li:has-text("杀死一个角色") button:has-text("收起")').click()
    page.wait_for_timeout(200)

    # 构造无活角色：把全部凡人标记 dead 后刷新
    page.evaluate('''() => {
      const raw = localStorage.getItem('tyov:save:v1');
      const g = JSON.parse(raw);
      for (const c of g.characters) { if (!c.immortal) c.dead = true; }
      localStorage.setItem('tyov:save:v1', JSON.stringify(g));
    }''')
    page.reload()
    page.wait_for_load_state('networkidle')
    page.wait_for_timeout(700)
    if page.locator('button:has-text("继续旅程")').count():
        page.locator('button:has-text("继续旅程")').first.click()
        page.wait_for_timeout(500)
    sel2 = page.locator('li:has-text("杀死一个角色") button:has-text("选择 ▾")').first
    sel2.click()
    page.wait_for_timeout(300)
    sugg2 = page.locator('text=规则书指示：无可用目标时改而').count()
    fb_btn = page.locator('button:has-text("创造凡人角色")').count()
    print(f'   无活角色时互斥建议出现: {sugg2 > 0} / 建议按钮(创造凡人角色): {fb_btn > 0}')
    assert sugg2 > 0 and fb_btn > 0, '互斥建议缺失'

    print('\n=== 4. 行级撤回 ===')
    page.locator('button:has-text("创造凡人角色")').first.click()
    page.wait_for_timeout(300)
    inp = page.locator('input[placeholder*="凡人角色名"]')
    if inp.count() == 0:
        inp = page.locator('input.input.text-sm')
    inp.fill('替补凡人')
    submit_confirm(page)
    page.wait_for_timeout(400)
    page.locator('div.fixed button.btn-gold:has-text("确认")').click()
    page.wait_for_timeout(600)

    g = json.loads(page.evaluate('localStorage.getItem("tyov:save:v1")'))
    has_replacement = any(c['name'] == '替补凡人' for c in g['characters'])
    print(f'   确认后角色创建: {has_replacement}')
    assert has_replacement, '角色未创建'

    undo_btn = page.locator('button:has-text("撤回")')
    print(f'   该行"撤回"按钮出现: {undo_btn.count() > 0}')
    assert undo_btn.count() > 0, '撤回按钮缺失'
    undo_btn.first.click()
    page.wait_for_timeout(500)
    g2 = json.loads(page.evaluate('localStorage.getItem("tyov:save:v1")'))
    replaced = any(c['name'] == '替补凡人' for c in g2['characters'])
    print(f'   撤回后角色已撤销: {not replaced}')
    assert not replaced, '撤回未生效'

    print('\n=== 5. 页面错误 ===')
    print(errs if errs else '无')

    ctx.close()
    browser.close()
    print('\n效果执行四项增强 E2E 全部通过')