// js/report.js

document.addEventListener("DOMContentLoaded", () => {
    // ========================================================
    // 📜 核心新增：使用條款與免責聲明彈窗控制邏輯
    // ========================================================
    const termsOverlay = document.getElementById("terms-overlay");
    const chkAgreeTerms = document.getElementById("chk-agree-terms");
    const btnEnterSite = document.getElementById("btn-enter-site");

    if (termsOverlay && chkAgreeTerms && btnEnterSite) {
        // 1. 檢查使用者以前是否曾經同意過條款
        const hasAgreed = localStorage.getItem("user_agreed_mushrooms_terms");

        if (!hasAgreed) {
            // 如果沒同意過，強制顯示彈窗遮罩，並禁止後面網頁捲動
            termsOverlay.style.display = "flex";
            document.body.style.overflow = "hidden";
        } else {
            // 如果同意過，保持隱藏，網頁正常運作
            termsOverlay.style.display = "none";
            document.body.style.overflow = "auto";
        }

        // 2. 監聽勾選狀態切換
        chkAgreeTerms.addEventListener("change", () => {
            if (chkAgreeTerms.checked) {
                btnEnterSite.disabled = false;
                btnEnterSite.className = "btn-enter-active";
            } else {
                btnEnterSite.disabled = true;
                btnEnterSite.className = "btn-enter-disabled";
            }
        });

        // 3. 點擊「進入網站」按鈕
        btnEnterSite.addEventListener("click", () => {
            if (chkAgreeTerms.checked) {
                // 將同意紀錄永久存入瀏覽器 localStorage
                localStorage.setItem("user_agreed_mushrooms_terms", "true");
                
                // 關閉遮罩並恢復網頁捲動
                termsOverlay.style.display = "none";
                document.body.style.overflow = "auto";
                
                // 引導玩家開啟推播
                if ("Notification" in window && Notification.permission === "default") {
                    Notification.requestPermission();
                }
            }
        });
    }

    // ========================================================
    // 🌍 原有功能：看板變數與核心元件初始化
    // ========================================================
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
    
    // 排序選單
    const sortMethod = document.getElementById("sort-method");

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
        sortMethod?.addEventListener("change", renderBoard);
    }

    // 免 API 純前端定位
    if (btnAutoLocation) {
        btnAutoLocation.addEventListener("click", () => {
            if (!navigator.geolocation) {
                alert("您的瀏覽器不支援地理定位功能。");
                return;
            }
            btnAutoLocation.textContent = "⌛";
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

    // 情報發佈 (防重複、原地更新)
    // 情報發佈 (防重複、原地更新、自動合併新行政區)
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

            // 1. 先找出是否有「同縣市、同名稱」的現有蘑菇
            // ========================================================
            // 🌟 核心修正：大表單提交時，強制比對所有蘑菇（含已重生的死菇）
            // ========================================================
            let existingId = null;
            let finalDistrictsArray = [district.trim()]; 

            // 這裡會走訪所有資料庫內的蘑菇，不管牠有沒有過期！
            for (const [id, item] of Object.entries(localMushroomsData)) {
                // 強制去空格比對縣市與地點名稱
                if (item.city.trim() === city.trim() && item.locationName.trim() === locationName.trim()) {
                    existingId = id; // 🎯 只要名字一樣，就算牠是過期的「已重生」狀態，也成功抓到牠的 ID！
                    
                    // 取出舊的行政區陣列並追加新區
                    let oldDistricts = [];
                    if (Array.isArray(item.district)) {
                        oldDistricts = item.district.map(d => d.trim());
                    } else if (item.district) {
                        oldDistricts = [item.district.trim()];
                    }

                    const mergedSet = new Set([...oldDistricts, district.trim()]);
                    finalDistrictsArray = Array.from(mergedSet);
                    
                    break; 
                }
            }

            // 準備要送入的全新滿血資料
            const mushroomData = {
                city, 
                district: finalDistrictsArray, 
                locationName, 
                type, 
                size,
                mushroomIcon: iconPath,
                currentPlayers: players, 
                maxPlayers: maxPlayersVal,
                timeReported: { hours, minutes, seconds },
                createdAt: nowTimestamp, // 🌟 核心：把原本的舊菇 createdAt 刷新為「現在」，牠就不會再是已重生狀態，而是滿血復活重新倒數！
                updatedAt: nowTimestamp
            };

            if (existingId) {
                // 🔄 找到同名菇（不論活著還是已重生），直接原地覆蓋更新，並追加行政區！
                const targetRef = window.fbRef(window.fbDB, `mushrooms/${existingId}`);
                window.fbUpdate(targetRef, mushroomData)
                    .then(() => {
                        reportForm.reset();
                        document.getElementById("district").disabled = true;
                        delete firedAlerts[existingId];
                        alert(`🔄 成功讓【已重生蘑菇】原地滿血復活並追加行政區！`);
                    })
                    .catch((error) => alert("更新失敗：" + error.message));
            } else {
                // 🎉 完全沒這朵菇，正常建立全新的新卡片
                const shroomRef = window.fbRef(window.fbDB, "mushrooms");
                window.fbPush(shroomRef, mushroomData)
                    .then(() => {
                        reportForm.reset();
                        document.getElementById("district").disabled = true;
                        alert("🎉 新情報發佈成功！");
                    })
                    .catch((error) => alert("發佈失敗：" + error.message));
            }
        });
    }
    // 圖片路抓取引擎
    function getIconPath(type) {
        if (!type) return "picture/mushroom_monthly_special.png";
        const typeStr = String(type);

        if (typeStr.includes("每月") || typeStr.includes("特殊")) return "picture/mushroom_monthly_special.png";
        if (typeStr.includes("冰藍")) return "picture/mushroom_ice.png"; 
        if (typeStr.includes("水晶")) return "picture/mushroom_crystal.png";
        if (typeStr.includes("粉紅") || typeStr.includes("羽翅")) return "picture/mushroom_wing.png"; 
        if (typeStr.includes("岩石")) return "picture/mushroom_rock.png";

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
        if (typeStr.includes("灰")) return "picture/mushroom_rock.png"; 
        
        return "picture/mushroom_monthly_special.png"; 
    }

    function startBoardSync() {
        if (!window.fbDB || !mushroomBoard) return;
        const shroomRef = window.fbRef(window.fbDB, "mushrooms");
        
        window.fbOnValue(shroomRef, (snapshot) => {
            localMushroomsData = snapshot.val() || {};
            
            // 🌟 核心新增：3 天舊資料自動清理機制 (TTL)
            const now = Date.now();
            const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000; // 3 天的毫秒數

            Object.entries(localMushroomsData).forEach(([id, item]) => {
                // 計算這朵菇原本預計的總倒數時間（毫秒）
                const totalReportedMs = ((item.timeReported.hours * 3600) + (item.timeReported.minutes * 60) + item.timeReported.seconds) * 1000;
                const expireTime = item.createdAt + totalReportedMs;
                
                // 條件：如果當前時間已經超過「過期時間」，而且距離過期已經超過 3 天 (3天沒人理牠)
                if (now > expireTime && (now - expireTime) > THREE_DAYS_MS) {
                    console.log(`🗑️ 偵測到過期超過 3 天的舊蘑菇 [${item.locationName}]，自動從雲端刪除。`);
                    
                    // 發送刪除指令到 Firebase
                    const deleteRef = window.fbRef(window.fbDB, `mushrooms/${id}`);
                    window.fbRemove(deleteRef).catch(err => console.error("TTL 刪除失敗:", err));
                    
                    // 同步從本地快照中移除，避免當次重複渲染
                    delete localMushroomsData[id];
                }
            });

            renderBoard(); 
        });
        setInterval(updateTickCounters, 1000); 
    }

    function renderBoard() {
        if (!mushroomBoard) return;
        
        let htmlContent = "";
        const keys = Object.keys(localMushroomsData);

        const cityFilter = filterCity?.value || "all";
        const distFilter = filterDistrict?.value || "all";
        const keyword = searchKeyword?.value.trim().toLowerCase() || "";
        const currentSort = sortMethod?.value || "default";

        if (keys.length === 0) {
            mushroomBoard.innerHTML = '<p class="loading-text">目前沒有即時情報，快去發佈第一個吧！</p>';
            return;
        }

        keys.sort((a, b) => {
            const aPinned = pinnedList.includes(a) ? 1 : 0;
            const bPinned = pinnedList.includes(b) ? 1 : 0;
            if (bPinned !== aPinned) return bPinned - aPinned;

            const itemA = localMushroomsData[a];
            const itemB = localMushroomsData[b];

            if (currentSort === "type") {
                const getTypeWeight = (typeStr) => {
                    if (typeStr.includes("無") || typeStr.includes("未指定") || typeStr === "") return 1;
                    if (typeStr.includes("紅") || typeStr.includes("藍") || typeStr.includes("黃") || 
                        typeStr.includes("紫") || typeStr.includes("白") || typeStr.includes("灰") || 
                        typeStr.includes("岩石") || typeStr.includes("羽翅") || typeStr.includes("粉紅")) {
                        return 2;
                    }
                    if (typeStr.includes("火") || typeStr.includes("水") || typeStr.includes("水晶") || 
                        typeStr.includes("毒") || typeStr.includes("電") || typeStr.includes("冰")) {
                        if (typeStr.includes("冰藍")) return 2; 
                        return 3; 
                    }
                    if (typeStr.includes("每月") || typeStr.includes("特殊")) return 4;
                    return 2; 
                };
                const wA = getTypeWeight(itemA.type);
                const wB = getTypeWeight(itemB.type);
                if (wA === wB) return itemA.type.localeCompare(itemB.type, "zh-Hant");
                return wA - wB;
            } 
            else if (currentSort === "size") {
                const sizeWeight = { "巨大": 4, "大型": 3, "普通": 2, "一般": 2, "小型": 1 };
                const wA = sizeWeight[itemA.size] || 0;
                const wB = sizeWeight[itemB.size] || 0;
                return wB - wA; 
            } 
            else if (currentSort === "time") {
                const msLeftA = ((itemA.timeReported.hours * 3600) + (itemA.timeReported.minutes * 60) + itemA.timeReported.seconds) * 1000 + itemA.createdAt - Date.now();
                const msLeftB = ((itemB.timeReported.hours * 3600) + (itemB.timeReported.minutes * 60) + itemB.timeReported.seconds) * 1000 + itemB.createdAt - Date.now();
                return msLeftA - msLeftB; 
            } 
            else if (currentSort === "update") {
                const timeA = itemA.updatedAt || itemA.createdAt;
                const timeB = itemB.updatedAt || itemB.createdAt;
                return timeB - timeA; 
            } 
            else if (currentSort === "players") {
                return (itemB.currentPlayers || 0) - (itemA.currentPlayers || 0); 
            }
            return 0; 
        });

        let renderedCount = 0;

        keys.forEach(id => {
            const item = localMushroomsData[id];
            
            if (cityFilter !== "all" && item.city !== cityFilter) return;
            if (distFilter !== "all") {
                // 🌟 核心修改：判定資料庫內的 district 是否包含網頁目前篩選的行政區
                let matchPrimaryDistrict = false;
                if (Array.isArray(item.district)) {
                    matchPrimaryDistrict = item.district.includes(distFilter);
                } else {
                    matchPrimaryDistrict = item.district === distFilter;
                }
                
                const matchLocationText = item.locationName.includes(distFilter);
                if (!matchPrimaryDistrict && !matchLocationText) return;
            }
            if (keyword !== "") {
                const matchLocation = item.locationName.toLowerCase().includes(keyword);
                const matchType = item.type.toLowerCase().includes(keyword);
                if (!matchLocation && !matchType) return;
            }

            const lastUpdatedTime = item.updatedAt || item.createdAt;
            const msSinceLastUpdate = Date.now() - lastUpdatedTime;
            const isStale = msSinceLastUpdate > 900000; 

            let displayMaxPlayers = item.maxPlayers || 30;
            if (item.size === "小型") displayMaxPlayers = 25;
            else if (item.size === "普通" || item.size === "一般") displayMaxPlayers = 30;
            else if (item.size === "大型") displayMaxPlayers = 35;
            else if (item.size === "巨大") displayMaxPlayers = 40;

            renderedCount++;
            const isPinned = pinnedList.includes(id) ? "pinned" : "";
            const pinBtnText = pinnedList.includes(id) ? "⭐ 已釘選" : "📌 釘選";
            const isAlertEnabled = alertEnabledList.includes(id);
            const alertBtnText = isAlertEnabled ? "🔔 提醒已開" : "🔕 開啟提醒";

            const lastUpdatedDate = new Date(lastUpdatedTime);
            const formattedTime = `${lastUpdatedDate.getMonth()+1}/${lastUpdatedDate.getDate()} ${lastUpdatedDate.getHours().toString().padStart(2,'0')}:${lastUpdatedDate.getMinutes().toString().padStart(2,'0')}:${lastUpdatedDate.getSeconds().toString().padStart(2,'0')}`;

            const isEditOpen = activePanels[id]?.edit ? "block" : "none";
            const isHistoryOpen = activePanels[id]?.history ? "block" : "none";

            const dynamicImgSrc = getIconPath(item.type);

            htmlContent += `
                <div class="mushroom-card ${isPinned}" data-id="${id}" id="card-${id}">
                    <div id="stale-badge-${id}" class="stale-warning-badge" style="display: ${isStale ? 'block' : 'none'};">⚠️ 許久未更新</div>

                    <div class="card-header">
                        <img src="${dynamicImgSrc}" class="shroom-img" alt="${item.type}">
                        <div class="shroom-info">
                            <h4>[${item.size}] ${item.type}</h4>
                            <p>📍 ${item.city}${item.district} - ${item.locationName}</p>
                        </div>
                        
                        <div class="header-controls-group" style="display: flex; align-items: center; gap: 6px; margin-left: auto;">
                            <button class="btn-sm btn-pin-top ${isPinned ? 'active' : ''}" onclick="togglePin('${id}')" title="${pinBtnText}">
                                ${isPinned ? '⭐' : '📌'}
                            </button>
                            <button class="btn-history-trigger" onclick="toggleHistoryPanel('${id}')" title="顯示上次更新時間">◎</button>
                        </div>
                    </div>

                    <div id="history-panel-${id}" class="history-info-panel" style="display: ${isHistoryOpen};">
                        <p>🕒 上次更新：<strong>${formattedTime}</strong></p>
                    </div>

                    <div class="card-body">
                        <p>👥 參戰人數：<strong>${item.currentPlayers} / ${displayMaxPlayers}</strong> 人</p>
                        <p class="countdown-text" id="time-text-${id}">⏳ 計算時間中...</p>
                    </div>

                    <div id="edit-panel-${id}" class="edit-status-panel" style="display: ${isEditOpen};">
                        <h5>✏️ 修改目前即時狀態：</h5>
                        <div class="edit-row">
                            <label>👥 人數：</label>
                            <input type="number" id="edit-players-${id}" min="0" max="${displayMaxPlayers}" value="${item.currentPlayers}">
                        </div>
                        <div class="edit-row">
                            <label>⏳ 時間：</label>
                            <div class="edit-time-inputs">
                                <input type="number" id="edit-h-${id}" min="0" max="23" value="0" placeholder="時">:
                                <input type="number" id="edit-m-${id}" min="0" max="59" value="0" placeholder="分">:
                                <input type="number" id="edit-s-${id}" min="0" max="59" value="0" placeholder="秒">
                            </div>
                        </div>
                        <div class="edit-actions">
                            <button class="btn-save" onclick="saveStatusEdit('${id}')">💾 儲存送出</button>
                            <button class="btn-cancel" onclick="toggleEditPanel('${id}')">取消</button>
                        </div>
                    </div>

                    <div class="card-footer">
                        <button class="btn-sm btn-alert ${isAlertEnabled ? 'btn-alert-on' : 'btn-alert-off'}" id="alert-btn-${id}" onclick="toggleAlert('${id}')">${alertBtnText}</button>
                        <button class="btn-sm btn-edit-trigger" id="edit-btn-${id}" onclick="toggleEditPanel('${id}')">✏️ 更新狀態</button>
                        <button class="btn-sm btn-verify" id="verify-btn-${id}" style="display:none;" onclick="verifyMushroomStatus('${id}')">✅ 核實狀態</button>
                    </div>
                </div>
            `;
        });

        if (renderedCount === 0) {
            mushroomBoard.innerHTML = '<p class="loading-text">🔍 找不到符合當前地區或條件的蘑菇情報。</p>';
        } else {
            mushroomBoard.innerHTML = htmlContent;
            updateTickCounters();
        }
    }

    function updateTickCounters() {
        const keys = Object.keys(localMushroomsData);
        keys.forEach(id => {
            const item = localMushroomsData[id];
            const textElement = document.getElementById(`time-text-${id}`);
            const cardElement = document.getElementById(`card-${id}`);
            const editBtn = document.getElementById(`edit-btn-${id}`);
            const alertBtn = document.getElementById(`alert-btn-${id}`);
            const verifyBtn = document.getElementById(`verify-btn-${id}`);
            const staleBadge = document.getElementById(`stale-badge-${id}`);

            if (!textElement) return;

            const totalReportedMs = ((item.timeReported.hours * 3600) + (item.timeReported.minutes * 60) + item.timeReported.seconds) * 1000;
            const expireTime = item.createdAt + totalReportedMs;
            const msLeft = expireTime - Date.now();

            let isOver5Min = false;

            if (msLeft > 0) {
                const totalSec = Math.floor(msLeft / 1000);
                const h = Math.floor(totalSec / 3600);
                const m = Math.floor((totalSec % 3600) / 60);
                const s = totalSec % 60;
                textElement.textContent = `⏳ 剩餘時間：${h}時${m}分${s}秒`;
                textElement.className = "countdown-text";
            } else {
                const bufferLeft = 300000 + msLeft; 
                if (bufferLeft > 0) {
                    const totalSec = Math.floor(bufferLeft / 1000);
                    const m = Math.floor(totalSec / 60);
                    const s = totalSec % 60;
                    textElement.textContent = `🔄 下次出現倒數：${m}分${s}秒`;
                    textElement.className = "countdown-text buffer-period";

                    if (totalSec >= 50 && totalSec <= 60 && alertEnabledList.includes(id) && !firedAlerts[id]) {
                        firedAlerts[id] = true;
                        triggerWebNotification(item, id);
                    }
                } else {
                    textElement.textContent = `🔄 待現場玩家更新 (新菇已出生)`;
                    textElement.className = "countdown-text need-update-period";
                    isOver5Min = true;
                }
            }

            if (isOver5Min) {
                cardElement?.classList.add("card-expired-mode");
                if (alertBtn) alertBtn.style.display = "none";
                if (verifyBtn) verifyBtn.style.display = "none";
                if (staleBadge) staleBadge.style.display = "none";
                if (editBtn) editBtn.style.display = "inline-block"; 
            } else {
                cardElement?.classList.remove("card-expired-mode");
                if (editBtn) editBtn.style.display = "inline-block";
                if (alertBtn) alertBtn.style.display = "inline-block";
                
                const lastUpdatedTime = item.updatedAt || item.createdAt;
                const isStale = (Date.now() - lastUpdatedTime) > 900000;
                if (staleBadge) staleBadge.style.display = isStale ? "block" : "none";
                if (verifyBtn) verifyBtn.style.display = isStale ? "inline-block" : "none";
            }
        });
    }

    window.verifyMushroomStatus = (id) => {
        if (!window.fbDB) return;
        const item = localMushroomsData[id];
        if (!item) return;

        const totalReportedMs = ((item.timeReported.hours * 3600) + (item.timeReported.minutes * 60) + item.timeReported.seconds) * 1000;
        const expireTime = item.createdAt + totalReportedMs;
        const msLeft = expireTime - Date.now();

        if (msLeft <= 0) return; 

        const totalSec = Math.floor(msLeft / 1000);
        const h = Math.floor(totalSec / 3600);
        const m = Math.floor((totalSec % 3600) / 60);
        const s = totalSec % 60;

        const shroomRef = window.fbRef(window.fbDB, `mushrooms/${id}`);
        const now = Date.now();

        window.fbUpdate(shroomRef, {
            timeReported: { hours: h, minutes: m, seconds: s },
            createdAt: now,
            updatedAt: now 
        }).then(() => alert("✅ 核實成功！已重整情報新鮮度！"));
    };

    window.toggleHistoryPanel = (id) => {
        if (!activePanels[id]) activePanels[id] = { edit: false, history: false };
        activePanels[id].history = !activePanels[id].history;
        renderBoard();
    };

    window.toggleEditPanel = (id) => {
        if (!activePanels[id]) activePanels[id] = { edit: false, history: false };
        activePanels[id].edit = !activePanels[id].edit;
        
        if (activePanels[id].edit) {
            renderBoard(); 
            const item = localMushroomsData[id];
            if (item) {
                const totalReportedMs = ((item.timeReported.hours * 3600) + (item.timeReported.minutes * 60) + item.timeReported.seconds) * 1000;
                const msLeft = (item.createdAt + totalReportedMs) - Date.now();
                if (msLeft > 0) {
                    const totalSec = Math.floor(msLeft / 1000);
                    if (document.getElementById(`edit-h-${id}`)) {
                        document.getElementById(`edit-h-${id}`).value = Math.floor(totalSec / 3600);
                        document.getElementById(`edit-m-${id}`).value = Math.floor((totalSec % 3600) / 60);
                        document.getElementById(`edit-s-${id}`).value = totalSec % 60;
                    }
                }
            }
        } else {
            renderBoard();
        }
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

    function triggerWebNotification(item, id) {
        if ("Notification" in window && Notification.permission === "granted") {
            new Notification("🍄 皮克敏蘑菇轉生預告！", {
                body: `📍【${item.city}${item.district} - ${item.locationName}】將在 1 分鐘後原地出生！`,
                icon: getIconPath(item.type),
                requireInteraction: true
            });

            if (id && typeof alertEnabledList !== "undefined") {
                const alertIndex = alertEnabledList.indexOf(id);
                if (alertIndex > -1) {
                    alertEnabledList.splice(alertIndex, 1);
                    localStorage.setItem("mushroom_alerts_enabled", JSON.stringify(alertEnabledList));
                    
                    const alertBtn = document.getElementById(`alert-btn-${id}`);
                    if (alertBtn) {
                        alertBtn.textContent = "🔕 開啟提醒";
                        alertBtn.className = "btn-sm btn-alert btn-alert-off";
                    }
                }
            }
        }
    }

    window.togglePin = (id) => {
        const index = pinnedList.indexOf(id);
        if (index > -1) pinnedList.splice(index, 1);
        else pinnedList.push(id);
        localStorage.setItem("pinned_mushrooms", JSON.stringify(pinnedList));
        renderBoard();
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
