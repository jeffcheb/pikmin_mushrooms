// js/report.js

// 🌟 全域變數宣告
let map; 
let markerGroup; 
let userCurrentLat = null;  
let userCurrentLng = null;  
let isNearbyFilterOn = false; 

// 🌐 取得使用者 IP 位址
async function getUserIP() {
    try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        return data.ip;
    } catch (error) {
        console.error("無法取得 IP:", error);
        return "0.0.0.0";
    }
}

// 🍄 1. 尺寸獨立標準校正
function normalizeMushroomSize(sizeStr) {
    if (!sizeStr) return '一般';
    let s = String(sizeStr).trim();
    if (s.includes('巨') || s.includes('大')) return '巨大';
    if (s.includes('小')) return '小';
    return '一般';
}

// 🔍 自動解析蘑菇名稱，切出「尺寸」與「種類」
function parseMushroomTypeAndSize(rawInput) {
    if (!rawInput) return { size: '一般', type: '黃色蘑菇' };

    let text = String(rawInput).trim();
    let detectedSize = '一般';

    // 1. 先判定尺寸
    if (text.includes('巨大') || text.includes('巨型') || text.includes('大')) {
        detectedSize = '巨大';
    } else if (text.includes('小型') || text.includes('小')) {
        detectedSize = '小';
    }

    // 2. 🎯 精準去除尺寸前綴/括號（只拿掉「小/大/巨大/小型/一般/普通」）
    // 使用 replace 只替換「第一個出現的尺寸關鍵字」，絕不誤傷內文的字！
    let cleanType = text
        .replace(/\[|\]|\(|\)/g, '')
        .replace(/^(巨大|巨型|小型|一般|普通|大|小)/, '') 
        .trim();

    if (!cleanType) cleanType = text;

    return {
        size: detectedSize,
        type: cleanType // 這裡會乾乾淨淨地傳出 "黃色蘑菇"
    };
}
// 🍄 2. 種類獨立標準校正 (關鍵直球防呆)
function normalizeMushroomType(typeStr) {
    if (!typeStr) return '黃色蘑菇';
    let normalized = String(typeStr).trim();

    // 🎯 只要包含字眼就直球回傳，完全不給它跌落到最後一行的機會！
    if (normalized.includes("藍")) return normalized.includes("冰") ? "冰藍蘑菇" : "藍色蘑菇";
    if (normalized.includes("灰") || normalized.includes("岩")) return "灰色蘑菇";
    if (normalized.includes("紅")) return "紅色蘑菇";
    if (normalized.includes("黃")) return "黃色蘑菇";
    if (normalized.includes("紫")) return "紫色蘑菇";
    if (normalized.includes("白")) return "白色蘑菇";
    if (normalized.includes("粉") || normalized.includes("羽")) return "粉紅蘑菇";
    if (normalized.includes("水晶")) return "水晶蘑菇";
    if (normalized.includes("火")) return "火蘑菇";
    if (normalized.includes("水")) return "水蘑菇";
    if (normalized.includes("毒")) return "毒蘑菇";
    if (normalized.includes("電")) return "電蘑菇";
    if (normalized.includes("海泡泡") || normalized.includes("特殊") || normalized.includes("活動") || normalized.includes("每月") || normalized.includes("本月")) {
        return "每月特殊蘑菇";
    }

    return normalized; // 保留原字串去匹配，絕對不自作聰明改成黃色！
}

// 🍄 3. 圖示路徑解析 (補上灰色蘑菇檔名)
function getIconPath(type) {
    if (!type) return "picture/mushroom_monthly_special.png";
    const typeStr = String(type).trim();

    if (typeStr.includes("水晶")) return "picture/mushroom_crystal.png";
    if (typeStr.includes("每月") || typeStr.includes("特殊") || typeStr.includes("海泡泡") || typeStr.includes("本月")) {
        return "picture/mushroom_monthly_special.png";
    }
    if (typeStr.includes("火")) return "picture/mushroom_fire.png";
    if (typeStr.includes("水")) return "picture/mushroom_water.png";
    if (typeStr.includes("毒")) return "picture/mushroom_poison.png";
    if (typeStr.includes("電")) return "picture/mushroom_electric.png";
    if (typeStr.includes("冰")) return "picture/mushroom_ice.png";
    if (typeStr.includes("灰") || typeStr.includes("岩")) return "picture/mushroom_gray.png"; // 👈 🎯 就是漏了這行！
    if (typeStr.includes("紅")) return "picture/mushroom_red.png";
    if (typeStr.includes("藍")) return "picture/mushroom_blue.png";
    if (typeStr.includes("黃")) return "picture/mushroom_yellow.png";
    if (typeStr.includes("紫")) return "picture/mushroom_purple.png";
    if (typeStr.includes("白")) return "picture/mushroom_white.png";

    return "picture/mushroom_monthly_special.png";
}
// 📊 4. 字串相似度算法
function calculateSimilarity(str1, str2) {
    if (!str1 || !str2) return 0;
    const s1 = str1.trim().toLowerCase();
    const s2 = str2.trim().toLowerCase();

    if (s1.includes(s2) || s2.includes(s1)) {
        const minLen = Math.min(s1.length, s2.length);
        const maxLen = Math.max(s1.length, s2.length);
        if (minLen >= 3 && minLen / maxLen >= 0.5) return 0.85;
    }

    const track = Array(s2.length + 1).fill(null).map(() => Array(s1.length + 1).fill(null));
    for (let i = 0; i <= s1.length; i += 1) track[0][i] = i;
    for (let j = 0; j <= s2.length; j += 1) track[j][0] = j;

    for (let j = 1; j <= s2.length; j += 1) {
        for (let i = 1; i <= s1.length; i += 1) {
            const indicator = s1[i - 1] === s2[j - 1] ? 0 : 1;
            track[j][i] = Math.min(
                track[j][i - 1] + 1,
                track[j - 1][i] + 1,
                track[j - 1][i - 1] + indicator
            );
        }
    }
    return 1 - (track[s2.length][s1.length] / Math.max(s1.length, s2.length));
}

// ⚡ 5. 格式碼解析 (#菇,截圖時間,行政區,地點,尺寸,種類,人數,剩餘時間)
function parseMushroomCode(code) {
    try {
        console.log("📥 執行捷徑自動解析，內容：", code);

        if (!code || !code.startsWith('#菇')) return false;

        const parts = code.trim().split(',');
        let [prefix, rawPhotoTime, rawDistrict, rawLocation, rawSize, rawType, rawPlayers, rawTime] = parts.map(p => p ? p.trim() : '');

        if (parts.length === 7) {
            rawTime = rawPlayers;
            rawPlayers = "1";
        }

        // A. 時間計算
        let timeOffsetSec = 0;
        if (rawPhotoTime) {
            const now = new Date();
            const photoDate = new Date();
            const photoTimeParts = rawPhotoTime.split(':').map(t => parseInt(t, 10) || 0);

            if (photoTimeParts.length >= 2) {
                photoDate.setHours(photoTimeParts[0], photoTimeParts[1], photoTimeParts[2] || 0, 0);

                let diffMs = now.getTime() - photoDate.getTime();
                if (diffMs < 0 && Math.abs(diffMs) > 12 * 3600 * 1000) {
                    photoDate.setDate(photoDate.getDate() - 1);
                    diffMs = now.getTime() - photoDate.getTime();
                }

                if (diffMs > 0) {
                    timeOffsetSec = Math.floor(diffMs / 1000);
                }
            }
        }

        // B. 剩餘時間解析
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

        // C. 地點清洗與匹配
        let cleanLocation = rawLocation
            .replace(/[>＞〉⟩»›]/g, '')
            .replace(/\.{2,}/g, '')
            .replace(/\s+/g, ' ')
            .trim();

        let cleanDistrict = rawDistrict ? rawDistrict.replace(/\s+/g, '').trim() : null;

        let bestMatchedLocation = cleanLocation;
        let matchedCity = null;
        let matchedDistrict = cleanDistrict;
        let highestScore = 0;

        if (typeof localMushroomsData !== 'undefined' && localMushroomsData) {
            Object.values(localMushroomsData).forEach(item => {
                if (item && item.locationName) {
                    const targetName = item.locationName.replace(/[>＞〉⟩»›]/g, '').trim();
                    const cleanChineseInput = cleanLocation.split(' LRT')[0].split(' Station')[0].trim();
                    const cleanChineseTarget = targetName.split(' LRT')[0].split(' Station')[0].trim();

                    let score = calculateSimilarity(cleanLocation, targetName);

                    if (cleanChineseTarget.includes(cleanChineseInput) || cleanChineseInput.includes(cleanChineseTarget)) {
                        score = Math.max(score, 0.9);
                    }

                    if (score > highestScore && score >= 0.5) {
                        highestScore = score;
                        bestMatchedLocation = item.locationName;
                        matchedCity = item.city;
                        if (!matchedDistrict) {
                            matchedDistrict = Array.isArray(item.district) ? item.district[0] : item.district;
                        }
                    }
                }
            });
        }

        // D. 帶入縣市與地區
        const citySelect = document.getElementById("city");
        const distSelect = document.getElementById("district");

        if (citySelect) {
            citySelect.value = matchedCity || "高雄市";
            citySelect.dispatchEvent(new Event('change'));
        }

        if (distSelect) {
            setTimeout(() => {
                let options = Array.from(distSelect.options);
                let matchedOpt = options.find(o => 
                    matchedDistrict && (o.value === matchedDistrict || o.text.includes(matchedDistrict))
                );

                if (matchedOpt) {
                    distSelect.value = matchedOpt.value;
                } else if (options.length > 1) {
                    distSelect.selectedIndex = 1;
                }
                distSelect.dispatchEvent(new Event('change'));
            }, 150);
        }

        // 🎯 E. 帶入尺寸與種類
        let parsedSize = rawSize;
        let parsedType = rawType;

        if (rawType && (rawType.includes("大") || rawType.includes("巨") || rawType.includes("小") || rawType.includes("普") || rawType.includes("般"))) {
            const parsed = parseMushroomTypeAndSize(rawType);
            if (!parsedSize) parsedSize = parsed.size;
            parsedType = parsed.type; // 這時候 parsedType 就是完整的 "黃色蘑菇"
        }

        let finalSize = normalizeMushroomSize(parsedSize);
        let finalType = normalizeMushroomType(parsedType);

        // 設定尺寸
        const sizeSelect = document.getElementById('mushroom-size');
        if (sizeSelect) {
            sizeSelect.value = finalSize;
            sizeSelect.dispatchEvent(new Event('change'));
        }

        // 設定種類 (直球帶入)
        const typeSelect = document.getElementById('mushroom-type');
        if (typeSelect) {
            // 直接去找 value 完全等於 "黃色蘑菇" 的選項
            let targetOpt = Array.from(typeSelect.options).find(opt => opt.value === finalType);
            
            if (targetOpt) {
                typeSelect.value = targetOpt.value;
            } else {
                // 備用：尋找 value 含有 "黃" 的選項
                let fallbackOpt = Array.from(typeSelect.options).find(opt => opt.value.includes("黃"));
                if (fallbackOpt && finalType.includes("黃")) {
                    typeSelect.value = fallbackOpt.value;
                }
            }
            typeSelect.dispatchEvent(new Event('change'));
        }
        // F. 人數、地點與時間
        let parsedPlayers = parseInt(rawPlayers, 10) || 1;
        const playerInput = document.getElementById('current-players');
        if (playerInput) playerInput.value = parsedPlayers;

        const locationInput = document.getElementById('location-name');
        if (locationInput) locationInput.value = bestMatchedLocation;

        const hEl = document.getElementById('time-hours');
        const mEl = document.getElementById('time-minutes');
        const sEl = document.getElementById('time-seconds');
        if (hEl && mEl && sEl) {
            hEl.value = finalH;
            mEl.value = finalM;
            sEl.value = finalS;
        }

        // G. 自動送出
        const reportForm = document.getElementById("report-form");
        if (reportForm) {
            setTimeout(() => {
                reportForm.requestSubmit();
            }, 700);
        }

        return true;
    } catch (err) {
        console.error("parseMushroomCode 錯誤：", err);
        return false;
    }
}

// 🗺️ 6. 地圖初始化
function initLeafletMap() {
    try {
        const mapContainer = document.getElementById('map');
        if (!mapContainer || typeof L === 'undefined') return;
        map = L.map('map').setView([22.613, 120.316], 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap' }).addTo(map);
        markerGroup = L.layerGroup().addTo(map);
    } catch (error) { console.error("地圖載入失敗:", error); }
}

document.addEventListener("DOMContentLoaded", () => {
    initLeafletMap();

    const reportForm = document.getElementById("report-form");
    const mushroomBoard = document.getElementById("mushroom-board");
    const filterCity = document.getElementById("filter-city");
    const filterDistrict = document.getElementById("filter-district");
    const searchKeyword = document.getElementById("search-keyword");
    const sortMethod = document.getElementById("sort-method");
    const btnGridView = document.getElementById("btn-grid-view");
    const btnListView = document.getElementById("btn-list-view");
    const btnAutoLocation = document.getElementById("btn-auto-location");
    const btnNearbyMushrooms = document.getElementById("btn-nearby-mushrooms");

    let localMushroomsData = {};
    let pinnedList = JSON.parse(localStorage.getItem("pinned_mushrooms")) || [];
    let alertEnabledList = JSON.parse(localStorage.getItem("mushroom_alerts_enabled")) || [];
    let activePanels = {};

    window.setViewMode = function(mode) {
        if (!mushroomBoard) return;
        mushroomBoard.className = `board-container ${mode}-view`;
        btnGridView?.classList.toggle("active", mode === "grid");
        btnListView?.classList.toggle("active", mode === "list");
        localStorage.setItem("board_view_pref", mode);
        renderBoard();
    };

    if (btnGridView && btnListView) {
        btnGridView.addEventListener("click", () => window.setViewMode("grid"));
        btnListView.addEventListener("click", () => window.setViewMode("list"));
    }

    const savedView = localStorage.getItem("board_view_pref") || "grid";
    window.setViewMode(savedView);

    function initFilterDistricts() {
        const availableData = window.taiwanData || (typeof taiwanData !== 'undefined' ? taiwanData : null);
        if (!filterCity || !filterDistrict || !availableData) return false;

        filterCity.innerHTML = '<option value="all">所有縣市</option>';
        Object.keys(availableData).forEach(city => {
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
                (availableData[selectedCity] || []).forEach(dist => {
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

        const savedCity = localStorage.getItem("mushroom_filter_city") || "all";
        const savedDist = localStorage.getItem("mushroom_filter_dist") || "all";
        if (savedCity !== "all" && filterCity) {
            filterCity.value = savedCity;
            filterCity.dispatchEvent(new Event("change"));
            if (savedDist !== "all" && filterDistrict) {
                filterDistrict.value = savedDist;
            }
        }

        renderBoard();
        return true;
    }

    if (btnAutoLocation) {
        btnAutoLocation.addEventListener("click", () => {
            if (!navigator.geolocation) return alert("您的瀏覽器不支援地理定位功能。");
            btnAutoLocation.textContent = "⌛";
            
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    userCurrentLat = position.coords.latitude;
                    userCurrentLng = position.coords.longitude;

                    if (map) map.setView([userCurrentLat, userCurrentLng], 16);

                    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${userCurrentLat}&lon=${userCurrentLng}&accept-language=zh-TW`;

                    fetch(url, { headers: { 'User-Agent': 'PikminMushroomHubApp/1.0' } })
                    .then(response => response.json())
                    .then(data => {
                        btnAutoLocation.textContent = "🎯 定位";
                        if (!data || !data.address) return alert("定位成功，但無法自動解析縣市名稱，請手動選擇。");

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

                        const reportCityEl = document.getElementById("city");
                        const reportDistrictEl = document.getElementById("district");
                        const filterCityEl = document.getElementById("filter-city");
                        const filterDistrictEl = document.getElementById("filter-district");

                        if (reportCityEl) {
                            reportCityEl.value = detectedCity;
                            reportCityEl.dispatchEvent(new Event("change"));
                        }

                        if (filterCityEl) {
                            filterCityEl.value = detectedCity;
                            filterCityEl.dispatchEvent(new Event("change"));
                        }

                        setTimeout(() => {
                            if (reportDistrictEl) reportDistrictEl.value = detectedDistrict;
                            if (filterDistrictEl) filterDistrictEl.value = detectedDistrict;

                            localStorage.setItem("mushroom_filter_city", detectedCity);
                            localStorage.setItem("mushroom_filter_dist", detectedDistrict);

                            alert(`🎯 定位成功！已自動帶入【${detectedCity} ${detectedDistrict}】！`);
                            renderBoard();
                        }, 100);
                    })
                    .catch(err => {
                        console.error("逆向解析失敗:", err);
                        btnAutoLocation.textContent = "🎯 定位";
                    });
                },
                () => {
                    btnAutoLocation.textContent = "🎯 定位";
                    alert("GPS 定位失敗。");
                },
                { enableHighAccuracy: true, timeout: 6000 }
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
        reportForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            if (!window.fbDB) return alert("Firebase 尚未連線！");

            const userIP = await getUserIP();
            const safeIpKey = userIP.replace(/\./g, "_");

            if (window.fbGet) {
                try {
                    const blacklistSnap = await window.fbGet(window.fbRef(window.fbDB, `blacklist/${safeIpKey}`));
                    if (blacklistSnap && blacklistSnap.exists()) {
                        alert("⛔ 您的 IP 已被管理員列入黑名單，無法進行發佈或更新！");
                        return;
                    }
                } catch (err) {
                    console.warn("黑名單比對跳過:", err);
                }
            }

            const cityEl = document.getElementById("city");
            const districtEl = document.getElementById("district");
            const city = (cityEl && cityEl.value && cityEl.value !== "") ? cityEl.value : "高雄市";
            const district = (districtEl && districtEl.value && districtEl.value !== "") ? districtEl.value : "前金區";

            const locationName = document.getElementById("location-name").value.trim();
            const type = normalizeMushroomType(document.getElementById("mushroom-type").value);
            const size = normalizeMushroomSize(document.getElementById("mushroom-size").value);
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
                lat: latVal, lng: lngVal,
                reporterIP: userIP,
                status: "active"
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

    function startBoardSync() {
        if (!window.fbDB || !mushroomBoard) return;
        window.fbOnValue(window.fbRef(window.fbDB, "mushrooms"), (snapshot) => {
            localMushroomsData = snapshot.val() || {};
            renderBoard();

            const urlParams = new URLSearchParams(window.location.search);
            const codeParam = urlParams.get('code');
            if (codeParam) {
                parseMushroomCode(decodeURIComponent(codeParam));
                window.history.replaceState({}, document.title, window.location.pathname);
            }
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
            const dailyCount = keys.filter(id => (localMushroomsData[id].updatedAt || localMushroomsData[id].createdAt || 0) >= todayTimestamp).length;
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
                const sizeWeight = { "巨大": 3, "一般": 2, "普通": 2, "小": 1, "小型": 1 };
                const weightA = sizeWeight[itemA.size] || 2;
                const weightB = sizeWeight[itemB.size] || 2;
                return weightB - weightA;
            } 
            else if (currentSort === "time") {
                const getMsLeft = (item) => {
                    if (!item.timeReported) return Infinity;
                    const totalReportedMs = ((item.timeReported.hours * 3600) + (item.timeReported.minutes * 60) + (item.timeReported.seconds || 0)) * 1000;
                    return ((item.createdAt || 0) + totalReportedMs) - Date.now();
                };
                return getMsLeft(itemA) - getMsLeft(itemB);
            } 
            else {
                const timeA = itemA.updatedAt || itemA.createdAt || 0;
                const timeB = itemB.updatedAt || itemB.createdAt || 0;
                return timeB - timeA;
            }
        });

        if (markerGroup) markerGroup.clearLayers();

        keys.forEach(id => {
            const item = localMushroomsData[id];
            if (item.status === 'hidden') return;

            const displayType = normalizeMushroomType(item.type);
            const displaySize = normalizeMushroomSize(item.size);

            if (cityFilter !== "all" && item.city !== cityFilter) return;
            
            if (distFilter !== "all") {
                if (!item.district) return;
                if (Array.isArray(item.district)) {
                    if (!item.district.includes(distFilter)) return;
                } else if (typeof item.district === "string") {
                    if (item.district !== distFilter) return;
                }
            }

            if (keyword && !item.locationName.toLowerCase().includes(keyword) && !displayType.toLowerCase().includes(keyword)) return;

            const isPinned = pinnedList.includes(id) ? "pinned" : "";
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

            let districtBadgeHTML = "";
            if (Array.isArray(item.district) && item.district.length > 0) {
                districtBadgeHTML = item.district.map(d => `<span class="dist-badge" style="background:#e2e8f0; color:#334155; padding:1px 5px; border-radius:4px; font-size:11px; margin-right:4px;">${d}</span>`).join('');
            } else if (typeof item.district === "string" && item.district.trim() !== "") {
                districtBadgeHTML = `<span class="dist-badge" style="background:#e2e8f0; color:#334155; padding:1px 5px; border-radius:4px; font-size:11px; margin-right:4px;">${item.district}</span>`;
            }

            htmlContent += `
                <div class="mushroom-card ${isPinned}" data-id="${id}" id="card-${id}">
                    <div class="card-header">
                        <img src="${dynamicImgSrc}" class="shroom-img" alt="${displayType}">
                        <div class="shroom-info">
                            <div style="display: flex; align-items: center; gap: 6px; flex-wrap: nowrap;">
                                <h4 style="margin:0; white-space:nowrap;">[${displaySize}] ${displayType}</h4>
                                <button class="btn-fast-fill-trigger" onclick="handleFastFill('${fastFillData}')" style="font-size:11px; padding:2px 6px; cursor:pointer; white-space:nowrap; border-radius:4px; background:#e0f2fe; color:#0284c7; border:1px solid #bae6fd;">⚡ 更新</button>
                            </div>
                            <div style="font-size:12px; color:#666; margin-top:2px; display:flex; align-items:center; flex-wrap:wrap;">
                                <span>📍 ${item.city || ''}</span>
                                ${districtBadgeHTML}
                                <span>- ${item.locationName}</span>
                            </div>
                        </div>
                        
                        <div class="header-controls-group" style="display: flex; gap: 4px; margin-left: auto;">
                            <button class="btn-sm btn-pin-top" onclick="togglePin('${id}')">${isPinned ? '⭐' : '📌'}</button>
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

        mushroomBoard.innerHTML = htmlContent;
        updateTickCounters();
    }

    function updateTickCounters() {
        const keys = Object.keys(localMushroomsData);
        keys.forEach(id => {
            const item = localMushroomsData[id];
            const textElement = document.getElementById(`time-text-${id}`);
            if (!textElement || !item.timeReported) return;

            const totalReportedMs = ((item.timeReported.hours * 3600) + (item.timeReported.minutes * 60) + (item.timeReported.seconds || 0)) * 1000;
            const expireTime = (item.createdAt || Date.now()) + totalReportedMs;
            const msLeft = expireTime - Date.now();

            if (msLeft > 0) {
                const totalSec = Math.floor(msLeft / 1000);
                const h = Math.floor(totalSec / 3600);
                const m = Math.floor((totalSec % 3600) / 60);
                const s = totalSec % 60;
                textElement.innerHTML = `⏳ 剩餘時間：<strong>${h}時${m}分${s}秒</strong>`;
                textElement.style.color = "#0284c7";
            } else if (msLeft <= 0 && msLeft > -300000) {
                const cooldownMsLeft = 300000 + msLeft;
                const totalCoolSec = Math.floor(cooldownMsLeft / 1000);
                const coolM = Math.floor(totalCoolSec / 60);
                const coolS = totalCoolSec % 60;
                
                const formattedM = coolM.toString().padStart(2, '0');
                const formattedS = coolS.toString().padStart(2, '0');

                textElement.innerHTML = `💥 蘑菇已被摧毀！新菇倒數：<strong style="color:#e11d48;">${formattedM}分${formattedS}秒</strong>`;
            } else {
                textElement.innerHTML = `✨ 新蘑菇已出生！待現場玩家更新`;
                textElement.style.color = "#059669";
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
        const willOpen = !activePanels[id].edit;
        activePanels[id].edit = willOpen;
        renderBoard();

        if (willOpen && localMushroomsData[id]) {
            const item = localMushroomsData[id];
            if (item.timeReported) {
                const totalReportedMs = ((item.timeReported.hours * 3600) + (item.timeReported.minutes * 60) + (item.timeReported.seconds || 0)) * 1000;
                const expireTime = (item.createdAt || Date.now()) + totalReportedMs;
                const msLeft = expireTime - Date.now();

                let h = 0, m = 0, s = 0;
                if (msLeft > 0) {
                    const totalSec = Math.floor(msLeft / 1000);
                    h = Math.floor(totalSec / 3600);
                    m = Math.floor((totalSec % 3600) / 60);
                    s = totalSec % 60;
                }

                setTimeout(() => {
                    const hInput = document.getElementById(`edit-h-${id}`);
                    const mInput = document.getElementById(`edit-m-${id}`);
                    const sInput = document.getElementById(`edit-s-${id}`);

                    if (hInput) hInput.value = h;
                    if (mInput) mInput.value = m;
                    if (sInput) sInput.value = s;
                }, 50);
            }
        }
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
            if (activePanels[id]) activePanels[id].edit = false;
            alert("💾 狀態更新成功！");
            renderBoard();
        });
    };

    window.toggleAlert = (id) => {
    // 1. 檢查瀏覽器是否支援 Notification API
    if (!("Notification" in window)) {
        alert("您的瀏覽器不支援桌面通知功能！");
        return;
    }

    const index = alertEnabledList.indexOf(id);
    if (index > -1) {
        // 關閉提醒
        alertEnabledList.splice(index, 1);
        localStorage.setItem("mushroom_alerts_enabled", JSON.stringify(alertEnabledList));
        renderBoard();
    } else {
        // 2. 請求通知權限
        Notification.requestPermission().then(permission => {
            if (permission === "granted") {
                alertEnabledList.push(id);
                localStorage.setItem("mushroom_alerts_enabled", JSON.stringify(alertEnabledList));
                
                // 測試發送一次通知
                new Notification("🔔 蘑菇倒數提醒已開啟", {
                    body: "當此蘑菇即將重生時，系統會發送通知提醒您！",
                    icon: "picture/mushroom_monthly_special.png"
                });

                renderBoard();
            } else {
                alert("請在瀏覽器設定中「允許」本網站發送通知，才能正常開啟提醒功能喔！");
            }
        });
    }
};

    window.handleFastFill = (encodedData) => {
        try {
            const data = JSON.parse(decodeURIComponent(encodedData));
            document.getElementById("city").value = data.city;
            document.getElementById("location-name").value = data.locationName;
            document.querySelector(".report-section")?.scrollIntoView({ behavior: "smooth" });
        } catch (e) { console.error(e); }
    };

    function forceInitFilter() {
        if (!initFilterDistricts()) {
            const filterRetryInterval = setInterval(() => {
                if (initFilterDistricts()) {
                    clearInterval(filterRetryInterval);
                }
            }, 50);
        }
    }
    forceInitFilter();

    const checkFbInterval = setInterval(() => {
        if (window.fbDB) {
            clearInterval(checkFbInterval);
            startBoardSync();
        }
    }, 150);
});
