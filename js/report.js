// js/report.js

document.addEventListener("DOMContentLoaded", () => {
    const reportForm = document.getElementById("report-form");
    const mushroomBoard = document.getElementById("mushroom-board");
    const mushroomSize = document.getElementById("mushroom-size");
    const currentPlayers = document.getElementById("current-players");
    
    // 看板控制與篩選元素
    const btnGridView = document.getElementById("btn-grid-view");
    const btnListView = document.getElementById("btn-list-view");
    const searchKeyword = document.getElementById("search-keyword");
    const filterCity = document.getElementById("filter-city");
    const filterDistrict = document.getElementById("filter-district");
    const btnAutoLocation = document.getElementById("btn-auto-location");

    let localMushroomsData = {};
    let pinnedList = JSON.parse(localStorage.getItem("pinned_mushrooms")) || [];

    // --- F4: 參戰人數動態限制 ---
    if (mushroomSize && currentPlayers) {
        mushroomSize.addEventListener("change", () => {
            const size = mushroomSize.value;
            currentPlayers.max = 5; 
            if (parseInt(currentPlayers.value) > parseInt(currentPlayers.max)) {
                currentPlayers.value = currentPlayers.max;
            }
        });
    }

    // --- 偏好設定：網格/清單切換 ---
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
    // 🌍 看板功能：即時看板「全台行政區篩選選單」初始化與連動
    // ========================================================
    function initFilterDistricts() {
        if (!filterCity || !filterDistrict || !window.taiwanData) return;

        // 將全台縣市塞入看板篩選器
        Object.keys(window.taiwanData).forEach(city => {
            const option = document.createElement("option");
            option.value = city;
            option.textContent = city;
            filterCity.appendChild(option);
        });

        // 監聽看板篩選器的縣市切換
        filterCity.addEventListener("change", () => {
            const selectedCity = filterCity.value;
            
            filterDistrict.innerHTML = '<option value="all">所有行政區</option>';
            
            if (selectedCity === "all") {
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
            renderBoard(); // 切換篩選，即時重新渲染看板
        });

        filterDistrict.addEventListener("change", renderBoard);
        searchKeyword?.addEventListener("input", renderBoard);
    }

    // ========================================================
    // 🎯 定位功能：地理位置自動定位功能 (GPS 經緯度逆查縣市行政區)
    // ========================================================
    if (btnAutoLocation) {
        btnAutoLocation.addEventListener("click", () => {
            if (!navigator.geolocation) {
                alert("您的瀏覽器不支援地理定位功能。");
                return;
            }

            btnAutoLocation.textContent = "⌛ 定位中";
            
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    const lat = position.coords.latitude;
                    const lon = position.coords.longitude;

                    // 🔍 請在 js/report.js 中，將 try { ... } 裡面的 fetch 換成這個 100% 穩定的版本：

try {
    // 更換為對前端網頁極度友善、不鎖 GitHub Pages 的開源地理逆查服務
    const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&accept-language=zh-TW`,
        {
            headers: {
                // 模擬成一般行動裝置瀏覽器發出請求，繞過伺服器的網域封鎖
                'User-Agent': 'Mozilla/5.0 (Linux; Android 10; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.0.0 Mobile Safari/537.36'
            }
        }
    );
    
    // 💡 備援機制：如果上面的 Nominatim 還是斷線，立刻啟用第二備用 API
    let data;
    if (!response.ok) {
        console.warn("主要定位伺服器繁忙，啟動備用定位機制...");
        const backupRes = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=zh`);
        data = await backupRes.json();
        
        // 備用 API 的資料欄位解析
        if (data) {
            let detectCity = (data.principalSubdivision || "").replace("臺", "台");
            let detectDistrict = (data.locality || "").replace("臺", "台");
            
            let foundCity = Object.keys(window.taiwanData).find(c => detectCity.includes(c) || c.includes(detectCity));
            if (foundCity) {
                filterCity.value = foundCity;
                filterCity.dispatchEvent(new Event('change'));
                let foundDist = window.taiwanData[foundCity].find(d => detectDistrict.includes(d) || d.includes(detectDistrict));
                if (foundDist) filterDistrict.value = foundDist;
                
                alert(`🎯 定位成功(備用通道)：已自動切換至【${foundCity} ${filterDistrict.value}】`);
                renderBoard();
                return; // 成功後直接結束
            }
        }
        throw new Error("雙通道定位皆失敗");
    } else {
        data = await response.json();
    }
    
    // --- 底下原本處理主 API data.address 的舊邏輯保持不變 ---
    if (data && data.address) {
        const city = data.address.city || data.address.town || data.address.county || "";
        const suburb = data.address.suburb || data.address.district || data.address.village || "";

        let detectCity = city.replace("臺", "台");
        let detectDistrict = suburb.replace("臺", "台");

        let foundCity = Object.keys(window.taiwanData).find(c => detectCity.includes(c));
        
        if (foundCity) {
            filterCity.value = foundCity;
            filterCity.dispatchEvent(new Event('change'));

            let foundDist = window.taiwanData[foundCity].find(d => detectDistrict.includes(d) || d.includes(detectDistrict));
            if (foundDist) {
                filterDistrict.value = foundDist;
            }
            
            alert(`🎯 定位成功：已自動為您切換至【${foundCity} ${filterDistrict.value}】`);
            renderBoard(); 
        } else {
            alert(`雖然定位成功，但找不到對應的台灣縣市名（偵測到：${detectCity}），請手動選取。`);
        }
    }
} catch (err) {
    console.error(err);
    alert("📢 定位伺服器目前過載，已為您重置。請改用手動下拉選單選擇行政區！");
}
                    } catch (err) {
                        console.error(err);
                        alert("連線到定位逆查伺服器失敗，請手動選擇。");
                    } finally {
                        btnAutoLocation.textContent = "🎯 定位";
                    }
                },
                (error) => {
                    btnAutoLocation.textContent = "🎯 定位";
                    switch(error.code) {
                        case error.PERMISSION_DENIED:
                            alert("請允許網頁獲取您的 GPS 位置權限才能使用自動定位功能。");
                            break;
                        default:
                            alert("無法取得您的位置資訊。");
                    }
                },
                { enableHighAccuracy: true, timeout: 5000 }
            );
        });
    }

    // --- F3: 蘑菇情報發佈 (寫入 Firebase) ---
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

            // 🌟 精準圖片指派邏輯 (包含普通、元素、當月特殊菇)
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

    // --- F5: 即時看板監聽與渲染 ---
    function startBoardSync() {
        if (!window.fbDB || !mushroomBoard) return;
        const shroomRef = window.fbRef(window.fbDB, "mushrooms");
        window.fbOnValue(shroomRef, (snapshot) => {
            localMushroomsData = snapshot.val() || {};
            renderBoard();
        });
        setInterval(renderBoard, 1000); // 每秒觸發一次以更新倒數秒數
    }

    function renderBoard() {
        if (!mushroomBoard) return;
        
        let htmlContent = "";
        const keys = Object.keys(localMushroomsData);

        // 撈取篩選與搜尋欄位數值
        const cityFilter = filterCity?.value || "all";
        const distFilter = filterDistrict?.value || "all";
        const keyword = searchKeyword?.value.trim().toLowerCase() || "";

        if (keys.length === 0) {
            mushroomBoard.innerHTML = '<p class="loading-text">目前沒有即時情報，快去發佈第一個吧！</p>';
            return;
        }

        // 依據是否釘選權重排序
        keys.sort((a, b) => {
            const aPinned = pinnedList.includes(a) ? 1 : 0;
            const bPinned = pinnedList.includes(b) ? 1 : 0;
            return bPinned - aPinned; 
        });

        let renderedCount = 0;

        keys.forEach(id => {
            const item = localMushroomsData[id];
            
            // 🔍 進行條件篩選
            // ========================================================
// 🎯 👉 進階修改：支援跨行政區可見的模糊比對篩選
// ========================================================
if (cityFilter !== "all" && item.city !== cityFilter) return;

if (distFilter !== "all") {
    // 檢查一：回報時選定的主行政區是否相符
    const matchPrimaryDistrict = item.district === distFilter;
    
    // 檢查二：具體地點名稱是否有提及該行政區 (例如名稱打：捷運站-大安/信義交界)
    const matchLocationText = item.locationName.includes(distFilter);
    
    // 只要主行政區符合，或者地點名稱有提到，就代表該區玩家看得到！
    if (!matchPrimaryDistrict && !matchLocationText) return;
}
// ========================================================
            if (keyword !== "") {
                const matchLocation = item.locationName.toLowerCase().includes(keyword);
                const matchType = item.type.toLowerCase().includes(keyword);
                if (!matchLocation && !matchType) return;
            }

            // 計算精準時間倒數
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
                const bufferLeft = 300000 + msLeft; // 5分鐘重生緩衝 (300,000 毫秒)
                if (bufferLeft > 0) {
                    const totalSec = Math.floor(bufferLeft / 1000);
                    const m = Math.floor(totalSec / 60);
                    const s = totalSec % 60;
                    timeString = `🔄 下次出現倒數：${m}分${s}秒`;
                    statusClass = "countdown-text buffer-period"; // 變為紅色樣式
                } else {
                    return; // 超過緩衝期，過期不予渲染
                }
            }

            renderedCount++;
            const isPinned = pinnedList.includes(id) ? "pinned" : "";
            const pinBtnText = pinnedList.includes(id) ? "⭐ 已釘選" : "📌 📌 釘選";

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
                        <p>👥 👥 參戰人數：<strong>${item.currentPlayers} / ${item.maxPlayers}</strong> 人</p>
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

    // 確保 Firebase、全台行政區字典都成功載入後，再行掛載核心功能
    const checkFbInterval = setInterval(() => {
        if (window.fbDB && window.taiwanData) {
            clearInterval(checkFbInterval);
            initFilterDistricts(); 
            startBoardSync();      
        }
    }, 200);
});
