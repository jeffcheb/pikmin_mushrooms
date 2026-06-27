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
    
    // 3. ③ 是否有飾品
    let decor = parseInt(decorSelect.value) || 0;
    
    // 4. ④ 友好度分數
    let hearts = parseInt(heartsSelect.value) || 0;
    
    let match = 0;
    const selectedMushroom = mushroomTypeSelect.value;
    totalScoreDisplay.style.color = "#2e7d32"; 

    // ==========================================
    // 🍄 依據特定蘑菇環境進行匹配加分
    // ==========================================
    if (selectedMushroom !== 'none') {
        
        // 情況 A：選了「本月限定活動蘑菇」
        if (selectedMushroom === 'event_special') {
            if (decor === 300) {
                match = 300; 
                decor = 0; 
            } else if (decor === 100) {
                match = 100;
                decor = 0; 
            } else {
                match = 0; 
            }
        } 
        
        // 情況 B：選了「特殊/元素蘑菇」
        else if (selectedMushroom.includes('_')) {
            const requiredColor = selectedMushroom.split('_')[0];
            if (colorName !== requiredColor) {
                totalScoreDisplay.innerText = "❌ 禁止參戰";
                totalScoreDisplay.style.color = "#d32f2f"; 
                return; 
            } else {
                if (decor === 300 || decor === 100) { decor = 15; }
                match = 100; 
            }
        } 
        
        // 情況 C：選了「普通蘑菇 / 冰藍蘑菇」
        else {
            if (decor === 300 || decor === 100) { decor = 15; }
            
            // 精準匹配：顏色或種類與蘑菇完全相同才有 +12
            if (colorName === selectedMushroom) {
                match = 12; 
            }
        }
    } else {
        if (decor === 300 || decor === 100) { decor = 15; }
    }

    // 最終總戰力 = 基礎戰力 + 頭花分 + 飾品分 + 友好度 + 蘑菇額外匹配
    totalScoreDisplay.innerText = base + flower + decor + hearts + match;
}

// 監聽所有下拉選單與按鈕的切換事件
document.querySelectorAll('input[name="color"]').forEach(r => r.addEventListener('change', calculatePower));
[heartsSelect, flowerSelect, decorSelect, mushroomTypeSelect].forEach(e => e.addEventListener('change', calculatePower));

// 初始化執行
calculatePower();
