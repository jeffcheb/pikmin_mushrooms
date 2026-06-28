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

    // 人數動態限制
    if (mushroomSize && currentPlayers) {
        mushroomSize.addEventListener("change", () => {
            currentPlayers.max = 5; 
            if (parseInt(currentPlayers.value) > parseInt(currentPlayers.max)) {
                currentPlayers.value = currentPlayers.max;
            }
        });
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

    // ========================================================
    // 🌍 看板功能：使用全域 window.taiwanData 初始化縣市選單
    // ========================================================
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

    // ========================================================
    // 🎯 定位功能：免 API 的純前端超速定位（已修正變數名稱錯誤）
    // ========================================================
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

                    // 台灣主要縣市中心點概略經緯度
                    const TaiwanCityCoordinates = {
                        "台北市": { lat: 25.0339, lon: 121.5644, defaultDist: "大安區" },
                        "新北市": { lat: 25.0169, lon: 121.4627, defaultDist: "板橋區" },
                        "桃園市": { lat: 24.9936, lon: 121.3009, defaultDist: "桃園區" },
                        "台中市": { lat: 24.1477, lon: 120.6736, defaultDist: "西屯區" },
                        "台南市": { lat: 22.9908, lon: 120.2133, defaultDist: "中西區" },
                        "高雄市": { lat: 22.6273, lon: 120.3014, defaultDist: "前鎮區" },
                        "基隆市": { lat: 25.1283, lon: 121.7391, defaultDist: "仁愛區" },
                        "新竹市": { lat: 24.8138, lon: 120.9674, defaultDist: "東區" },
                        "嘉義市": { lat: 23.4800, lon: 120.4491, defaultDist: "西區" },
                        "新竹縣": { lat: 24.8383, lon: 121.0117, defaultDist: "竹北市" },
                        "苗栗縣": { lat: 24.5601, lon: 120.8207, defaultDist: "苗栗市" },
                        "彰化縣": { lat: 24.0516, lon: 120.5161, defaultDist: "彰化市" },
                        "南投縣": { lat: 23.9155, lon: 120.6868, defaultDist: "南投市" },
                        "雲林縣": { lat: 23.7092, lon: 120.4313, defaultDist: "斗六市" },
                        "嘉義縣": { lat: 23.4592, lon: 120.2931, defaultDist: "太保市" },
                        "屏東縣": { lat: 22.6660, lon: 120.4860, defaultDist: "屏東市" },
                        "宜蘭縣": { lat: 24.7570, lon: 121.7530, defaultDist: "宜蘭市" },
                        "花蓮縣": { lat: 23.9870, lon: 121.6010, defaultDist: "花蓮市" },
                        "台東縣": { lat: 22.7560, lon: 121.1520, defaultDist: "台東市" },
                        "澎湖縣": { lat: 23.5710, lon: 119.5790, defaultDist: "馬公市" }
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

                    const matchedData = TaiwanCityCoordinates[closestCity];
                    const foundDist = matchedData.defaultDist;

                    if (filterCity && filterDistrict) {
                        // 🌟 修正核心：全部對齊使用全域 window.taiwanData
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
                (error) => {
                    btnAutoLocation.textContent = "🎯 定位";
                    alert("GPS 定位取得失敗，請確認是否給予網頁位置權限！");
                },
                { enableHighAccuracy: false, timeout: 5000 }
            );
        });
    }

    // --- F3: 情報發佈 (寫入 Firebase) ---
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

    // --- F5: 看板監聽與過濾渲染 ---
    function startBoardSync() {
        if (!window.fbDB || !mushroomBoard) return;
        const shroomRef = window.fbRef(window.fbDB, "mushrooms");
        window.fbOnValue(shroomRef, (snapshot) => {
            localMushroomsData = snapshot.val() || {};
            renderBoard();
        });
        setInterval(renderBoard, 1000); 
    }

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
            
            // 🔍 跨行政區模糊可見篩選邏輯
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

            if (msLeft > 0) {
                const totalSec = Math.floor(msLeft / 1000);
                const h = Math.floor(totalSec / 3600);
                const m = Math.floor((totalSec % 3600) / 60);
                const s = totalSec % 60;
                timeString = `⏳ 剩餘時間：${h}時${m}分${s}秒`;
            } else {
                const bufferLeft = 300000 + msLeft; 
                if (bufferLeft > 0) {
                    const totalSec = Math.floor(bufferLeft / 1000);
                    const m = Math.floor(totalSec / 60);
                    const s = totalSec % 60;
                    timeString = `🔄 下次出現倒數：${m}分${s}秒`;
                    statusClass = "countdown-text buffer-period"; 
                } else {
                    return; 
                }
            }

            renderedCount++;
            const isPinned = pinnedList.includes(id) ? "pinned" : "";
            const pinBtnText = pinnedList.includes(id) ? "⭐ 已釘選" : "📌 釘選";

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
                        <p>👥 參戰人數：<strong>${item.currentPlayers} / ${item.maxPlayers}</strong> 人</p>
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

    // 只要確保 Firebase 與全域字典掛載好，就立刻啟動
    const checkFbInterval = setInterval(() => {
        if (window.fbDB && window.taiwanData) {
            clearInterval(checkFbInterval);
            initFilterDistricts(); 
            startBoardSync();      
        }
    }, 200);
});
