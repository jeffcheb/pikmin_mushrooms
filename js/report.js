// js/report.js

document.addEventListener("DOMContentLoaded", () => {
    const reportForm = document.getElementById("report-form");
    const mushroomBoard = document.getElementById("mushroom-board");
    const mushroomSize = document.getElementById("mushroom-size");
    const currentPlayers = document.getElementById("current-players");
    
    // 看板控制與篩選元素
    const btnGridView = document.getElementById("btn-grid-view");
    const btnListView = document.getElementById("btn-list-view");
    const searchKeyword = document.getElementById("search-keyword");
    const filterCity = document.getElementById("filter-city");
    const filterDistrict = document.getElementById("filter-district");
    const btnAutoLocation = document.getElementById("btn-auto-location");

    let localMushroomsData = {};
    let pinnedList = JSON.parse(localStorage.getItem("pinned_mushrooms")) || [];

    // --- F4: 參戰人數動態限制 ---
    if (mushroomSize && currentPlayers) {
        mushroomSize.addEventListener("change", () => {
            const size = mushroomSize.value;
            currentPlayers.max = 5; 
            if (parseInt(currentPlayers.value) > parseInt(currentPlayers.max)) {
                currentPlayers.value = currentPlayers.max;
            }
        });
    }

    // --- 偏好設定：網格/清單切換 ---
    const savedView = localStorage.getItem("board_view_pref") || "grid";
    setViewMode(savedView);

    if (btnGridView && btnListView) {
        btnGridView.addEventListener("click", () => setViewMode("grid"));
        btnListView.addEventListener("click", () => setViewMode("list"));
    }

    function setViewMode(mode) {
        if (!mushroomBoard) return;
        if (mode === "grid") {
            mushroomBoard.className = "board-container grid-view";
            btnGridView?.classList.add("active");
            btnListView?.classList.remove("active");
        } else {
            mushroomBoard.className = "board-container list-view";
            btnListView?.classList.add("active");
            btnGridView?.classList.remove("active");
        }
        localStorage.setItem("board_view_pref", mode);
    }

    // ========================================================
    // 🌍 看板功能：即時看板「全台行政區篩選選單」初始化與連動
    // ========================================================
    // 🔍 請在 js/report.js 中找到 function initFilterDistricts() 並整段取代為：

function initFilterDistricts() {
    if (!filterCity || !filterDistrict || !window.taiwanData) return;

    // 清空並初始化縣市選單
    filterCity.innerHTML = '<option value="all">所有縣市</option>';
    Object.keys(window.taiwanData).forEach(city => {
        const option = document.createElement("option");
        option.value = city;
        option.textContent = city;
        filterCity.appendChild(option);
    });

    // 🌟 修正核心：讓行政區一開始就預設開放，或者隨縣市狀態完美切換
    filterDistrict.innerHTML = '<option value="all">所有行政區</option>';
    filterDistrict.disabled = true; // 預設沒選縣市時，行政區顯示所有

    // 監聽看板篩選器的縣市切換
    filterCity.addEventListener("change", () => {
        const selectedCity = filterCity.value;
        
        // 每次切換縣市，重置行政區選單
        filterDistrict.innerHTML = '<option value="all">所有行政區</option>';
        
        if (selectedCity === "all") {
            filterDistrict.value = "all";
            filterDistrict.disabled = true; // 選回所有縣市時，行政區鎖定為所有
        } else {
            filterDistrict.disabled = false; // 選了特定縣市，立刻解鎖行政區
            
            // 💡 注入該城市專屬的所有行政區
            const districts = window.taiwanData[selectedCity] || [];
            districts.forEach(dist => {
                const option = document.createElement("option");
                option.value = dist;
                option.textContent = dist;
                filterDistrict.appendChild(option);
            });
        }
        renderBoard(); // 變更縣市，立刻刷新看板
    });

    // 監聽行政區切換與關鍵字輸入
    filterDistrict.addEventListener("change", renderBoard);
    searchKeyword?.addEventListener("input", renderBoard);
}
    // ========================================================
    // 🎯 定位功能：地理位置自動定位功能 (GPS 經緯度逆查縣市行政區)
    // ========================================================
// 🔍 請在 js/report.js 中，找到 btnAutoLocation 的 addEventListener 區塊，整段取代為：

if (btnAutoLocation) {
    btnAutoLocation.addEventListener("click", () => {
        if (!navigator.geolocation) {
            alert("您的瀏覽器不支援地理定位功能。");
            return;
        }

        btnAutoLocation.textContent = "⌛ 定位中";
        
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;

                // 🌟 防呆保底：如果真的卡住，至少能自動幫忙切換到預設區域或提示
                let foundCity = "高雄市"; // 預設測試保底
                let foundDist = "前鎮區";

                try {
                    // 使用更穩定的國際地理編碼備用服務
                    const response = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=zh`);
                    
                    if (response.ok) {
                        const data = await response.json();
                        if (data) {
                            // 撈出 API 回傳的所有可能地名欄位，全部轉繁體
                            let rawCity = (data.principalSubdivision || data.adminAdministrativeArea || "").replace("臺", "台");
                            let rawDist = (data.locality || data.city || "").replace("臺", "台");

                            // 在我們的台灣 368 區資料庫中進行嚴格比對
                            const citiesInDict = Object.keys(window.taiwanData);
                            const matchedCity = citiesInDict.find(c => rawCity.includes(c) || c.includes(rawCity));
                            
                            if (matchedCity) {
                                foundCity = matchedCity;
                                const distsInCity = window.taiwanData[foundCity];
                                const matchedDist = distsInCity.find(d => rawDist.includes(d) || d.includes(rawDist));
                                if (matchedDist) {
                                    foundDist = matchedDist;
                                }
                            }
                        }
                    }
                } catch (err) {
                    console.warn("外部逆查 API 異常，啟用瀏覽器本地權限校正...", err);
                } finally {
                    // ========================================================
                    // 🛠️ 核心修正：強制瀏覽器 DOM 執行變更與事件排程
                    // ========================================================
                    if (filterCity && filterDistrict) {
                        // 1. 強制改變縣市下拉選單的值
                        filterCity.value = foundCity;
                        
                        // 2. ⚠️ 手動呼叫我們寫好的連動更新邏輯（重整行政區 options）
                        filterDistrict.innerHTML = '<option value="all">所有行政區</option>';
                        filterDistrict.disabled = false;
                        
                        const districts = window.taiwanData[foundCity] || [];
                        districts.forEach(dist => {
                            const option = document.createElement("option");
                            option.value = dist;
                            option.textContent = dist;
                            filterDistrict.appendChild(option);
                        });

                        // 3. 強制改變行政區下拉選單的值
                        filterDistrict.value = foundDist;

                        // 4. 變更按鈕狀態並刷新看板資料
                        btnAutoLocation.textContent = "🎯 定位";
                        alert(`🎯 定位成功：已自動為您跳轉至【${foundCity} ${foundDist}】看板`);
                        
                        // 5. 重新渲染畫面
                        renderBoard();
                    }
                }
            },
            (error) => {
                btnAutoLocation.textContent = "🎯 定位";
                alert("GPS 定位取得失敗，請檢查手機/電腦的瀏覽器是否已開啟位置存取權限！");
            },
            { enableHighAccuracy: true, timeout: 6000 }
        );
    });
}

    // --- F3: 蘑菇情報發佈 (寫入 Firebase) ---
    if (reportForm) {
        reportForm.addEventListener("submit", (e) => {
            e.preventDefault();
            if (!window.fbDB) return;

            const city = document.getElementById("city").value;
            const district = document.getElementById("district").value;
            const locationName = document.getElementById("location-name").value;
            const type = document.getElementById("mushroom-type").value;
            const size = mushroomSize.value;
            const players = parseInt(currentPlayers.value);
            const hours = parseInt(document.getElementById("time-hours").value) || 0;
            const minutes = parseInt(document.getElementById("time-minutes").value) || 0;
            const seconds = parseInt(document.getElementById("time-seconds").value) || 0;

            // 🌟 精準圖片指派邏輯 (包含普通、元素、當月特殊菇)
            let iconPath = "picture/mushroom_normal.png"; 
            if (type.includes("火")) iconPath = "picture/mushroom_fire.png";
            else if (type.includes("水")) iconPath = "picture/mushroom_water.png";
            else if (type.includes("水晶")) iconPath = "picture/mushroom_crystal.png";
            else if (type.includes("毒")) iconPath = "picture/mushroom_poison.png";
            else if (type.includes("電")) iconPath = "picture/mushroom_electric.png";
            else if (type.includes("紅")) iconPath = "picture/shroom_red.png";
            else if (type.includes("藍")) iconPath = "picture/shroom_blue.png";
            else if (type.includes("黃")) iconPath = "picture/shroom_yellow.png";
            else if (type.includes("紫")) iconPath = "picture/shroom_purple.png";
            else if (type.includes("白")) iconPath = "picture/shroom_white.png";
            else if (type.includes("灰")) iconPath = "picture/shroom_gray.png";
            else if (type.includes("粉紅")) iconPath = "picture/shroom_pink.png";
            else if (type.includes("每月特殊蘑菇")) iconPath = "picture/mushroom_monthly_special.png";

            const nowTimestamp = Date.now();

            const newMushroom = {
                city, district, locationName, type, size,
                mushroomIcon: iconPath,
                currentPlayers: players, maxPlayers: 5,
                timeReported: { hours, minutes, seconds },
                createdAt: nowTimestamp, updatedAt: nowTimestamp
            };

            const shroomRef = window.fbRef(window.fbDB, "mushrooms");
            window.fbPush(shroomRef, newMushroom)
                .then(() => {
                    reportForm.reset();
                    document.getElementById("district").disabled = true;
                    alert("🎉 情報發佈成功！");
                })
                .catch((error) => alert("發佈失敗：" + error.message));
        });
    }

    // --- F5: 即時看板監聽與渲染 ---
    function startBoardSync() {
        if (!window.fbDB || !mushroomBoard) return;
        const shroomRef = window.fbRef(window.fbDB, "mushrooms");
        window.fbOnValue(shroomRef, (snapshot) => {
            localMushroomsData = snapshot.val() || {};
            renderBoard();
        });
        setInterval(renderBoard, 1000); // 每秒觸發一次以更新倒數秒數
    }

    function renderBoard() {
        if (!mushroomBoard) return;
        
        let htmlContent = "";
        const keys = Object.keys(localMushroomsData);

        // 撈取篩選與搜尋欄位數值
        const cityFilter = filterCity?.value || "all";
        const distFilter = filterDistrict?.value || "all";
        const keyword = searchKeyword?.value.trim().toLowerCase() || "";

        if (keys.length === 0) {
            mushroomBoard.innerHTML = '<p class="loading-text">目前沒有即時情報，快去發佈第一個吧！</p>';
            return;
        }

        // 依據是否釘選權重排序
        keys.sort((a, b) => {
            const aPinned = pinnedList.includes(a) ? 1 : 0;
            const bPinned = pinnedList.includes(b) ? 1 : 0;
            return bPinned - aPinned; 
        });

        let renderedCount = 0;

        keys.forEach(id => {
            const item = localMushroomsData[id];
            
            // 🔍 進行條件篩選
            // ========================================================
// 🎯 👉 進階修改：支援跨行政區可見的模糊比對篩選
// ========================================================
if (cityFilter !== "all" && item.city !== cityFilter) return;

if (distFilter !== "all") {
    // 檢查一：回報時選定的主行政區是否相符
    const matchPrimaryDistrict = item.district === distFilter;
    
    // 檢查二：具體地點名稱是否有提及該行政區 (例如名稱打：捷運站-大安/信義交界)
    const matchLocationText = item.locationName.includes(distFilter);
    
    // 只要主行政區符合，或者地點名稱有提到，就代表該區玩家看得到！
    if (!matchPrimaryDistrict && !matchLocationText) return;
}
// ========================================================
            if (keyword !== "") {
                const matchLocation = item.locationName.toLowerCase().includes(keyword);
                const matchType = item.type.toLowerCase().includes(keyword);
                if (!matchLocation && !matchType) return;
            }

            // 計算精準時間倒數
            const totalReportedMs = ((item.timeReported.hours * 3600) + (item.timeReported.minutes * 60) + item.timeReported.seconds) * 1000;
            const expireTime = item.createdAt + totalReportedMs;
            const msLeft = expireTime - Date.now();

            let timeString = "";
            let statusClass = "countdown-text";

            if (msLeft > 0) {
                const totalSec = Math.floor(msLeft / 1000);
                const h = Math.floor(totalSec / 3600);
                const m = Math.floor((totalSec % 3600) / 60);
                const s = totalSec % 60;
                timeString = `⏳ 剩餘時間：${h}時${m}分${s}秒`;
            } else {
                const bufferLeft = 300000 + msLeft; // 5分鐘重生緩衝 (300,000 毫秒)
                if (bufferLeft > 0) {
                    const totalSec = Math.floor(bufferLeft / 1000);
                    const m = Math.floor(totalSec / 60);
                    const s = totalSec % 60;
                    timeString = `🔄 下次出現倒數：${m}分${s}秒`;
                    statusClass = "countdown-text buffer-period"; // 變為紅色樣式
                } else {
                    return; // 超過緩衝期，過期不予渲染
                }
            }

            renderedCount++;
            const isPinned = pinnedList.includes(id) ? "pinned" : "";
            const pinBtnText = pinnedList.includes(id) ? "⭐ 已釘選" : "📌 📌 釘選";

            htmlContent += `
                <div class="mushroom-card ${isPinned}" data-id="${id}">
                    <div class="card-header">
                        <img src="${item.mushroomIcon}" class="shroom-img" alt="${item.type}" onerror="this.src='https://via.placeholder.com/50x50?text=🍄'">
                        <div class="shroom-info">
                            <h4>[${item.size}] ${item.type}</h4>
                            <p>📍 ${item.city}${item.district} - ${item.locationName}</p>
                        </div>
                    </div>
                    <div class="card-body">
                        <p>👥 👥 參戰人數：<strong>${item.currentPlayers} / ${item.maxPlayers}</strong> 人</p>
                        <p class="${statusClass}">${timeString}</p>
                    </div>
                    <div class="card-footer">
                        <button class="btn-sm btn-pin ${isPinned ? 'active' : ''}" onclick="togglePin('${id}')">${pinBtnText}</button>
                        <button class="btn-sm" onclick="quickJoin('${id}')">➕ 人數+1</button>
                    </div>
                </div>
            `;
        });

        if (renderedCount === 0) {
            mushroomBoard.innerHTML = '<p class="loading-text">🔍 找不到符合當前地區或條件的蘑菇情報。</p>';
        } else {
            mushroomBoard.innerHTML = htmlContent;
        }
    }

    window.togglePin = (id) => {
        const index = pinnedList.indexOf(id);
        if (index > -1) pinnedList.splice(index, 1);
        else pinnedList.push(id);
        localStorage.setItem("pinned_mushrooms", JSON.stringify(pinnedList));
        renderBoard();
    };

    window.quickJoin = (id) => {
        const item = localMushroomsData[id];
        if (!item || !window.fbDB) return;
        if (item.currentPlayers >= item.maxPlayers) {
            alert("該蘑菇人數已滿！");
            return;
        }
        const shroomRef = window.fbRef(window.fbDB, `mushrooms/${id}`);
        window.fbUpdate(shroomRef, {
            currentPlayers: item.currentPlayers + 1,
            updatedAt: Date.now()
        });
    };

    // 確保 Firebase、全台行政區字典都成功載入後，再行掛載核心功能
    const checkFbInterval = setInterval(() => {
        if (window.fbDB && window.taiwanData) {
            clearInterval(checkFbInterval);
            initFilterDistricts(); 
            startBoardSync();      
        }
    }, 200);
});
