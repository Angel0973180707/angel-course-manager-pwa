# 幸福教養課程管理 PWA

這是一個以 Google 試算表為中控臺的課程管理 PWA（手機可加到主畫面）。

## 已預設你的 API
- exec URL: https://script.google.com/macros/s/AKfycbwUl82fzFmReE8PyOB9G6FJDT-B1MOCZufcLDJ6mvUXIfuFN2YsHpPLS5ZNi93LeHR0SA/exec
- token: angel

你也可以在 PWA 內「設定（API / token）」修改。

## 功能
- 課程清單（list）
- 搜尋 / 類型篩選 / 狀態篩選
- 查看詳細
- 匯出 JSON 備份
- 新增 / 編修 / 刪除：需要 GAS API 升級支援（見 CODEGS_UPGRADE.txt）

## GitHub Pages 上線
1) 建 repo（英文名，例如: angel-course-manager）
2) 上傳本資料夾所有檔案到 repo 根目錄
3) Settings → Pages → Deploy from branch → main / root
4) 用手機打開 Pages 網址 → 加到主畫面

## API 測試
- ping:  ?action=ping&token=angel
- list:  ?action=list&token=angel
