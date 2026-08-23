// js/report.js

// 🌟 全域變數宣告
let map;[cite: 3]
let markerGroup;[cite: 3]
let userCurrentLat = null;  [cite: 3]
let userCurrentLng = null; [cite: 3]
let isNearbyFilterOn = false;[cite: 3]
// 🌟 追蹤已觸發通知的蘑菇 ID，避免重複洗版通知
let notifiedMushrooms = [];[cite: 3]

// 🌐 取得使用者 IP 位址
async function getUserIP() {
    try {
        const response = await fetch('https://api.ipify.org?format=json');[cite: 3]
        const data = await response.json();[cite: 3]
        return data.ip;[cite: 3]
    } catch (error) {
        console.error("無法取得 IP:", error);[cite: 3]
        return "0.0.0.0";[cite: 3]
    }
}

// 🍄 1. 尺寸獨立標準校正
function normalizeMushroomSize(sizeStr) {
    if (!sizeStr) return '一般';[cite: 3]
    let s = String(sizeStr).trim();[cite: 3]
    if (s.includes('巨') || s.includes('大')) return '巨大';[cite: 3]
    if (s.includes('小')) return '小';[cite: 3]
    return '一般';[cite: 3]
}

// 🔍 自動解析蘑菇名稱，切出「尺寸」與「種類」（絕對不誤傷種類文字）
function parseMushroomTypeAndSize(rawInput) {
    if (!rawInput) return { size: '一般', type: '黃色蘑菇' };[cite: 3]

    let text = String(rawInput).trim().replace(/\[|\]|\(|\)/g, ''); // 只清理括號[cite: 3]
    let detectedSize = '一般';[cite: 3]
    let cleanType = text;[cite: 3]

    // 🎯 1. 先匹配雙字尺寸（巨大、巨型、小型、普通）
    if (text.startsWith('巨大') || text.startsWith('巨型')) {[cite: 3]
        detectedSize = '巨大';[cite: 3]
        cleanType = text.substring(2); // 精準砍掉前2個字[cite: 3]
    } else if (text.startsWith('小型')) {[cite: 3]
        detectedSize = '小';[cite: 3]
        cleanType = text.substring(2); // 精準砍掉前2個字[cite: 3]
    } else if (text.startsWith('一般') || text.startsWith('普通')) {[cite: 3]
        detectedSize = '一般';[cite: 3]
        cleanType = text.substring(2); // 精準砍掉前2個字[cite: 3]
    } 
    // 🎯 2. 再匹配單字尺寸（大、小、巨、中）
    else if (text.startsWith('大') || text.startsWith('巨')) {[cite: 3]
        detectedSize = '巨大';[cite: 3]
        cleanType = text.substring(1); // 精準砍掉第1個字[cite: 3]
    } else if (text.startsWith('小')) {[cite: 3]
        detectedSize = '小';[cite: 3]
        cleanType = text.substring(1); // 精準砍掉第1個字 ("小紅色蘑菇" -> 完美留下 "紅色蘑菇")[cite: 3]
    }

    cleanType = cleanType.trim();[cite: 3]
    if (!cleanType) cleanType = '黃色蘑菇';[cite: 3]

    return {
        size: detectedSize,[cite: 3]
        type: cleanType // 100% 乾淨輸出 "紅色蘑菇"、"黃色蘑菇"、"紫色蘑菇"[cite: 3]
    };
}

// 🍄 2. 種類獨立標準校正 (先抹除尺寸，再直球比對顏色)
function normalizeMushroomType(typeStr) {
    if (!typeStr) return '黃色蘑菇';[cite: 3]
    
    // 🎯 第一步：強制把所有尺寸關鍵字拔掉 (例如 "小黃色蘑菇" -> "黃色蘑菇")
    let normalized = String(typeStr)[cite: 3]
        .replace(/\[|\]|\(|\)/g, '')[cite: 3]
        .replace(/巨大|巨型|小型|一般|普通|大|小/g, '')[cite: 3]
        .trim();[cite: 3]

    // 🌟 1. 當月特殊與活動蘑菇
    if (
        normalized.includes("海泡泡") || 
        normalized.includes("特殊") || 
        normalized.includes("活動") || 
        normalized.includes("每月") || 
        normalized.includes("本月") || 
        normalized.includes("神秘")[cite: 3]
    ) {
        return "每月特殊蘑菇";[cite: 3]
    }

    // 🌟 2. 元素蘑菇
    if (normalized.includes("水晶")) return "水晶蘑菇";[cite: 3]
    if (normalized.includes("火")) return "火蘑菇";[cite: 3]
    if (normalized.includes("水")) return "水蘑菇";[cite: 3]
    if (normalized.includes("毒")) return "毒蘑菇";[cite: 3]
    if (normalized.includes("電")) return "電蘑菇";[cite: 3]

    // 🌟 3. 普通顏色蘑菇 (核心字精準攔截)
    if (normalized.includes("黃")) return "黃色蘑菇";[cite: 3]
    if (normalized.includes("藍")) return normalized.includes("冰") ? "冰藍蘑菇" : "藍色蘑菇";[cite: 3]
    if (normalized.includes("灰") || normalized.includes("岩")) return "灰色蘑菇";[cite: 3]
    if (normalized.includes("紫")) return "紫色蘑菇";[cite: 3]
    if (normalized.includes("白")) return "白色蘑菇";[cite: 3]
    if (normalized.includes("粉") || normalized.includes("羽")) return "粉紅蘑菇";[cite: 3]
    if (normalized.includes("紅")) return "紅色蘑菇";[cite: 3]

    return "黃色蘑菇"; // 預設值鎖死黃色，絕不給它機會變紅色！[cite: 3]
}

// 🍄 3. 圖示路徑解析
function getIconPath(type) {
    if (!type) return "picture/mushroom_monthly_special.png";[cite: 3]
    const typeStr = String(type).trim();[cite: 3]

    // 🌟 特殊/元素蘑菇
    if (typeStr.includes("水晶")) return "picture/mushroom_crystal.png";[cite: 3]
    if (typeStr.includes("每月") || typeStr.includes("特殊") || typeStr.includes("海泡泡") || typeStr.includes("本月")) {[cite: 3]
        return "picture/mushroom_monthly_special.png";[cite: 3]
    }
    if (typeStr.includes("火")) return "picture/mushroom_fire.png";[cite: 3]
    if (typeStr.includes("水")) return "picture/mushroom_water.png";[cite: 3]
    if (typeStr.includes("毒")) return "picture/mushroom_poison.png";[cite: 3]
    if (typeStr.includes("電")) return "picture/mushroom_electric.png";[cite: 3]
    if (typeStr.includes("冰")) return "picture/mushroom_ice.png";[cite: 3]

    // 🎯 優先攔截「雙字顏色」（粉紅、冰藍），避免被下面的「紅、藍」搶先抓走！
    if (typeStr.includes("粉") || typeStr.includes("羽")) return "picture/mushroom_pink.png"; // 👈 搬到「紅」的前面！[cite: 3]
    if (typeStr.includes("冰藍")) return "picture/mushroom_ice_blue.png";[cite: 3]

    // 🌟 單字顏色
    if (typeStr.includes("灰") || typeStr.includes("岩")) return "picture/mushroom_gray.png";[cite: 3]
    if (typeStr.includes("紅")) return "picture/mushroom_red.png"; // 👈 現在粉紅色不會跑到這裡了！[cite: 3]
    if (typeStr.includes("藍")) return "picture/mushroom_blue.png";[cite: 3]
    if (typeStr.includes("黃")) return "picture/mushroom_yellow.png";[cite: 3]
    if (typeStr.includes("紫")) return "picture/mushroom_purple.png";[cite: 3]
    if (typeStr.includes("白")) return "picture/mushroom_white.png";[cite: 3]

    return "picture/mushroom_monthly_special.png";[cite: 3]
}

// 📊 4. 字串相似度算法
function calculateSimilarity(str1, str2) {
    if (!str1 || !str2) return 0;[cite: 3]
    const s1 = str1.trim().toLowerCase();[cite: 3]
    const s2 = str2.trim().toLowerCase();[cite: 3]

    if (s1.includes(s2) || s2.includes(s1)) {[cite: 3]
        const minLen = Math.min(s1.length, s2.length);[cite: 3]
        const maxLen = Math.max(s1.length, s2.length);[cite: 3]
        if (minLen >= 3 && minLen / maxLen >= 0.5) return 0.85;[cite: 3]
    }

    const track = Array(s2.length + 1).fill(null).map(() => Array(s1.length + 1).fill(null));[cite: 3]
    for (let i = 0; i <= s1.length; i += 1) track[0][i] = i;[cite: 3]
    for (let j = 0; j <= s2.length; j += 1) track[j][0] = j;[cite: 3]

    for (let j = 1; j <= s2.length; j += 1) {[cite: 3]
        for (let i = 1; i <= s1.length; i += 1) {[cite: 3]
            const indicator = s1[i - 1] === s2[j - 1] ? 0 : 1;[cite: 3]
            track[j][i] = Math.min([cite: 3]
                track[j][i - 1] + 1,[cite: 3]
                track[j - 1][i] + 1,[cite: 3]
                track[j - 1][i - 1] + indicator[cite: 3]
            );
        }
    }
    return 1 - (track[s2.length][s1.length] / Math.max(s1.length, s2.length));[cite: 3]
}

// ⚡ 5. 格式碼解析 (#菇,截圖時間,行政區,地點,尺寸,種類,人數,剩餘時間)
function parseMushroomCode(code) {
    try {
        console.log("📥 執行捷徑自動解析，內容：", code);[cite: 3]

        if (!code || !code.startsWith('#菇')) return false;[cite: 3]

        const parts = code.trim().split(',');[cite: 3]
        let [prefix, rawPhotoTime, rawDistrict, rawLocation, rawSize, rawType, rawPlayers, rawTime] = parts.map(p => p ? p.trim() : '');[cite: 3]

        // 🎯 處理 7 欄位格式 (若捷徑傳入 7 欄位)
        if (parts.length === 7) {[cite: 3]
            rawTime = parts[6] ? parts[6].trim() : '';[cite: 3]
            rawPlayers = parts[5] ? parts[5].trim() : '1';[cite: 3]
            rawType = parts[4] ? parts[4].trim() : '';[cite: 3]
            rawSize = '一般';[cite: 3]
        }

        // A. 時間計算 (截圖時間校正)
        let timeOffsetSec = 0;[cite: 3]
        if (rawPhotoTime) {[cite: 3]
            const now = new Date();[cite: 3]
            const photoDate = new Date();[cite: 3]
            const photoTimeParts = rawPhotoTime.split(':').map(t => parseInt(t, 10) || 0);[cite: 3]

            if (photoTimeParts.length >= 2) {[cite: 3]
                photoDate.setHours(photoTimeParts[0], photoTimeParts[1], photoTimeParts[2] || 0, 0);[cite: 3]

                let diffMs = now.getTime() - photoDate.getTime();[cite: 3]
                if (diffMs < 0 && Math.abs(diffMs) > 12 * 3600 * 1000) {[cite: 3]
                    photoDate.setDate(photoDate.getDate() - 1);[cite: 3]
                    diffMs = now.getTime() - photoDate.getTime();[cite: 3]
                }

                if (diffMs > 0) {[cite: 3]
                    timeOffsetSec = Math.floor(diffMs / 1000);[cite: 3]
                }
            }
        }

        // B. 剩餘時間解析
        let h = 0, m = 0, s = 0;[cite: 3]
        if (rawTime.includes('小時') || rawTime.includes('分')) {[cite: 3]
            const hMatch = rawTime.match(/(\d+)\s*小時/);[cite: 3]
            const mMatch = rawTime.match(/(\d+)\s*分/);[cite: 3]
            const sMatch = rawTime.match(/(\d+)\s*秒/);[cite: 3]
            if (hMatch) h = parseInt(hMatch[1], 10);[cite: 3]
            if (mMatch) m = parseInt(mMatch[1], 10);[cite: 3]
            if (sMatch) s = parseInt(sMatch[1], 10);[cite: 3]
        } else {
            const timeParts = rawTime.split(':').map(t => parseInt(t, 10) || 0);[cite: 3]
            if (timeParts.length === 3) { h = timeParts[0]; m = timeParts[1]; s = timeParts[2]; }[cite: 3]
            else if (timeParts.length === 2) { h = timeParts[0]; m = timeParts[1]; s = 0; }[cite: 3]
        }

        let totalLeftSec = (h * 3600) + (m * 60) + s - timeOffsetSec;[cite: 3]
        if (totalLeftSec < 0) totalLeftSec = 0;[cite: 3]

        const finalH = Math.floor(totalLeftSec / 3600);[cite: 3]
        const finalM = Math.floor((totalLeftSec % 3600) / 60);[cite: 3]
        const finalS = totalLeftSec % 60;[cite: 3]

        // C. 地點比對 (捷徑已完全清除箭頭，直接進行歷史據點比對)
        let cleanLocation = rawLocation.trim();[cite: 3]
        let cleanDistrict = rawDistrict ? rawDistrict.trim() : null;[cite: 3]

        let bestMatchedLocation = cleanLocation;[cite: 3]
        let matchedCity = null;[cite: 3]
        let matchedDistrict = cleanDistrict;[cite: 3]
        let highestScore = 0;[cite: 3]

        if (typeof localMushroomsData !== 'undefined' && localMushroomsData) {[cite: 3]
            Object.values(localMushroomsData).forEach(item => {[cite: 3]
                if (item && item.locationName) {[cite: 3]
                    const targetName = item.locationName.trim();[cite: 3]
                    let score = calculateSimilarity(cleanLocation, targetName);[cite: 3]

                    if (score > highestScore && score >= 0.5) {[cite: 3]
                        highestScore = score;[cite: 3]
                        bestMatchedLocation = item.locationName;[cite: 3]
                        matchedCity = item.city;[cite: 3]
                        if (!matchedDistrict) {[cite: 3]
                            matchedDistrict = Array.isArray(item.district) ? item.district[0] : item.district;[cite: 3]
                        }
                    }
                }
            });
        }

        // D. 帶入縣市與地區
        const citySelect = document.getElementById("city");[cite: 3]
        const distSelect = document.getElementById("district");[cite: 3]

        if (citySelect) {[cite: 3]
            citySelect.value = matchedCity || "高雄市";[cite: 3]
            citySelect.dispatchEvent(new Event('change'));[cite: 3]
        }

        if (distSelect) {[cite: 3]
            setTimeout(() => {
                let options = Array.from(distSelect.options);[cite: 3]
                let matchedOpt = options.find(o => 
                    matchedDistrict && (o.value === matchedDistrict || o.text.includes(matchedDistrict))[cite: 3]
                );

                if (matchedOpt) {[cite: 3]
                    distSelect.value = matchedOpt.value;[cite: 3]
                } else if (options.length > 1) {[cite: 3]
                    distSelect.selectedIndex = 1;[cite: 3]
                }
                distSelect.dispatchEvent(new Event('change'));[cite: 3]
            }, 150);
        }

        // 🎯 E. 直球帶入尺寸與種類 (無需拆解，100% 精準寫入)
        let finalSize = normalizeMushroomSize(rawSize);[cite: 3]
        let finalType = normalizeMushroomType(rawType);[cite: 3]

        // 帶入尺寸選單
        const sizeSelect = document.getElementById('mushroom-size');[cite: 3]
        if (sizeSelect) {[cite: 3]
            sizeSelect.value = finalSize;[cite: 3]
            sizeSelect.dispatchEvent(new Event('change'));[cite: 3]
        }

        // 帶入種類選單
        const typeSelect = document.getElementById('mushroom-type');[cite: 3]
        if (typeSelect) {[cite: 3]
            let matchedOpt = Array.from(typeSelect.options).find(opt => 
                opt.value === finalType || opt.text.includes(finalType)[cite: 3]
            );

            if (matchedOpt) {[cite: 3]
                typeSelect.value = matchedOpt.value;[cite: 3]
            } else {
                // 防呆：用顏色字眼對應
                const colorChar = finalType.replace(/蘑菇|色|一般|普通/g, '');[cite: 3]
                let fallbackOpt = Array.from(typeSelect.options).find(opt => 
                    colorChar && (opt.value.includes(colorChar) || opt.text.includes(colorChar))[cite: 3]
                );
                if (fallbackOpt) typeSelect.value = fallbackOpt.value;[cite: 3]
            }
            typeSelect.dispatchEvent(new Event('change'));[cite: 3]
        }

        // 🎯 F. 帶入人數、地點與時間
        let parsedPlayers = parseInt(rawPlayers, 10) || 1;[cite: 3]
        const playerInput = document.getElementById('current-players');[cite: 3]
        if (playerInput) playerInput.value = parsedPlayers;[cite: 3]

        const locationInput = document.getElementById('location-name');[cite: 3]
        if (locationInput) {[cite: 3]
            locationInput.value = bestMatchedLocation;[cite: 3]
        }

        const hEl = document.getElementById('time-hours');[cite: 3]
        const mEl = document.getElementById('time-minutes');[cite: 3]
        const sEl = document.getElementById('time-seconds');[cite: 3]
        if (hEl && mEl && sEl) {[cite: 3]
            hEl.value = finalH;[cite: 3]
            mEl.value = finalM;[cite: 3]
            sEl.value = finalS;[cite: 3]
        }

        // G. 自動送出
        const reportForm = document.getElementById("report-form");[cite: 3]
        if (reportForm) {[cite: 3]
            setTimeout(() => {
                reportForm.requestSubmit();[cite: 3]
            }, 700);
        }

        return true;[cite: 3]
    } catch (err) {
        console.error("parseMushroomCode 錯誤：", err);[cite: 3]
        return false;[cite: 3]
    }
}

// 🗺️ 6. 地圖初始化
function initLeafletMap() {
    try {
        const mapContainer = document.getElementById('map');[cite: 3]
        if (!mapContainer || typeof L === 'undefined') return;[cite: 3]
        map = L.map('map').setView([22.613, 120.316], 13);[cite: 3]
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap' }).addTo(map);[cite: 3]
        markerGroup = L.layerGroup().addTo(map);[cite: 3]
    } catch (error) { console.error("地圖載入失敗:", error); }[cite: 3]
}

document.addEventListener("DOMContentLoaded", () => {
    initLeafletMap();[cite: 3]

    const reportForm = document.getElementById("report-form");[cite: 3]
    const mushroomBoard = document.getElementById("mushroom-board");[cite: 3]
    const filterCity = document.getElementById("filter-city");[cite: 3]
    const filterDistrict = document.getElementById("filter-district");[cite: 3]
    const searchKeyword = document.getElementById("search-keyword");[cite: 3]
    const sortMethod = document.getElementById("sort-method");[cite: 3]
    const btnGridView = document.getElementById("btn-grid-view");[cite: 3]
    const btnListView = document.getElementById("btn-list-view");[cite: 3]
    const btnAutoLocation = document.getElementById("btn-auto-location");[cite: 3]
    const btnNearbyMushrooms = document.getElementById("btn-nearby-mushrooms");[cite: 3]

    let localMushroomsData = {};[cite: 3]
    let pinnedList = JSON.parse(localStorage.getItem("pinned_mushrooms")) || [];[cite: 3]
    let alertEnabledList = JSON.parse(localStorage.getItem("mushroom_alerts_enabled")) || [];[cite: 3]
    let activePanels = {};[cite: 3]

    window.setViewMode = function(mode) {
        if (!mushroomBoard) return;[cite: 3]
        mushroomBoard.className = `board-container ${mode}-view`;[cite: 3]
        btnGridView?.classList.toggle("active", mode === "grid");[cite: 3]
        btnListView?.classList.toggle("active", mode === "list");[cite: 3]
        localStorage.setItem("board_view_pref", mode);[cite: 3]
        renderBoard();[cite: 3]
    };

    if (btnGridView && btnListView) {[cite: 3]
        btnGridView.addEventListener("click", () => window.setViewMode("grid"));[cite: 3]
        btnListView.addEventListener("click", () => window.setViewMode("list"));[cite: 3]
    }

    const savedView = localStorage.getItem("board_view_pref") || "grid";[cite: 3]
    window.setViewMode(savedView);[cite: 3]

    function initFilterDistricts() {
        const availableData = window.taiwanData || (typeof taiwanData !== 'undefined' ? taiwanData : null);[cite: 3]
        if (!filterCity || !filterDistrict || !availableData) return false;[cite: 3]

        filterCity.innerHTML = '<option value="all">所有縣市</option>';[cite: 3]
        Object.keys(availableData).forEach(city => {[cite: 3]
            const option = document.createElement("option");[cite: 3]
            option.value = city;  [cite: 3]
            option.textContent = city;[cite: 3]
            filterCity.appendChild(option);[cite: 3]
        });

        filterDistrict.innerHTML = '<option value="all">所有行政區</option>';[cite: 3]
        filterDistrict.disabled = true;[cite: 3]

        filterCity.addEventListener("change", () => {[cite: 3]
            const selectedCity = filterCity.value;[cite: 3]
            filterDistrict.innerHTML = '<option value="all">所有行政區</option>';[cite: 3]
            if (selectedCity === "all") {[cite: 3]
                filterDistrict.disabled = true;[cite: 3]
            } else {
                filterDistrict.disabled = false;[cite: 3]
                (availableData[selectedCity] || []).forEach(dist => {[cite: 3]
                    const option = document.createElement("option");[cite: 3]
                    option.value = dist; [cite: 3]
                    option.textContent = dist;[cite: 3]
                    filterDistrict.appendChild(option);[cite: 3]
                });
            }
            renderBoard();[cite: 3]
        });

        filterDistrict.addEventListener("change", renderBoard);[cite: 3]
        sortMethod?.addEventListener("change", renderBoard);[cite: 3]
        searchKeyword?.addEventListener("input", renderBoard);[cite: 3]

        const savedCity = localStorage.getItem("mushroom_filter_city") || "all";[cite: 3]
        const savedDist = localStorage.getItem("mushroom_filter_dist") || "all";[cite: 3]
        if (savedCity !== "all" && filterCity) {[cite: 3]
            filterCity.value = savedCity;[cite: 3]
            filterCity.dispatchEvent(new Event("change"));[cite: 3]
            if (savedDist !== "all" && filterDistrict) {[cite: 3]
                filterDistrict.value = savedDist;[cite: 3]
            }
        }

        renderBoard();[cite: 3]
        return true;[cite: 3]
    }

    if (btnAutoLocation) {[cite: 3]
        btnAutoLocation.addEventListener("click", () => {[cite: 3]
            if (!navigator.geolocation) return alert("您的瀏覽器不支援地理定位功能。");[cite: 3]
            btnAutoLocation.textContent = "⌛";[cite: 3]
            
            navigator.geolocation.getCurrentPosition([cite: 3]
                (position) => {
                    userCurrentLat = position.coords.latitude;[cite: 3]
                    userCurrentLng = position.coords.longitude;[cite: 3]

                    if (map) map.setView([userCurrentLat, userCurrentLng], 16);[cite: 3]

                    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${userCurrentLat}&lon=${userCurrentLng}&accept-language=zh-TW`;[cite: 3]

                    fetch(url, { headers: { 'User-Agent': 'PikminMushroomHubApp/1.0' } })[cite: 3]
                    .then(response => response.json())[cite: 3]
                    .then(data => {[cite: 3]
                        btnAutoLocation.textContent = "🎯 定位";[cite: 3]
                        if (!data || !data.address) return alert("定位成功，但無法自動解析縣市名稱，請手動選擇。");[cite: 3]

                        const addr = data.address;[cite: 3]
                        let detectedCity = addr.city || addr.state || addr.town || "";[cite: 3]
                        let detectedDistrict = addr.suburb || addr.district || addr.town || addr.city_district || "";[cite: 3]

                        if (detectedCity.includes("高雄")) detectedCity = "高雄市";[cite: 3]
                        if (detectedCity.includes("臺南") || detectedCity.includes("台南")) detectedCity = "台南市";[cite: 3]
                        if (detectedCity.includes("臺北") || detectedCity.includes("台北")) detectedCity = "台北市";[cite: 3]
                        if (detectedCity.includes("新北")) detectedCity = "新北市";[cite: 3]
                        if (detectedCity.includes("桃園")) detectedCity = "桃園市";[cite: 3]
                        if (detectedCity.includes("臺中") || detectedCity.includes("台中")) detectedCity = "台中市";[cite: 3]

                        detectedDistrict = detectedDistrict.replace(detectedCity, "").trim();[cite: 3]

                        const reportCityEl = document.getElementById("city");[cite: 3]
                        const reportDistrictEl = document.getElementById("district");[cite: 3]
                        const filterCityEl = document.getElementById("filter-city");[cite: 3]
                        const filterDistrictEl = document.getElementById("filter-district");[cite: 3]

                        if (reportCityEl) {[cite: 3]
                            reportCityEl.value = detectedCity;[cite: 3]
                            reportCityEl.dispatchEvent(new Event("change"));[cite: 3]
                        }

                        if (filterCityEl) {[cite: 3]
                            filterCityEl.value = detectedCity;[cite: 3]
                            filterCityEl.dispatchEvent(new Event("change"));[cite: 3]
                        }

                        setTimeout(() => {[cite: 3]
                            if (reportDistrictEl) reportDistrictEl.value = detectedDistrict;[cite: 3]
                            if (filterDistrictEl) filterDistrictEl.value = detectedDistrict;[cite: 3]

                            localStorage.setItem("mushroom_filter_city", detectedCity);[cite: 3]
                            localStorage.setItem("mushroom_filter_dist", detectedDistrict);[cite: 3]

                            alert(`🎯 定位成功！已自動帶入【${detectedCity} ${detectedDistrict}】！`);[cite: 3]
                            renderBoard();[cite: 3]
                        }, 100);[cite: 3]
                    })
                    .catch(err => {[cite: 3]
                        console.error("逆向解析失敗:", err);[cite: 3]
                        btnAutoLocation.textContent = "🎯 定位";[cite: 3]
                    });
                },
                () => {
                    btnAutoLocation.textContent = "🎯 定位";[cite: 3]
                    alert("GPS 定位失敗。");[cite: 3]
                },
                { enableHighAccuracy: true, timeout: 6000 }[cite: 3]
            );
        });
    }

    if (btnNearbyMushrooms) {[cite: 3]
        btnNearbyMushrooms.addEventListener("click", () => {[cite: 3]
            if (userCurrentLat === null || userCurrentLng === null) return alert("請先點擊「🎯 定位」！");[cite: 3]
            isNearbyFilterOn = !isNearbyFilterOn;[cite: 3]
            btnNearbyMushrooms.classList.toggle("active", isNearbyFilterOn);[cite: 3]
            btnNearbyMushrooms.textContent = isNearbyFilterOn ? "🟢 顯示 600m 內" : "📍 篩選 600m 內";[cite: 3]
            renderBoard();[cite: 3]
        });
    }

    if (reportForm) {[cite: 3]
        reportForm.addEventListener("submit", async (e) => {[cite: 3]
            e.preventDefault();[cite: 3]

            // 🛑 前端防洗板頻率限制（冷卻 5 秒）
            const COOLDOWN_MS = 5000;[cite: 3]
            const lastReportTime = parseInt(localStorage.getItem("last_report_timestamp") || "0", 10);[cite: 3]
            const now = Date.now();[cite: 3]

            if (now - lastReportTime < COOLDOWN_MS) {[cite: 3]
                const waitSec = Math.ceil((COOLDOWN_MS - (now - lastReportTime)) / 1000);[cite: 3]
                alert(`⛔ 回報過於頻繁！請等待 ${waitSec} 秒後再試。`);[cite: 3]
                return;[cite: 3]
            }

            if (!window.fbDB) return alert("Firebase 尚未連線！");[cite: 3]

            const userIP = await getUserIP();[cite: 3]
            const safeIpKey = userIP.replace(/\./g, "_");[cite: 3]

            if (window.fbGet) {[cite: 3]
                try {
                    const blacklistSnap = await window.fbGet(window.fbRef(window.fbDB, `blacklist/${safeIpKey}`));[cite: 3]
                    if (blacklistSnap && blacklistSnap.exists()) {[cite: 3]
                        alert("⛔ 您的 IP 已被管理員列入黑名單，無法進行發佈或更新！");[cite: 3]
                        return;[cite: 3]
                    }
                } catch (err) {
                    console.warn("黑名單比對跳過:", err);[cite: 3]
                }
            }

            const cityEl = document.getElementById("city");[cite: 3]
            const districtEl = document.getElementById("district");[cite: 3]
            const city = (cityEl && cityEl.value && cityEl.value !== "") ? cityEl.value : "高雄市";[cite: 3]
            const district = (districtEl && districtEl.value && districtEl.value !== "") ? districtEl.value : "前金區";[cite: 3]

            const locationName = document.getElementById("location-name").value.trim();[cite: 3]
            const type = normalizeMushroomType(document.getElementById("mushroom-type").value);[cite: 3]
            const size = normalizeMushroomSize(document.getElementById("mushroom-size").value);[cite: 3]
            const players = parseInt(document.getElementById("current-players").value) || 1;[cite: 3]

            const h = parseInt(document.getElementById("time-hours").value) || 0;[cite: 3]
            const m = parseInt(document.getElementById("time-minutes").value) || 0;[cite: 3]
            const s = parseInt(document.getElementById("time-seconds").value) || 0;[cite: 3]

            const nowTimestamp = Date.now();[cite: 3]
            const latVal = parseFloat(document.getElementById("lat")?.value) || null;[cite: 3]
            const lngVal = parseFloat(document.getElementById("lng")?.value) || null;[cite: 3]

            let existingId = null;[cite: 3]
            for (const [id, item] of Object.entries(localMushroomsData)) {[cite: 3]
                if (item.locationName === locationName) {[cite: 3]
                    existingId = id; break;[cite: 3]
                }
            }

            let existingLat = null;[cite: 3]
            let existingLng = null;[cite: 3]

            if (existingId && localMushroomsData[existingId]) {[cite: 3]
                existingLat = localMushroomsData[existingId].lat;[cite: 3]
                existingLng = localMushroomsData[existingId].lng;[cite: 3]
            }

            const mushroomData = {
                city, district: [district], locationName, type, size,[cite: 3]
                currentPlayers: players, maxPlayers: 30,[cite: 3]
                timeReported: { hours: h, minutes: m, seconds: s },[cite: 3]
                createdAt: nowTimestamp, updatedAt: nowTimestamp,[cite: 3]
                lat: latVal || existingLat || null,[cite: 3]
                lng: lngVal || existingLng || null,[cite: 3]
                reporterIP: userIP,[cite: 3]
                status: "active"[cite: 3]
            };

            if (existingId) {[cite: 3]
                window.fbUpdate(window.fbRef(window.fbDB, `mushrooms/${existingId}`), mushroomData)[cite: 3]
                    .then(() => { 
                        localStorage.setItem("last_report_timestamp", Date.now().toString());
                        reportForm.reset();  [cite: 3]
                        alert("🔄 自動回報：已成功原地更新！"); [cite: 3]
                    });
            } else {
                window.fbPush(window.fbRef(window.fbDB, "mushrooms"), mushroomData)[cite: 3]
                    .then(() => { 
                        localStorage.setItem("last_report_timestamp", Date.now().toString());
                        reportForm.reset(); [cite: 3]
                        alert("🎉 自動回報：新情報發佈成功！"); [cite: 3]
                    });
            }
        });
    }

    function startBoardSync() {
        if (!window.fbDB || !mushroomBoard) return;[cite: 3]

        // 🛑 單次執行：僅在載入時解析一次 URL code 參數
        const urlParams = new URLSearchParams(window.location.search);
        const codeParam = urlParams.get('code');
        if (codeParam) {
            parseMushroomCode(decodeURIComponent(codeParam));
            window.history.replaceState({}, document.title, window.location.pathname);
        }

        window.fbOnValue(window.fbRef(window.fbDB, "mushrooms"), (snapshot) => {[cite: 3]
            localMushroomsData = snapshot.val() || {};[cite: 3]
            renderBoard();[cite: 3]
        });
        setInterval(updateTickCounters, 1000);[cite: 3]
    }

    function renderBoard() {
        const keys = Object.keys(localMushroomsData);[cite: 3]

        const countEl = document.getElementById("daily-report-count");[cite: 3]
        if (countEl) {[cite: 3]
            const startOfToday = new Date();[cite: 3]
            startOfToday.setHours(0, 0, 0, 0);[cite: 3]
            const todayTimestamp = startOfToday.getTime();[cite: 3]
            const dailyCount = keys.filter(id => (localMushroomsData[id].updatedAt || localMushroomsData[id].createdAt || 0) >= todayTimestamp).length;[cite: 3]
            countEl.textContent = `📊 今日回報量：${dailyCount} 筆`;[cite: 3]
        }

        if (!mushroomBoard) return;[cite: 3]

        let htmlContent = "";[cite: 3]
        const cityFilter = filterCity?.value || "all";[cite: 3]
        const distFilter = filterDistrict?.value || "all";[cite: 3]
        const keyword = searchKeyword?.value.trim().toLowerCase() || "";[cite: 3]
        const currentSort = sortMethod?.value || "default";[cite: 3]

        if (keys.length === 0) {[cite: 3]
            mushroomBoard.innerHTML = '<p class="loading-text">目前沒有即時情報，快去發佈第一個吧！</p>';[cite: 3]
            if (markerGroup) markerGroup.clearLayers();[cite: 3]
            return;[cite: 3]
        }

        keys.sort((a, b) => {[cite: 3]
            const aPinned = pinnedList.includes(a) ? 1 : 0;[cite: 3]
            const bPinned = pinnedList.includes(b) ? 1 : 0;[cite: 3]
            if (bPinned !== aPinned) return bPinned - aPinned;[cite: 3]

            const itemA = localMushroomsData[a];[cite: 3]
            const itemB = localMushroomsData[b];[cite: 3]

            if (currentSort === "size") {[cite: 3]
                const sizeWeight = { "巨大": 3, "一般": 2, "普通": 2, "小": 1, "小型": 1 };[cite: 3]
                const weightA = sizeWeight[itemA.size] || 2;[cite: 3]
                const weightB = sizeWeight[itemB.size] || 2;[cite: 3]
                return weightB - weightA;[cite: 3]
            } 
            else if (currentSort === "time") {[cite: 3]
                const getMsLeft = (item) => {[cite: 3]
                    if (!item.timeReported) return Infinity;[cite: 3]
                    const totalReportedMs = ((item.timeReported.hours * 3600) + (item.timeReported.minutes * 60) + (item.timeReported.seconds || 0)) * 1000;[cite: 3]
                    return ((item.createdAt || 0) + totalReportedMs) - Date.now();[cite: 3]
                };
                return getMsLeft(itemA) - getMsLeft(itemB);[cite: 3]
            } 
            else {
                const timeA = itemA.updatedAt || itemA.createdAt || 0;[cite: 3]
                const timeB = itemB.updatedAt || itemB.createdAt || 0;[cite: 3]
                return timeB - timeA;[cite: 3]
            }
        });

        if (markerGroup) markerGroup.clearLayers();[cite: 3]

        keys.forEach(id => {[cite: 3]
            const item = localMushroomsData[id];[cite: 3]
            if (item.status === 'hidden') return;[cite: 3]

            const displayType = normalizeMushroomType(item.type);[cite: 3]
            const displaySize = normalizeMushroomSize(item.size);[cite: 3]

            if (cityFilter !== "all" && item.city !== cityFilter) return;[cite: 3]
            
            if (distFilter !== "all") {[cite: 3]
                if (!item.district) return;[cite: 3]
                if (Array.isArray(item.district)) {[cite: 3]
                    if (!item.district.includes(distFilter)) return;[cite: 3]
                } else if (typeof item.district === "string") {[cite: 3]
                    if (item.district !== distFilter) return;[cite: 3]
                }
            }

            if (keyword && !item.locationName.toLowerCase().includes(keyword) && !displayType.toLowerCase().includes(keyword)) return;[cite: 3]

            const isPinned = pinnedList.includes(id) ? "pinned" : "";[cite: 3]
            const isAlertEnabled = alertEnabledList.includes(id);[cite: 3]
            const alertBtnText = isAlertEnabled ? "🔔 提醒已開" : "🔕 開啟提醒";[cite: 3]

            const dynamicImgSrc = getIconPath(displayType);[cite: 3]
            const lastUpdatedDate = new Date(item.updatedAt || item.createdAt || Date.now());[cite: 3]
            const formattedTime = `${lastUpdatedDate.getMonth()+1}/${lastUpdatedDate.getDate()} ${lastUpdatedDate.getHours().toString().padStart(2,'0')}:${lastUpdatedDate.getMinutes().toString().padStart(2,'0')}`;[cite: 3]

            const isEditOpen = activePanels[id]?.edit ? "block" : "none";[cite: 3]
            const isHistoryOpen = activePanels[id]?.history ? "block" : "none";[cite: 3]

            const fastFillData = encodeURIComponent(JSON.stringify({[cite: 3]
                city: item.city,[cite: 3]
                district: Array.isArray(item.district) ? item.district[0] : item.district,[cite: 3]
                locationName: item.locationName,[cite: 3]
                lat: item.lat || "",[cite: 3]
                lng: item.lng || ""[cite: 3]
            }));[cite: 3]

            let districtBadgeHTML = "";[cite: 3]
            if (Array.isArray(item.district) && item.district.length > 0) {[cite: 3]
                districtBadgeHTML = item.district.map(d => `<span class="dist-badge" style="background:#e2e8f0; color:#334155; padding:1px 5px; border-radius:4px; font-size:11px; margin-right:4px;">${d}</span>`).join('');[cite: 3]
            } else if (typeof item.district === "string" && item.district.trim() !== "") {[cite: 3]
                districtBadgeHTML = `<span class="dist-badge" style="background:#e2e8f0; color:#334155; padding:1px 5px; border-radius:4px; font-size:11px; margin-right:4px;">${item.district}</span>`;[cite: 3]
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
            `;[cite: 3]

            if (markerGroup && item.lat && item.lng) {[cite: 3]
                const marker = L.marker([item.lat, item.lng]).bindPopup(`<b>${displayType}</b><br>${item.locationName}`);[cite: 3]
                markerGroup.addLayer(marker);[cite: 3]
            }
        });

        mushroomBoard.innerHTML = htmlContent;[cite: 3]
        updateTickCounters();[cite: 3]
    }

    function updateTickCounters() {
        const keys = Object.keys(localMushroomsData);[cite: 3]
        keys.forEach(id => {[cite: 3]
            const item = localMushroomsData[id];[cite: 3]
            const textElement = document.getElementById(`time-text-${id}`);[cite: 3]
            if (!textElement || !item.timeReported) return;[cite: 3]

            const totalReportedMs = ((item.timeReported.hours * 3600) + (item.timeReported.minutes * 60) + (item.timeReported.seconds || 0)) * 1000;[cite: 3]
            const expireTime = (item.createdAt || Date.now()) + totalReportedMs;[cite: 3]
            const msLeft = expireTime - Date.now();[cite: 3]

            const displayType = normalizeMushroomType(item.type);[cite: 3]
            const displaySize = normalizeMushroomSize(item.size);[cite: 3]

            if (msLeft > 0) {[cite: 3]
                const totalSec = Math.floor(msLeft / 1000);[cite: 3]
                const h = Math.floor(totalSec / 3600);[cite: 3]
                const m = Math.floor((totalSec % 3600) / 60);[cite: 3]
                const s = totalSec % 60;[cite: 3]
                textElement.innerHTML = `⏳ 剩餘時間：<strong>${h}時${m}分${s}秒</strong>`;[cite: 3]
                textElement.style.color = "#0284c7";[cite: 3]

                // 🔔 【剩餘 1 分鐘提醒】
                if (msLeft <= 60000 && alertEnabledList.includes(id) && !notifiedMushrooms.includes(`${id}_1m`)) {[cite: 3]
                    notifiedMushrooms.push(`${id}_1m`);[cite: 3]
                    
                    if (Notification.permission === "granted") {[cite: 3]
                        new Notification(`⏰ 蘑菇即將結束！倒數 1 分鐘`, {[cite: 3]
                            body: `📍 ${item.locationName} 的【${displaySize}${displayType}】只剩 1 分鐘，準備迎接新菇！`,[cite: 3]
                            icon: getIconPath(displayType),[cite: 3]
                            requireInteraction: true[cite: 3]
                        });
                    }
                }

            } else if (msLeft <= 0 && msLeft > -300000) {[cite: 3]
                const cooldownMsLeft = 300000 + msLeft;[cite: 3]
                const totalCoolSec = Math.floor(cooldownMsLeft / 1000);[cite: 3]
                const coolM = Math.floor(totalCoolSec / 60);[cite: 3]
                const coolS = totalCoolSec % 60;[cite: 3]
                
                const formattedM = coolM.toString().padStart(2, '0');[cite: 3]
                const formattedS = coolS.toString().padStart(2, '0');[cite: 3]

                textElement.innerHTML = `💥 蘑菇已被摧毀！新菇倒數：<strong style="color:#e11d48;">${formattedM}分${formattedS}秒</strong>`;[cite: 3]

                // 🔔 【新菇倒數剩 60 秒提醒】
                if (cooldownMsLeft <= 60000 && alertEnabledList.includes(id) && !notifiedMushrooms.includes(`${id}_born_1m`)) {[cite: 3]
                    notifiedMushrooms.push(`${id}_born_1m`);[cite: 3]
                    
                    if (Notification.permission === "granted") {[cite: 3]
                        new Notification(`⏳ 新蘑菇即將出生！倒數 1 分鐘`, {[cite: 3]
                            body: `📍 ${item.locationName} 的新蘑菇倒數剩 60 秒，準備搶位置囉！`,[cite: 3]
                            icon: getIconPath(displayType),[cite: 3]
                            requireInteraction: true[cite: 3]
                        });
                    }
                }

                // 🔔 【新菇剛出生提醒】
                if (cooldownMsLeft <= 0 && alertEnabledList.includes(id) && !notifiedMushrooms.includes(`${id}_born`)) {[cite: 3]
                    notifiedMushrooms.push(`${id}_born`);[cite: 3]
                    
                    if (Notification.permission === "granted") {[cite: 3]
                        new Notification(`✨ 新蘑菇已出生！`, {[cite: 3]
                            body: `📍 ${item.locationName} 的新蘑菇已出生，請現場玩家協助回報！`,[cite: 3]
                            icon: getIconPath(displayType)[cite: 3]
                        });
                    }
                }

            } else {
                textElement.innerHTML = `✨ 新蘑菇已出生！待現場玩家更新`;[cite: 3]
                textElement.style.color = "#059669";[cite: 3]
            }
        });
    }

    window.togglePin = (id) => {[cite: 3]
        const index = pinnedList.indexOf(id);[cite: 3]
        if (index > -1) pinnedList.splice(index, 1);[cite: 3]
        else pinnedList.push(id);[cite: 3]
        localStorage.setItem("pinned_mushrooms", JSON.stringify(pinnedList));[cite: 3]
        renderBoard();[cite: 3]
    };

    window.toggleHistoryPanel = (id) => {[cite: 3]
        if (!activePanels[id]) activePanels[id] = { edit: false, history: false };[cite: 3]
        activePanels[id].history = !activePanels[id].history;[cite: 3]
        renderBoard();[cite: 3]
    };

    window.toggleEditPanel = (id) => {[cite: 3]
        if (!activePanels[id]) activePanels[id] = { edit: false, history: false };[cite: 3]
        const willOpen = !activePanels[id].edit;[cite: 3]
        activePanels[id].edit = willOpen;[cite: 3]
        renderBoard();[cite: 3]

        if (willOpen && localMushroomsData[id]) {[cite: 3]
            const item = localMushroomsData[id];[cite: 3]
            if (item.timeReported) {[cite: 3]
                const totalReportedMs = ((item.timeReported.hours * 3600) + (item.timeReported.minutes * 60) + (item.timeReported.seconds || 0)) * 1000;[cite: 3]
                const expireTime = (item.createdAt || Date.now()) + totalReportedMs;[cite: 3]
                const msLeft = expireTime - Date.now();[cite: 3]

                let h = 0, m = 0, s = 0;[cite: 3]
                if (msLeft > 0) {[cite: 3]
                    const totalSec = Math.floor(msLeft / 1000);[cite: 3]
                    h = Math.floor(totalSec / 3600);[cite: 3]
                    m = Math.floor((totalSec % 3600) / 60);[cite: 3]
                    s = totalSec % 60;[cite: 3]
                }

                setTimeout(() => {[cite: 3]
                    const hInput = document.getElementById(`edit-h-${id}`);[cite: 3]
                    const mInput = document.getElementById(`edit-m-${id}`);[cite: 3]
                    const sInput = document.getElementById(`edit-s-${id}`);[cite: 3]

                    if (hInput) hInput.value = h;[cite: 3]
                    if (mInput) mInput.value = m;[cite: 3]
                    if (sInput) sInput.value = s;[cite: 3]
                }, 50);[cite: 3]
            }
        }
    };

    window.saveStatusEdit = (id) => {[cite: 3]
        if (!window.fbDB) return;[cite: 3]
        const players = parseInt(document.getElementById(`edit-players-${id}`).value) || 0;[cite: 3]
        const h = parseInt(document.getElementById(`edit-h-${id}`).value) || 0;[cite: 3]
        const m = parseInt(document.getElementById(`edit-m-${id}`).value) || 0;[cite: 3]
        const s = parseInt(document.getElementById(`edit-s-${id}`).value) || 0;[cite: 3]

        const now = Date.now();[cite: 3]
        window.fbUpdate(window.fbRef(window.fbDB, `mushrooms/${id}`), {[cite: 3]
            currentPlayers: players,[cite: 3]
            timeReported: { hours: h, minutes: m, seconds: s },[cite: 3]
            createdAt: now, updatedAt: now[cite: 3]
        }).then(() => {
            if (activePanels[id]) activePanels[id].edit = false;[cite: 3]
            alert("💾 狀態更新成功！");[cite: 3]
            renderBoard();[cite: 3]
        });
    };

    window.toggleAlert = (id) => {[cite: 3]
        if (!("Notification" in window)) {[cite: 3]
            alert("您的瀏覽器不支援桌面通知功能！");[cite: 3]
            return;[cite: 3]
        }

        const index = alertEnabledList.indexOf(id);[cite: 3]
        if (index > -1) {[cite: 3]
            alertEnabledList.splice(index, 1);[cite: 3]
            localStorage.setItem("mushroom_alerts_enabled", JSON.stringify(alertEnabledList));[cite: 3]
            renderBoard();[cite: 3]
        } else {
            Notification.requestPermission().then(permission => {[cite: 3]
                if (permission === "granted") {[cite: 3]
                    alertEnabledList.push(id);[cite: 3]
                    localStorage.setItem("mushroom_alerts_enabled", JSON.stringify(alertEnabledList));[cite: 3]
                    
                    new Notification("🔔 蘑菇倒數提醒已開啟", {[cite: 3]
                        body: "當此蘑菇即將重生時，系統會發送通知提醒您！",[cite: 3]
                        icon: "picture/mushroom_monthly_special.png"[cite: 3]
                    });

                    renderBoard();[cite: 3]
                } else {
                    alert("請在瀏覽器設定中「允許」本網站發送通知，才能正常開啟提醒功能喔！");[cite: 3]
                }
            });
        }
    };

    window.handleFastFill = (encodedData) => {[cite: 3]
        try {
            const data = JSON.parse(decodeURIComponent(encodedData));[cite: 3]
            
            const citySelect = document.getElementById("city");[cite: 3]
            const distSelect = document.getElementById("district");[cite: 3]
            const locInput = document.getElementById("location-name");[cite: 3]
            const latInput = document.getElementById("lat");[cite: 3]
            const lngInput = document.getElementById("lng");[cite: 3]

            // 1. 帶入地點名稱
            if (locInput) locInput.value = data.locationName || "";[cite: 3]

            // 2. 帶入經緯度（若有）
            if (latInput) latInput.value = data.lat || "";[cite: 3]
            if (lngInput) lngInput.value = data.lng || "";[cite: 3]

            // 3. 帶入縣市並觸發 change 事件以更新行政區清單
            if (citySelect && data.city) {[cite: 3]
                citySelect.value = data.city;[cite: 3]
                citySelect.dispatchEvent(new Event("change"));[cite: 3]
            }

            // 4. 等待行政區下拉選單生成完畢後帶入行政區
            setTimeout(() => {
                if (distSelect && data.district) {[cite: 3]
                    distSelect.disabled = false;[cite: 3]
                    
                    let matchedOpt = Array.from(distSelect.options).find(o => 
                        o.value === data.district || o.text.includes(data.district)[cite: 3]
                    );
                    
                    if (matchedOpt) {[cite: 3]
                        distSelect.value = matchedOpt.value;[cite: 3]
                    } else if (distSelect.options.length > 1) {[cite: 3]
                        distSelect.value = data.district;[cite: 3]
                    }
                    distSelect.dispatchEvent(new Event("change"));[cite: 3]
                }
            }, 120);

            // 5. 滑動至上方表單區塊
            document.querySelector(".report-section")?.scrollIntoView({ behavior: "smooth" });[cite: 3]

        } catch (e) { 
            console.error("快速帶入失敗:", e);  [cite: 3]
        }
    };

    function forceInitFilter() {
        if (!initFilterDistricts()) {[cite: 3]
            const filterRetryInterval = setInterval(() => {[cite: 3]
                if (initFilterDistricts()) {[cite: 3]
                    clearInterval(filterRetryInterval);[cite: 3]
                }
            }, 50);[cite: 3]
        }
    }
    forceInitFilter();[cite: 3]

    const checkFbInterval = setInterval(() => {[cite: 3]
        if (window.fbDB) {[cite: 3]
            clearInterval(checkFbInterval);[cite: 3]
            startBoardSync();[cite: 3]
        }
    }, 150);[cite: 3]
});

// 📜 免責同意書多重 ID 抓取防呆
const disclaimerModal = document.getElementById("disclaimer-modal") 
                     || document.getElementById("terms-modal") 
                     || document.getElementById("agreement-modal")
                     || document.querySelector(".modal-overlay");[cite: 3]

const btnAcceptDisclaimer = document.getElementById("btn-accept-disclaimer") 
                         || document.getElementById("btn-agree") 
                         || document.getElementById("accept-btn");[cite: 3]

const hasAgreed = localStorage.getItem("has_agreed_disclaimer");[cite: 3]

if (!hasAgreed && disclaimerModal) {[cite: 3]
    disclaimerModal.style.display = "flex";[cite: 3]
}

if (btnAcceptDisclaimer) {[cite: 3]
    btnAcceptDisclaimer.addEventListener("click", () => {[cite: 3]
        localStorage.setItem("has_agreed_disclaimer", "true");[cite: 3]
        if (disclaimerModal) {[cite: 3]
            disclaimerModal.style.display = "none";[cite: 3]
        }
        
        const reportForm = document.getElementById("report-form");[cite: 3]
        if (reportForm && window.location.hash.includes('#菇')) {[cite: 3]
            reportForm.requestSubmit();[cite: 3]
        }
    });
}
