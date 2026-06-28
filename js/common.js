// js/common.js

document.addEventListener("DOMContentLoaded", () => {
    console.log("🌱 皮克敏高階工具站：共用核心模組已載入。");

    // --- 全站共用：主動式防呆與優化體驗 ---
    // 自動為所有數字輸入框 (number) 加上防呆：防止使用者輸入負數
    const numberInputs = document.querySelectorAll('input[type="number"]');
    numberInputs.forEach(input => {
        input.addEventListener("change", (e) => {
            const min = e.target.min;
            const max = e.target.max;
            let val = parseInt(e.target.value);

            if (isNaN(val)) return;

            // 若小於設定的最小值，自動校正
            if (min !== "" && val < parseInt(min)) {
                e.target.value = min;
            }
            // 若大於設定的最大值，自動校正
            if (max !== "" && val > parseInt(max)) {
                e.target.value = max;
            }
        });
    });

    // --- 預留：未來的 Notification API 訂閱通知機制 (F9) ---
    // 如果未來要在重生緩衝期倒數 1 分鐘發出網頁通知，可在此初始化權限
    window.requestNotificationPermission = () => {
        if (!("Notification" in window)) {
            console.log("此瀏覽器不支援桌面通知");
            return;
        }
        if (Notification.permission !== "granted" && Notification.permission !== "denied") {
            Notification.requestPermission().then(permission => {
                if (permission === "granted") {
                    console.log("🔔 通知權限已開通！");
                }
            });
        }
    };
});
