const heartsSelect = document.getElementById('hearts');
const flowerSelect = document.getElementById('flower');
const decorSelect = document.getElementById('decor');
const mushroomTypeSelect = document.getElementById('mushroom-type');
const totalScoreDisplay = document.getElementById('total-score');

// 🎨 ① 皮皮的種類：基礎戰力設定
const colorBaseValues = {
    purple: 6, // 紫皮
    rock: 5,   // 岩皮
    red: 4,    // 紅皮
    yellow: 3, // 黃皮
    blue: 3,   // 藍皮
    white: 2,  // 白皮
    wing: 2,   // 羽皮
    ice: 2     // 冰皮
};

function calculatePower() {
    const selectedColorRadio = document.querySelector('input[name="color"]:checked');
    const colorName = selectedColorRadio ? selectedColorRadio.value : 'red';
    
    // 1. 種類基礎戰力
    let base = colorBaseValues[colorName] || 0;
    
    // 2. ② 皮皮頭上的花
    let flower = parseInt(flowerSelect.value) || 0;
    
    // 3. ③ 是否有飾品 (基本分)
    let decor = parseInt(decorSelect.value) || 0;
    
    // 4. ④ 友好度分數
    let hearts = parseInt(heartsSelect.value) || 0;
    
    let match = 0;
    let extraDecorBonus = 0; // 用來存放活動飾品額外的 +15 戰力
    
    const selectedMushroom = mushroomTypeSelect.value;
    totalScoreDisplay.style.color = "#2e7d32"; 

    // ==========================================
    // 🍄 依據特定蘑菇環境進行匹配加分
    // ==========================================
    if (selectedMushroom !== 'none') {
        
        // 【第一類】：攻打當季活動/神秘蘑菇
        if (selectedMushroom === 'event_special') {
            if (decor === 300) {
                match = 300; 
                decor = 4; // 🎯 修正：即使觸發大加成，依然保留有飾品基本分 +4！
            } else if (decor === 100) {
                match = 100;
                decor = 4; // 🎯 修正：即使觸發大加成，依然保留有飾品基本分 +4！
            } else {
                match = 0; 
            }
        } 
        
        // 【第二類】：攻打特殊屬性元素蘑菇
        else if (selectedMushroom.includes('_')) {
            const requiredColor = selectedMushroom.split('_')[0];
            // 屬性顏色如果不相符，嚴格禁止參戰
            if (colorName !== requiredColor) {
                totalScoreDisplay.innerText = "❌ 禁止參戰";
                totalScoreDisplay.style.color = "#d32f2f"; 
                return; 
            } else {
                // 屬性正確！若是活動飾品，一律加上基本飾品分(+4)與活動基礎分(+15)
                if (decor === 300 || decor === 100) { 
                    decor = 4; 
                    extraDecorBonus = 15; 
                }
                match = 100; // 元素菇屬性匹配分
            }
        } 
        
        // 【第三類】：攻打普通蘑菇 / 冰藍蘑菇
        else {
            // 若是活動飾品，一律加上基本飾品分(+4)與活動基礎分(+15)
            if (decor === 300 || decor === 100) { 
                decor = 4; 
                extraDecorBonus = 15; 
            }
            
            // 顏色或種類相符匹配分
            if (colorName === selectedMushroom) {
                match = 12; 
            }
        }
    } else {
        // 【第四類】：未選擇蘑菇時（空閒狀態），活動飾品也完美享有 4 + 15 戰力
        if (decor === 300 || decor === 100) { 
            decor = 4; 
            extraDecorBonus = 15; 
        }
    }

    // 最終總戰力相加公式
    totalScoreDisplay.innerText = base + flower + decor + extraDecorBonus + hearts + match;
}

// 監聽所有下拉選單與按鈕的切換事件
document.querySelectorAll('input[name="color"]').forEach(r => r.addEventListener('change', calculatePower));
[heartsSelect, flowerSelect, decorSelect, mushroomTypeSelect].forEach(e => e.addEventListener('change', calculatePower));

// 初始化執行
calculatePower();
