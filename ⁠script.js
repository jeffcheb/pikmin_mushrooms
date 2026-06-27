// 獲取設定元素
const heartsSelect = document.getElementById('hearts');
const flowerSelect = document.getElementById('flower');
const decorSelect = document.getElementById('decor');
const mushroomTypeSelect = document.getElementById('mushroom-type');
const totalScoreDisplay = document.getElementById('total-score');
const locationFilter = document.getElementById('location-filter');
const mushroomContainer = document.getElementById('mushroom-container');
const geoBtn = document.getElementById('geo-btn');
const mushroomForm = document.getElementById('mushroom-form');

// 表單動態限制元素
const formTypeSelect = document.getElementById('form-type');
const formSizeSelect = document.getElementById('form-size');
const formCountInput = document.getElementById('form-count');
const countHint = document.getElementById('count-hint');

// 開發者模式相關元素
const devModeBtn = document.getElementById('dev-mode-btn');
const devStatusText = document.getElementById('dev-status');
let isDevMode = false;

const colorBaseValues = {
    red: 4, blue: 3, yellow: 3, purple: 6, white: 2, rock: 5, wing: 2
};

const regionsList = [
    "北投", "士林", "內湖", "南港", "文山", "萬華", "大同", "中山", "松山", "大安", "中正", "信義",
    "板橋", "三重", "中和", "永和", "新莊", "新店", "土城", "蘆洲", "汐止", "樹林", "淡水",
    "桃園", "西屯", "北屯", "南屯", "永康", "安南", "三民", "鳳山", "小港", "前鎮", "苓雅", 
    "新興", "前金", "鹽埕", "鼓山", "左營", "楠梓", "基隆", "新竹", "嘉義"
];

// 根據種類與大小動態計算人數上限值
function getCountLimit() {
    const type = formTypeSelect.value;
    const size = formSizeSelect.value;

    if (type === 'event') return 30;
    if (size === '巨型') return 30;
    if (size === '大') return 20;
    return 5;
}

// 動態變更自填人數的 max 限制與提示文字
function updateCountLimitConstraint() {
    const limit = getCountLimit();
    formCountInput.max = limit;
    formCountInput.placeholder = `0-${limit}`;
    countHint.innerText = `上限: ${limit}人`;

    if (parseInt(formCountInput.value) > limit) {
        formCountInput.value = limit;
    }
}

// 1. 戰力與特殊屬性限制計算邏輯
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
        } else if (selectedMushroom.includes('_') && selectedMushroom !== 'blue_ice') {
            const requiredColor = selectedMushroom.split('_')[0];
            
            if (colorName !== requiredColor) {
                totalScoreDisplay.innerText = "❌ 禁止參戰";
                totalScoreDisplay.style.color = "#d32f2f"; 
                return; 
            } else {
                match = 100; 
            }
        } else {
            const targetColor = (selectedMushroom === 'blue_ice') ? 'blue' : selectedMushroom;
            if (colorName === targetColor) {
                match = 12;
            }
        }
    }

    let total = base + hearts + flower + decor + match;
    totalScoreDisplay.innerText = total;
}

// 2. 地區位置篩選邏輯
function filterLocation() {
    const selectedLocation = locationFilter.value;
    const cards = document.querySelectorAll('#mushroom-container .card');

    cards.forEach(card => {
        const cardLocation = card.getAttribute('data-location');
        if (selectedLocation === 'all' || cardLocation === selectedLocation) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
}

// 3. 釘選功能邏輯
function setupPinFeature() {
    mushroomContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('pin-btn')) {
            const currentCard = e.target.closest('.card');
            e.target.classList.toggle('active');
            if (e.target.classList.contains('active')) {
                mushroomContainer.prepend(currentCard);
            } else {
                mushroomContainer.appendChild(currentCard);
            }
        }
    });
}

// 4. 開發者編輯模式驗證模組
function setupDeveloperMode() {
    const CORRECT_PASSWORD = "admin123";

    devModeBtn.addEventListener('click', () => {
        if (!isDevMode) {
            const inputPassword = prompt("🔐 請輸入開發者安全驗證密碼：");
            if (inputPassword === null) return;

            if (inputPassword === CORRECT_PASSWORD) {
                isDevMode = true;
                document.body.classList.add('dev-active');
                devModeBtn.innerText = "🔒 關閉編輯模式";
                devModeBtn.style.backgroundColor = "#d32f2f";
                devStatusText.innerText = "🔓 開發者編輯中 (點擊卡片左上角 ❌ 可刪除蘑菇)";
                devStatusText.style.color = "#d32f2f";
                alert("驗證成功！已解鎖直接編輯與刪除權限。");
            } else {
                alert("❌ 密碼錯誤！拒絕存取。");
            }
        } else {
            isDevMode = false;
            document.body.classList.remove('dev-active');
            devModeBtn.innerText = "🛠️ 開啟開發者模式";
            devModeBtn.style.backgroundColor = "#607d8b";
            devStatusText.innerText = "🔒 安全瀏覽模式";
            devStatusText.style.color = "#546e7a";
        }
    });

    mushroomContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('delete-btn')) {
            const currentCard = e.target.closest('.card');
            const mushroomName = currentCard.querySelector('h3').innerText;
            const confirmDelete = confirm(`⚠️ 確定要刪除「${mushroomName}」嗎？此操作無法還原。`);
            if (confirmDelete) {
                currentCard.remove();
            }
        }
    });
}

// 5. 手動回報表單控制組件
function setupReportForm() {
    formTypeSelect.addEventListener('change', updateCountLimitConstraint);
    formSizeSelect.addEventListener('change', updateCountLimitConstraint);

    mushroomForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const limit = getCountLimit();
        const pCount = parseInt(formCountInput.value) || 0;

        if (pCount < 0 || pCount > limit) {
            alert(`❌ 人數輸入錯誤！當前選擇的蘑菇限制範圍為 0 至 ${limit} 人。`);
            return;
        }

        const region = document.getElementById('form-region').value;
        const name = document.getElementById('form-name').value;
        const type = formTypeSelect.value;
        const size = formSizeSelect.value;
        const hours = parseInt(document.getElementById('form-hours').value) || 0;
        const minutes = parseInt(document.getElementById('form-minutes').value) || 0;
        const seconds = parseInt(document.getElementById('form-seconds').value) || 0; 

        const now = new Date();
        const reportTimeString = `${now.getFullYear()}-${format(now.getMonth()+1)}-${format(now.getDate())} ${format(now.getHours())}:${format(now.getMinutes())}:${format(now.getSeconds())}`;

        const typeMapping = {
            red: { title: "普通紅色蘑菇", img: "mushroom_red.png" },
            purple: { title: "普通紫色蘑菇", img: "mushroom_purple.png" },
            ice: { title: "普通冰藍蘑菇", img: "mushroom_ice.png" },
            crystal: { title: "特殊水晶蘑菇", img: "mushroom_crystal.png" },
            fire: { title: "元素火蘑菇", img: "mushroom_fire.png" },
            water: { title: "元素水蘑菇", img: "mushroom_water.png" },
            poison: { title: "元素毒蘑菇", img: "mushroom_poison.png" },
            electric: { title: "元素電子蘑菇", img: "mushroom_electric.png" },
            event: { title: "本月限定活動蘑菇", img: "mushroom_event.png" }
        };

        const mInfo = typeMapping[type] || { title: "未知蘑菇", img: "mushroom_red.png" };

        const newCard = document.createElement('div');
        newCard.className = "card";
        newCard.setAttribute('data-location', region);
        newCard.innerHTML = `
            <button class="pin-btn" title="釘選此位置">📌</button>
            <button class="delete-btn" title="刪除此蘑菇">❌ 刪除</button>
            <img src="picture/${mInfo.img}" alt="蘑菇" class="card-icon">
            <h3>[${size}] ${mInfo.title}</h3>
            <p>📍 地點：${name}</p>
            <p class="countdown" 
               data-report-time="${reportTimeString}" 
               data-initial-hours="${hours}" 
               data-initial-minutes="${minutes}"
               data-initial-seconds="${seconds}">⏳ 剩餘時間：計算中...</p>
            <p>👥 目前人數：<span class="p-count">${pCount}</span> / ${limit} 人</p>
        `;

        const el = newCard.querySelector('.countdown');
        initSingleCountdown(el);

        mushroomContainer.prepend(newCard);
        
        if (locationFilter.value !== 'all' && locationFilter.value !== region) {
            const hasOption = Array.from(locationFilter.options).some(opt => opt.value === region);
            locationFilter.value = hasOption ? region : 'all';
        }

        filterLocation();
        mushroomForm.reset();
        document.getElementById('form-seconds').value = "0"; 
        updateCountLimitConstraint(); 
        alert("🎉 蘑菇回報成功！已加入列表。");
    });
}

// 6. 定位模組
function setupGeolocation() {
    if (!navigator.geolocation) {
        geoBtn.innerText = "❌ 不支援定位";
        geoBtn.disabled = true;
        return;
    }

    geoBtn.addEventListener('click', () => {
        geoBtn.innerText = "⌛ 定位中...";
        geoBtn.disabled = true;

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;

                try {
                    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&accept-language=zh-TW`);
                    const data = await response.json();
                    const address = data.display_name || "";
                    
                    const normalizedAddress = address.toLowerCase().replace(/臺/g, "台");
                    let matchedRegion = null;
                    
                    for (let region of regionsList) {
                        if (normalizedAddress.includes(region)) {
                            matchedRegion = region;
                            break;
                        }
                    }

                    if (matchedRegion) {
                        const hasFilterOption = Array.from(locationFilter.options).some(opt => opt.value === matchedRegion);
                        if (hasFilterOption) {
                            locationFilter.value = matchedRegion;
                        } else {
                            alert(`定位成功！您位於 [${matchedRegion}]。\n目前篩選器未單獨列出此區，系統將為您開啟全部顯示。`);
                            locationFilter.value = "all";
                        }
                    } else {
                        alert(`定位成功！但此專案暫無建立您所在的區域資料。\n\n您目前在：\n${address}\n\n系統將為您開啟全部顯示。`);
                        locationFilter.value = "all";
                    }

                    filterLocation();
                    geoBtn.innerText = "🎯 定位成功";
                } catch (error) {
                    alert("網路請求失敗，無法解析位置。");
                    geoBtn.innerText = "🎯 自動定位";
                } finally {
                    geoBtn.disabled = false;
                }
            },
            (error) => {
                alert("瀏覽器定位失敗。請確保在 Live Server 環境下給予位置授權。");
                geoBtn.innerText = "🎯 自動定位";
                geoBtn.disabled = false;
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    });
}

// 7. 智慧倒數計時器邏輯模組
const format = (num) => String(num).padStart(2, '0');

function initSingleCountdown(el) {
    const reportTimeString = el.getAttribute('data-report-time');
    const initialHours = parseInt(el.getAttribute('data-initial-hours')) || 0;
    const initialMinutes = parseInt(el.getAttribute('data-initial-minutes')) || 0;
    const initialSeconds = parseInt(el.getAttribute('data-initial-seconds')) || 0; 

    const reportTimestamp = Date.parse(reportTimeString.replace(/-/g, '/')); 
    const initialDurationMs = ((initialHours * 3600) + (initialMinutes * 60) + initialSeconds) * 1000;
    const expireTime = reportTimestamp + initialDurationMs;
    
    el.setAttribute('data-target', expireTime); 
    el.setAttribute('data-respawn', expireTime + 300000); 
}

function updateCountdowns() {
    const now = Date.now();
    const countdownElements = document.querySelectorAll('.countdown');

    countdownElements.forEach(el => {
        if (!document.body.contains(el)) return;

        const targetTime = parseInt(el.getAttribute('data-target'));
        const respawnTime = parseInt(el.getAttribute('data-respawn'));
        
        let timeLeft = targetTime - now;

        if (timeLeft > 0) {
            let seconds = Math.floor((timeLeft / 1000) % 60);
            let minutes = Math.floor((timeLeft / (1000 * 60)) % 60);
            let hours = Math.floor((timeLeft / (1000 * 60 * 60)) % 24);

            el.innerText = `⏳ 剩餘時間：${format(hours)}:${format(minutes)}:${format(seconds)}`;
            el.style.color = "#333";
        } else {
            let respawnLeft = respawnTime - now;

            if (respawnLeft > 0) {
                let rSeconds = Math.floor((respawnLeft / 1000) % 60);
                let rMinutes = Math.floor((respawnLeft / (1000 * 60)) % 60);

                el.innerText = `🔄 下次出現倒數：${format(rMinutes)}分${format(rSeconds)}秒`;
                el.style.color = "#d32f2f"; 
            } else {
                el.innerText = `✨ 蘑菇已重新出現！`;
                el.style.color = "#2e7d32";
            }
        }
    });
}

// 8. 事件監聽與初期化啟動
document.querySelectorAll('input[name="color"]').forEach(radio => {
    radio.addEventListener('change', calculatePower);
});

[heartsSelect, flowerSelect, decorSelect, mushroomTypeSelect].forEach(element => {
    element.addEventListener('change', calculatePower);
});

locationFilter.addEventListener('change', filterLocation);

// 全面啟動
calculatePower();
filterLocation();
setupPinFeature();
setupGeolocation();
setupDeveloperMode();
setupReportForm();
updateCountLimitConstraint(); 

document.querySelectorAll('.countdown').forEach(initSingleCountdown);
setInterval(updateCountdowns, 1000); 
updateCountdowns(); 
