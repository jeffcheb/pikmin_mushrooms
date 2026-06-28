// js/report.js

document.addEventListener("DOMContentLoaded", () => {
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

    let localMushroomsData = {};
    let pinnedList = JSON.parse(localStorage.getItem("pinned_mushrooms")) || [];
    let alertEnabledList = JSON.parse(localStorage.getItem("mushroom_alerts_enabled")) || [];
    let firedAlerts = {};
    let activePanels = {};

    // 人數動態限制
    if (mushroomSize && currentPlayers) {
        const updateMaxPlayers = () => {
            const size = mushroomSize.value;
            let maxVal = 30; 
            if (size === "小型") maxVal = 25;
            else if (size === "普通" || size === "一般") maxVal = 30;
            else if (size === "大型") maxVal = 35;
            else if (size === "巨大") maxVal = 40;
            
            currentPlayers.max = maxVal;
            if (parseInt(currentPlayers.value) > maxVal) {
                currentPlayers.value = maxVal;
            }
        };
        mushroomSize.addEventListener("change", updateMaxPlayers);
        updateMaxPlayers();
    }

    // 網格/清單模式切換
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

    // 初始化縣市選單
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
                filterDistrict.value = "all";
                filterDistrict.disabled = true;
            } else {
                filterDistrict.disabled = false;
                const districts = window.taiwanData[selectedCity] || [];
                districts.forEach(dist => {
                    const option = document.createElement("option");
                    option.value = dist;
                    option.textContent = dist;
                    filterDistrict.appendChild(option);
                });
            }
            renderBoard(); 
        });

        filterDistrict.addEventListener("change", renderBoard);
        searchKeyword?.addEventListener("input", renderBoard);
    }

    // 免 API 純前端定位
    if (btnAutoLocation) {
        btnAutoLocation.addEventListener("click", () => {
            if (!navigator.geolocation) {
                alert("您的瀏覽器不支援地理定位功能。");
                return;
            }
            btnAutoLocation.textContent = "⌛ 定位中";
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const lat = position.coords.latitude;
                    const lon = position.coords.longitude;
                    const TaiwanCityCoordinates = {
                        "台北市": { lat: 25.0339, lon: 121.5644, defaultDist: "大安區" },
                        "新北市": { lat: 25.0169, lon: 121.4627, defaultDist: "板橋區" },
                        "桃園市": { lat: 24.9936, lon: 121.3009, defaultDist: "桃園區" },
                        "台中市": { lat: 24.1477, lon: 120.6736, defaultDist: "西屯區" },
                        "台南市": { lat: 22.9908, lon: 120.2133, defaultDist: "中西區" },
                        "高雄市": { lat: 22.6273, lon: 120.3014, defaultDist: "前鎮區" },
                        "基隆市": { lat: 25.1283, lon: 121.7391, defaultDist: "仁愛區" },
                        "宜蘭縣": { lat: 24.7570, lon: 121.7530, defaultDist: "宜蘭市" }
                    };

                    let closestCity = "高雄市"; 
                    let minDistance = Infinity;
                    for (const [cityName, coord] of Object.entries(TaiwanCityCoordinates)) {
                        const dLat = lat - coord.lat;
                        const dLon = lon - coord.lon;
                        const distance = Math.sqrt(dLat * dLat + dLon * dLon);
                        if (distance < minDistance) {
                            minDistance = distance;
                            closestCity = cityName;
                        }
                    }
                    const foundDist = TaiwanCityCoordinates[closestCity].defaultDist;
                    if (filterCity && filterDistrict) {
                        const districtsData = window.taiwanData || {}; 
                        filterCity.value = closestCity;
                        filterDistrict.innerHTML = '<option value="all">所有行政區</option>';
                        filterDistrict.disabled = false;
                        const districts = districtsData[closestCity] || [];
                        districts.forEach(dist => {
                            const option = document.createElement("option");
                            option.value = dist;
                            option.textContent = dist;
                            filterDistrict.appendChild(option);
                        });
                        filterDistrict.value = foundDist;
                        btnAutoLocation.textContent = "🎯 定位";
                        alert(`🎯 定位成功：已自動切換至【${closestCity} ${foundDist}】`);
                        renderBoard();
                    }
                },
                () => {
                    btnAutoLocation.textContent = "🎯 定位";
                    alert("GPS 定位失敗，請確認是否開啟權限。");
                },
                { enableHighAccuracy: false, timeout: 5000 }
            );
        });
    }

    // 情報發佈 (寫入 Firebase)
    // --- F3: 情報發佈 (🔥 升級版：自動防重複、原地覆蓋更新機制) ---
    if (reportForm) {
        reportForm.addEventListener("submit", (e) => {
            e.preventDefault();
            if (!window.fbDB) return;

            const city = document.getElementById("city").value;
            const district = document.getElementById("district").value;
            const locationName = document.getElementById("location-name").value.trim();
            const type = document.getElementById("mushroom-type").value;
            const size = mushroomSize.value;
            const players = parseInt(currentPlayers.value);
            const hours = parseInt(document.getElementById("time-hours").value) || 0;
            const minutes = parseInt(document.getElementById("time-minutes").value) || 0;
            const seconds = parseInt(document.getElementById("time-seconds").value) || 0;

            let maxPlayersVal = 30;
            if (size === "小型") maxPlayersVal = 25;
            else if (size === "普通" || size === "一般") maxPlayersVal = 30;
            else if (size === "大型") maxPlayersVal = 35;
            else if (size === "巨大") maxPlayersVal = 40;

            const iconPath = getIconPath(type);
            const nowTimestamp = Date.now();

            // 📦 準備要寫入或更新的資料內容
            const mushroomData = {
                city, district, locationName, type, size,
                mushroomIcon: iconPath,
                currentPlayers: players, maxPlayers: maxPlayersVal,
                timeReported: { hours, minutes, seconds },
                createdAt: nowTimestamp, 
                updatedAt: nowTimestamp
            };

            // 🔍 核心檢查：遍歷目前本機已快取的 localMushroomsData，比對有沒有完全相同的菇
            let existingId = null;
            for (const [id, item] of Object.entries(localMushroomsData)) {
                if (item.city === city && item.district === district && item.locationName === locationName) {
                    existingId = id; // 找到了！抓到重複的地點了
                    break;
                }
            }

            if (existingId) {
                // 🔄 狀況 A：地點重複，不新增卡片，直接原地「覆蓋更新」原卡片！
                const targetRef = window.fbRef(window.fbDB, `mushrooms/${existingId}`);
                window.fbUpdate(targetRef, mushroomData)
                    .then(() => {
                        reportForm.reset();
                        document.getElementById("district").disabled = true;
                        // 清除通知鎖，讓新覆蓋的蘑菇倒數能再次觸發推播
                        delete firedAlerts[existingId];
                        alert(`🔄 偵測到相同地點！已成功為您更新【${locationName}】的蘑菇狀態，防重複卡卡！`);
                    })
                    .catch((error) => alert("更新失敗：" + error.message));
            } else {
                // ➕ 狀況 B：全新地點，正常建立新卡片
                const shroomRef = window.fbRef(window.fbDB, "mushrooms");
                window.fbPush(shroomRef, mushroomData)
                    .then(() => {
                        reportForm.reset();
                        document.getElementById("district").disabled = true;
                        alert("🎉 全新地點！情報已順利發佈成功！");
                    })
                    .catch((error) => alert("發佈失敗：" + error.message));
            }
        });
    }

    function getIconPath(type) {
    if (type.includes("火")) return "picture/mushroom_fire.png";
    if (type.includes("水")) return "picture/mushroom_water.png";
    if (type.includes("水晶")) return "picture/mushroom_crystal.png";
    if (type.includes("毒")) return "picture/mushroom_poison.png";
    if (type.includes("電")) return "picture/mushroom_electric.png";
    
    // 🥶 完美支援「冰蘑菇」與社群愛用的「冰藍蘑菇」關鍵字！
    if (type.includes("冰") || type.includes("冰藍")) return "picture/mushroom_ice.png"; 
    
    // 🎨 普通/巨大蘑菇系列
    if (type.includes("紅")) return "picture/mushroom_red.png";
    if (type.includes("藍")) return "picture/mushroom_blue.png";
    if (type.includes("黃")) return "picture/mushroom_yellow.png";
    if (type.includes("紫")) return "picture/mushroom_purple.png";
    if (type.includes("白")) return "picture/mushroom_white.png";
    if (type.includes("灰") || type.includes("岩石")) return "picture/mushroom_rock.png"; 
    if (type.includes("粉紅") || type.includes("羽翅")) return "picture/mushroom_wing.png"; 
    
    // 🌟 預設保底或當月限定
    return "picture/mushroom_monthly_special.png"; 
}

    function startBoardSync() {
        if (!window.fbDB || !mushroomBoard) return;
        const shroomRef = window.fbRef(window.fbDB, "mushrooms");
        window.fbOnValue(shroomRef, (snapshot) => {
            localMushroomsData = snapshot.val() || {};
            renderBoard();
        });
        setInterval(renderBoard, 1000); 
    }

    // ========================================================
    // 🌍 看板渲染引擎（新增：過期驚嘆號、核實按鈕面板）
    // ========================================================
    function renderBoard() {
        if (!mushroomBoard) return;
        
        let htmlContent = "";
        const keys = Object.keys(localMushroomsData);

        const cityFilter = filterCity?.value || "all";
        const distFilter = filterDistrict?.value || "all";
        const keyword = searchKeyword?.value.trim().toLowerCase() || "";

        if (keys.length === 0) {
            mushroomBoard.innerHTML = '<p class="loading-text">目前沒有即時情報，快去發佈第一個吧！</p>';
            return;
        }

        keys.sort((a, b) => {
            const aPinned = pinnedList.includes(a) ? 1 : 0;
            const bPinned = pinnedList.includes(b) ? 1 : 0;
            return bPinned - aPinned; 
        });

        let renderedCount = 0;

        keys.forEach(id => {
            const item = localMushroomsData[id];
            
            if (cityFilter !== "all" && item.city !== cityFilter) return;
            if (distFilter !== "all") {
                const matchPrimaryDistrict = item.district === distFilter;
                const matchLocationText = item.locationName.includes(distFilter);
                if (!matchPrimaryDistrict && !matchLocationText) return;
            }
            if (keyword !== "") {
                const matchLocation = item.locationName.toLowerCase().includes(keyword);
                const matchType = item.type.toLowerCase().includes(keyword);
                if (!matchLocation && !matchType) return;
            }

            const totalReportedMs = ((item.timeReported.hours * 3600) + (item.timeReported.minutes * 60) + item.timeReported.seconds) * 1000;
            const expireTime = item.createdAt + totalReportedMs;
            const msLeft = expireTime - Date.now();

            let timeString = "";
            let statusClass = "countdown-text";
            let expiredCardClass = ""; 
            let showQuickPanel = false; 

            let displayMaxPlayers = item.maxPlayers || 30;
            if (item.size === "小型") displayMaxPlayers = 25;
            else if (item.size === "普通" || item.size === "一般") displayMaxPlayers = 30;
            else if (item.size === "大型") displayMaxPlayers = 35;
            else if (item.size === "巨大") displayMaxPlayers = 40;

            let curH = 0, curM = 0, curS = 0;

            if (msLeft > 0) {
                const totalSec = Math.floor(msLeft / 1000);
                curH = Math.floor(totalSec / 3600);
                curM = Math.floor((totalSec % 3600) / 60);
                curS = totalSec % 60;
                timeString = `⏳ 剩餘時間：${curH}時${curM}分${curS}秒`;
            } else {
                const bufferLeft = 300000 + msLeft; 
                if (bufferLeft > 0) {
                    const totalSec = Math.floor(bufferLeft / 1000);
                    const m = Math.floor(totalSec / 60);
                    const s = totalSec % 60;
                    timeString = `🔄 下次出現倒數：${m}分${s}秒`;
                    statusClass = "countdown-text buffer-period"; 

                    if (totalSec >= 50 && totalSec <= 60 && alertEnabledList.includes(id) && !firedAlerts[id]) {
                        firedAlerts[id] = true; 
                        triggerWebNotification(item);
                    }
                } else {
                    timeString = `🔄 待現場玩家更新 (新菇已出生)`;
                    statusClass = "countdown-text need-update-period";
                    expiredCardClass = "card-expired-mode"; 
                    showQuickPanel = true; 
                }
            }

            // 🌟 核心計算：檢查這張卡片是否「許久未更新（超過15分鐘）」
            const lastUpdatedTime = item.updatedAt || item.createdAt;
            const msSinceLastUpdate = Date.now() - lastUpdatedTime;
            const isStale = msSinceLastUpdate > 900000; // 15分鐘 = 900,000 毫秒

            renderedCount++;
            const isPinned = pinnedList.includes(id) ? "pinned" : "";
            const pinBtnText = pinnedList.includes(id) ? "⭐ 已釘選" : "📌 釘選";
            const isAlertEnabled = alertEnabledList.includes(id);
            const alertBtnText = isAlertEnabled ? "🔔 提醒已開" : "🔕 開啟提醒";

            const lastUpdatedDate = new Date(lastUpdatedTime);
            const formattedTime = `${lastUpdatedDate.getMonth()+1}/${lastUpdatedDate.getDate()} ${lastUpdatedDate.getHours().toString().padStart(2,'0')}:${lastUpdatedDate.getMinutes().toString().padStart(2,'0')}:${lastUpdatedDate.getSeconds().toString().padStart(2,'0')}`;

            const isEditOpen = activePanels[id]?.edit ? "block" : "none";
            const isHistoryOpen = activePanels[id]?.history ? "block" : "none";

            const inputPlayersVal = document.getElementById(`edit-players-${id}`) ? document.getElementById(`edit-players-${id}`).value : item.currentPlayers;
            const inputHVal = document.getElementById(`edit-h-${id}`) && isEditOpen === "block" ? document.getElementById(`edit-h-${id}`).value : curH;
            const inputMVal = document.getElementById(`edit-m-${id}`) && isEditOpen === "block" ? document.getElementById(`edit-m-${id}`).value : curM;
            const inputSVal = document.getElementById(`edit-s-${id}`) && isEditOpen === "block" ? document.getElementById(`edit-s-${id}`).value : curS;

            htmlContent += `
                <div class="mushroom-card ${isPinned} ${expiredCardClass}" data-id="${id}">
                    
                    ${isStale && !showQuickPanel ? `
                    <div class="stale-warning-badge" title="這份情報已超過 15 分鐘未更新，狀態可能不準確。">
                        ⚠️ 許久未更新
                    </div>
                    ` : ''}

                    <div class="card-header">
                        <img src="${item.mushroomIcon}" class="shroom-img" alt="${item.type}" onerror="this.src='https://via.placeholder.com/50x50?text=🍄'">
                        <div class="shroom-info">
                            <h4>[${item.size}] ${item.type}</h4>
                            <p>📍 ${item.city}${item.district} - ${item.locationName}</p>
                        </div>
                        <button class="btn-history-trigger" onclick="toggleHistoryPanel('${id}')" title="顯示上次更新時間">◎</button>
                    </div>

                    <div id="history-panel-${id}" class="history-info-panel" style="display: ${isHistoryOpen};">
                        <p>🕒 上次更新：<strong>${formattedTime}</strong></p>
                    </div>

                    <div class="card-body">
                        <p>👥 參戰人數：<strong>${item.currentPlayers} / ${displayMaxPlayers}</strong> 人</p>
                        <p class="${statusClass}">${timeString}</p>
                    </div>

                    <div id="edit-panel-${id}" class="edit-status-panel" style="display: ${isEditOpen};">
                        <h5>✏️ 修改目前即時狀態：</h5>
                        <div class="edit-row">
                            <label>👥 人數：</label>
                            <input type="number" id="edit-players-${id}" min="0" max="${displayMaxPlayers}" value="${inputPlayersVal}">
                        </div>
                        <div class="edit-row">
                            <label>⏳ 時間：</label>
                            <div class="edit-time-inputs">
                                <input type="number" id="edit-h-${id}" min="0" max="23" value="${inputHVal}" placeholder="時">:
                                <input type="number" id="edit-m-${id}" min="0" max="59" value="${inputMVal}" placeholder="分">:
                                <input type="number" id="edit-s-${id}" min="0" max="59" value="${inputSVal}" placeholder="秒">
                            </div>
                        </div>
                        <div class="edit-actions">
                            <button class="btn-save" onclick="saveStatusEdit('${id}')">💾 儲存送出</button>
                            <button class="btn-cancel" onclick="toggleEditPanel('${id}')">取消</button>
                        </div>
                    </div>

                    ${showQuickPanel ? `
                    <div class="quick-update-panel">
                        <h5>⚡ 快速回報現場新菇：</h5>
                        <div class="quick-buttons">
                            <button onclick="quickUpdateStatus('${id}', '每月特殊蘑菇', '巨大', 4)">✨ 巨大特殊菇 (4小時)</button>
                            <button onclick="quickUpdateStatus('${id}', '每月特殊蘑菇', '大型', 3)">✨ 大型特殊菇 (3小時)</button>
                            <button onclick="quickUpdateStatus('${id}', '火蘑菇', '大型', 4)">🔥 大型火菇 (4小時)</button>
                            <button onclick="quickUpdateStatus('${id}', '一般紅蘑菇', '普通', 1)">🔴 普通紅菇 (1小時)</button>
                            <button class="btn-no-shroom" onclick="quickUpdateStatus('${id}', '暫無蘑菇', '無', 0)">❌ 目前沒長菇 (清除卡片)</button>
                        </div>
                    </div>
                    ` : ''}

                    <div class="card-footer">
                        <button class="btn-sm btn-pin ${isPinned ? 'active' : ''}" onclick="togglePin('${id}')">${pinBtnText}</button>
                        <button class="btn-sm btn-alert ${isAlertEnabled ? 'btn-alert-on' : 'btn-alert-off'}" onclick="toggleAlert('${id}')" ${expiredCardClass ? 'style="display:none;"' : ''}>${alertBtnText}</button>
                        <button class="btn-sm btn-edit-trigger" onclick="toggleEditPanel('${id}')" ${showQuickPanel ? 'style="display:none;"' : ''}>✏️ 更新狀態</button>
                        
                        ${isStale && !showQuickPanel ? `
                        <button class="btn-sm btn-verify" onclick="verifyMushroomStatus('${id}')">✅ 核實狀態</button>
                        ` : ''}
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

    // 🌟 核心功能：一鍵核實按鈕處理程序
    window.verifyMushroomStatus = (id) => {
        if (!window.fbDB) return;
        const item = localMushroomsData[id];
        if (!item) return;

        // 計算因為時間流逝，目前應該扣除的賸餘時間，再重新存進去，保持倒數完全不中斷！
        const totalReportedMs = ((item.timeReported.hours * 3600) + (item.timeReported.minutes * 60) + item.timeReported.seconds) * 1000;
        const expireTime = item.createdAt + totalReportedMs;
        const msLeft = expireTime - Date.now();

        if (msLeft <= 0) return; // 安全機制：過期就不給核實了

        const totalSec = Math.floor(msLeft / 1000);
        const h = Math.floor(totalSec / 3600);
        const m = Math.floor((totalSec % 3600) / 60);
        const s = totalSec % 60;

        const shroomRef = window.fbRef(window.fbDB, `mushrooms/${id}`);
        const now = Date.now();

        // 重新注入最新時間與印章，洗掉驚嘆號！
        window.fbUpdate(shroomRef, {
            timeReported: { hours: h, minutes: m, seconds: s },
            createdAt: now,
            updatedAt: now // 更新印章
        }).then(() => {
            alert("✅ 核實成功！已同步通知社群：目前該點情報 100% 準確！");
        }).catch(err => alert("核實失敗：" + err.message));
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
        const newPlayers = parseInt(document.getElementById(`edit-players-${id}`).value) || 0;
        const h = parseInt(document.getElementById(`edit-h-${id}`).value) || 0;
        const m = parseInt(document.getElementById(`edit-m-${id}`).value) || 0;
        const s = parseInt(document.getElementById(`edit-s-${id}`).value) || 0;

        const shroomRef = window.fbRef(window.fbDB, `mushrooms/${id}`);
        const now = Date.now();

        window.fbUpdate(shroomRef, {
            currentPlayers: newPlayers,
            timeReported: { hours: h, minutes: m, seconds: s },
            createdAt: now, 
            updatedAt: now
        }).then(() => {
            alert("💾 狀態更新成功！");
            if (activePanels[id]) activePanels[id].edit = false;
            delete firedAlerts[id];
        }).catch(err => alert("更新失敗：" + err.message));
    };

    window.quickUpdateStatus = (id, type, size, hours) => {
        if (!window.fbDB) return;
        const shroomRef = window.fbRef(window.fbDB, `mushrooms/${id}`);

        if (type === "暫無蘑菇") {
            window.fbRemove(shroomRef)
                .then(() => alert("❌ 已同步回報：該點目前無蘑菇，卡片已下架。"))
                .catch(err => alert("更新失敗：" + err.message));
            return;
        }

        let maxVal = 30;
        if (size === "小型") maxVal = 25;
        else if (size === "普通") maxVal = 30;
        else if (size === "大型") maxVal = 35;
        else if (size === "巨大") maxVal = 40;

        const iconPath = getIconPath(type);
        const now = Date.now();

        window.fbUpdate(shroomRef, {
            type: type,
            size: size,
            mushroomIcon: iconPath,
            currentPlayers: 0,
            maxPlayers: maxVal,
            timeReported: { hours: hours, minutes: 0, seconds: 0 },
            createdAt: now,
            updatedAt: now
        }).then(() => {
            delete firedAlerts[id];
            alert(`🎉 快速更新成功！已同步此處為【${size} ${type}】`);
        }).catch(err => alert("更新失敗：" + err.message));
    };

    window.toggleAlert = (id) => {
        const index = alertEnabledList.indexOf(id);
        if (index > -1) {
            alertEnabledList.splice(index, 1);
            delete firedAlerts[id];
        } else {
            alertEnabledList.push(id);
        }
        localStorage.setItem("mushroom_alerts_enabled", JSON.stringify(alertEnabledList));
        renderBoard();
    };

    function triggerWebNotification(item) {
        if ("Notification" in window && Notification.permission === "granted") {
            new Notification("🍄 皮克敏蘑菇轉生預告！", {
                body: `📍【${item.city}${item.district} - ${item.locationName}】將在 1 分鐘後原地出生，準備卡位！`,
                icon: item.mushroomIcon || "picture/mushroom_normal.png",
                requireInteraction: true
            });
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
        let currentMax = 30;
        if (item.size === "小型") currentMax = 25;
        else if (item.size === "普通" || item.size === "一般") currentMax = 30;
        else if (item.size === "大型") currentMax = 35;
        else if (item.size === "巨大") currentMax = 40;

        if (item.currentPlayers >= currentMax) {
            alert("該蘑菇人數已滿！");
            return;
        }
        const shroomRef = window.fbRef(window.fbDB, `mushrooms/${id}`);
        window.fbUpdate(shroomRef, {
            currentPlayers: item.currentPlayers + 1,
            updatedAt: Date.now()
        });
    };

    function bootstrapFilter() {
        const availableData = window.taiwanData || (typeof taiwanData !== 'undefined' ? taiwanData : null);
        if (availableData) {
            window.taiwanData = availableData;
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
