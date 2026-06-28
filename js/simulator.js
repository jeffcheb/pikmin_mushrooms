// js/simulator.js

document.addEventListener("DOMContentLoaded", () => {
    // 獲取所有表单元素與結果欄位
    const form = document.getElementById("simulator-form");
    const targetMushroom = document.getElementById("target-mushroom");
    const pikminColor = document.getElementById("pikmin-color");
    const friendshipLevel = document.getElementById("friendship-level");
    const flowerStatus = document.getElementById("flower-status");
    const decorStatus = document.getElementById("decor-status");
    
    const powerResult = document.getElementById("power-result");
    const errorMessage = document.getElementById("error-message");

    // 如果不在 index.html 頁面則不執行
    if (!form) return;

    // 基礎數值設定 (模擬遊戲中的戰力權重)
    const basePower = {
        red: 20, blue: 20, yellow: 20,
        purple: 30, rock: 30, white: 15, winged: 15
    };

    const flowerBonus = {
        bare: 0, leaf: 1, bud: 2, normal_flower: 3, special_flower: 5
    };

    // 核心計算與檢查函式
    function calculatePower() {
        const mushroom = targetMushroom.value;
        const color = pikminColor.value;
        const friendship = parseInt(friendshipLevel.value) || 0;
        const flower = flowerStatus.value;
        const decor = decorStatus.value;

        // --- F2: 元素蘑菇防呆邏輯 ---
        let isBanned = false;
        if (mushroom === "fire" && color !== "red") isBanned = true;
        if (mushroom === "water" && color !== "blue") isBanned = true;

        if (isBanned) {
            // 隱藏戰力，顯示禁止參戰
            powerResult.style.display = "none";
            errorMessage.style.display = "block";
            return;
        } else {
            // 恢復顯示
            powerResult.style.display = "block";
            errorMessage.style.display = "none";
        }

        // --- F1: 戰力計算公式公式 ---
        // 基礎分 + (友好度 * 5) + 花朵加成 + 飾品加成
        let totalPower = basePower[color];
        
        totalPower += friendship * 5;
        totalPower += flowerBonus[flower];
        if (decor === "decor") totalPower += 10;

        // 屬性相剋加成 (如果是對應的元素蘑菇，戰力大幅提升)
        if (mushroom === "fire" && color === "red") totalPower += 50;
        if (mushroom === "water" && color === "blue") totalPower += 50;

        // 渲染到畫面上
        powerResult.textContent = totalPower;
    }

    // 監聽整個表單的 input 與 change 事件，達成「即時連動」
    form.addEventListener("input", calculatePower);
    form.addEventListener("change", calculatePower);

    // 限制友好度輸入框的上下限防呆
    friendshipLevel.addEventListener("blur", () => {
        let val = parseInt(friendshipLevel.value);
        if (isNaN(val) || val < 0) friendshipLevel.value = 0;
        if (val > 8) friendshipLevel.value = 8;
        calculatePower();
    });

    // 初始化先執行一次計算
    calculatePower();
});
