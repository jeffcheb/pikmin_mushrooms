// js/admin-backend.js

document.addEventListener("DOMContentLoaded", () => {
    const adminLogin = document.getElementById("admin-login");
    const adminDashboard = document.getElementById("admin-dashboard");
    const adminPassword = document.getElementById("admin-password");
    const btnLogin = document.getElementById("btn-login");
    const btnLogout = document.getElementById("btn-logout");
    const tableBody = document.getElementById("admin-table-body");
    
    // 🌟 新增：取得後台搜尋框元件
    const adminSearch = document.getElementById("admin-search");

    // 全域變數，用來暫存從 Firebase 撈出來的原始資料，方便搜尋時過濾
    let rawMushroomsData = {};

    const HASHED_PASSWORD_HEX = "109827b3add23b5080c647208e766d61d61760f1a47135d5252405bb134553ac"; 

    async function sha256(message) {
        const msgBuffer = new TextEncoder().encode(message);                    
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    if (sessionStorage.getItem("admin_authenticated") === "true") {
        showDashboard();
    }

    if (btnLogin) {
        btnLogin.addEventListener("click", async () => {
            const inputPassword = adminPassword.value;
            const inputHashed = await sha256(inputPassword);

            if (inputHashed === HASHED_PASSWORD_HEX) {
                sessionStorage.setItem("admin_authenticated", "true");
                showDashboard();
            } else {
                alert("❌ 密碼錯誤，拒絕存取！");
                adminPassword.value = "";
            }
        });
    }

    if (btnLogout) {
        btnLogout.addEventListener("click", () => {
            sessionStorage.removeItem("admin_authenticated");
            window.location.reload();
        });
    }

    function showDashboard() {
        if (!adminLogin || !adminDashboard) return;
        adminLogin.style.display = "none";
        adminDashboard.style.display = "block";
        startAdminSync(); 
    }

    function startAdminSync() {
        const checkFb = setInterval(() => {
            if (window.fbDB && window.fbRef && window.fbOnValue) {
                clearInterval(checkFb);
                
                const shroomRef = window.fbRef(window.fbDB, "mushrooms");
                window.fbOnValue(shroomRef, (snapshot) => {
                    // 🌟 核心變更：把資料存到全域變數中
                    rawMushroomsData = snapshot.val() || {};
                    renderAdminTable(); // 執行渲染
                });
            }
        }, 100);

        // 🌟 新增：監聽搜尋框打字事件（即時觸發過濾）
        adminSearch?.addEventListener("input", () => {
            renderAdminTable();
        });
    }

    // 🌟 升級：支援關鍵字搜尋的渲染函式
    function renderAdminTable() {
        if (!tableBody) return;
        const keys = Object.keys(rawMushroomsData);
        const keyword = adminSearch?.value.trim().toLowerCase() || ""; // 取得搜尋關鍵字

        if (keys.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:#95a5a6;">📭 目前雲端資料庫沒有任何蘑菇數據。</td></tr>`;
            return;
        }

        keys.sort((a, b) => (rawMushroomsData[b].createdAt || 0) - (rawMushroomsData[a].createdAt || 0));

        let html = "";
        let matchCount = 0;

        keys.forEach(id => {
            const item = rawMushroomsData[id];
            
            // 🌟 搜尋過濾邏輯：檢查 種類、大小、城市、行政區、具體地點 是否包含關鍵字
            if (keyword !== "") {
                const matchType = item.type.toLowerCase().includes(keyword);
                const matchSize = item.size.toLowerCase().includes(keyword);
                const matchCity = item.city.toLowerCase().includes(keyword);
                const matchDist = item.district.toLowerCase().includes(keyword);
                const matchLoc = item.locationName.toLowerCase().includes(keyword);
                
                // 如果通通都不符合，就跳過這筆資料不渲染
                if (!matchType && !matchSize && !matchCity && !matchDist && !matchLoc) return;
            }

            matchCount++;
            const date = new Date(item.createdAt || Date.now());
            const timeStr = `${date.getMonth()+1}/${date.getDate()} ${date.getHours().toString().padStart(2,'0')}:${date.getMinutes().toString().padStart(2,'0')}`;

            html += `
                <tr>
                    <td>
                        <img src="${item.mushroomIcon || 'picture/mushroom_monthly_special.png'}" class="shroom-thumb">
                        <strong>${item.type}</strong>
                    </td>
                    <td>${item.size}</td>
                    <td>📍 ${item.city}${item.district}</td>
                    <td>${item.locationName}</td>
                    <td>👤 ${item.currentPlayers} / ${item.maxPlayers || 30} 人</td>
                    <td>${timeStr}</td>
                    <td>
                        <button class="btn-delete" onclick="deleteMushroomData('${id}')">🗑️ 刪除</button>
                    </td>
                </tr>
            `;
        });

        // 如果有總資料，但搜尋完後一筆都沒對上
        if (matchCount === 0 && keyword !== "") {
            tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:#e74c3c;">🔍 找不到任何符合關鍵字「${keyword}」的蘑菇資料。</td></tr>`;
        } else {
            tableBody.innerHTML = html;
        }
    }

    window.deleteMushroomData = (id) => {
        if (!window.fbDB || !window.fbRef || !window.fbRemove) {
            alert("Firebase 核心模組尚未就緒。");
            return;
        }

        if (confirm("⚠️ 您確定要永久刪除此筆蘑菇情報嗎？刪除後前端看板將同步消失且無法復原。")) {
            const targetRef = window.fbRef(window.fbDB, `mushrooms/${id}`);
            window.fbRemove(targetRef)
                .then(() => alert("🗑️ 資料已成功從雲端清除！"))
                .catch(err => alert("刪除失敗：" + err.message));
        }
    };
});
