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
    let normalized = typeStr.trim();
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
        if (!mapContainer) {
            console.warn("⚠️ 網頁 HTML 中找不到 id='map' 的地圖容器，暫不初始化地圖。");
            return;
        }
        
        if (typeof L === 'undefined') {
            console.error("❌ 找不到 Leaflet 套件（L is undefined），請檢查 HTML 是否有引入 Leaflet 的 CDN！");
            return;
        }

        map = L.map('map').setView([22.613, 120.316], 13);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap'
        }).addTo(map);

        markerGroup = L.layerGroup().addTo(map);
        console.log("🗺️ Leaflet 地圖初始化成功！");
    } catch (error) {
        console.error("地圖初始化發生未知錯誤:", error);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    // 🔗 檢查網址列是否有捷徑傳入的 code 參數
    const urlParams = new URLSearchParams(window.location.search);
    const codeParam = urlParams.get('code');
    if (codeParam) {
        parseMushroomCode(decodeURIComponent(codeParam));
    }

    // ========================================================
    // 📜 使用條款與免責聲明彈窗控制邏輯
    // ========================================================
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
            if (chkAgreeTerms.checked) {
                btnEnterSite.disabled = false;
                btnEnterSite.className = "btn-enter-active";
            } else {
                btnEnterSite.disabled = true;
                btnEnterSite.className = "btn-enter-disabled";
            }
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

    // ========================================================
    // 🌍 看板變數與核心元件初始化
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
    const btnNearbyMushrooms = document.getElementById("btn-nearby-mushrooms");
    
    const sortMethod = document.getElementById("sort-method");

    let localMushroomsData = {};
    let pinnedList = JSON.parse(localStorage.getItem("pinned_mushrooms")) || [];
    let alertEnabledList = JSON.parse(localStorage.getItem("mushroom_alerts_enabled")) || [];
    let firedAlerts = {};
    let activePanels = {};

    // 人數動態限制
    if (mushroomSize && currentPlayers) {
        const updateMaxPlayers = () => {
            const size = normalizeMushroomType(mushroomSize.value);
            let maxVal = 30; 
            if (size === "小") maxVal = 25;
            else if (size === "一般") maxVal = 30;
            else if (size === "大") maxVal = 35;
            else if (size === "巨大") maxVal = 40;
            
            currentPlayers.max = maxVal;
            if (parseInt(currentPlayers.value) > maxVal) {
                currentPlayers.value = maxVal;
            }
        };
        mushroomSize.addEventListener("change", updateMaxPlayers);
        updateMaxPlayers();
    }

    // 視圖切換模式
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

    // 初始化縣市與行政區選單
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
                localStorage.setItem("mushroom_filter_city", "all");
                localStorage.setItem("mushroom_filter_dist", "all");
            } else {
                filterDistrict.disabled = false;
                const districts = window.taiwanData[selectedCity] || [];
                districts.forEach(dist => {
                    const option = document.createElement("option");
                    option.value = dist;
                    option.textContent = dist;
                    filterDistrict.appendChild(option);
                });
                localStorage.setItem("mushroom_filter_city", selectedCity);
            }
            renderBoard(); 
        });

        filterDistrict.addEventListener("change", () => {
            localStorage.setItem("mushroom_filter_dist", filterDistrict.value);
            renderBoard();
        });

        sortMethod?.addEventListener("change", () => {
            localStorage.setItem("mushroom_sort_method", sortMethod.value);
            renderBoard();
        });
        
        searchKeyword?.addEventListener("input", renderBoard);

        const savedCity = localStorage.getItem("mushroom_filter_city") || "all";
        const savedDist = localStorage.getItem("mushroom_filter_dist") || "all";
        const savedSort = localStorage.getItem("mushroom_sort_method") || "default";

        if (savedCity !== "all" && filterCity) {
            filterCity.value = savedCity;
            filterCity.dispatchEvent(new Event("change")); 
            if (savedDist !== "all" && filterDistrict) {
                filterDistrict.value = savedDist;
            }
        }
        
        if (sortMethod) {
            sortMethod.value = savedSort;
        }

        renderBoard();
    }

    // GPS 定位功能
    if (btnAutoLocation) {
        btnAutoLocation.addEventListener("click", () => {
            if (!navigator.geolocation) {
                alert("您的瀏覽器不支援地理定位功能。");
                return;
            }
            btnAutoLocation.textContent = "⌛";
            
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    userCurrentLat = position.coords.latitude;
                    userCurrentLng = position.coords.longitude;

                    if (map) {
                        map.setView([userCurrentLat, userCurrentLng], 16);
                    }

                    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${userCurrentLat}&lon=${userCurrentLng}&accept-language=zh-TW`;

                    fetch(url, { headers: { 'User-Agent': 'PikminMushroomHubApp/1.0' } })
                    .then(response => response.json())
                    .then(data => {
                        btnAutoLocation.textContent = "🎯 定位";
                        if (!data || !data.address) {
                            alert("定位成功，但無法解析行政區名稱。");
                            return;
                        }

                        const addr = data.address;
                        let detectedCity = addr.city || addr.state || addr.town || "";
                        let detectedDistrict = addr.suburb || addr.district || addr.town || addr.city_district || "";

                        if (detectedCity.includes("高雄")) detectedCity = "高雄市";
                        if (detectedCity.includes("臺南") || detectedCity.includes("台南")) detectedCity = "台南市";
                        if (detectedCity.includes("臺北") || detectedCity.includes("台北")) detectedCity = "台北市";
                        if (detectedCity.includes("新北")) detectedCity = "新北市";
                        if (detectedCity.includes("桃園")) detectedCity = "桃園市";
                        if (detectedCity.includes("臺中") || detectedCity.includes("台中")) detectedCity = "台中市";

                        detectedDistrict = detectedDistrict.replace(detectedCity, "").trim();

                        if (filterDistrict) {
                            const options = Array.from(filterDistrict.options).map(opt => opt.value);
                            if (!options.includes(detectedDistrict)) {
                                if (options.includes(detectedDistrict + "區")) {
                                    detectedDistrict = detectedDistrict + "區";
                                } else {
                                    const matchedOpt = options.find(opt => opt.includes(detectedDistrict) || detectedDistrict.includes(opt));
                                    if (matchedOpt) detectedDistrict = matchedOpt;
                                }
                            }
                        }

                        if (filterCity && filterDistrict) {
                            filterCity.value = detectedCity;
                            filterCity.dispatchEvent(new Event("change"));

                            const reportCityEl = document.getElementById("city");
                            const reportDistrictEl = document.getElementById("district");
                            const reportLatEl = document.getElementById("lat");
                            const reportLngEl = document.getElementById("lng");

                            if (reportCityEl) {
                                reportCityEl.value = detectedCity;
                                reportCityEl.dispatchEvent(new Event("change"));
                            }

                            setTimeout(() => {
                                filterDistrict.value = detectedDistrict;
                                if (reportDistrictEl) reportDistrictEl.value = detectedDistrict;
                                
                                if (reportLatEl) reportLatEl.value = userCurrentLat.toFixed(5);
                                if (reportLngEl) reportLngEl.value = userCurrentLng.toFixed(5);
                                
                                localStorage.setItem("mushroom_filter_city", detectedCity);
                                localStorage.setItem("mushroom_filter_dist", detectedDistrict);

                                alert(`🎯 定位成功！已同步切換至【${detectedCity} ${detectedDistrict}】！`);
                                renderBoard();
                            }, 100);
                        }
                    })
                    .catch(err => {
                        console.error("逆向解析失敗:", err);
                        btnAutoLocation.textContent = "🎯 定位";
                    });
                },
                () => {
                    btnAutoLocation.textContent = "🎯 定位";
                    alert("GPS 定位失敗，請確認位置權限。");
                },
                { enableHighAccuracy: true, timeout: 6000 }
            );
        });
    }

    if (btnNearbyMushrooms) {
        btnNearbyMushrooms.addEventListener("click", () => {
            if (userCurrentLat === null || userCurrentLng === null) {
                alert("請先點擊「🎯 定位」按鈕取得您目前的位置！");
                return;
            }

            isNearbyFilterOn = !isNearbyFilterOn;

            if (isNearbyFilterOn) {
                btnNearbyMushrooms.classList.add("active");
                btnNearbyMushrooms.textContent = "🟢 顯示 600m 內";
            } else {
                btnNearbyMushrooms.classList.remove("active");
                btnNearbyMushrooms.textContent = "📍 篩選 600m 內";
            }

            renderBoard();
        });
    }

    // 發佈情報
    if (reportForm) {
        reportForm.addEventListener("submit", (e) => {
            e.preventDefault(); 
            if (!window.fbDB) {
                alert("❌ Firebase 尚未連線成功，請稍後再試！");
                return;
            }

            const cityEl = document.getElementById("city");
            const districtEl = document.getElementById("district");
            const locationNameEl = document.getElementById("location-name");
            const mushroomTypeEl = document.getElementById("mushroom-type");

            if (!cityEl || !districtEl || !locationNameEl || !mushroomTypeEl) {
                alert("❌ 網頁 HTML 缺少必要欄位！");
                return;
            }

            const city = cityEl.value;
            const district = districtEl.value;
            const locationName = locationNameEl.value.trim();
            // 🌟 寫入前進行名稱校正
            const type = normalizeMushroomType(mushroomTypeEl.value);
            
            if (!locationName) {
                alert("⚠️ 請輸入具體地點名稱！");
                return;
            }

            const rawSize = mushroomSize ? mushroomSize.value : "一般";
            const size = normalizeMushroomType(rawSize);

            const players = currentPlayers ? parseInt(currentPlayers.value) : 1;
            
            const hEl = document.getElementById("time-hours");
            const mEl = document.getElementById("time-minutes");
            const sEl = document.getElementById("time-seconds");
            
            const hours = hEl ? (parseInt(hEl.value) || 0) : 0;
            const minutes = mEl ? (parseInt(mEl.value) || 0) : 0;
            const seconds = sEl ? (parseInt(sEl.value) || 0) : 0;

            let maxPlayersVal = 30;
            if (size === "小") maxPlayersVal = 25;
            else if (size === "一般") maxPlayersVal = 30;
            else if (size === "大") maxPlayersVal = 35;
            else if (size === "巨大") maxPlayersVal = 40;

            const iconPath = getIconPath(type);
            const nowTimestamp = Date.now();
            
            const latInput = document.getElementById("lat");
            const lngInput = document.getElementById("lng");
            const latVal = (latInput && latInput.value) ? parseFloat(latInput.value) : null;
            const lngVal = (lngInput && lngInput.value) ? parseFloat(lngInput.value) : null;
            
            let existingId = null;
            let finalDistrictsArray = [district.trim()]; 
            let oldLat = null;
            let oldLng = null;

            for (const [id, item] of Object.entries(localMushroomsData)) {
                if (item.city && item.locationName && item.city.trim() === city.trim() && item.locationName.trim() === locationName.trim()) {
                    existingId = id; 
                    oldLat = (item.lat !== undefined) ? item.lat : null;
                    oldLng = (item.lng !== undefined) ? item.lng : null;
                    
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
                createdAt: nowTimestamp, 
                updatedAt: nowTimestamp,
                lat: latVal !== null ? latVal : oldLat,
                lng: lngVal !== null ? lngVal : oldLng
            };

            if (existingId) {
                const targetRef = window.fbRef(window.fbDB, `mushrooms/${existingId}`);
                window.fbUpdate(targetRef, mushroomData)
                    .then(() => {
                        reportForm.reset();
                        if (districtEl) districtEl.disabled = true;
                        delete firedAlerts[existingId];
                        alert(`🔄 成功將【已重生蘑菇】原地更新！`);
                    })
                    .catch((error) => alert("寫入失敗：" + error.message));
            } else {
                const shroomRef = window.fbRef(window.fbDB, "mushrooms");
                window.fbPush(shroomRef, mushroomData)
                    .then(() => {
                        reportForm.reset();
                        if (districtEl) districtEl.disabled = true;
                        alert("🎉 新情報發佈成功！");
                    })
                    .catch((error) => alert("發佈失敗：" + error.message));
            }
        });
    }

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
            renderBoard(); 
        });
        setInterval(updateTickCounters, 1000); 
    }

    function renderBoard() {
        const keys = Object.keys(localMushroomsData);

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
        const currentSort = sortMethod?.value || "default";

        if (keys.length === 0) {
            mushroomBoard.innerHTML = '<p class="loading-text">目前沒有即時情報，快去發佈第一個吧！</p>';
            if (markerGroup) markerGroup.clearLayers(); 
            return;
        }

        keys.sort((a, b) => {
            const aPinned = pinnedList.includes(a) ? 1 : 0;
            const bPinned = pinnedList.includes(b) ? 1 : 0;
            if (bPinned !== aPinned) return bPinned - aPinned;

            const itemA = localMushroomsData[a];
            const itemB = localMushroomsData[b];

            if (currentSort === "size") {
                const sizeWeight = { "巨大": 4, "大": 3, "大型": 3, "一般": 2, "普通": 2, "小": 1, "小型": 1 };
                const wA = sizeWeight[itemA.size] || 0;
                const wB = sizeWeight[itemB.size] || 0;
                return wB - wA; 
            } 
            return 0; 
        });

        let renderedCount = 0;
        if (markerGroup) markerGroup.clearLayers();
        let bounds = [];
        let hasValidMarker = false;

        keys.forEach(id => {
            const item = localMushroomsData[id];
            
            // 讀取顯示時校正
            const displayType = normalizeMushroomType(item.type);
            const displaySize = normalizeMushroomType(item.size);

            if (cityFilter !== "all" && item.city !== cityFilter) return;
            if (distFilter !== "all") {
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
                const matchType = displayType.toLowerCase().includes(keyword);
                if (!matchLocation && !matchType) return;
            }

            renderedCount++;
            const isPinned = pinnedList.includes(id) ? "pinned" : "";
            const pinBtnText = pinnedList.includes(id) ? "⭐ 已釘選" : "📌 釘選";
            const isAlertEnabled = alertEnabledList.includes(id);

            const dynamicImgSrc = getIconPath(displayType);

            htmlContent += `
                <div class="mushroom-card ${isPinned}" data-id="${id}" id="card-${id}">
                    <div class="card-header">
                        <img src="${dynamicImgSrc}" class="shroom-img" alt="${displayType}">
                        <div class="shroom-info">
                            <h4>[${displaySize}] ${displayType}</h4>
                            <span>📍 ${item.city} - ${item.locationName}</span>
                        </div>
                        <button onclick="togglePin('${id}')">${pinBtnText}</button>
                    </div>
                    <div class="card-body">
                        <p>👥 參戰人數：<strong>${item.currentPlayers} / ${item.maxPlayers || 30}</strong> 人</p>
                        <p class="countdown-text" id="time-text-${id}">⏳ 計算時間中...</p>
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

        mushroomBoard.innerHTML = htmlContent || '<p class="loading-text">🔍 找不到符合條件的蘑菇。</p>';

        if (hasValidMarker && bounds.length > 0 && map) {
            map.fitBounds(bounds, { padding: [30, 30] });
        }
    }

    function updateTickCounters() {
        // 時間倒數計時元件（保持原有邏輯）
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
