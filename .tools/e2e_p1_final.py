# -*- coding: utf-8 -*-
"""P1 最终验证：配额满场景下完整建卡→回合→掷骰 + 正常场景回归"""
from playwright.sync_api import sync_playwright

EDGE = r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
URL = 'http://127.0.0.1:5199/'
QUOTA_JS = """
const realLS = window.localStorage;
const fake = {
  getItem: (k) => { try { return realLS.getItem(k); } catch { return null; } },
  setItem: () => { throw new DOMException('Quota exceeded', 'QuotaExceededError'); },
  removeItem: (k) => { try { realLS.removeItem(k); } catch {} },
  clear: () => { try { realLS.clear(); } catch {} },
  key: (i) => { try { return realLS.key(i); } catch { return null; } },
  get length() { try { return realLS.length; } catch { return 0; } },
};
Object.defineProperty(window, 'localStorage', { get: () => fake });
"""

def fill_create(page, name):
    page.goto(URL)
    page.wait_for_load_state('networkidle')
    page.wait_for_timeout(700)
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
    page.wait_for_timeout(800)

with sync_playwright() as p:
    # ===== 场景 A：配额满 =====
    print('=== A. 配额满场景 ===')
    ctx_a = p.chromium.launch_persistent_context(
        r'D:\Projects\Thousand Year Old Vampire\.tmp\p1_final_a',
        executable_path=EDGE, headless=True, viewport={'width': 1500, 'height': 1100})
    pa = ctx_a.pages[0] if ctx_a.pages else ctx_a.new_page()
    errs_a = []
    pa.on('pageerror', lambda e: errs_a.append(str(e)[:150]))
    pa.add_init_script(QUOTA_JS)
    fill_create(pa, '配额满者')

    in_game = pa.locator('text=当前提示').count() > 0
    warn_on_create = pa.locator('text=本地存储不可用').count() > 0
    print(f'1. 建卡进入游戏: {in_game} / 警告横幅: {warn_on_create}')

    t = pa.locator('textarea[placeholder*="好的经历格式"]')
    if t.count():
        t.fill('纵无片纸存世，我也写下这行字。')
        pa.locator('button:has-text("完成这一回合，掷出命运之骰")').click()
        pa.wait_for_timeout(900)
        rolled = pa.locator('text=骰 子 之 判').count() > 0
        warn_in_game = pa.locator('text=本地存储不可用').count() > 0
        print(f'2. 回合完成+掷骰: {rolled} / 游戏中警告持续: {warn_in_game}')
        assert rolled, '配额满也应能玩回合'
    print(f'3. 页面错误: {errs_a if errs_a else "无"}')
    ctx_a.close()

    # ===== 场景 B：正常（回归） =====
    print('\n=== B. 正常场景回归 ===')
    ctx_b = p.chromium.launch_persistent_context(
        r'D:\Projects\Thousand Year Old Vampire\.tmp\p1_final_b',
        executable_path=EDGE, headless=True, viewport={'width': 1500, 'height': 1100})
    pb = ctx_b.pages[0] if ctx_b.pages else ctx_b.new_page()
    errs_b = []
    pb.on('pageerror', lambda e: errs_b.append(str(e)[:150]))
    fill_create(pb, '正常者')

    saved = pb.evaluate('localStorage.getItem("tyov:save:v1")')
    warn_b = pb.locator('text=本地存储不可用').count()
    print(f'4. 存档写入: {saved is not None} / 无警告: {warn_b == 0}')
    assert saved, '正常模式必须写存档'

    pb.reload()
    pb.wait_for_load_state('networkidle')
    pb.wait_for_timeout(900)
    ongoing = pb.locator('text=未 竟 之 旅').count()
    print(f'5. 刷新后恢复未竟之旅: {ongoing > 0}')
    assert ongoing > 0, '刷新应恢复'
    print(f'6. 页面错误: {errs_b if errs_b else "无"}')
    ctx_b.close()

    print('\nP1 最终验证全部通过')