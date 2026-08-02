// js/report.js

let map; 
let markerGroup; 
let userCurrentLat = null;  
let userCurrentLng = null;  
let isNearbyFilterOn = false; 

// 🍄 全站統一蘑菇名稱校正工具
function normalizeMushroomType(typeStr) {
    if (!typeStr) return '一般蘑菇';
    let normalized = String(typeStr).trim();
    return normalized
        .replace(/巨型/g, '巨大')
        .replace(/普通/g, '一般')
        .replace(/小型/g, '小')
        .replace(/大型/g, '大');
}

// ⚡ 格式碼解析 (含自動推算時間 + 模糊比對 + 自動發佈回報)
function parseMushroomCode(code) {
    if (!code || !code.startsWith('#菇')) {
        alert('❌ 格式碼無效！格式應為：#菇,截圖時間,地點名稱,蘑菇種類,剩餘時間');
        return false;
    }

    const parts = code.trim().split(',');
    if (parts.length < 5) {
        alert('❌ 格式碼欄位不足！請確認包含：#菇,截圖時間,地點,種類,時間');
        return false;
    }

    let [prefix, rawPhotoTime, rawLocation, rawType, rawTime] = parts.map(p => p ? p.trim() : '');

    // 1. 計算截圖時間差
    let timeOffsetSec = 0;
    if (rawPhotoTime) {
        const now = new Date();
        const photoDate = new Date();
        const photoTimeParts = rawPhotoTime.split(':').map(t => parseInt(t, 10) || 0);
        if (photoTimeParts.length >= 2) {
            photoDate.setHours(photoTimeParts[0], photoTimeParts[1], photoTimeParts[2] || 0, 0);
            const diffMs = now.getTime() - photoDate.getTime();
            if (diffMs > 0) timeOffsetSec = Math.floor(diffMs / 1000);
        }
    }

    // 2. 清洗地點與模糊比對
    let cleanLocation = rawLocation.replace(/[>＞]/g, '').trim();
    let bestMatchedLocation = cleanLocation;
    let highestScore = 0;

    if (typeof localMushroomsData !== 'undefined') {
        Object.values(localMushroomsData).forEach(item => {
            if (item.locationName) {
                const score = calculateSimilarity(cleanLocation, item.locationName);
                if (score > highestScore && score >= 0.55) {
                    highestScore = score;
                    bestMatchedLocation = item.locationName;
                }
            }
        });
    }

    // 3. 清洗種類
    let cleanType = rawType.replace(/\s+/g, '');
    let finalType = normalizeMushroomType(cleanType);

    // 4. 解析剩餘時間並扣除時間差
    let h = 0, m = 0, s = 0;
    if (rawTime.includes('小時') || rawTime.includes('分')) {
        const hMatch = rawTime.match(/(\d+)\s*小時/);
        const mMatch = rawTime.match(/(\d+)\s*分/);
        const sMatch = rawTime.match(/(\d+)\s*秒/);
        if (hMatch) h = parseInt(hMatch[1], 10);
        if (mMatch) m = parseInt(mMatch[1], 10);
        if (sMatch) s = parseInt(sMatch[1], 10);
    } else {
        const timeParts = rawTime.split(':').map(t => parseInt(t, 10) || 0);
        if (timeParts.length === 3) { h = timeParts[0]; m = timeParts[1]; s = timeParts[2]; }
        else if (timeParts.length === 2) { h = timeParts[0]; m = timeParts[1]; s = 0; }
    }

    let totalLeftSec = (h * 3600) + (m * 60) + s - timeOffsetSec;
    if (totalLeftSec < 0) totalLeftSec = 0;

    const finalH = Math.floor(totalLeftSec / 3600);
    const finalM = Math.floor((totalLeftSec % 3600) / 60);
    const finalS = totalLeftSec % 60;

    // 5. 自動帶入表單欄位
    const locationInput = document.getElementById('location-name');
    if (locationInput) locationInput.value = bestMatchedLocation;

    const typeSelect = document.getElementById('mushroom-type');
    if (typeSelect) {
        let matchedOption = Array.from(typeSelect.options).find(opt => 
            opt.value === finalType || opt.text.includes(finalType)
        );
        if (matchedOption) typeSelect.value = matchedOption.value;
        else typeSelect.value = finalType;
    }

    const hEl = document.getElementById('time-hours');
    const mEl = document.getElementById('time-minutes');
    const sEl = document.getElementById('time-seconds');
    if (hEl && mEl && sEl) {
        hEl.value = finalH;
        mEl.value = finalM;
        sEl.value = finalS;
    }

    const playerInput = document.getElementById('current-players');
    if (playerInput) playerInput.value = 1;

    // 🌟 核心修復：自動觸發表單送出 (寫入 Firebase)
    const reportForm = document.getElementById("report-form");
    if (reportForm) {
        // 使用 setTimeout 確保 Firebase 資料庫連線準備好後立刻送出
        setTimeout(() => {
            reportForm.requestSubmit(); 
        }, 300);
    }

    return true;
}

// 🟢 地圖初始化
function initLeafletMap() {
    try {
        const mapContainer = document.getElementById('map');
        if (!mapContainer || typeof L === 'undefined') return;
        map = L.map('map').setView([22.613, 120.316], 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap' }).addTo(map);
        markerGroup = L.layerGroup().addTo(map);
    } catch (error) { console.error("地圖錯誤:", error); }
}

document.addEventListener("DOMContentLoaded", () => {
    initLeafletMap();

    const reportForm = document.getElementById("report-form");
    const mushroomBoard = document.getElementById("mushroom-board");
    const searchKeyword = document.getElementById("search-keyword");
    const filterCity = document.getElementById("filter-city");
    const filterDistrict = document.getElementById("filter-district");
    const btnAutoLocation = document.getElementById("btn-auto-location");
    const btnNearbyMushrooms = document.getElementById("btn-nearby-mushrooms");
    const sortMethod = document.getElementById("sort-method");
    const btnGridView = document.getElementById("btn-grid-view");
    const btnListView = document.getElementById("btn-list-view");

    let localMushroomsData = {};
    let pinnedList = JSON.parse(localStorage.getItem("pinned_mushrooms")) || [];
    let alertEnabledList = JSON.parse(localStorage.getItem("mushroom_alerts_enabled")) || [];
    let activePanels = {};

    // 🌟 核心修復：全域視圖模式切換（解決列表模式無法切換問題）
    window.setViewMode = function(mode) {
        if (!mushroomBoard) return;
        mushroomBoard.className = `board-container ${mode}-view`;
        btnGridView?.classList.toggle("active", mode === "grid");
        btnListView?.classList.toggle("active", mode === "list");
        localStorage.setItem("board_view_pref", mode);
        renderBoard(); // 切換後立刻重繪
    };

    if (btnGridView && btnListView) {
        btnGridView.addEventListener("click", () => window.setViewMode("grid"));
        btnListView.addEventListener("click", () => window.setViewMode("list"));
    }

    const savedView = localStorage.getItem("board_view_pref") || "grid";
    window.setViewMode(savedView);

    function initFilterDistricts() {
        if (!filterCity || !filterDistrict || !window.taiwanData) return;

        filterCity.innerHTML = '<option value="all">所有縣市</option>';
        Object.keys(window.taiwanData).forEach(city => {
            const option = document.createElement("option");
            option.value = city; option.textContent = city;
            filterCity.appendChild(option);
        });

        filterDistrict.innerHTML = '<option value="all">所有行政區</option>';
        filterDistrict.disabled = true;

        filterCity.addEventListener("change", () => {
            const selectedCity = filterCity.value;
            filterDistrict.innerHTML = '<option value="all">所有行政區</option>';
            if (selectedCity === "all") {
                filterDistrict.disabled = true;
            } else {
                filterDistrict.disabled = false;
                (window.taiwanData[selectedCity] || []).forEach(dist => {
                    const option = document.createElement("option");
                    option.value = dist; option.textContent = dist;
                    filterDistrict.appendChild(option);
                });
            }
            renderBoard();
        });

        filterDistrict.addEventListener("change", renderBoard);
        sortMethod?.addEventListener("change", renderBoard);
        searchKeyword?.addEventListener("input", renderBoard);
        renderBoard();
    }

    if (reportForm) {
        reportForm.addEventListener("submit", (e) => {
            e.preventDefault();
            if (!window.fbDB) return alert("Firebase 尚未連線！");

            const cityEl = document.getElementById("city");
            const districtEl = document.getElementById("district");
            const city = cityEl ? cityEl.value : "高雄市";
            const district = districtEl ? districtEl.value : "前金區";

            const locationName = document.getElementById("location-name").value.trim();
            const type = normalizeMushroomType(document.getElementById("mushroom-type").value);
            const size = normalizeMushroomType(document.getElementById("mushroom-size").value);
            const players = parseInt(document.getElementById("current-players").value) || 1;

            const h = parseInt(document.getElementById("time-hours").value) || 0;
            const m = parseInt(document.getElementById("time-minutes").value) || 0;
            const s = parseInt(document.getElementById("time-seconds").value) || 0;

            const nowTimestamp = Date.now();
            const latVal = parseFloat(document.getElementById("lat")?.value) || null;
            const lngVal = parseFloat(document.getElementById("lng")?.value) || null;

            let existingId = null;
            for (const [id, item] of Object.entries(localMushroomsData)) {
                if (item.locationName === locationName) {
                    existingId = id; break;
                }
            }

            const mushroomData = {
                city, district: [district], locationName, type, size,
                currentPlayers: players, maxPlayers: 30,
                timeReported: { hours: h, minutes: m, seconds: s },
                createdAt: nowTimestamp, updatedAt: nowTimestamp,
                lat: latVal, lng: lngVal
            };

            if (existingId) {
                window.fbUpdate(window.fbRef(window.fbDB, `mushrooms/${existingId}`), mushroomData)
                    .then(() => { reportForm.reset(); alert("🔄 自動回報：已成功原地更新！"); });
            } else {
                window.fbPush(window.fbRef(window.fbDB, "mushrooms"), mushroomData)
                    .then(() => { reportForm.reset(); alert("🎉 自動回報：新情報發佈成功！"); });
            }
        });
    }

    function getIconPath(type) {
        if (!type) return "picture/mushroom_monthly_special.png";
        const typeStr = String(type);
        if (typeStr.includes("每月") || typeStr.includes("特殊")) return "picture/mushroom_monthly_special.png";
        if (typeStr.includes("火")) return "picture/mushroom_fire.png";
        if (typeStr.includes("水")) return "picture/mushroom_water.png";
        if (typeStr.includes("毒")) return "picture/mushroom_poison.png";
        if (typeStr.includes("電")) return "picture/mushroom_electric.png";
        if (typeStr.includes("冰")) return "picture/mushroom_ice.png";
        if (typeStr.includes("紅")) return "picture/mushroom_red.png";
        if (typeStr.includes("藍")) return "picture/mushroom_blue.png";
        if (typeStr.includes("黃")) return "picture/mushroom_yellow.png";
        if (typeStr.includes("紫")) return "picture/mushroom_purple.png";
        if (typeStr.includes("白")) return "picture/mushroom_white.png";
        return "picture/mushroom_monthly_special.png";
    }

    function startBoardSync() {
        if (!window.fbDB || !mushroomBoard) return;
        window.fbOnValue(window.fbRef(window.fbDB, "mushrooms"), (snapshot) => {
            localMushroomsData = snapshot.val() || {};
            renderBoard();

            // 網頁載入後，若有代碼則執行解析與發佈
            const urlParams = new URLSearchParams(window.location.search);
            const codeParam = urlParams.get('code');
            if (codeParam) {
                parseMushroomCode(decodeURIComponent(codeParam));
                // 清除 URL 參數防重複送出
                window.history.replaceState({}, document.title, window.location.pathname);
            }
        });
        setInterval(updateTickCounters, 1000);
    }

    // 🌟 畫板渲染
    function renderBoard() {
        const keys = Object.keys(localMushroomsData);

        const countEl = document.getElementById("daily-report-count");
        if (countEl) {
            const startOfToday = new Date();
            startOfToday.setHours(0, 0, 0, 0);
            const todayTimestamp = startOfToday.getTime();
            const dailyCount = keys.filter(id => (localMushroomsData[id].updatedAt || localMushroomsData[id].createdAt || 0) >= todayTimestamp).length;
            countEl.textContent = `📊 今日回報量：${dailyCount} 筆`;
        }

        if (!mushroomBoard) return;
        let htmlContent = "";
        const cityFilter = filterCity?.value || "all";
        const distFilter = filterDistrict?.value || "all";
        const keyword = searchKeyword?.value.trim().toLowerCase() || "";

        if (keys.length === 0) {
            mushroomBoard.innerHTML = '<p class="loading-text">目前沒有即時情報，快去發佈第一個吧！</p>';
            if (markerGroup) markerGroup.clearLayers();
            return;
        }

        if (markerGroup) markerGroup.clearLayers();

        keys.forEach(id => {
            const item = localMushroomsData[id];
            const displayType = normalizeMushroomType(item.type);
            const displaySize = normalizeMushroomType(item.size);

            if (cityFilter !== "all" && item.city !== cityFilter) return;
            if (distFilter !== "all" && item.district && !item.district.includes(distFilter)) return;
            if (keyword && !item.locationName.toLowerCase().includes(keyword) && !displayType.toLowerCase().includes(keyword)) return;

            const isPinned = pinnedList.includes(id) ? "pinned" : "";
            const pinBtnText = pinnedList.includes(id) ? "⭐" : "📌";
            const dynamicImgSrc = getIconPath(displayType);

            htmlContent += `
                <div class="mushroom-card ${isPinned}" data-id="${id}" id="card-${id}">
                    <div class="card-header">
                        <img src="${dynamicImgSrc}" class="shroom-img" alt="${displayType}">
                        <div class="shroom-info">
                            <div style="display: flex; align-items: center; gap: 6px; flex-wrap: nowrap;">
                                <h4 style="margin:0; white-space:nowrap;">[${displaySize}] ${displayType}</h4>
                            </div>
                            <span style="font-size:12px; color:#666;">📍 ${item.city || ''} - ${item.locationName}</span>
                        </div>
                        <div class="header-controls-group" style="display: flex; gap: 4px; margin-left: auto;">
                            <button class="btn-sm btn-pin-top" onclick="togglePin('${id}')">${pinBtnText}</button>
                        </div>
                    </div>
                    <div class="card-body">
                        <p style="margin:4px 0;">👥 參戰人數：<strong>${item.currentPlayers || 0} / ${item.maxPlayers || 30}</strong> 人</p>
                        <p class="countdown-text" id="time-text-${id}" style="margin:4px 0;">⏳ 計算時間中...</p>
                    </div>
                </div>
            `;

            if (markerGroup && item.lat && item.lng) {
                const marker = L.marker([item.lat, item.lng]).bindPopup(`<b>${displayType}</b><br>${item.locationName}`);
                markerGroup.addLayer(marker);
            }
        });

        mushroomBoard.innerHTML = htmlContent || '<p class="loading-text">🔍 找不到符合條件的蘑菇。</p>';
        updateTickCounters();
    }

    function updateTickCounters() {
        const keys = Object.keys(localMushroomsData);
        keys.forEach(id => {
            const item = localMushroomsData[id];
            const textElement = document.getElementById(`time-text-${id}`);
            if (!textElement || !item.timeReported) return;

            const totalReportedMs = ((item.timeReported.hours * 3600) + (item.timeReported.minutes * 60) + (item.timeReported.seconds || 0)) * 1000;
            const expireTime = item.createdAt + totalReportedMs;
            const msLeft = expireTime - Date.now();

            if (msLeft > 0) {
                const totalSec = Math.floor(msLeft / 1000);
                const h = Math.floor(totalSec / 3600);
                const m = Math.floor((totalSec % 3600) / 60);
                const s = totalSec % 60;
                textElement.textContent = `⏳ 剩餘時間：${h}時${m}分${s}秒`;
            } else {
                textElement.textContent = `🔄 待現場玩家更新 (新菇已出生)`;
            }
        });
    }

    window.togglePin = (id) => {
        const index = pinnedList.indexOf(id);
        if (index > -1) pinnedList.splice(index, 1);
        else pinnedList.push(id);
        localStorage.setItem("pinned_mushrooms", JSON.stringify(pinnedList));
        renderBoard();
    };

    function bootstrapFilter() {
        if (window.taiwanData) {
            initFilterDistricts();
            return true;
        }
        return false;
    }

    if (!bootstrapFilter()) {
        const forceLoadInterval = setInterval(() => {
            if (bootstrapFilter()) clearInterval(forceLoadInterval);
        }, 30);
    }

    const checkFbInterval = setInterval(() => {
        if (window.fbDB) {
            clearInterval(checkFbInterval);
            startBoardSync();
        }
    }, 150);
});
