const heartsSelect = document.getElementById('hearts');
const flowerSelect = document.getElementById('flower');
const decorSelect = document.getElementById('decor');
const mushroomTypeSelect = document.getElementById('mushroom-type');
const totalScoreDisplay = document.getElementById('total-score');

// 🎨 皮克敏各色基本破壞力
const colorBaseValues = {
    red: 4, blue: 3, yellow: 3, purple: 6, white: 2, rock: 5, wing: 2
};

function calculatePower() {
    const selectedColorRadio = document.querySelector('input[name="color"]:checked');
    const colorName = selectedColorRadio ? selectedColorRadio.value : 'red';
    
    let base = colorBaseValues[colorName] || 0;
    let hearts = parseInt(heartsSelect.value);
    let flower = parseInt(flowerSelect.value);
    
    // 從下拉選單取得當前飾品狀態：無飾品=0, 一般飾品=4, 副活動飾品=15(打一般菇), 主活動飾品=15(打一般菇)
    let decor = parseInt(decorSelect.value); 
    let match = 0;
    
    const selectedMushroom = mushroomTypeSelect.value;
    totalScoreDisplay.style.color = "#2e7d32"; 

    // ==========================================
    // 🍄 依據網路最新規則修正之蘑菇匹配邏輯
    // ==========================================
    if (selectedMushroom !== 'none') {
        
        // 情況 A：選了「本月限定活動/神秘蘑菇」
        if (selectedMushroom === 'event_special') {
            // 如果選主活動飾品，在活動菇下它將獲得 +300 的頂級爆發加成
            if (decor === 300 || decorSelect.options[decorSelect.selectedIndex].text.includes("主活動")) {
                match = 300; 
                decor = 0; // 匹配大加成已包含其飾品工作力，不重複計算
            } 
            // 如果選副活動/復刻活動飾品，獲得次級 +100 爆發加成
            else if (decor === 100 || decorSelect.options[decorSelect.selectedIndex].text.includes("副活動")) {
                match = 100;
                decor = 0; // 匹配大加成已包含其飾品工作力，不重複計算
            } 
            // 一般飾品 (4分) 或 無飾品 (0分) 打活動菇，沒有額外匹配加成，只保留原本的 decor 分數
            else {
                match = 0; 
            }
        } 
        
        // 情況 B：選了「特殊/元素蘑菇」 (火、水、電、毒、水晶)
        else if (selectedMushroom.includes('_')) {
            const requiredColor = selectedMushroom.split('_')[0];
            // 屬性不相符，遊戲內嚴格禁止派去打屬性菇！
            if (colorName !== requiredColor) {
                totalScoreDisplay.innerText = "❌ 禁止參戰";
                totalScoreDisplay.style.color = "#d32f2f"; 
                return; 
            } else {
                // 如果是活動飾品，去打元素菇只會算它打一般菇的基礎分 (+15)，並疊加元素匹配分 (+100)
                if (decor === 300 || decor === 100) { decor = 15; }
                match = 100; 
            }
        } 
        
        // 情況 C：選了「普通蘑菇 / 冰藍蘑菇」
        else {
            const targetColor = (selectedMushroom === 'ice') ? 'blue' : selectedMushroom;
            // 如果是活動飾品，打一般同色菇會算其基礎分 (+15)，並加上同色匹配分 (+12)
            if (decor === 300 || decor === 100) { decor = 15; }
            
            if (colorName === targetColor) {
                match = 12; // 顏色匹配加成
            }
        }
    } else {
        // 沒有選擇任何蘑菇時（空閒狀態），活動飾品就是平時非活動菇的基礎工作力 +15
        if (decor === 300 || decor === 100) { decor = 15; }
    }

    // 最終戰力 = 基礎值 + 愛心分 + 頭花分 + 經修正的飾品分 + 蘑菇匹配加成分
    totalScoreDisplay.innerText = base + hearts + flower + decor + match;
}

// 監聽所有下拉選單與按鈕的切換事件
document.querySelectorAll('input[name="color"]').forEach(r => r.addEventListener('change', calculatePower));
[heartsSelect, flowerSelect, decorSelect, mushroomTypeSelect].forEach(e => e.addEventListener('change', calculatePower));

// 初始化執行
calculatePower();
