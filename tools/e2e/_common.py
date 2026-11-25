# -*- coding: utf-8 -*-
"""E2E 公共常量。

运行前置（在 tyov-web/ 下）：
    npm run dev -- --port 5199
以及系统 Edge + playwright（pip 安装，勿全局升级其它包）。

用法：
    python tools/e2e/smoke.py
"""
from pathlib import Path

# 系统 Edge（Playwright 复用本机浏览器，不额外下载）
EDGE = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"

# 本地 dev server：E2E 统一用 5199，避免与日常 5173 冲突
BASE_URL = "http://127.0.0.1:5199/"

# 线上部署地址
LIVE_URL = "https://knink-owo.github.io/Thousand-Year-Old-Vampire-web/"

HERE = Path(__file__).resolve().parent
