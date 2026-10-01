# 奶蛙文字產生器 (naiwa-text)

輸入中文字，用程式（非 AI 生圖）把每個字拼成「奶蛙」造型，可下載 PNG / SVG。
線上版：https://pojinyang.github.io/naiwa-text/ （repo: pojinYang/naiwa-text）

## 指令
- `npm run dev` — Vite dev server，網址 `http://localhost:5173/naiwa-text/`（注意 base 路徑）
- `npm test` — vitest，幾何演算法單元測試（`tests/`）
- `npm run build` — 輸出到 `dist/`

## 架構
Vite + 原生 JS，渲染結果是一整段 SVG 字串（同一份字串用於預覽與匯出）。

- `src/data/loadChar.js` — 從 jsdelivr 抓 `hanzi-writer-data@2.0/<字>.json`（源自 Make Me a Hanzi，約 9,500 字，含繁體），記憶體快取。
- `src/geometry/` — 筆畫中心線處理
  - 資料是 1024 字框、y 朝上 → `toSvgPoint` 轉成 `(x, 900 - y)`。
  - `medians` = 每筆中心線（書寫方向），是奶蛙身體骨架；`strokes`（外框）目前沒用到。
  - 流程：RDP 簡化 → 去掉頭尾小頓筆 → 轉角偵測（以前後固定弧長量轉角，處理圓角的橫折）→ 切段 → 過長再等分 → `orientHead` 讓臉不會倒過來。
  - `defaultWidth(筆畫數)` 決定身體粗細，筆畫越多越瘦。
  - 字形「黑體」（預設）沒有真正的黑體資料，是 `hei.js` 把楷書骨架黑體化：較大 ε 拉直弧線（往右下的斜鉤、捺整筆拉直；貼近軸線的豎撇保留豎的部分）、去掉起筆、橫折的斜角收成直角、近水平／垂直的段落對齊座標軸、鉤縮短成小凸點；渲染時改用直線（`smoothPath` tension 0）。目前沒有 Make Me a Hanzi 的黑體 fork（2026-10 查過）。
- `src/render/`
  - `defs.js` — 假立體 SVG filter（alpha 模糊當高度圖 + diffuse/specular lighting + 陰影）。filter 區域必須用 `userSpaceOnUse`，否則水平直線的 bbox 高度為 0 會被裁掉。
  - `naiwa.js` — 單隻奶蛙（積木風 `figure`）與一筆一條（麵條風 `tube`）、臉、手腳、種子亂數抖動。
  - `character.js` / `layout.js` — 單字與多字排版、不支援字的灰色佔位。
- `src/export.js` — SVG 直接下載；PNG 透過 `<img>` 畫到 canvas（保留 filter）。

## 慣例
- `reference/` 放使用者給的 4 張範例圖（我、想、你、了），**不進版控**（已在 .gitignore），只供本機對照。
- 瀏覽器驗證用 `playwright-cli -s=naiwa_word`（Edge，設定在 `.playwright/cli.config.json`），截圖存 `.playwright-cli/`。
- 字形資料授權為 Arphic Public License，頁尾需保留出處。

## 部署
push 到 `main` → `.github/workflows/deploy.yml`（test → build → GitHub Pages）。`vite.config.js` 的 `base` 必須與 repo 名稱 `/naiwa-text/` 一致。
