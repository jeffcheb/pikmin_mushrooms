// js/report.js

// 🌟 將地圖相關全域變數宣告在最頂層
let map; // Leaflet 地圖物件
let markerGroup; // 用來集中管理大頭針的圖層群組
let userCurrentLat = null;  // 儲存玩家目前的精準緯度
let userCurrentLng = null;  // 儲存玩家目前的精準經緯
let isNearbyFilterOn = false; // 紀錄「600m篩選」按鈕目前是否開啟

// 🍄 全站統一蘑菇名稱校正工具 (將 巨型->巨大、普通->一般、小型->小、大型->大)
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

    // 1. 帶入地點
    const locationInput = document.getElementById('location-name');
    if (locationInput) locationInput.value = locationName;

    // 2. 帶入蘑菇種類
    const typeSelect = document.getElementById('mushroom-type');
    if (typeSelect) {
        let matchedOption = Array.from(typeSelect.options).find(opt => 
            opt.value === finalType || opt.text.includes(finalType)
        );
        if (matchedOption) {
            typeSelect.value = matchedOption.value;
        } else {
            typeSelect.value = finalType;
        }
    }

    // 3. 解析剩餘時間 (支援 HH:MM:SS 或 HH:MM)
    const timeParts = timeStr.split(':').map(t => parseInt(t, 10) || 0);
    const hEl = document.getElementById('time-hours');
    const mEl = document.getElementById('time-minutes');
    const sEl = document.getElementById('time-seconds');

    if (hEl && mEl && sEl) {
        if (timeParts.length === 3) {
            hEl.value = timeParts[0];
            mEl.value = timeParts[1];
            sEl.value = timeParts[2];
        } else if (timeParts.length === 2) {
            hEl.value = timeParts[0];
            mEl.value = timeParts[1];
            sEl.value = 0;
        }
    }

    // 4. 帶入參戰人數
    const playerInput = document.getElementById('current-players');
    if (playerInput) playerInput.value = parseInt(players, 10) || 1;

    alert(`✅ 已成功解析格式碼！\n📍 地點：${locationName}\n🍄 種類：${finalType}\n⏳ 時間：${timeStr}\n👥 人數：${players}`);
    
    // 自動捲動到表單位置
    const reportSection = document.querySelector(".report-section");
    if (reportSection) {
        reportSection.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    return true;
}

// 🟢 隔離防護版：地圖初始化
function initLeafletMap() {
    try {
        const mapContainer = document.getElementById('map');
        if (!mapContainer) return;
        if (typeof L === 'undefined') return;

        map = L.map('map').setView([22.613, 120.316], 13);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap'
        }).addTo(map);

        markerGroup = L.layerGroup().addTo(map);
    } catch (error) {
        console.error("地圖初始化錯誤:", error);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    // 🔗 檢查網址列是否有捷徑傳入的 code 參數
    const urlParams = new URLSearchParams(window.location.search);
    const codeParam = urlParams.get('code');
    if (codeParam) {
        parseMushroomCode(decodeURIComponent(codeParam));
    }

    // 📜 條款視窗控制
    const termsOverlay = document.getElementById("terms-overlay");
    const chkAgreeTerms = document.getElementById("chk-agree-terms");
    const btnEnterSite = document.getElementById("btn-enter-site");

    if (termsOverlay && chkAgreeTerms && btnEnterSite) {
        const hasAgreed = localStorage.getItem("user_agreed_mushrooms_terms");
        if (!hasAgreed) {
            termsOverlay.style.display = "flex";
            document.body.style.overflow = "hidden";
        } else {
            termsOverlay.style.display = "none";
            document.body.style.overflow = "auto";
        }

        chkAgreeTerms.addEventListener("change", () => {
            btnEnterSite.disabled = !chkAgreeTerms.checked;
            btnEnterSite.className = chkAgreeTerms.checked ? "btn-enter-active" : "btn-enter-disabled";
        });

        btnEnterSite.addEventListener("click", () => {
            if (chkAgreeTerms.checked) {
                localStorage.setItem("user_agreed_mushrooms_terms", "true");
                termsOverlay.style.display = "none";
                document.body.style.overflow = "auto";
                if ("Notification" in window && Notification.permission === "default") {
                    Notification.requestPermission();
                }
            }
        });
    }

    initLeafletMap();

    // 元件選取
    const reportForm = document.getElementById("report-form");
    const mushroomBoard = document.getElementById("mushroom-board");
    const mushroomSize = document.getElementById("mushroom-size");
    const currentPlayers = document.getElementById("current-players");
    
    const btnGridView = document.getElementById("btn-grid-view");
    const btnListView = document.getElementById("btn-list-view");
    const searchKeyword = document.getElementById("search-keyword");
    const filterCity = document.getElementById("filter-city");
    const filterDistrict = document.getElementById("filter-district");
    const btnAutoLocation = document.getElementById("btn-auto-location");
    const btnNearbyMushrooms = document.getElementById("btn-nearby-mushrooms");
    const sortMethod = document.getElementById("sort-method");

    let localMushroomsData = {};
    let pinnedList = JSON.parse(localStorage.getItem("pinned_mushrooms")) || [];
    let alertEnabledList = JSON.parse(localStorage.getItem("mushroom_alerts_enabled")) || [];
    let firedAlerts = {};
    let activePanels = {};

    // 視圖切換
    const savedView = localStorage.getItem("board_view_pref") || "grid";
    setViewMode(savedView);

    if (btnGridView && btnListView) {
        btnGridView.addEventListener("click", () => setViewMode("grid"));
        btnListView.addEventListener("click", () => setViewMode("list"));
    }

    function setViewMode(mode) {
        if (!mushroomBoard) return;
        mushroomBoard.className = `board-container ${mode}-view`;
        btnGridView?.classList.toggle("active", mode === "grid");
        btnListView?.classList.toggle("active", mode === "list");
        localStorage.setItem("board_view_pref", mode);
    }

    // 初始化選單
    function initFilterDistricts() {
        if (!filterCity || !filterDistrict || !window.taiwanData) return;

        filterCity.innerHTML = '<option value="all">所有縣市</option>';
        Object.keys(window.taiwanData).forEach(city => {
            const option = document.createElement("option");
            option.value = city;
            option.textContent = city;
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
                    option.value = dist;
                    option.textContent = dist;
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

    // 定位與 600m 按鈕
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
                () => {
                    btnAutoLocation.textContent = "🎯 定位";
                    alert("GPS 定位失敗");
                }
            );
        });
    }

    if (btnNearbyMushrooms) {
        btnNearbyMushrooms.addEventListener("click", () => {
            if (userCurrentLat === null || userCurrentLng === null) {
                alert("請先點擊「🎯 定位」按鈕！");
                return;
            }
            isNearbyFilterOn = !isNearbyFilterOn;
            btnNearbyMushrooms.classList.toggle("active", isNearbyFilterOn);
            btnNearbyMushrooms.textContent = isNearbyFilterOn ? "🟢 顯示 600m 內" : "📍 篩選 600m 內";
            renderBoard();
        });
    }

    // 情報發佈與寫入
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
                    existingId = id;
                    break;
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

    // 🌟 渲染主畫板（完整按鈕與面板版）
    function renderBoard() {
        const keys = Object.keys(localMushroomsData);
        if (!mushroomBoard) return;

        let htmlContent = "";
        const cityFilter = filterCity?.value || "all";
        const distFilter = filterDistrict?.value || "all";
        const keyword = searchKeyword?.value.trim().toLowerCase() || "";
        const currentSort = sortMethod?.value || "default";

        if (keys.length === 0) {
            mushroomBoard.innerHTML = '<p class="loading-text">目前沒有即時情報，快去發佈第一個吧！</p>';
            if (markerGroup) markerGroup.clearLayers();
            return;
        }

        // 排序邏輯
        keys.sort((a, b) => {
            const aPinned = pinnedList.includes(a) ? 1 : 0;
            const bPinned = pinnedList.includes(b) ? 1 : 0;
            if (bPinned !== aPinned) return bPinned - aPinned;

            const itemA = localMushroomsData[a];
            const itemB = localMushroomsData[b];

            if (currentSort === "size") {
                const sizeWeight = { "巨大": 4, "大": 3, "大型": 3, "一般": 2, "普通": 2, "小": 1, "小型": 1 };
                return (sizeWeight[itemB.size] || 0) - (sizeWeight[itemA.size] || 0);
            }
            return 0;
        });

        if (markerGroup) markerGroup.clearLayers();
        let bounds = [];
        let hasValidMarker = false;

        keys.forEach(id => {
            const item = localMushroomsData[id];
            const displayType = normalizeMushroomType(item.type);
            const displaySize = normalizeMushroomType(item.size);

            if (cityFilter !== "all" && item.city !== cityFilter) return;
            if (distFilter !== "all" && item.district && !item.district.includes(distFilter)) return;
            if (keyword && !item.locationName.toLowerCase().includes(keyword) && !displayType.toLowerCase().includes(keyword)) return;

            const isPinned = pinnedList.includes(id) ? "pinned" : "";
            const pinBtnText = pinnedList.includes(id) ? "⭐ 已釘選" : "📌 釘選";
            const isAlertEnabled = alertEnabledList.includes(id);
            const alertBtnText = isAlertEnabled ? "🔔 提醒已開" : "🔕 開啟提醒";

            const dynamicImgSrc = getIconPath(displayType);

            // 格式化上次更新時間
            const lastUpdatedDate = new Date(item.updatedAt || item.createdAt || Date.now());
            const formattedTime = `${lastUpdatedDate.getMonth()+1}/${lastUpdatedDate.getDate()} ${lastUpdatedDate.getHours().toString().padStart(2,'0')}:${lastUpdatedDate.getMinutes().toString().padStart(2,'0')}:${lastUpdatedDate.getSeconds().toString().padStart(2,'0')}`;

            // 控制開關狀態
            const isEditOpen = activePanels[id]?.edit ? "block" : "none";
            const isHistoryOpen = activePanels[id]?.history ? "block" : "none";

            const fastFillData = encodeURIComponent(JSON.stringify({
                city: item.city,
                district: Array.isArray(item.district) ? item.district[0] : item.district,
                locationName: item.locationName,
                lat: item.lat || "",
                lng: item.lng || ""
            }));

            // 🌟 組合出所有原本的完整按鈕與面板 HTML
            htmlContent += `
                <div class="mushroom-card ${isPinned}" data-id="${id}" id="card-${id}">
                    <div id="stale-badge-${id}" class="stale-warning-badge" style="display:none;">⚠️ 許久未更新</div>

                    <div class="card-header">
                        <img src="${dynamicImgSrc}" class="shroom-img" alt="${displayType}">
                        <div class="shroom-info">
                            <h4 style="display: flex; align-items: center; gap: 6px;">
                                [${displaySize}] ${displayType}
                                <button class="btn-fast-fill-trigger" onclick="handleFastFill('${fastFillData}')" title="快填此地點">⚡ 更新</button>
                            </h4>
                            <div class="location-container">
                                <span class="city-text">📍 ${item.city} - ${item.locationName}</span>
                            </div>
                        </div>
                        
                        <div class="header-controls-group" style="display: flex; gap: 4px; margin-left: auto;">
                            <button class="btn-sm btn-pin-top ${isPinned ? 'active' : ''}" onclick="togglePin('${id}')" title="${pinBtnText}">
                                ${isPinned ? '⭐' : '📌'}
                            </button>
                            <button class="btn-history-trigger" onclick="toggleHistoryPanel('${id}')" title="顯示上次更新時間">◎</button>
                        </div>
                    </div>

                    <div id="history-panel-${id}" class="history-info-panel" style="display: ${isHistoryOpen}; font-size:12px; background:#f8fafc; padding:6px; border-radius:4px; margin-top:4px;">
                        <p>🕒 上次更新：<strong>${formattedTime}</strong></p>
                    </div>

                    <div class="card-body">
                        <p>👥 參戰人數：<strong>${item.currentPlayers || 0} / ${item.maxPlayers || 30}</strong> 人</p>
                        <p class="countdown-text" id="time-text-${id}">⏳ 計算時間中...</p>
                    </div>

                    <div id="edit-panel-${id}" class="edit-status-panel" style="display: ${isEditOpen}; padding:8px; background:#f0fdf4; border-radius:6px; margin-bottom:8px;">
                        <h5 style="margin:0 0 6px 0;">✏️ 修改目前即時狀態：</h5>
                        <div style="display:flex; gap:8px; align-items:center; margin-bottom:6px;">
                            <label>👥 人數：</label>
                            <input type="number" id="edit-players-${id}" min="0" max="40" value="${item.currentPlayers || 0}" style="width:60px;">
                        </div>
                        <div style="display:flex; gap:8px; align-items:center; margin-bottom:8px;">
                            <label>⏳ 時間：</label>
                            <input type="number" id="edit-h-${id}" min="0" max="23" value="0" placeholder="時" style="width:45px;">:
                            <input type="number" id="edit-m-${id}" min="0" max="59" value="0" placeholder="分" style="width:45px;">:
                            <input type="number" id="edit-s-${id}" min="0" max="59" value="0" placeholder="秒" style="width:45px;">
                        </div>
                        <div style="display:flex; gap:6px;">
                            <button class="btn-save" onclick="saveStatusEdit('${id}')" style="background:#22c55e; color:white; border:none; padding:4px 8px; border-radius:4px; cursor:pointer;">💾 儲存</button>
                            <button class="btn-cancel" onclick="toggleEditPanel('${id}')" style="background:#94a3b8; color:white; border:none; padding:4px 8px; border-radius:4px; cursor:pointer;">取消</button>
                        </div>
                    </div>

                    <div class="card-footer" style="display:flex; gap:6px; margin-top:8px;">
                        <button class="btn-sm btn-alert" id="alert-btn-${id}" onclick="toggleAlert('${id}')">${alertBtnText}</button>
                        <button class="btn-sm btn-edit-trigger" id="edit-btn-${id}" onclick="toggleEditPanel('${id}')">✏️ 更新狀態</button>
                        <button class="btn-sm btn-verify" id="verify-btn-${id}" style="display:none;" onclick="verifyMushroomStatus('${id}')">✅ 核實狀態</button>
                    </div>
                </div>
            `;

            if (markerGroup && item.lat && item.lng) {
                const marker = L.marker([item.lat, item.lng]).bindPopup(`<b>${displayType}</b><br>${item.locationName}`);
                markerGroup.addLayer(marker);
                bounds.push([item.lat, item.lng]);
                hasValidMarker = true;
            }
        });

        mushroomBoard.innerHTML = htmlContent;
        updateTickCounters();
    }


    // ⏰ 倒數計時即時刷新引擎
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
