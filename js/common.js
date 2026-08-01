// js/common.js
/**
 * 🍄 全站統一蘑菇名稱校正工具
 * 自動將 巨型->巨大、普通->一般、小型->小、大型->大
 */
function normalizeMushroomName(str) {
    if (!str) return '一般蘑菇';
    
    return str.toString().trim()
        .replace(/巨型/g, '巨大')
        .replace(/普通/g, '一般')
        .replace(/小型/g, '小')
        .replace(/大型/g, '大');
}
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
