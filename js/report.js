// js/report.js

document.addEventListener("DOMContentLoaded", () => {
    const reportForm = document.getElementById("report-form");
    const mushroomBoard = document.getElementById("mushroom-board");
    const mushroomSize = document.getElementById("mushroom-size");
    const currentPlayers = document.getElementById("current-players");
    
    // 切換視圖與篩選按鈕
    const btnGridView = document.getElementById("btn-grid-view");
    const btnListView = document.getElementById("btn-list-view");

    // 儲存目前從 Firebase 撈出來的所有蘑菇原始資料
    let localMushroomsData = {};
    // 存放本機釘選清單 [id, id, ...]
    let pinnedList = JSON.parse(localStorage.getItem("pinned_mushrooms")) || [];

    // --- F4: 參戰人數動態限制 ---
    if (mushroomSize && currentPlayers) {
        mushroomSize.addEventListener("change", () => {
            const size = mushroomSize.value;
            // 巨大蘑菇上限可能為 5 或 20 (活動)，此處以常規大型/巨大作動態示範
            if (size === "小型" || size === "普通") {
                currentPlayers.max = 5;
            } else {
                currentPlayers.max = 5; // 基礎常規皆為 5 人
            }
            if (parseInt(currentPlayers.value) > parseInt(currentPlayers.max)) {
                currentPlayers.value = currentPlayers.max;
            }
        });
    }

    // --- 偏好設定：網格/清單切換與持久化 ---
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

    // --- F3: 蘑菇情報發佈 (寫入 Firebase) ---
    if (reportForm) {
        reportForm.addEventListener("submit", (e) => {
            e.preventDefault();
            
            // 確保 Firebase 已經初始化完成
            if (!window.fbDB) {
                alert("Firebase 尚未就緒，請檢查連線與配置。");
                return;
            }

            const city = document.getElementById("city").value;
            const district = document.getElementById("district").value;
            const locationName = document.getElementById("location-name").value;
            const type = document.getElementById("mushroom-type").value;
            const size = mushroomSize.value;
            const players = parseInt(currentPlayers.value);
            const hours = parseInt(document.getElementById("time-hours").value) || 0;
            const minutes = parseInt(document.getElementById("time-minutes").value) || 0;
            const seconds = parseInt(document.getElementById("time-seconds").value) || 0;

            // 依種類指派 picture/ 資料夾對應的圖片
            let iconPath = "picture/mushroom_normal.png"; 
            if (type.includes("火")) iconPath = "picture/mushroom_fire.png";
            if (type.includes("水")) iconPath = "picture/mushroom_water.png";
            if (type.includes("水晶")) iconPath = "picture/mushroom_crystal.png";
            if (type.includes("毒")) iconPath = "picture/mushroom_poison.png";

            const nowTimestamp = Date.now();

            const newMushroom = {
                city,
                district,
                locationName,
                type,
                size,
                mushroomIcon: iconPath,
                currentPlayers: players,
                maxPlayers: 5,
                timeReported: { hours, minutes, seconds },
                createdAt: nowTimestamp,
                updatedAt: nowTimestamp
            };

            // 推送到 Firebase
            const shroomRef = window.fbRef(window.fbDB, "mushrooms");
            window.fbPush(shroomRef, newMushroom)
                .then(() => {
                    reportForm.reset();
                    // 行政區重新鎖定防呆
                    document.getElementById("district").disabled = true;
                    alert("🎉 情報發佈成功！");
                })
                .catch((error) => alert("發佈失敗：" + error.message));
        });
    }

    // --- F5: 即時看板監聽與定時倒數渲染 ---
    function startBoardSync() {
        if (!window.fbDB || !mushroomBoard) return;

        const shroomRef = window.fbRef(window.fbDB, "mushrooms");
        window.fbOnValue(shroomRef, (snapshot) => {
            const data = snapshot.val();
            localMushroomsData = data || {};
            renderBoard();
        });

        // 每秒執行一次，讓全網頁的所有卡片倒數秒數即時跳動
        setInterval(renderBoard, 1000);
    }

    function renderBoard() {
        if (!mushroomBoard) return;
        
        let htmlContent = "";
        const keys = Object.keys(localMushroomsData);

        if (keys.length === 0) {
            mushroomBoard.innerHTML = '<p class="loading-text">目前沒有即時情報，快去發佈第一個吧！</p>';
            return;
        }

        // 依據是否釘選排序，把有釘選的往前排
        keys.sort((a, b) => {
            const aPinned = pinnedList.includes(a) ? 1 : 0;
            const bPinned = pinnedList.includes(b) ? 1 : 0;
            return bPinned - aPinned; 
        });

        keys.forEach(id => {
            const item = localMushroomsData[id];
            
            // 計算時間差
            const totalReportedMs = ((item.timeReported.hours * 3600) + (item.timeReported.minutes * 60) + item.timeReported.seconds) * 1000;
            const expireTime = item.createdAt + totalReportedMs;
            const msLeft = expireTime - Date.now();

            let timeString = "";
            let statusClass = "countdown-text";

            if (msLeft > 0) {
                // 正常倒數階段
                const totalSec = Math.floor(msLeft / 1000);
                const h = Math.floor(totalSec / 3600);
                const m = Math.floor((totalSec % 3600) / 60);
                const s = totalSec % 60;
                timeString = `⏳ 剩餘時間：${h}時${m}分${s}秒`;
            } else {
                // 進入重生緩衝期 (超過原本時間，5分鐘內，即 300000 毫秒)
                const bufferLeft = 300000 + msLeft; 
                if (bufferLeft > 0) {
                    const totalSec = Math.floor(bufferLeft / 1000);
                    const m = Math.floor(totalSec / 60);
                    const s = totalSec % 60;
                    timeString = `🔄 下次出現倒數：${m}分${s}秒`;
                    statusClass = "countdown-text buffer-period"; // 轉為紅色
                } else {
                    // 超過 5 分鐘，直接隱藏或不渲染該卡片（此處選擇不顯示過期情報）
                    return;
                }
            }

            const isPinned = pinnedList.includes(id) ? "pinned" : "";
            const pinBtnText = pinnedList.includes(id) ? "⭐ 已釘選" : "📌 釘選";

            // 組裝 HTML 卡片字串
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

        mushroomBoard.innerHTML = htmlContent || '<p class="loading-text">目前情報皆已過期。</p>';
    }

    // 處理全域釘選功能
    window.togglePin = (id) => {
        const index = pinnedList.indexOf(id);
        if (index > -1) {
            pinnedList.splice(index, 1);
        } else {
            pinnedList.push(id);
        }
        localStorage.setItem("pinned_mushrooms", JSON.stringify(pinnedList));
        renderBoard();
    };

    // 處理快速更新人數功能 (F7 互動)
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

    // 啟動 Firebase 同步監聽
    // 透過定時檢查確認 fbDB 變數是否掛載至全域
    const checkFbInterval = setInterval(() => {
        if (window.fbDB) {
            clearInterval(checkFbInterval);
            startBoardSync();
        }
    }, 200);
});
