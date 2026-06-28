<!DOCTYPE html>
<html lang="zh-TW">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>皮克敏蘑菇即時回報站</title>
    <script src="https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js"></script>
    <script src="https://www.gstatic.com/firebasejs/8.10.1/firebase-database.js"></script>
    <link rel="stylesheet" href="style.css?v=fixed999">
</head>
<body>

    <header>
        <div class="logo-area">
            <img src="picture/pikmin_logo.png" alt="Pikmin" class="logo" onerror="this.style.display='none'">
            <h1>皮克敏高階工具站</h1>
        </div>
        <nav>
            <a href="index.html">🧮 戰力模擬器</a>
            <a href="report.html" class="active">🍄 雲端回報系統</a>
        </nav>
    </header>

    <main>
        <section class="section-box">
            <h2>🍄 回報蘑菇現況</h2>
            <form id="mushroom-form" class="report-form">
                <div class="form-row">
                    <div class="form-cell">
                        <label>📍 選擇縣市：</label>
                        <select id="form-city"></select>
                    </div>
                    <div class="form-cell">
                        <label>選擇行政區：</label>
                        <select id="form-district"></select>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-cell">
                        <label>🏢 地點具體名稱：</label>
                        <input type="text" id="form-name" placeholder="例如：公園變電箱、麥當勞旁" required>
                    </div>
                    <div class="form-cell">
                        <label>🍄 蘑菇種類：</label>
                        <select id="form-type">
                            <option value="red">紅色蘑菇</option>
                            <option value="blue">藍色蘑菇</option>
                            <option value="yellow">黃色蘑菇</option>
                            <option value="purple">紫色蘑菇</option>
                            <option value="white">白色蘑菇</option>
                            <option value="rock">灰色蘑菇</option>
                            <option value="wing">粉紅色蘑菇</option>
                            <option value="ice">冰藍蘑菇</option>
                            <option value="rock_crystal">特殊水晶蘑菇</option>
                            <option value="red_fire">元素火蘑菇</option>
                            <option value="blue_water">元素水蘑菇</option>
                            <option value="white_poison">元素毒蘑菇</option>
                            <option value="yellow_electric">元素電子蘑菇</option>
                            <option value="event_special">本月限定活動蘑菇</option>
                        </select>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-cell">
                        <label>📏 蘑菇大小：</label>
                        <select id="form-size">
                            <option value="小">小</option>
                            <option value="普通" selected>普通</option>
                            <option value="大">大</option>
                            <option value="巨型">巨型</option>
                        </select>
                    </div>
                    <div class="form-cell">
                        <label>👥 目前參戰人數：</label>
                        <input type="number" id="form-count" value="0" min="0">
                        <span id="count-hint" style="font-size: 12px; color: #78909c; display: block; margin-top: 4px;"></span>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-cell" style="flex: 2;">
                        <label>⏳ 剩餘倒數時間：</label>
                        <div class="time-input-group">
                            <input type="number" id="form-hours" value="0" min="0"> <span>時</span>
                            <input type="number" id="form-minutes" value="0" min="0" max="59"> <span>分</span>
                            <input type="number" id="form-seconds" value="0" min="0" max="59"> <span>秒</span>
                        </div>
                    </div>
                </div>
                <button type="submit" class="submit-btn">🚀 發佈至全台即時看板</button>
            </form>
        </section>

        <section class="section-box" style="max-width: 1200px;">
            <div class="location-select-wrapper">
                <label>📍 選擇縣市：</label>
                <select id="filter-city" style="width: auto;"></select>
                
                <label style="margin-left: 10px;">行政區：</label>
                <select id="filter-district" style="width: auto;"></select>

                <label style="margin-left: 10px;">📊 排序：</label>
                <select id="card-sort" style="width: auto;">
                    <option value="remainingTime">剩餘時間 (最少)</option>
                    <option value="updateTime">更新時間 (最新)</option>
                    <option value="totalPlayers">參戰人數 (最多)</option>
                    <option value="mushroomSize">蘑菇大小 (最大)</option>
                    <option value="mushroomType">蘑菇種類 (名稱)</option>
                </select>

                <button id="geo-btn" class="geo-btn" style="margin-left: 10px;">🎯 自動定位</button>

                <div style="flex-grow: 1;"></div> 

                <input type="text" id="search-name" placeholder="🔍 關鍵字 (如: 電桶)..." style="padding: 8px 12px; border-radius: 6px; border: 1px solid #ccc; outline: none; margin-right: 10px;">
                <button id="view-toggle-btn" class="geo-btn" style="background-color: #f57c00;">🎴 卡片模式</button>
            </div>

            <div class="dev-toolbar">
                <button id="dev-mode-btn" class="dev-mode-btn">🛠️ 開啟開發者模式</button>
                <span id="dev-status" class="dev-status" style="margin-left: 10px;">🔒 安全瀏覽模式</span>
            </div>

            <div id="mushroom-container" class="grid-container"></div>
        </section>
    </main>

    <footer>
        <p>© 2026 Pikmin Bloom 台灣高階社群工具站</p>
    </footer>

    <script src="report.js"></script>
</body>
</html>
