// js/report.js

// 🌟 將地圖相關全域變數宣告在最頂層
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

// ⚡ 格式碼/捷徑解析與自動帶入函式
function parseMushroomCode(code) {
    if (!code || !code.startsWith('#菇')) {
        alert('❌ 格式碼無效！格式應為：#菇,地點名稱,蘑菇種類,剩餘時間,參戰人數');
        return false;
    }

    const parts = code.trim().split(',');
    if (parts.length < 5) {
        alert('❌ 格式碼欄位不足！請確認包含：#菇,地點,種類,時間,人數');
        return false;
    }

    let [prefix, locationName, rawType, timeStr, players] = parts.map(p => p.trim());
    const finalType = normalizeMushroomType(rawType);

    const locationInput = document.getElementById('location-name');
    if (locationInput) locationInput.value = locationName;

    const typeSelect = document.getElementById('mushroom-type');
    if (typeSelect) {
        let matchedOption = Array.from(typeSelect.options).find(opt => 
            opt.value === finalType || opt.text.includes(finalType)
        );
        if (matchedOption) typeSelect.value = matchedOption.value;
        else typeSelect.value = finalType;
    }

    const timeParts = timeStr.split(':').map(t => parseInt(t, 10) || 0);
    const hEl = document.getElementById('time-hours');
    const mEl = document.getElementById('time-minutes');
    const sEl = document.getElementById('time-seconds');

    if (hEl && mEl && sEl) {
        if (timeParts.length === 3) {
            hEl.value = timeParts[0]; mEl.value = timeParts[1]; sEl.value = timeParts[2];
        } else if (timeParts.length === 2) {
            hEl.value = timeParts[0]; mEl.value = timeParts[1]; sEl.value = 0;
        }
    }

    const playerInput = document.getElementById('current-players');
    if (playerInput) playerInput.value = parseInt(players, 10) || 1;

    alert(`✅ 已成功解析格式碼！\n📍 地點：${locationName}\n🍄 種類：${finalType}\n⏳ 時間：${timeStr}\n👥 人數：${players}`);
    
    document.querySelector(".report-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
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
    } catch (error) {
        console.error("地圖初始化錯誤:", error);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const urlParams = new URLSearchParams(window.location.search);
    const codeParam = urlParams.get('code');
    if (codeParam) parseMushroomCode(decodeURIComponent(codeParam));

    const termsOverlay = document.getElementById("terms-overlay");
    const chkAgreeTerms = document.getElementById("chk-agree-terms");
    const btnEnterSite = document.getElementById("btn-enter-site");

    if (termsOverlay && chkAgreeTerms && btnEnterSite) {
        const hasAgreed = localStorage.getItem("user_agreed_mushrooms_terms");
        termsOverlay.style.display = hasAgreed ? "none" : "flex";
        document.body.style.overflow = hasAgreed ? "auto" : "hidden";

        chkAgreeTerms.addEventListener("change", () => {
            btnEnterSite.disabled = !chkAgreeTerms.checked;
            btnEnterSite.className = chkAgreeTerms.checked ? "btn-enter-active" : "btn-enter-disabled";
        });

        btnEnterSite.addEventListener("click", () => {
            if (chkAgreeTerms.checked) {
                localStorage.setItem("user_agreed_mushrooms_terms", "true");
                termsOverlay.style.display = "none";
                document.body.style.overflow = "auto";
            }
        });
    }

    initLeafletMap();

    const reportForm = document.getElementById("report-form");
    const mushroomBoard = document.getElementById("mushroom-board");
    const searchKeyword = document.getElementById("search-keyword");
    const filterCity = document.getElementById("filter-city");
    const filterDistrict = document.getElementById("filter-district");
    const btnAutoLocation = document.getElementById("btn-auto-location");
    const btnNearbyMushrooms = document.getElementById("btn-nearby-mushrooms");
    const sortMethod = document.getElementById("sort-method");

    let localMushroomsData = {};
    let pinnedList = JSON.parse(localStorage.getItem("pinned_mushrooms")) || [];
    let alertEnabledList = JSON.parse(localStorage.getItem("mushroom_alerts_enabled")) || [];
    let activePanels = {};

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

    if (btnAutoLocation) {
        btnAutoLocation.addEventListener("click", () => {
            if (!navigator.geolocation) return alert("不支援定位");
            btnAutoLocation.textContent = "⌛";
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    userCurrentLat = pos.coords.latitude;
                    userCurrentLng = pos.coords.longitude;
                    if (map) map.setView([userCurrentLat, userCurrentLng], 16);
                    btnAutoLocation.textContent = "🎯 定位";
                    renderBoard();
                },
                () => { btnAutoLocation.textContent = "🎯 定位"; alert("GPS 定位失敗"); }
            );
        });
    }

    if (btnNearbyMushrooms) {
        btnNearbyMushrooms.addEventListener("click", () => {
            if (userCurrentLat === null || userCurrentLng === null) return alert("請先點擊「🎯 定位」！");
            isNearbyFilterOn = !isNearbyFilterOn;
            btnNearbyMushrooms.classList.toggle("active", isNearbyFilterOn);
            btnNearbyMushrooms.textContent = isNearbyFilterOn ? "🟢 顯示 600m 內" : "📍 篩選 600m 內";
            renderBoard();
        });
    }

    if (reportForm) {
        reportForm.addEventListener("submit", (e) => {
            e.preventDefault();
            if (!window.fbDB) return alert("Firebase 尚未連線！");

            const city = document.getElementById("city").value;
            const district = document.getElementById("district").value;
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
                if (item.city === city && item.locationName === locationName) {
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
                    .then(() => { reportForm.reset(); alert("🔄 原地更新成功！"); });
            } else {
                window.fbPush(window.fbRef(window.fbDB, "mushrooms"), mushroomData)
                    .then(() => { reportForm.reset(); alert("🎉 發佈成功！"); });
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
        });
        setInterval(updateTickCounters, 1000);
    }

    // 🌟 渲染主畫板（修正今日計算 + 解決跳行）
    function renderBoard() {
        const keys = Object.keys(localMushroomsData);

        // 📊 1. 計算「今日回報量」
        const countEl = document.getElementById("daily-report-count");
        if (countEl) {
            const startOfToday = new Date();
            startOfToday.setHours(0, 0, 0, 0);
            const todayTimestamp = startOfToday.getTime();

            const dailyCount = keys.filter(id => {
                const item = localMushroomsData[id];
                const lastTime = item.updatedAt || item.createdAt || 0;
                return lastTime >= todayTimestamp;
            }).length;

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
            const isAlertEnabled = alertEnabledList.includes(id);
            const alertBtnText = isAlertEnabled ? "🔔 提醒已開" : "🔕 開啟提醒";

            const dynamicImgSrc = getIconPath(displayType);
            const lastUpdatedDate = new Date(item.updatedAt || item.createdAt || Date.now());
            const formattedTime = `${lastUpdatedDate.getMonth()+1}/${lastUpdatedDate.getDate()} ${lastUpdatedDate.getHours().toString().padStart(2,'0')}:${lastUpdatedDate.getMinutes().toString().padStart(2,'0')}`;

            const isEditOpen = activePanels[id]?.edit ? "block" : "none";
            const isHistoryOpen = activePanels[id]?.history ? "block" : "none";

            const fastFillData = encodeURIComponent(JSON.stringify({
                city: item.city,
                district: Array.isArray(item.district) ? item.district[0] : item.district,
                locationName: item.locationName,
                lat: item.lat || "",
                lng: item.lng || ""
            }));

            // 🌟 修正點：使用 style="display:inline-flex" 與 flex-nowrap 防跳行
            htmlContent += `
                <div class="mushroom-card ${isPinned}" data-id="${id}" id="card-${id}">
                    <div class="card-header">
                        <img src="${dynamicImgSrc}" class="shroom-img" alt="${displayType}">
                        <div class="shroom-info">
                            <div style="display: flex; align-items: center; gap: 6px; flex-wrap: nowrap;">
                                <h4 style="margin:0; white-space:nowrap;">[${displaySize}] ${displayType}</h4>
                                <button class="btn-fast-fill-trigger" onclick="handleFastFill('${fastFillData}')" style="font-size:11px; padding:2px 6px; cursor:pointer; white-space:nowrap; border-radius:4px; background:#e0f2fe; color:#0284c7; border:1px solid #bae6fd;">⚡ 更新</button>
                            </div>
                            <span style="font-size:12px; color:#666;">📍 ${item.city} - ${item.locationName}</span>
                        </div>
                        
                        <div class="header-controls-group" style="display: flex; gap: 4px; margin-left: auto;">
                            <button class="btn-sm btn-pin-top" onclick="togglePin('${id}')">${pinBtnText}</button>
                            <button class="btn-history-trigger" onclick="toggleHistoryPanel('${id}')">◎</button>
                        </div>
                    </div>

                    <div id="history-panel-${id}" class="history-info-panel" style="display: ${isHistoryOpen}; font-size:12px; background:#f8fafc; padding:6px; border-radius:4px; margin-top:4px;">
                        <p style="margin:0;">🕒 上次更新：<strong>${formattedTime}</strong></p>
                    </div>

                    <div class="card-body">
                        <p style="margin:4px 0;">👥 參戰人數：<strong>${item.currentPlayers || 0} / ${item.maxPlayers || 30}</strong> 人</p>
                        <p class="countdown-text" id="time-text-${id}" style="margin:4px 0;">⏳ 計算時間中...</p>
                    </div>

                    <div id="edit-panel-${id}" class="edit-status-panel" style="display: ${isEditOpen}; padding:8px; background:#f0fdf4; border-radius:6px; margin-top:6px;">
                        <h5 style="margin:0 0 6px 0;">✏️ 修改目前即時狀態：</h5>
                        <div style="display:flex; gap:8px; align-items:center; margin-bottom:6px;">
                            <label>👥 人數：</label>
                            <input type="number" id="edit-players-${id}" min="0" max="40" value="${item.currentPlayers || 0}" style="width:60px;">
                        </div>
                        <div style="display:flex; gap:8px; align-items:center; margin-bottom:8px;">
                            <label>⏳ 時間：</label>
                            <input type="number" id="edit-h-${id}" min="0" max="23" value="0" placeholder="時" style="width:40px;">:
                            <input type="number" id="edit-m-${id}" min="0" max="59" value="0" placeholder="分" style="width:40px;">:
                            <input type="number" id="edit-s-${id}" min="0" max="59" value="0" placeholder="秒" style="width:40px;">
                        </div>
                        <div style="display:flex; gap:6px;">
                            <button class="btn-save" onclick="saveStatusEdit('${id}')" style="background:#22c55e; color:white; border:none; padding:4px 8px; border-radius:4px; cursor:pointer;">💾 儲存</button>
                            <button class="btn-cancel" onclick="toggleEditPanel('${id}')" style="background:#94a3b8; color:white; border:none; padding:4px 8px; border-radius:4px; cursor:pointer;">取消</button>
                        </div>
                    </div>

                    <div class="card-footer" style="display:flex; gap:6px; margin-top:8px;">
                        <button class="btn-sm btn-alert" id="alert-btn-${id}" onclick="toggleAlert('${id}')">${alertBtnText}</button>
                        <button class="btn-sm btn-edit-trigger" id="edit-btn-${id}" onclick="toggleEditPanel('${id}')">✏️ 更新狀態</button>
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

    // ⏰ 倒數計時即時刷新
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

    window.toggleHistoryPanel = (id) => {
        if (!activePanels[id]) activePanels[id] = { edit: false, history: false };
        activePanels[id].history = !activePanels[id].history;
        renderBoard();
    };

    window.toggleEditPanel = (id) => {
        if (!activePanels[id]) activePanels[id] = { edit: false, history: false };
        activePanels[id].edit = !activePanels[id].edit;
        renderBoard();
    };

    window.saveStatusEdit = (id) => {
        if (!window.fbDB) return;
        const players = parseInt(document.getElementById(`edit-players-${id}`).value) || 0;
        const h = parseInt(document.getElementById(`edit-h-${id}`).value) || 0;
        const m = parseInt(document.getElementById(`edit-m-${id}`).value) || 0;
        const s = parseInt(document.getElementById(`edit-s-${id}`).value) || 0;

        const now = Date.now();
        window.fbUpdate(window.fbRef(window.fbDB, `mushrooms/${id}`), {
            currentPlayers: players,
            timeReported: { hours: h, minutes: m, seconds: s },
            createdAt: now, updatedAt: now
        }).then(() => {
            activePanels[id].edit = false;
            alert("💾 狀態更新成功！");
            renderBoard();
        });
    };

    window.toggleAlert = (id) => {
        const index = alertEnabledList.indexOf(id);
        if (index > -1) alertEnabledList.splice(index, 1);
        else alertEnabledList.push(id);
        localStorage.setItem("mushroom_alerts_enabled", JSON.stringify(alertEnabledList));
        renderBoard();
    };

    window.handleFastFill = (encodedData) => {
        try {
            const data = JSON.parse(decodeURIComponent(encodedData));
            document.getElementById("city").value = data.city;
            document.getElementById("location-name").value = data.locationName;
            document.querySelector(".report-section")?.scrollIntoView({ behavior: "smooth" });
        } catch (e) { console.error(e); }
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
/**
 * ⚡ 格式碼解析 (支援 OCR 雜字自動清洗 + 模糊相似度比對 + 取消人數強制要求)
 * 新版格式範例：#菇,轉角遇到電箱 >,巨大 海泡泡蘑菇,剩下6小時 43 分 27 秒
 */
function parseMushroomCode(code) {
    if (!code || !code.startsWith('#菇')) {
        alert('❌ 格式碼無效！格式應為：#菇,地點名稱,蘑菇種類,剩餘時間');
        return false;
    }

    // 依逗號切割欄位
    const parts = code.trim().split(',');
    // 🌟 修改點：欄位長度要求從 5 降為 4，不再強制要求第五個「人數」參數
    if (parts.length < 4) {
        alert('❌ 格式碼欄位不足！請確認包含：#菇,地點,種類,時間');
        return false;
    }

    // 🌟 修改點：對 parts 使用可選解構，若沒有 rawPlayers 則給空字串
    let [prefix, rawLocation, rawType, rawTime, rawPlayers] = parts.map(p => p ? p.trim() : '');

    // 🧹 1. 清洗地點名稱
    let cleanLocation = rawLocation.replace(/[>＞]/g, '').trim();
    let bestMatchedLocation = cleanLocation;
    let highestScore = 0;

    // 🔍 比對現有資料庫中是否存在相似地點
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

    // 🧹 2. 清洗蘑菇種類與大小
    let cleanType = rawType.replace(/\s+/g, '');
    let finalType = normalizeMushroomType(cleanType);

    // 🧹 3. 超強時間解析引擎
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
        if (timeParts.length === 3) {
            h = timeParts[0]; m = timeParts[1]; s = timeParts[2];
        } else if (timeParts.length === 2) {
            h = timeParts[0]; m = timeParts[1]; s = 0;
        }
    }

    // 🌟 修改點 4. 解析人數 (如果有傳遞就用，沒傳遞則預設為 1 人)
    let players = rawPlayers ? (parseInt(rawPlayers, 10) || 1) : 1;

    // 💼 自動填入表單
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
        hEl.value = h;
        mEl.value = m;
        sEl.value = s;
    }

    const playerInput = document.getElementById('current-players');
    if (playerInput) playerInput.value = players;

    // 顯示提示訊息 (移除強制顯示人數)
    if (highestScore >= 0.55 && cleanLocation !== bestMatchedLocation) {
        alert(`🎯 偵測到相似據點！\n辨識結果：${cleanLocation}\n自動對齊全名：${bestMatchedLocation}\n🍄 種類：${finalType}\n⏳ 時間：${h}時${m}分${s}秒`);
    } else {
        alert(`✅ 已成功透過截圖解析自動帶入！\n📍 地點：${bestMatchedLocation}\n🍄 種類：${finalType}\n⏳ 時間：${h}時${m}分${s}秒`);
    }

    document.querySelector(".report-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
    return true;
}
/**
 * 📊 計算兩個字串的相似度 (0 ~ 1)
 * 支援短字串包含與錯別字容錯
 */
function calculateSimilarity(str1, str2) {
    if (!str1 || !str2) return 0;
    
    const s1 = str1.trim().toLowerCase();
    const s2 = str2.trim().toLowerCase();

    // 1. 若其中一個字串完全包含另一個（處理名稱被截斷的情況）
    if (s1.includes(s2) || s2.includes(s1)) {
        const minLen = Math.min(s1.length, s2.length);
        const maxLen = Math.max(s1.length, s2.length);
        // 如果較短的字串長度大於 3 個字，直接給予高相似度分
        if (minLen >= 3 && minLen / maxLen >= 0.5) {
            return 0.85; 
        }
    }

    // 2. 核心相似度演算法 (Levenshtein Distance)
    const track = Array(s2.length + 1).fill(null).map(() =>
        Array(s1.length + 1).fill(null));
    for (let i = 0; i <= s1.length; i += 1) track[0][i] = i;
    for (let j = 0; j <= s2.length; j += 1) track[j][0] = j;

    for (let j = 1; j <= s2.length; j += 1) {
        for (let i = 1; i <= s1.length; i += 1) {
            const indicator = s1[i - 1] === s2[j - 1] ? 0 : 1;
            track[j][i] = Math.min(
                track[j][i - 1] + 1, // 刪除
                track[j - 1][i] + 1, // 插入
                track[j - 1][i - 1] + indicator // 替換
            );
        }
    }

    const distance = track[s2.length][s1.length];
    const maxLength = Math.max(s1.length, s2.length);
    return 1 - (distance / maxLength);
}
