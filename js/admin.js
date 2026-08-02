// js/admin.js

let mushroomsData = {};

// 🟢 初始化頁面與側邊欄切換
function showSection(sectionName) {
    document.querySelectorAll('.admin-section').forEach(s => s.style.display = 'none');
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.getElementById(`section-${sectionName}`).style.display = 'block';
    event.currentTarget.classList.add('active');
}

// 🟢 監聽 Firebase 數據同步
function initAdminSync() {
    if (!window.fbDB) return;

    // 1. 監聽蘑菇資料
    window.fbOnValue(window.fbRef(window.fbDB, "mushrooms"), (snapshot) => {
        mushroomsData = snapshot.val() || {};
        renderAdminDashboard();
        renderAnalytics();
    });

    // 2. 監聽黑名單
    window.fbOnValue(window.fbRef(window.fbDB, "blacklist"), (snapshot) => {
        renderBlacklist(snapshot.val() || {});
    });

    // 3. 監聽 Log (限制最近 50 筆)
    window.fbOnValue(window.fbQuery(window.fbRef(window.fbDB, "audit_logs"), window.fbLimitToLast(50)), (snapshot) => {
        renderLogs(snapshot.val() || {});
    });

    // 4. 在線人數監控 (Firebase 特殊節點)
    const onlineRef = window.fbRef(window.fbDB, ".info/connected");
    window.fbOnValue(onlineRef, (snap) => {
        if (snap.val() === true) {
            document.getElementById('stat-online').textContent = "🟢 連線中";
        }
    });
}

// 🟢 渲染數據分析 (Analytics)
function renderAnalytics() {
    const keys = Object.keys(mushroomsData);
    document.getElementById('stat-total').textContent = keys.length;
    
    // 今日更新統計
    const startOfToday = new Date();
    startOfToday.setHours(0,0,0,0);
    const todayCount = keys.filter(id => (mushroomsData[id].updatedAt || 0) >= startOfToday.getTime()).length;
    document.getElementById('stat-today').textContent = todayCount;

    // 種類分布統計 (簡單顯示)
    const typeCounts = {};
    keys.forEach(id => {
        const type = mushroomsData[id].type || "未知";
        typeCounts[type] = (typeCounts[type] || 0) + 1;
    });
    
    let typeHtml = "";
    Object.keys(typeCounts).forEach(type => {
        typeHtml += `<p>${type}: <strong>${typeCounts[type]}</strong></p>`;
    });
    document.getElementById('type-distribution').innerHTML = typeHtml;
}

// 🟢 渲染蘑菇列表與隱藏切換
function renderAdminDashboard() {
    const listBody = document.getElementById('admin-mushroom-list');
    listBody.innerHTML = "";

    Object.keys(mushroomsData).forEach(id => {
        const item = mushroomsData[id];
        const isHidden = item.status === 'hidden';
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><span class="status-badge ${isHidden ? 'hidden-status' : 'active-status'}">${isHidden ? '已隱藏' : '正常'}</span></td>
            <td>${item.locationName}</td>
            <td>${item.city}</td>
            <td>${item.type}</td>
            <td id="admin-time-${id}">計算中...</td>
            <td>
                <button class="btn-action" onclick="toggleVisibility('${id}', '${item.status || 'active'}')">
                    ${isHidden ? '👁️ 恢復' : '👁️‍🗨️ 隱藏'}
                </button>
                <button class="btn-action" style="background:#fee2e2; color:#991b1b;" onclick="deleteMushroom('${id}', '${item.locationName}')">🗑️</button>
            </td>
        `;
        listBody.appendChild(tr);
    });
}

// 👁️ 切換顯示/隱藏 (Soft Delete) + 寫入稽核 Log
window.toggleVisibility = (id, currentStatus) => {
    const newStatus = currentStatus === 'hidden' ? 'active' : 'hidden';
    window.fbUpdate(window.fbRef(window.fbDB, `mushrooms/${id}`), {
        status: newStatus,
        updatedAt: Date.now()
    }).then(() => {
        writeAuditLog("TOGGLE_VISIBILITY", `將據點 [${mushroomsData[id].locationName}] 設定為 ${newStatus}`);
    });
};

// 🗑️ 刪除據點
window.deleteMushroom = (id, name) => {
    if (!confirm(`確定要永久刪除 [${name}] 嗎？此動作無法復原。`)) return;
    window.fbRemove(window.fbRef(window.fbDB, `mushrooms/${id}`))
    .then(() => {
        writeAuditLog("DELETE_MUSHROOM", `永久刪除了據點 [${name}]`);
    });
};

// 📜 寫入稽核紀錄
function writeAuditLog(action, details) {
    const logData = {
        action: action,
        details: details,
        timestamp: Date.now(),
        admin: "AdminUser" // 之後可連動登入系統
    };
    window.fbPush(window.fbRef(window.fbDB, "audit_logs"), logData);
}

// 🧹 一鍵清理過期菇 (Batch Purge)
document.getElementById('btn-purge')?.addEventListener('click', () => {
    const now = Date.now();
    let purgeCount = 0;
    
    Object.keys(mushroomsData).forEach(id => {
        const item = mushroomsData[id];
        const totalMs = ((item.timeReported.hours * 3600) + (item.timeReported.minutes * 60)) * 1000;
        const expireTime = item.createdAt + totalMs;
        
        // 如果已經過期 (包含冷卻 5 分鐘) 超過 2 小時
        if (now - expireTime > (2 * 3600 * 1000 + 300000)) {
            window.fbRemove(window.fbRef(window.fbDB, `mushrooms/${id}`));
            purgeCount++;
        }
    });
    
    if (purgeCount > 0) {
        alert(`🧹 清理完成：已刪除 ${purgeCount} 筆過期據點。`);
        writeAuditLog("BATCH_PURGE", `執行了批次清理，刪除 ${purgeCount} 筆資料`);
    } else {
        alert("目前沒有可清理的過期資料。");
    }
});

// 黑名單與其他功能... (以此類推)

document.addEventListener("DOMContentLoaded", initAdminSync);
// 🔒 密碼驗證邏輯
window.verifyPassword = async () => {
    const inputPass = document.getElementById('admin-pass-input').value;
    const errorMsg = document.getElementById('login-error');

    if (!inputPass) {
        errorMsg.textContent = "請輸入密碼！";
        errorMsg.style.display = "block";
        return;
    }

    // 1. 將使用者輸入的密碼進行 SHA-256 加密
    const hashedInput = CryptoJS.SHA256(inputPass).toString();

    try {
        // 2. 從 Firebase 抓取正確的密碼 Hash
        const snapshot = await window.fbGet(window.fbRef(window.fbDB, "config/adminPasswordHash"));
        const realHash = snapshot.val();

        // 3. 比對兩者的 Hash 是否完全符合
        if (realHash && hashedInput === realHash) {
            // 驗證成功：隱藏登入視窗，啟動後台數據同步
            document.getElementById('login-modal').style.display = 'none';
            sessionStorage.setItem("adminAuthenticated", "true"); // 紀錄登入狀態 (當前分頁有效)
            initAdminSync();
        } else {
            errorMsg.textContent = "密碼錯誤！";
            errorMsg.style.display = "block";
        }
    } catch (err) {
        console.error("驗證過程發生錯誤：", err);
        errorMsg.textContent = "驗證失敗，請檢查網路狀態";
        errorMsg.style.display = "block";
    }
};

// 頁面載入時檢查是否已經登入過
document.addEventListener("DOMContentLoaded", () => {
    if (sessionStorage.getItem("adminAuthenticated") === "true") {
        document.getElementById('login-modal').style.display = 'none';
        initAdminSync();
    }
});
// 🚫 後台把指定 IP 加入黑名單
window.blockUserIP = (ip, reason = "惡意變更資料") => {
    if (!ip || ip === "0.0.0.0") return alert("無效的 IP 位址");
    
    const safeIpKey = ip.replace(/\./g, "_");
    
    window.fbUpdate(window.fbRef(window.fbDB, `blacklist/${safeIpKey}`), {
        ip: ip,
        reason: reason,
        blockedAt: Date.now()
    }).then(() => {
        alert(`⛔ 已成功封鎖 IP：${ip}`);
        writeAuditLog("BLOCK_IP", `封鎖了 IP: ${ip}，原因：${reason}`);
    });
};
