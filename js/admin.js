// js/admin.js

let mushroomsData = {};
let blacklistData = {};
let logsData = {};

// 🟢 側邊欄與頁面切換
window.showSection = function(sectionName) {
    document.querySelectorAll('.admin-section').forEach(s => s.style.display = 'none');
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.getElementById(`section-${sectionName}`).style.display = 'block';
    event.currentTarget.classList.add('active');
};

// 🔒 密碼驗證邏輯
window.verifyPassword = async function() {
    const inputEl = document.getElementById('admin-pass-input');
    const errorMsg = document.getElementById('login-error');
    if (!inputEl) return;

    const inputPass = inputEl.value.trim();
    if (!inputPass) {
        errorMsg.textContent = "請輸入密碼！";
        errorMsg.style.display = "block";
        return;
    }

    // 將 jeff110chen 加密
    const hashedInput = CryptoJS.SHA256(inputPass).toString();

    try {
        errorMsg.textContent = "驗證中...";
        errorMsg.style.display = "block";
        errorMsg.style.color = "#0284c7";

        // 等待 Firebase 載入
        let retries = 0;
        while ((!window.fbDB || !window.fbGet || !window.fbRef) && retries < 15) {
            await new Promise(r => setTimeout(r, 200));
            retries++;
        }

        const snap = await window.fbGet(window.fbRef(window.fbDB, "config/adminPasswordHash"));
        const realHash = snap && snap.exists() ? snap.val() : null;

        // 🌟 印出兩邊 Hash 方便確認
        console.log("🔍 輸入算出的 Hash:", hashedInput);
        console.log("🔍 資料庫裡的 Hash:", realHash);

        if (realHash && hashedInput === realHash) {
            document.getElementById('login-modal').style.display = 'none';
            sessionStorage.setItem("adminAuthenticated", "true");
            if (typeof window.initAdminSync === 'function') {
                window.initAdminSync();
            }
        } else {
            errorMsg.textContent = "密碼錯誤！";
            errorMsg.style.color = "#e11d48";
        }
    } catch (err) {
        console.error("驗證錯誤:", err);
        errorMsg.textContent = "驗證失敗，請檢查網路。";
        errorMsg.style.color = "#e11d48";
    }
};
// 🟢 啟動後台資料同步
window.initAdminSync = function() {
    if (!window.fbDB) return;

    // 定義安全呼叫函式 (防爆)
    const onVal = window.fbOnValue || ((ref, cb) => ref.on('value', cb));
    const mkRef = window.fbRef || ((db, path) => db.ref(path));

    // 1. 監聽蘑菇
    onVal(mkRef(window.fbDB, "mushrooms"), (snap) => {
        mushroomsData = snap.val() || {};
        renderAdminDashboard();
        renderAnalytics();
    });

    // 2. 監聽黑名單
    onVal(mkRef(window.fbDB, "blacklist"), (snap) => {
        blacklistData = snap.val() || {};
        renderBlacklist();
    });

    // 3. 監聽稽核紀錄
    if (window.fbQuery && window.fbLimitToLast) {
        onVal(window.fbQuery(mkRef(window.fbDB, "audit_logs"), window.fbLimitToLast(50)), (snap) => {
            logsData = snap.val() || {};
            renderLogs();
        });
    } else {
        // Fallback
        onVal(mkRef(window.fbDB, "audit_logs"), (snap) => {
            logsData = snap.val() || {};
            renderLogs();
        });
    }
};

// 🍄 渲染：蘑菇管理列表
window.renderAdminDashboard = function() {
    const tbody = document.getElementById('admin-mushroom-list');
    if (!tbody) return;
    tbody.innerHTML = "";
    Object.keys(mushroomsData).forEach(id => {
        const item = mushroomsData[id];
        const isHidden = item.status === 'hidden';
        tbody.innerHTML += `
            <tr>
                <td><span class="status-badge ${isHidden ? 'hidden-status' : 'active-status'}">${isHidden ? '已隱藏' : '正常'}</span></td>
                <td>${item.locationName}</td>
                <td>${item.city}</td>
                <td>${item.type}</td>
                <td>${item.currentPlayers || 0} 人</td>
                <td>
                    <button class="btn-action" onclick="toggleVisibility('${id}', '${item.status || 'active'}')">${isHidden ? '👁️ 恢復' : '👁️‍🗨️ 隱藏'}</button>
                    <button class="btn-action" style="background:#fee2e2; color:#991b1b;" onclick="deleteMushroom('${id}', '${item.locationName}')">🗑️</button>
                </td>
            </tr>
        `;
    });
};

// 📊 渲染：數據分析
window.renderAnalytics = function() {
    const keys = Object.keys(mushroomsData);
    if(document.getElementById('stat-total')) document.getElementById('stat-total').textContent = keys.length;
    
    const typeCounts = {};
    keys.forEach(id => {
        const t = mushroomsData[id].type || '未知';
        typeCounts[t] = (typeCounts[t] || 0) + 1;
    });
    
    let html = '';
    Object.entries(typeCounts).forEach(([k, v]) => html += `<p style="margin:4px 0;">${k}: <strong>${v}</strong></p>`);
    if(document.getElementById('type-distribution')) document.getElementById('type-distribution').innerHTML = html || "<p>尚無數據</p>";
};

// 🚫 渲染：黑名單
window.renderBlacklist = function() {
    const tbody = document.getElementById('blacklist-list');
    if (!tbody) return;
    tbody.innerHTML = "";
    const keys = Object.keys(blacklistData);
    if (keys.length === 0) {
        tbody.innerHTML = `<tr><td colspan="3" style="text-align:center;">目前無黑名單</td></tr>`;
        return;
    }
    keys.forEach(key => {
        const item = blacklistData[key];
        const ip = item.ip || key.replace(/_/g, ".");
        tbody.innerHTML += `
            <tr>
                <td>${ip}</td>
                <td>${item.reason || '無'}</td>
                <td><button class="btn-action" style="background:#10b981; color:white;" onclick="unblockUserIP('${key}', '${ip}')">🔓 解除</button></td>
            </tr>
        `;
    });
};

// 📜 渲染：稽核紀錄 (修復之前的 Missing Error)
window.renderLogs = function() {
    const tbody = document.getElementById('logs-list');
    if (!tbody) return;
    tbody.innerHTML = "";
    const keys = Object.keys(logsData).reverse(); // 最新的排前面
    if (keys.length === 0) {
        tbody.innerHTML = `<tr><td colspan="3" style="text-align:center;">無歷史紀錄</td></tr>`;
        return;
    }
    keys.forEach(key => {
        const log = logsData[key];
        const timeStr = new Date(log.timestamp).toLocaleString();
        tbody.innerHTML += `
            <tr>
                <td>${timeStr}</td>
                <td><strong>${log.action}</strong></td>
                <td>${log.details}</td>
            </tr>
        `;
    });
};

// ⚙️ 操作：切換隱藏
window.toggleVisibility = function(id, currentStatus) {
    const newStatus = currentStatus === 'hidden' ? 'active' : 'hidden';
    const updater = window.fbUpdate || ((ref, data) => ref.update(data));
    const mkRef = window.fbRef || ((db, path) => db.ref(path));
    
    updater(mkRef(window.fbDB, `mushrooms/${id}`), { status: newStatus, updatedAt: Date.now() })
    .then(() => writeAuditLog("TOGGLE", `將據點狀態改為 ${newStatus === 'hidden' ? '隱藏' : '正常'}`));
};

// ⚙️ 操作：刪除蘑菇
window.deleteMushroom = function(id, name) {
    if (!confirm(`確定要永久刪除 [${name}] 嗎？`)) return;
    const remover = window.fbRemove || ((ref) => ref.remove());
    const mkRef = window.fbRef || ((db, path) => db.ref(path));
    
    remover(mkRef(window.fbDB, `mushrooms/${id}`))
    .then(() => writeAuditLog("DELETE", `刪除了據點 [${name}]`));
};

// ⚙️ 操作：新增黑名單
window.addToBlacklist = function() {
    const ip = document.getElementById('blacklist-input').value.trim();
    if(!ip) return alert("請輸入要封鎖的 IP");
    const safeKey = ip.replace(/\./g, "_");
    const updater = window.fbUpdate || ((ref, data) => ref.update(data));
    const mkRef = window.fbRef || ((db, path) => db.ref(path));

    updater(mkRef(window.fbDB, `blacklist/${safeKey}`), { ip: ip, reason: "管理員手動封鎖", blockedAt: Date.now() })
    .then(() => { 
        writeAuditLog("BLOCK", `封鎖了 IP: ${ip}`); 
        document.getElementById('blacklist-input').value = ""; 
        alert(`已成功封鎖 ${ip}`);
    });
};

// ⚙️ 操作：解除封鎖
window.unblockUserIP = function(key, ip) {
    if(!confirm(`解除 ${ip} 的封鎖？`)) return;
    const remover = window.fbRemove || ((ref) => ref.remove());
    const mkRef = window.fbRef || ((db, path) => db.ref(path));

    remover(mkRef(window.fbDB, `blacklist/${key}`))
    .then(() => writeAuditLog("UNBLOCK", `解除了 IP: ${ip} 的封鎖`));
};

// ⚙️ 操作：寫入稽核 Log
window.writeAuditLog = function(action, details) {
    if(!window.fbDB) return;
    const pusher = window.fbPush || ((ref, data) => ref.push(data));
    const mkRef = window.fbRef || ((db, path) => db.ref(path));
    pusher(mkRef(window.fbDB, "audit_logs"), { action, details, timestamp: Date.now(), admin: "Admin" });
};

// ⚙️ 操作：一鍵清理過期
document.getElementById('btn-purge')?.addEventListener('click', () => {
    let count = 0;
    const now = Date.now();
    const remover = window.fbRemove || ((ref) => ref.remove());
    const mkRef = window.fbRef || ((db, path) => db.ref(path));

    Object.keys(mushroomsData).forEach(id => {
        const item = mushroomsData[id];
        const totalMs = ((item.timeReported.hours * 3600) + (item.timeReported.minutes * 60) + (item.timeReported.seconds || 0)) * 1000;
        const expireTime = (item.createdAt || Date.now()) + totalMs;
        
        // 過期超過 2 小時 (7200000 ms) + 5 分鐘冷卻 (300000 ms)
        if (now - expireTime > 7500000) {
            remover(mkRef(window.fbDB, `mushrooms/${id}`));
            count++;
        }
    });
    
    if(count > 0) {
        alert(`✅ 批次清理完成：已刪除 ${count} 筆過期資料。`);
        writeAuditLog("PURGE", `執行一鍵清理，刪除了 ${count} 筆過期據點`);
    } else {
        alert("目前沒有需要清理的過期資料。");
    }
});

// 🟢 頁面載入時檢查是否已登入過
document.addEventListener("DOMContentLoaded", () => {
    if (sessionStorage.getItem("adminAuthenticated") === "true") {
        document.getElementById('login-modal').style.display = 'none';
        
        // 輪詢等待 Firebase 載入完成再啟動
        const checkFbInterval = setInterval(() => {
            if(window.fbDB) {
                clearInterval(checkFbInterval);
                initAdminSync();
            }
        }, 150);
    }
});
