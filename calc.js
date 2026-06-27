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

    if (selectedMushroom !== 'none') {
        if (selectedMushroom === 'event_special') {
            match = 300;
        } else if (selectedMushroom.includes('_')) {
            // 處理元素與特殊蘑菇的嚴格禁止限制
            const requiredColor = selectedMushroom.split('_')[0];
            if (colorName !== requiredColor) {
                totalScoreDisplay.innerText = "❌ 禁止參戰";
                totalScoreDisplay.style.color = "#d32f2f"; 
                return; 
            } else {
                match = 100; // 元素蘑菇匹配加成
            }
        } else {
            // 普通蘑菇與冰藍蘑菇
            const targetColor = (selectedMushroom === 'ice') ? 'blue' : selectedMushroom;
            if (colorName === targetColor) {
                match = 12;
            }
        }
    }
    totalScoreDisplay.innerText = base + hearts + flower + decor + match;
}

document.querySelectorAll('input[name="color"]').forEach(r => r.addEventListener('change', calculatePower));
[heartsSelect, flowerSelect, decorSelect, mushroomTypeSelect].forEach(e => e.addEventListener('change', calculatePower));

// 初始化執行
calculatePower();
