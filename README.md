# 數學 8下 第2章 三角形全等 題庫(p1-p4)

## 線上練習(GitHub Pages)

本資料夾直接就是一個可部署的靜態網站。打開後可選擇「隨機 20 題」或「全部 43 題」,
依題型自動切換答題介面(甲乙丙下拉選單、SSS/SAS/ASA/AAS/RHS 性質下拉選單)。

### 本機預覽

不能直接 double-click 開啟 `index.html`(瀏覽器的 `file://` 會擋下 JSON fetch)。
請在此資料夾內啟動任一本機伺服器,例如:

```sh
cd 三角形全等題庫_p1-p4
python3 -m http.server 8000
# 然後打開 http://localhost:8000
```

### 部署到 GitHub Pages

1. 建立 GitHub repo,把整個資料夾推上去(內容直接放在 repo 根目錄):
   ```sh
   git init
   git add .
   git commit -m "init triangle quiz site"
   git branch -M main
   git remote add origin git@github.com:<你的帳號>/<repo>.git
   git push -u origin main
   ```
2. 進 repo Settings → Pages → Source 選 `Deploy from a branch`,Branch 選 `main` / `/ (root)`,Save。
3. 等 1–2 分鐘,網址會是 `https://<你的帳號>.github.io/<repo>/`。

如果想放在子路徑(例如把網站放在 `docs/` 下),把 `index.html` / `app.js` / `styles.css` /
`questions.json` / `images/` 五個東西一起搬到 `docs/`,然後在 Pages 設定中 Folder 選 `/docs`。

### 檔案
- `index.html` ・ 入口頁
- `app.js` ・ 練習邏輯(讀取 questions.json、評分)
- `styles.css` ・ 版面
- `questions.json` ・ 題庫資料(網頁直接讀這個)
- `images/` ・ 題目圖

## 規模
- 共 **43 題**(p1: 12 / p2: 12 / p3: 7 / p4: 12)
- 圖片 **43 張**(每題一張完整裁切圖)

## 檔案結構

```
output/
├── README.md          # 本檔
├── questions.json     # 主題庫(結構化資料)
├── questions.md       # Markdown 索引(Obsidian 友善)
├── questions.csv      # CSV(可匯入 Google Sheets)
└── images/            # 43 張裁切圖
    ├── p1_A1.png ~ p1_B5_2.png  # 第 1 頁(12 題)
    ├── p2_A1.png ~ p2_B5_2.png  # 第 2 頁(12 題,RHS+ASA/AAS)
    ├── p3_A1.png ~ p3_A5_2.png  # 第 3 頁前半(6 題)
    ├── p3_B_combined.png        # 第 3 頁綜合題(10 三角形配對)
    └── p4_U1.png ~ p4_D_R_3.png # 第 4 頁(12 題,判斷題+圖形辨識)
```

## 命名規則

- **題庫 ID**:`G8B-CH2-NNN`(年級_學期_章節_流水號)
- **圖片檔名**:`{page}_{position}.png`
  - p1-p2:`A1`(上半第1題)~`B5_2`(下半第5(2)小題)
  - p3:`A1`-`A5_2`(上半 5 題)+ `B_combined`(綜合題)
  - p4:`U1`-`U6`(上半 6 題判斷)+ `D_L_1`-`D_L_3` / `D_R_1`-`D_R_3`(下半左右兩題)

## 內容統計

| 全等性質 | 題數 |
|---------|------|
| SSS(邊邊邊) | 8 |
| SAS(邊角邊) | 10 |
| ASA(角邊角) | 8 |
| AAS(角角邊) | 9 |
| RHS(直角斜邊一股) | 10 |

| 難度 | 題數 |
|-----|------|
| ⭐ 易 | 7 |
| ⭐⭐ 中 | 25 |
| ⭐⭐⭐ 難 | 11 |

| 題型 | 題數 |
|-----|------|
| 從甲乙丙找全等 | 20 |
| 寫對應頂點 | 10 |
| 判斷是否全等 | 6 |
| 帶圖示判斷 | 6 |
| 綜合配對 | 1 |

## 核對狀態

- **已核對**:12 題(p1 的 12 題,Claude 詳細處理過)
- **待核對**:31 題(p2-p4,初步判讀,**建議比對教師手冊**)

待核對的題目在 JSON 中標註為 `answer.verified: false`,你可以針對這些題目單獨檢查。

## 重要注意事項

### p2 第 1 題的 RHS / SSS 判讀
p2 A1 三個三角形:甲(直角在頂)、乙(直角在右下)、丙(直角在左下)。三邊都是 10、6,但
配置不同。**全等判定要看「斜邊」與「股」的對應**,我的初步判讀是甲乙丙皆為斜邊10、一股6
的直角三角形 → 三個都全等。但題目通常設計成只有兩個全等,請務必核對。

### p3 綜合題(第 31 題)
10 個三角形找 5 組全等,我的判讀基於形狀粗略匹配,**準確答案需仔細比對每個三角形的條件**。
JSON 中以 `pairs` 陣列保留了五組對應,但 `verified: false`。

### p4 下半部圖形題
這些題目涉及共用邊、對頂角、平行四邊形對角線等幾何概念,**判讀需要對圖形語義有正確理解**,
建議比對教師手冊。

## 擴充至 200 題的工作流建議

1. **JSON 為單一真實來源** — 所有元資料都從 JSON 出發,Markdown/CSV 由腳本生成
2. **章節組織** — 每章一個資料夾,例如 `8B-CH2/`、`8B-CH3/`
3. **同步 Google Sheets** — 把 questions.csv 匯入,用 `=IMAGE()` 顯示圖片(需先把圖片上 Drive)
4. **Telegram bot 整合** — 直接讀 JSON,用 `tags`、`difficulty`、`property` 篩選抽題
5. **裁切工作流** — 每頁仍需手動測 y 座標(自動化嘗試過,投影法在這種頁面失敗)。
   建議流程:你看圖估座標 → 我執行 → 視覺驗證 → 微調

## Schema 範例(每題的 JSON 結構)

```json
{
  "id": "G8B-CH2-001",
  "page": 1,
  "question_number": "1",
  "image": "images/p1_A1.png",
  "type": "multiple_choice_congruent",
  "instruction": "找出全等三角形,並寫出全等性質",
  "given": { "triangles": [...] },
  "answer": {
    "congruent_pair": ["甲", "丙"],
    "property": "SSS",
    "verified": true
  },
  "difficulty": 1,
  "tags": ["三角形全等", "SSS", "邊邊邊"]
}
```
