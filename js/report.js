// js/report.js

// 🌟 將地圖相關全域變數宣告在最頂層
let map; // Leaflet 地圖物件
let markerGroup; // 用來集中管理大頭針的圖層群組
let userCurrentLat = null;  // 儲存玩家目前的精準緯度
let userCurrentLng = null;  // 儲存玩家目前的精準經緯
let isNearbyFilterOn = false; // 紀錄「600m篩選」按鈕目前是否開啟

// 🟢 隔離防護版：就算沒有地圖，也絕對不卡死後面程式碼
function initLeafletMap() {
    try {
        const mapContainer = document.getElementById('map');
        // 防呆 1：如果 HTML 根本沒寫 id="map"，直接結束，不報錯
        if (!mapContainer) {
            console.warn("⚠️ 網頁 HTML 中找不到 id='map' 的地圖容器，暫不初始化地圖。");
            return;
        }
        
        // 防呆 2：檢查 Leaflet 套件有沒有成功引入
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

    // 🌟 在這裡呼叫地圖初始化
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
    const btnNearbyMushrooms = document.getElementById("btn-nearby-mushrooms"); // 🌟 新增：600m按鈕元件
    
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

    // 初始化縣市與行政區選單 (含 localStorage 讀取與記憶固定)
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

        // 監聽縣市切換
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

        // 監聽行政區切換
        filterDistrict.addEventListener("change", () => {
            localStorage.setItem("mushroom_filter_dist", filterDistrict.value);
            renderBoard();
        });

        // 監聽排序切換
        sortMethod?.addEventListener("change", () => {
            localStorage.setItem("mushroom_sort_method", sortMethod.value);
            renderBoard();
        });
        
        searchKeyword?.addEventListener("input", renderBoard);

        // 🌟 網頁啟動時：自動回復上次的篩選與排序記憶
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

    // 🎯 超高效、真精準的 GPS 逆向地理定位功能
    if (btnAutoLocation) {
        btnAutoLocation.addEventListener("click", () => {
            if (!navigator.geolocation) {
                alert("您的瀏覽器不支援地理定位功能。");
                return;
            }
            
            btnAutoLocation.textContent = "⌛";
            
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    // 🌟 核心修正：儲存精準全域經緯度，供600m篩選計算
                    userCurrentLat = position.coords.latitude;
                    userCurrentLng = position.coords.longitude;

                    // 🗺️ 1. 讓地圖即時平滑飛移到玩家當前精準位置
                    if (map) {
                        map.setView([userCurrentLat, userCurrentLng], 16); // 放大到 16 級看更清
                    }

                    // 📡 2. 利用開源不收費的 Nominatim API 進行逆向地理編碼查詢
                    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${userCurrentLat}&lon=${userCurrentLng}&accept-language=zh-TW`;

                    fetch(url, {
                        headers: { 'User-Agent': 'PikminMushroomHubApp/1.0' }
                    })
                    .then(response => response.json())
                    .then(data => {
                        btnAutoLocation.textContent = "🎯 定位";
                        
                        if (!data || !data.address) {
                            alert("定位成功，但無法解析行政區名稱，請手動選擇。");
                            return;
                        }

                        // 🔍 3. 智慧解析台灣的縣市與行政區欄位
                        const addr = data.address;
                        let detectedCity = addr.city || addr.state || addr.town || "";
                        let detectedDistrict = addr.suburb || addr.district || addr.town || addr.city_district || "";

                        // 清洗字串，確保格式乾淨
                        if (detectedCity.includes("高雄")) detectedCity = "高雄市";
                        if (detectedCity.includes("臺南") || detectedCity.includes("台南")) detectedCity = "台南市";
                        if (detectedCity.includes("臺北") || detectedCity.includes("台北")) detectedCity = "台北市";
                        if (detectedCity.includes("新北")) detectedCity = "新北市";
                        if (detectedCity.includes("桃園")) detectedCity = "桃園市";
                        if (detectedCity.includes("臺中") || detectedCity.includes("台中")) detectedCity = "台中市";

                        // 移除 Nominatim 有時會帶有的重複字詞
                        detectedDistrict = detectedDistrict.replace(detectedCity, "").trim();

                        // 🌟 核心修復：如果選單裡有「XX區」，但 API 只有「XX」，幫它自動校正防呆
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

                        // 💼 4. 強制將精準結果塞入網頁所有下拉選單（包含篩選區與回報區）
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

                            // 稍微延遲讓 DOM 生成完畢後，精準選取行政區與填入座標
                            setTimeout(() => {
                                filterDistrict.value = detectedDistrict;
                                if (reportDistrictEl) reportDistrictEl.value = detectedDistrict;
                                
                                if (reportLatEl) reportLatEl.value = userCurrentLat.toFixed(5);
                                if (reportLngEl) reportLngEl.value = userCurrentLng.toFixed(5);
                                
                                // 記憶到瀏覽器快取
                                localStorage.setItem("mushroom_filter_city", detectedCity);
                                localStorage.setItem("mushroom_filter_dist", detectedDistrict);

                                alert(`🎯 精準定位成功！已同步切換至【${detectedCity} ${detectedDistrict}】並自動帶入目前經緯度！`);
                                renderBoard();
                            }, 100);
                        }
                    })
                    .catch(err => {
                        console.error("逆向解析失敗:", err);
                        btnAutoLocation.textContent = "🎯 定位";
                        alert("網路忙碌中，未能成功解析行政區。");
                    });
                },
                () => {
                    btnAutoLocation.textContent = "🎯 定位";
                    alert("GPS 定位失敗，請確認手機/瀏覽器是否開啟位置權限。");
                },
                { enableHighAccuracy: true, timeout: 6000 } // 開啟高精準度模式
            );
        });
    }

    // 🌟 監聽「方圓 600m 蘑菇篩選」按鈕點擊事件
    if (btnNearbyMushrooms) {
        btnNearbyMushrooms.addEventListener("click", () => {
            if (userCurrentLat === null || userCurrentLng === null) {
                alert("請先點擊「🎯 定位」按鈕取得您目前的位置，才能計算方圓 600m 的蘑菇唷！");
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


    // 情報發佈 (防重複、原地更新、自動合併新行政區、經緯度萬能鎖定保護)
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
                alert("❌ 網頁 HTML 缺少必要欄位元件，請檢查 HTML 檔案！");
                return;
            }

            const city = cityEl.value;
            const district = districtEl.value;
            const locationName = locationNameEl.value.trim();
            const type = mushroomTypeEl.value;
            
            if (!locationName) {
                alert("⚠️ 請輸入具體地點名稱！");
                return;
            }

            const size = mushroomSize ? mushroomSize.value : "普通";
            const players = currentPlayers ? parseInt(currentPlayers.value) : 1;
            
            const hEl = document.getElementById("time-hours");
            const mEl = document.getElementById("time-minutes");
            const sEl = document.getElementById("time-seconds");
            
            const hours = hEl ? (parseInt(hEl.value) || 0) : 0;
            const minutes = mEl ? (parseInt(mEl.value) || 0) : 0;
            const seconds = sEl ? (parseInt(sEl.value) || 0) : 0;

            let maxPlayersVal = 30;
            if (size === "小型") maxPlayersVal = 25;
            else if (size === "普通" || size === "一般") maxPlayersVal = 30;
            else if (size === "大型") maxPlayersVal = 35;
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
                        alert(`🔄 成功讓【已重生蘑菇】原地滿血復活並追加行政區！`);
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

    // 圖片路徑抓取引擎
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
            
            const now = Date.now();
            const ONE_DAY_MS = 1 * 24 * 60 * 60 * 1000; 

            Object.entries(localMushroomsData).forEach(([id, item]) => {
                const totalReportedMs = ((item.timeReported.hours * 3600) + (item.timeReported.minutes * 60) + item.timeReported.seconds) * 1000;
                const expireTime = item.createdAt + totalReportedMs;
                
                if (now > expireTime && (now - expireTime) > ONE_DAY_MS) {
                    if (item.type !== "未指定" || item.currentPlayers !== 0) {
                        console.log(`🧹 偵測到 1 天未更新點 [${item.locationName}]，自動清空即時狀態，保留據點位置。`);
                        const updateRef = window.fbRef(window.fbDB, `mushrooms/${id}`);
                        
                        window.fbUpdate(updateRef, {
                            type: "未指定",
                            size: "未知",
                            mushroomIcon: "picture/mushroom_monthly_special.png",
                            currentPlayers: 0,
                            timeReported: { hours: 0, minutes: 0, seconds: 0 },
                            updatedAt: now,
                            createdAt: now
                        }).catch(err => console.error("據點重置失敗:", err));
                    }
                }
            });

            renderBoard(); 
        });
        setInterval(updateTickCounters, 1000); 
    }

    function renderBoard() {
        // 🌟 1. 提早取得 keys 陣列，解決未宣告先使用的報錯
        const keys = Object.keys(localMushroomsData);

        // 🌟 2. 統計今日回報量邏輯
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

        if (markerGroup) markerGroup.clearLayers();
        let bounds = [];
        let hasValidMarker = false;

        keys.forEach(id => {
            const item = localMushroomsData[id];
            
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
                const matchType = item.type.toLowerCase().includes(keyword);
                if (!matchLocation && !matchType) return;
            }

            if (isNearbyFilterOn && userCurrentLat !== null && userCurrentLng !== null) {
                if (item.lat === undefined || item.lat === null || item.lng === undefined || item.lng === null) {
                    return; 
                }

                const R = 6371e3; 
                const phi1 = userCurrentLat * Math.PI / 180;
                const phi2 = item.lat * Math.PI / 180;
                const deltaPhi = (item.lat - userCurrentLat) * Math.PI / 180;
                const deltaLambda = (item.lng - userCurrentLng) * Math.PI / 180;

                const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
                          Math.cos(phi1) * Math.cos(phi2) *
                          Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
                const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                const distance = R * c; 

                if (distance > 600) return; 
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

            let districtBadgesHTML = "";
            let firstDistrict = ""; 
            if (Array.isArray(item.district)) {
                firstDistrict = item.district[0] || "";
                item.district.forEach(dist => {
                    districtBadgesHTML += `<span class="dist-badge">${dist}</span>`;
                });
            } else if (item.district) {
                firstDistrict = item.district;
                districtBadgesHTML = `<span class="dist-badge">${item.district}</span>`;
            }

            const isFull = (item.currentPlayers || 0) >= displayMaxPlayers;
            const fullClass = isFull ? "card-full-shroom" : "";

            let colorBorderClass = "border-normal";
            if (item.type.includes("火")) colorBorderClass = "border-fire";
            else if (item.type.includes("水")) colorBorderClass = "border-water";
            else if (item.type.includes("水晶")) colorBorderClass = "border-crystal";
            else if (item.type.includes("毒")) colorBorderClass = "border-poison";
            else if (item.type.includes("電")) colorBorderClass = "border-electric";
            else if (item.type.includes("冰")) colorBorderClass = "border-ice";

            const fastFillData = encodeURIComponent(JSON.stringify({
                city: item.city,
                district: firstDistrict,
                locationName: item.locationName,
                lat: item.lat !== undefined && item.lat !== null ? item.lat : "",
                lng: item.lng !== undefined && item.lng !== null ? item.lng : ""
            }));

            htmlContent += `
                <div class="mushroom-card ${isPinned} ${fullClass} ${colorBorderClass}" data-id="${id}" id="card-${id}">
                    <div id="stale-badge-${id}" class="stale-warning-badge" style="display: ${isStale ? 'block' : 'none'};">⚠️ 許久未更新</div>

                    <div class="card-header">
                        <img src="${dynamicImgSrc}" class="shroom-img" alt="${item.type}">
                        <div class="shroom-info">
                            <h4 style="display: flex; align-items: center; gap: 8px;">
                                [${item.size}] ${item.type}
                                <button class="btn-fast-fill-trigger" onclick="handleFastFill('${fastFillData}')" title="將此地點帶入上方回報表單">⚡ 更新此點</button>
                            </h4>
                            <div class="location-container">
                                <span class="city-text">📍 ${item.city}</span>
                                <div class="badges-group">${districtBadgesHTML}</div>
                                <span class="location-name-text">- ${item.locationName}</span>
                            </div>
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
                        <p>👥 參戰人數：<strong>${item.currentPlayers} / ${displayMaxPlayers}</strong> 人 ${isFull ? '<span style="color: #ef4444; font-weight: bold; margin-left: 4px;">(已滿員)</span>' : ''}</p>
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

            if (markerGroup && item.lat !== undefined && item.lat !== null && item.lng !== undefined && item.lng !== null) {
                const popupContent = `
                    <div style="font-family: sans-serif; font-size: 14px;">
                        <strong style="color: #d9383a;">[${item.size}] ${item.type}</strong><br>
                        📍 ${item.city}${Array.isArray(item.district) ? item.district.join('/') : item.district} - ${item.locationName}<br>
                        👥 人數: ${item.currentPlayers} 人<br>
                        <hr style="margin: 5px 0; border: 0; border-top: 1px solid #ccc;">
                        <a href="http://googleusercontent.com/maps.google.com/maps?q=${item.lat},${item.lng}" target="_blank" style="color: #1890ff; font-weight: bold; text-decoration: none;">🚗 開啟 Google 導航</a>
                    </div>
                `;
                const marker = L.marker([item.lat, item.lng]).bindPopup(popupContent);
                markerGroup.addLayer(marker);
                bounds.push([item.lat, item.lng]);
                hasValidMarker = true;
            }
        });

        if (renderedCount === 0) {
            mushroomBoard.innerHTML = '<p class="loading-text">🔍 找不到符合當前地區或距離條件的蘑菇情報。</p>';
        } else {
            mushroomBoard.innerHTML = htmlContent;
        }

        if (hasValidMarker && bounds.length > 0 && map) {
            map.fitBounds(bounds, { padding: [30, 30] });
        }
        
        updateTickCounters();
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
            if (!cardElement) return;

            const totalReportedMs = ((item.timeReported.hours * 3600) + (item.timeReported.minutes * 60) + item.timeReported.seconds) * 1000;
            const expireTime = item.createdAt + totalReportedMs;
            const msLeft = expireTime - Date.now();

            let isOver5Min = false;
            
            if (item.type === "未指定") {
                textElement.textContent = `💤 據點休眠中 (等待新菇情報)`;
                textElement.className = "countdown-text";
                
                cardElement?.classList.add("card-dormant-mode");
                
                if (staleBadge) staleBadge.style.display = "none";
                if (verifyBtn) verifyBtn.style.display = "none";
                if (alertBtn) alertBtn.style.display = "none";
                return; 
            } else {
                cardElement?.classList.remove("card-dormant-mode");
            }

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
                    setTimeout(() => {
                        const hIn = document.getElementById(`edit-h-${id}`);
                        const mIn = document.getElementById(`edit-m-${id}`);
                        const sIn = document.getElementById(`edit-s-${id}`);
                        if (hIn) hIn.value = Math.floor(totalSec / 3600);
                        if (mIn) mIn.value = Math.floor((totalSec % 3600) / 60);
                        if (sIn) sIn.value = totalSec % 60;
                    }, 50);
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

        const currentDistrictElement = document.getElementById("district");
        const currentDistrict = currentDistrictElement ? currentDistrictElement.value.trim() : "";

        const item = localMushroomsData[id];
        let finalDistrictsArray = [];

        if (item) {
            let oldDistricts = [];
            if (Array.isArray(item.district)) {
                oldDistricts = item.district.map(d => d.trim());
            } else if (item.district) {
                oldDistricts = [item.district.trim()];
            }

            if (currentDistrict) {
                const mergedSet = new Set([...oldDistricts, currentDistrict]);
                finalDistrictsArray = Array.from(mergedSet);
            } else {
                finalDistrictsArray = oldDistricts;
            }
        }

        const shroomRef = window.fbRef(window.fbDB, `mushrooms/${id}`);
        const now = Date.now();

        window.fbUpdate(shroomRef, {
            district: finalDistrictsArray,
            currentPlayers: newPlayers,
            timeReported: { hours: h, minutes: m, seconds: s },
            createdAt: now, 
            updatedAt: now,
            lat: (item && item.lat !== undefined) ? item.lat : null,
            lng: (item && item.lng !== undefined) ? item.lng : null
        }).then(() => {
            if (!activePanels[id]) activePanels[id] = { edit: false, history: false };
            activePanels[id].edit = false;
            delete firedAlerts[id];
            alert("💾 狀態更新成功！");
            renderBoard();
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
                body: `📍【${item.city}${Array.isArray(item.district) ? item.district.join('/') : item.district} - ${item.locationName}】將在 1 分鐘後原地出生！`,
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

    window.handleFastFill = (encodedData) => {
        try {
            const data = JSON.parse(decodeURIComponent(encodedData));
            
            const cityEl = document.getElementById("city");
            const districtEl = document.getElementById("district");
            const locationNameEl = document.getElementById("location-name");
            const latEl = document.getElementById("lat");
            const lngEl = document.getElementById("lng");

            if (!cityEl || !districtEl || !locationNameEl) return;

            cityEl.value = data.city;
            cityEl.dispatchEvent(new Event("change"));

            setTimeout(() => {
                districtEl.value = data.district;
                locationNameEl.value = data.locationName;
                
                if (latEl) latEl.value = data.lat;
                if (lngEl) lngEl.value = data.lng;
                
                const reportSection = document.querySelector(".report-section");
                if (reportSection) {
                    reportSection.scrollIntoView({ behavior: "smooth", block: "start" });
                }
            }, 60);

        } catch (error) {
            console.error("快填解析失敗:", error);
        }
    };
});
