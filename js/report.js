// js/report.js

let map; 
let markerGroup; 
let userCurrentLat = null;  
let userCurrentLng = null;  

// 🍄 全站統一蘑菇名稱校正工具
function normalizeMushroomType(typeStr) {
    if (!typeStr) return '一般蘑菇';
    let normalized = String(typeStr).trim();

    if (
        normalized.includes("海泡泡") || 
        normalized.includes("特殊") || 
        normalized.includes("活動") || 
        normalized.includes("每月") ||
        normalized.includes("神秘")
    ) {
        return "每月特殊蘑菇";
    }

    normalized = normalized
        .replace(/巨型/g, '巨大')
        .replace(/普通/g, '一般')
        .replace(/小型/g, '小')
        .replace(/大型/g, '大');

    return normalized;
}

// 📊 計算字串相似度 (0 ~ 1)
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

// ⚡ 格式碼解析 (含全自動縣市/行政區補全與自動發佈)
function parseMushroomCode(code) {
    try {
        console.log("📥 執行捷徑解析，內容：", code);

        if (!code || !code.startsWith('#菇')) {
            alert('❌ 格式碼無效！格式應為：#菇,截圖時間,地點名稱,蘑菇種類,剩餘時間');
            return false;
        }

        const parts = code.trim().split(',');
        if (parts.length < 5) {
            alert('❌ 格式碼欄位不足！');
            return false;
        }

        let [prefix, rawPhotoTime, rawLocation, rawType, rawTime] = parts.map(p => p ? p.trim() : '');

        // 1. 計算時間差
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
        let matchedCity = null;
        let matchedDistrict = null;
        let highestScore = 0;

        if (typeof localMushroomsData !== 'undefined' && localMushroomsData) {
            Object.values(localMushroomsData).forEach(item => {
                if (item && item.locationName) {
                    const score = calculateSimilarity(cleanLocation, item.locationName);
                    if (score > highestScore && score >= 0.55) {
                        highestScore = score;
                        bestMatchedLocation = item.locationName;
                        matchedCity = item.city;
                        matchedDistrict = Array.isArray(item.district) ? item.district[0] : item.district;
                    }
                }
            });
        }

        // 3. 帶入與補全「縣市」與「行政區」（避免觸發瀏覽器下拉選單必填警告）
        const citySelect = document.getElementById("city");
        const distSelect = document.getElementById("district");

        if (citySelect) {
            // 如果地點資料庫有記錄到的縣市，帶入該縣市；否則預設帶入第一個有效縣市 (如 高雄市)
            citySelect.value = matchedCity || "高雄市";
            citySelect.dispatchEvent(new Event('change')); // 手動觸發 change 讓行政區產生選項
        }

        if (distSelect) {
            setTimeout(() => {
                if (matchedDistrict && Array.from(distSelect.options).some(o => o.value === matchedDistrict)) {
                    distSelect.value = matchedDistrict;
                } else if (distSelect.options.length > 1) {
                    distSelect.selectedIndex = 1; // 預設選擇第一個非預設的行政區
                }
                distSelect.dispatchEvent(new Event('change'));
            }, 100);
        }

        // 4. 帶入種類
        let cleanType = rawType.replace(/\s+/g, '');
        let finalType = normalizeMushroomType(cleanType);

        const typeSelect = document.getElementById('mushroom-type');
        if (typeSelect) {
            let matchedOption = Array.from(typeSelect.options).find(opt => 
                opt.value === finalType || opt.text.includes(finalType)
            );
            if (matchedOption) typeSelect.value = matchedOption.value;
            else typeSelect.value = "每月特殊蘑菇";
        }

        // 5. 解析剩餘時間並扣除時間差
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

        // 6. 填入地點與時間
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

        const playerInput = document.getElementById('current-players');
        if (playerInput) playerInput.value = 1;

        // 7. 🌟 關鍵修復：延遲 600ms 確保縣市與行政區下拉選單皆載入且選取成功後，再自動發佈！
        const reportForm = document.getElementById("report-form");
        if (reportForm) {
            setTimeout(() => {
                reportForm.requestSubmit();
            }, 600);
        }

        return true;
    } catch (err) {
        console.error("parseMushroomCode 錯誤：", err);
        return false;
    }
}

// 🟢 地圖初始化
function initLeafletMap() {
    try {
        const mapContainer = document.getElementById('map');
        if (!mapContainer || typeof L === 'undefined') return;
        map = L.map('map').setView([22.613, 120.316], 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap' }).addTo(map);
        markerGroup = L.layerGroup().addTo(map);
    } catch (error) { console.error(error); }
}

document.addEventListener("DOMContentLoaded", () => {
    initLeafletMap();

    const reportForm = document.getElementById("report-form");
    const mushroomBoard = document.getElementById("mushroom-board");

    let localMushroomsData = {};
    let pinnedList = JSON.parse(localStorage.getItem("pinned_mushrooms")) || [];

    window.setViewMode = function(mode) {
        if (!mushroomBoard) return;
        mushroomBoard.className = `board-container ${mode}-view`;
        localStorage.setItem("board_view_pref", mode);
        renderBoard();
    };

    if (reportForm) {
        reportForm.addEventListener("submit", (e) => {
            e.preventDefault();
            if (!window.fbDB) return alert("Firebase 尚未連線！");

            const cityEl = document.getElementById("city");
            const districtEl = document.getElementById("district");
            const city = (cityEl && cityEl.value && cityEl.value !== "") ? cityEl.value : "高雄市";
            const district = (districtEl && districtEl.value && districtEl.value !== "") ? districtEl.value : "前金區";

            const locationName = document.getElementById("location-name").value.trim();
            const type = normalizeMushroomType(document.getElementById("mushroom-type").value);
            const size = normalizeMushroomType(document.getElementById("mushroom-size").value);
            const players = parseInt(document.getElementById("current-players").value) || 1;

            const h = parseInt(document.getElementById("time-hours").value) || 0;
            const m = parseInt(document.getElementById("time-minutes").value) || 0;
            const s = parseInt(document.getElementById("time-seconds").value) || 0;

            const nowTimestamp = Date.now();

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
                createdAt: nowTimestamp, updatedAt: nowTimestamp
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
        if (!mushroomBoard) return;
        let htmlContent = "";

        if (keys.length === 0) {
            mushroomBoard.innerHTML = '<p class="loading-text">目前沒有即時情報，快去發佈第一個吧！</p>';
            return;
        }

        keys.forEach(id => {
            const item = localMushroomsData[id];
            const displayType = normalizeMushroomType(item.type);
            const displaySize = normalizeMushroomType(item.size);
            const dynamicImgSrc = getIconPath(displayType);

            htmlContent += `
                <div class="mushroom-card" data-id="${id}" id="card-${id}">
                    <div class="card-header">
                        <img src="${dynamicImgSrc}" class="shroom-img" alt="${displayType}">
                        <div class="shroom-info">
                            <h4>[${displaySize}] ${displayType}</h4>
                            <span style="font-size:12px; color:#666;">📍 ${item.city || ''} - ${item.locationName}</span>
                        </div>
                    </div>
                    <div class="card-body">
                        <p style="margin:4px 0;">👥 參戰人數：<strong>${item.currentPlayers || 0} / ${item.maxPlayers || 30}</strong> 人</p>
                        <p class="countdown-text" id="time-text-${id}" style="margin:4px 0;">⏳ 計算時間中...</p>
                    </div>
                </div>
            `;
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

    const checkFbInterval = setInterval(() => {
        if (window.fbDB) {
            clearInterval(checkFbInterval);
            startBoardSync();
        }
    }, 150);
});
