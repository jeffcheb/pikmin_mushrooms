// js/admin.js

document.addEventListener("DOMContentLoaded", () => {
    // 預設一個簡單的管理密碼 (實務上如 PRD 提及，建議走後端或 Firebase Rules 安全驗證)
    // 這裡我們示範前端隱藏觸發機制：在網頁上快速連點 Logo 5 次，即跳出密碼輸入框
    const logoContainer = document.querySelector(".logo");
    let clickCount = 0;
    let isAdmin = sessionStorage.getItem("is_admin") === "true";

    if (!logoContainer) return;

    // 監聽 Logo 連點
    logoContainer.addEventListener("click", () => {
        if (isAdmin) return; // 已經是管理員就不用再點了

        clickCount++;
        if (clickCount === 5) {
            clickCount = 0; // 重置
            const password = prompt("🔑 請輸入管理員通行密碼：");
            
            // 範例密碼設為 "pikmin888"
            if (password === "pikmin888") {
                isAdmin = true;
                sessionStorage.setItem("is_admin", "true");
                alert("🔓 管理員模式已啟用！已解鎖刪除權限。");
                activateAdminMode();
            } else if (password !== null) {
                alert("❌ 密碼錯誤，拒絕存取。");
            }
        }
        
        // 3 秒內沒點滿 5 次就重置計數
        setTimeout(() => { clickCount = 0; }, 3000);
    });

    // 啟用管理員模式的邏輯
    function activateAdminMode() {
        // 1. 為看板容器加上 admin class，方便透過 CSS 微調樣式（若有需要）
        const board = document.getElementById("mushroom-board");
        if (board) board.classList.add("admin-mode");

        // 2. 由於卡片是由 report.js 動態渲染的，我們需要利用「事件代理 (Event Delegation)」
        // 監聽整個看板，當點擊到我們未來動態塞進去的刪除按鈕時，執行刪除
        board.addEventListener("click", (e) => {
            if (e.target && e.target.classList.contains("btn-delete-shroom")) {
                const shroomCard = e.target.closest(".mushroom-card");
                const shroomId = shroomCard ? shroomCard.dataset.id : null;

                if (shroomId && confirm("⚠️ 確定要從雲端資料庫刪除這筆情報嗎？")) {
                    deleteMushroomFromServer(shroomId);
                }
            }
        });

        // 3. 修改 report.js 的渲染行為（動態注入刪除按鈕）
        // 這裡透過劫持或定時監聽，確保只要畫面上出現卡片，就在 footer 補上刪除按鈕
        setInterval(() => {
            const cards = document.querySelectorAll(".mushroom-card");
            cards.forEach(card => {
                const footer = card.querySelector(".card-footer");
                // 如果還沒有刪除按鈕，且撈得到 ID，就補上去
                if (footer && !footer.querySelector(".btn-delete-shroom")) {
                    const deleteBtn = document.createElement("button");
                    deleteBtn.className = "btn-sm btn-delete-shroom";
                    deleteBtn.style.color = "white";
                    deleteBtn.style.backgroundColor = "var(--danger-color)";
                    deleteBtn.style.borderColor = "var(--danger-color)";
                    deleteBtn.textContent = "❌ 刪除";
                    footer.appendChild(deleteBtn);
                }
            });
        }, 500);
    }

    // 從 Firebase 刪除資料節點
    function deleteMushroomFromServer(id) {
        if (!window.fbDB || !window.fbRef || !window.fbRemove) {
            alert("Firebase 未就緒，無法執行刪除。");
            return;
        }

        const exactShroomRef = window.fbRef(window.fbDB, `mushrooms/${id}`);
        window.fbRemove(exactShroomRef)
            .then(() => {
                alert("🗑️ 情報已成功從雲端資料庫移除。");
            })
            .catch((error) => {
                alert("刪除失敗：" + error.message);
            });
    }

    // 重新整理網頁時，如果 session 還在，自動保持管理員狀態
    if (isAdmin) {
        // 稍微延遲確保 report.js 把基本看板容器建好
        setTimeout(activateAdminMode, 500);
    }
});
