// js/admin-backend.js

document.addEventListener("DOMContentLoaded", () => {
    const adminLogin = document.getElementById("admin-login");
    const adminDashboard = document.getElementById("admin-dashboard");
    const adminPassword = document.getElementById("admin-password");
    const btnLogin = document.getElementById("btn-login");
    const btnLogout = document.getElementById("btn-logout");
    const tableBody = document.getElementById("admin-table-body");

    // 🔒 簡單的安全防護：你可以自行修改下方的 'pikmin888' 為你想設定的後台密碼
    const MASTER_PASSWORD = "pikmin888"; 

    // 檢查瀏覽器是否保持登入狀態
    if (sessionStorage.getItem("admin_authenticated") === "true") {
        showDashboard();
    }

    // 登入驗證
    if (btnLogin) {
        btnLogin.addEventListener("click", () => {
            if (adminPassword.value === MASTER_PASSWORD) {
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
        startAdminSync(); // 開始監聽 Firebase
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

        // 按建立時間由新到舊排序
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

    // 🗑️ 核心管理功能：一鍵將特定蘑菇從 Firebase 實時資料庫永久下架
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
