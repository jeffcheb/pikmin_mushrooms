// js/simulator.js

document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("simulator-form");
    const targetMushroom = document.getElementById("target-mushroom");
    const pikminColor = document.getElementById("pikmin-color");
    const redHeartsInput = document.getElementById("red-hearts");
    const goldHeartsInput = document.getElementById("gold-hearts");
    const flowerStatus = document.getElementById("flower-status");
    const decorStatus = document.getElementById("decor-status");
    
    const powerResult = document.getElementById("power-result");
    const errorMessage = document.getElementById("error-message");

    if (!form) return;

    // 📊 依據 et.jupiter 提供的精準基礎戰力對照表
    const basePower = {
        purple: 6, // 紫皮
        rock: 5,   // 岩皮
        red: 4,    // 紅皮
        yellow: 3, // 黃皮
        blue: 3,   // 藍皮
        white: 2,  // 白皮
        winged: 2  // 羽皮
    };

    // 🌸 花朵加成對照表
    const flowerBonus = {
        bare: 0,
        leaf: 1,
        bud: 2,
        normal_flower: 3,
        special_flower: 4,      // 特殊花 / 當月副花
        monthly_main_flower: 5  // 當月主花
    };

    function calculatePower() {
        const mushroom = targetMushroom.value;
        const color = pikminColor.value;
        const redHearts = parseInt(redHeartsInput.value) || 0;
        const goldHearts = parseInt(goldHeartsInput.value) || 0;
        const flower = flowerStatus.value;
        const decor = decorStatus.value;

        // --- 1. 元素蘑菇防呆阻斷 ---
        let isBanned = false;
        if (mushroom === "fire" && color !== "red") isBanned = true;
        if (mushroom === "water" && color !== "blue") isBanned = true;

        if (isBanned) {
            powerResult.style.display = "none";
            errorMessage.style.display = "block";
            return;
        } else {
            powerResult.style.display = "block";
            errorMessage.style.display = "none";
        }

        // --- 2. 核心戰力加總計算 ---
        // ① 皮皮種類基礎戰力
        let totalPower = basePower[color] || 0;

        // ② 皮皮頭頂的花朵狀態
        totalPower += (flowerBonus[flower] || 0);

        // ③ 是否有飾品（基礎全部加 4 分）
        if (decor !== "none") {
            totalPower += 4;
        }

        // 🎒 核心新需求：本月主/副飾品在當月特殊菇的額外超級加成！
        if (mushroom === "monthly_special") {
            if (decor === "monthly_main_decor") {
                totalPower += 300; // 主飾品加成
            } else if (decor === "monthly_sub_decor") {
                totalPower += 100; // 副飾品加成
            }
        }

        // ④ 友好度加成 (紅心一顆1分，金心一顆4分)
        totalPower += (redHearts * 1);
        totalPower += (goldHearts * 4);

        // --- 3. 元素相剋加成 (同屬打元素菇，例如紅皮打火菇，此處依遊戲實務保留額外克制分)
        if (mushroom === "fire" && color === "red") totalPower += 4; // 範例克制倍增，可依實際體感調整
        if (mushroom === "water" && color === "blue") totalPower += 4;

        // 將最終結果更新至網頁
        powerResult.textContent = totalPower;
    }

    // 監聽所有輸入與改變，實時觸發
    form.addEventListener("input", calculatePower);
    form.addEventListener("change", calculatePower);

    // 強制限制愛心輸入框的上下限 (0-4 顆)
    [redHeartsInput, goldHeartsInput].forEach(input => {
        input.addEventListener("blur", () => {
            let val = parseInt(input.value);
            if (isNaN(val) || val < 0) input.value = 0;
            if (val > 4) input.value = 4;
            calculatePower();
        });
    });

    // 初始化試算
    calculatePower();
});
