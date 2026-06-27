const heartsSelect = document.getElementById('hearts');
const flowerSelect = document.getElementById('flower');
const decorSelect = document.getElementById('decor');
const mushroomTypeSelect = document.getElementById('mushroom-type');
const totalScoreDisplay = document.getElementById('total-score');

const colorBaseValues = {
    red: 4, blue: 3, yellow: 3, purple: 6, white: 2, rock: 5, wing: 2
};

function calculatePower() {
    const selectedColorRadio = document.querySelector('input[name="color"]:checked');
    const colorName = selectedColorRadio ? selectedColorRadio.value : 'red';
    
    let base = colorBaseValues[colorName] || 0;
    let hearts = parseInt(heartsSelect.value);
    let flower = parseInt(flowerSelect.value);
    let decor = parseInt(decorSelect.value);
    let match = 0;
    
    const selectedMushroom = mushroomTypeSelect.value;
    totalScoreDisplay.style.color = "#2e7d32"; 

    // ==========================================
    // 🍄 蘑菇與飾品匹配邏輯核心
    // ==========================================
    if (selectedMushroom !== 'none') {
        
        // 情況 A：選了「本月限定活動蘑菇」
        if (selectedMushroom === 'event_special') {
            if (decor === 300) {
                match = 300; // 主活動飾品匹配，獲得頂級加成 +300
                decor = 0;   // 歸零避免重複計算
            } else if (decor === 100) {
                match = 100; // 副活動飾品匹配，獲得次級加成 +100
                decor = 0;   // 歸零避免重複計算
            } else {
                match = 0;   // 一般常駐飾品或無飾品，無法獲得活動蘑菇加成
            }
        } 
        
        // 情況 B：選了「特殊/元素蘑菇」 (例如：red_fire, rock_crystal)
        else if (selectedMushroom.includes('_')) {
            const requiredColor = selectedMushroom.split('_')[0];
            // 顏色不符，直接禁止參戰
            if (colorName !== requiredColor) {
                totalScoreDisplay.innerText = "❌ 禁止參戰";
                totalScoreDisplay.style.color = "#d32f2f"; 
                return; 
            } else {
                match = 100; // 元素蘑菇匹配加成
            }
        } 
        
        // 情況 C：選了「普通蘑菇 / 冰藍蘑菇」
        else {
            const targetColor = (selectedMushroom === 'ice') ? 'blue' : selectedMushroom;
            if (colorName === targetColor) {
                match = 12; // 普通同色蘑菇匹配加成
            }
        }
    }

    // 最後加總：基礎戰力 + 愛心 + 頭花 + 飾品(若未被活動邏輯扣除) + 蘑菇匹配加成
    totalScoreDisplay.innerText = base + hearts + flower + decor + match;
}

// 監聽所有下拉選單與按鈕的切換事件
document.querySelectorAll('input[name="color"]').forEach(r => r.addEventListener('change', calculatePower));
[heartsSelect, flowerSelect, decorSelect, mushroomTypeSelect].forEach(e => e.addEventListener('change', calculatePower));

// 初始化執行
calculatePower();
