# -*- coding: utf-8 -*-
"""P2 综合回归：效果执行引导 + 移动端抽屉 + 快照优化"""
from playwright.sync_api import sync_playwright
import json

EDGE = r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
URL = 'http://127.0.0.1:5199/'

def fill_create(page, name='回归者'):
    page.goto(URL)
    page.wait_for_load_state('networkidle')
    page.wait_for_timeout(600)
    page.evaluate('localStorage.clear()')
    page.reload()
    page.wait_for_load_state('networkidle')
    page.wait_for_timeout(600)
    page.locator('button:has-text("开始旅程")').click()
    page.wait_for_timeout(500)
    page.fill('input[placeholder*="亨利，乔恩之子"]', name)
    page.fill('textarea[placeholder*="出生于公元13世纪"]', f'我是{name}；我的故事在浏览器里展开。')
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
    page.fill('textarea[placeholder*="修道院的屋顶"]', '我在屋顶与他决斗；几乎死去。')
    page.locator('button:has-text("成为黑夜的生物")').click()
    page.wait_for_timeout(900)

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=EDGE, headless=True)
    ctx = browser.new_context(viewport={'width': 1500, 'height': 1100})
    page = ctx.new_page()
    errors = []
    page.on('console', lambda m: errors.append(f"{m.type}: {m.text[:100]}") if m.type == 'error' else None)
    page.on('pageerror', lambda e: errors.append(f"pageerror: {str(e)[:120]}"))

    print('=== 1. 效果执行引导渲染 ===')
    fill_create(page)
    # 提示 1 含效果（gainSkillNamed 嗜血 / killCharacter / createMortal / checkSkill）
    effect_panel = page.locator('text=效 果 执 行').count()
    print(f'   效果执行区: {effect_panel > 0}')
    assert effect_panel, '效果执行区未渲染'

    # 输入模式：获得技能嗜血（gainSkill 是 input 模式）
    input_btn = page.locator('button:has-text("填写 ▾")')
    print(f'   存在"填写"按钮（gainSkill input 模式）: {input_btn.count() > 0}')
    if input_btn.count():
        input_btn.first.click()
        page.wait_for_timeout(300)
        inp = page.locator('input[placeholder="技能名（如：嗜血）"]')
        inp.fill('噬血本能')
        page.locator('button:has-text("确认")').click()
        page.wait_for_timeout(500)
        skill_ok = page.evaluate('localStorage.getItem("tyov:save:v1")')
        g = json.loads(skill_ok)
        has_skill = any(sk['name'] == '噬血本能' for sk in g['skills'])
        print(f'   确认后技能被添加: {has_skill}')
        assert has_skill, 'input 模式执行失败'

    # 选择模式：killCharacter（提示1：杀死一个凡人角色）
    select_btn = page.locator('button:has-text("选择 ▾")')
    print(f'   存在"选择"按钮（killCharacter select 模式）: {select_btn.count() > 0}')
    # 关闭之前的输入浮层；滚动到选择按钮
    killed_before = json.loads(page.evaluate('localStorage.getItem("tyov:save:v1")'))['characters']
    # 直接点"选择"（第一个可能就是技能勾选，但验证机制即可：点开浮层有候选）
    if select_btn.count():
        select_btn.first.click()
        page.wait_for_timeout(300)
        cands = page.locator('div.card button.w-full.text-left').count()
        print(f'   选择浮层候选数: {cands}')
        assert cands > 0, '选择浮层无候选'

    # 手动模式：editMemory 应显示"去面板"
    manual_btn = page.locator('button:has-text("去面板")')
    print(f'   手动模式"去面板"按钮数: {manual_btn.count()}')

    print('\n=== 2. 快照优化 ===')
    full_key = page.evaluate('localStorage.getItem("tyov:history:full:v1")')
    full_before = json.loads(full_key) if full_key else {}
    print(f'   进行中游戏的 FULL_KEY 快照数: {len(full_before)}（应 0，或仅历史遗留）')

    # 查看历史记录
    page.locator('button:has-text("历史")').first.click()
    page.wait_for_timeout(600)
    review_btn = page.locator('button:has-text("回顾")')
    print(f'   回顾按钮可用（进行中记录）: {review_btn.count() > 0}')
    if review_btn.count():
        review_btn.first.click()
        page.wait_for_timeout(700)
        unfinished_txt = page.locator('text=这段旅程尚未终结').count()
        print(f'   回顾页显示"尚未终结"提示: {unfinished_txt > 0}')
        assert unfinished_txt > 0, '未完结记录应显示"尚未终结"'
    page.locator('button:has-text("首页")').first.click()
    page.wait_for_timeout(400)

    print('\n=== 3. 移动端抽屉（窄视口） ===')
    # 新 context 窄视口
    ctx2p = browser.new_context(viewport={'width': 420, 'height': 900})
    page_m = ctx2p.new_page()
    page_m.goto(URL)
    page_m.wait_for_load_state('networkidle')
    page_m.wait_for_timeout(700)
    # 首页 → 建卡需要全填；简化：直接验证首页有抽屉相关元素不存在（抽屉只在游戏页），
    # 因此先快速建卡
    page_m.locator('button:has-text("开始旅程")').click()
    page_m.wait_for_timeout(500)
    page_m.fill('input[placeholder*="亨利，乔恩之子"]', '移动者')
    page_m.fill('textarea[placeholder*="出生于公元13世纪"]', '我是移动者；我在窄屏上游走。')
    mm = page_m.locator('input[placeholder="例如：贡德尔，维京人"], input[placeholder="例如：劳伦斯·霍尔穆勒，男爵的后裔"], input[placeholder="例如：米内尔家的女儿，出色的决斗者"]')
    for i in range(mm.count()): mm.nth(i).fill(f'凡人{i+1}')
    ss = page_m.locator('input[placeholder="例如：击剑"], input[placeholder="例如：骑术"], input[placeholder="例如：宫廷礼节"]')
    for i in range(ss.count()): ss.nth(i).fill(f'技能{i+1}')
    rr = page_m.locator('input[placeholder="例如：长船博克苏登"], input[placeholder="例如：祖传宝剑"], input[placeholder="例如：一块耕地"]')
    for i in range(rr.count()): rr.nth(i).fill(f'资源{i+1}')
    ee = page_m.locator('textarea[placeholder^="例如：贡德尔带我"], textarea[placeholder^="例如：我在荒野"], textarea[placeholder^="例如：我向领主"]')
    for i in range(ee.count()): ee.nth(i).fill(f'经历{i+1}；风带来故土气息。')
    page_m.fill('input[placeholder="姓名 · 身份"]', '巴伦')
    page_m.fill('input[placeholder*="我的脖子永久破裂"]', '脖子永久破裂')
    page_m.fill('textarea[placeholder*="修道院的屋顶"]', '我在屋顶与他决斗；几乎死去。')
    page_m.locator('button:has-text("成为黑夜的生物")').click()
    page_m.wait_for_timeout(900)

    tool_bar = page_m.locator('button:has-text("特征")')
    print(f'   移动端底部工具条"特征"按钮: {tool_bar.count() > 0}')
    assert tool_bar.count(), '移动端工具条缺失'
    tool_bar.first.click()
    page_m.wait_for_timeout(500)
    drawer = page_m.locator('text=收 起').count() + page_m.locator('button:has-text("收起 ▾")').count()
    print(f'   抽屉弹出（含收起按钮）: {drawer > 0}')
    assert drawer > 0, '抽屉未弹出'
    # 抽屉有记忆 tab 面板
    in_drawer = page_m.locator('text=记忆 (5槽)').count()
    print(f'   抽屉内特征面板: {in_drawer > 0}')
    page_m.locator('button:has-text("收起 ▾")').click()
    page_m.wait_for_timeout(400)
    closed = page_m.locator('button:has-text("收起 ▾")').count()
    print(f'   收起后抽屉关闭: {closed == 0}')
    ctx2p.close()

    print('\n=== 4. 完结后快照生成 ===')
    # 当前已在首页（第2步末尾导航过）：继续旅程回游戏页
    page.locator('button:has-text("继续旅程")').first.click()
    page.wait_for_timeout(600)
    page.on('dialog', lambda d: d.accept())
    page.locator('button:has-text("结束旅程")').first.click()
    page.wait_for_timeout(1200)
    full_after = page.evaluate('localStorage.getItem("tyov:history:full:v1")')
    full_map = json.loads(full_after) if full_after else {}
    print(f'   完结后 FULL_KEY 快照数: {len(full_map)}（应 >0）')
    assert len(full_map) > 0, '完结后应生成快照'

    # 回顾页显示完整内容
    page.locator('button:has-text("历史")').first.click()
    page.wait_for_timeout(600)
    page.locator('button:has-text("回顾")').first.click()
    page.wait_for_timeout(700)
    full_review = page.locator('text=回顾 · 回归者').count()
    print(f'   完结游戏回顾页显示全量内容: {full_review > 0}')

    print('\n=== 5. 控制台错误 ===')
    print(errors if errors else '无')

    ctx.close()
    browser.close()
    print('\nP2 综合回归通过')