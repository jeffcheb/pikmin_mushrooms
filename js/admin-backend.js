// js/admin-backend.js

document.addEventListener("DOMContentLoaded", () => {
    const adminLogin = document.getElementById("admin-login");
    const adminDashboard = document.getElementById("admin-dashboard");
    const adminPassword = document.getElementById("admin-password");
    const btnLogin = document.getElementById("btn-login");
    const btnLogout = document.getElementById("btn-logout");
    const tableBody = document.getElementById("admin-table-body");

    const HASHED_PASSWORD_HEX = "96df8f747065961d199f1fa0e791b0f023db8cc7c69992fdd1d86bebf41c1a2e"; 

    // 🛠️ 輔助函式：將字串轉為 SHA-256 雜湊碼
    async function sha256(message) {
        const msgBuffer = new TextEncoder().encode(message);                    
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    // 檢查瀏覽器是否保持登入狀態
    if (sessionStorage.getItem("admin_authenticated") === "true") {
        showDashboard();
    }

    // 登入驗證（非同步處理加密比對）
    if (btnLogin) {
        btnLogin.addEventListener("click", async () => {
            const inputPassword = adminPassword.value;
            // 將使用者輸入的密碼即時加密
            const inputHashed = await sha256(inputPassword);

            // 比對兩邊的加密代號是否一致
            if (inputHashed === HASHED_PASSWORD_HEX) {
                sessionStorage.setItem("admin_authenticated", "true");
                showDashboard();
            } else {
                alert("❌ 密碼錯誤，拒絕存取！");
                adminPassword.value = "";
            }
        });
    }

    // 登出系統
    if (btnLogout) {
        btnLogout.addEventListener("click", () => {
            sessionStorage.removeItem("admin_authenticated");
            window.location.reload();
        });
    }

    function showDashboard() {
        if (!adminLogin || !adminDashboard) return;
        adminLogin.style.display = "none";
        adminDashboard.style.style.display = "block";
        startAdminSync(); 
    }

    // 🔄 實時監聽 Firebase 並渲染後台表格
    function startAdminSync() {
        const checkFb = setInterval(() => {
            if (window.fbDB && window.fbRef && window.fbOnValue) {
                clearInterval(checkFb);
                
                const shroomRef = window.fbRef(window.fbDB, "mushrooms");
                window.fbOnValue(shroomRef, (snapshot) => {
                    const data = snapshot.val() || {};
                    renderAdminTable(data);
                });
            }
        }, 100);
    }

    function renderAdminTable(data) {
        if (!tableBody) return;
        const keys = Object.keys(data);

        if (keys.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:#95a5a6;">📭 目前雲端資料庫沒有任何蘑菇數據。</td></tr>`;
            return;
        }

        keys.sort((a, b) => (data[b].createdAt || 0) - (data[a].createdAt || 0));

        let html = "";
        keys.forEach(id => {
            const item = data[id];
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
        tableBody.innerHTML = html;
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
