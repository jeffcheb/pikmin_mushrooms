// 獲取設定元素
const heartsSelect = document.getElementById('hearts');
const flowerSelect = document.getElementById('flower');
const decorSelect = document.getElementById('decor');
const mushroomTypeSelect = document.getElementById('mushroom-type');
const totalScoreDisplay = document.getElementById('total-score');
const mushroomContainer = document.getElementById('mushroom-container');
const geoBtn = document.getElementById('geo-btn');
const mushroomForm = document.getElementById('mushroom-form');

// 雙層連動相關選單元素
const formCitySelect = document.getElementById('form-city');
const formDistrictSelect = document.getElementById('form-district');
const filterCitySelect = document.getElementById('filter-city');
const filterDistrictSelect = document.getElementById('filter-district');

// 表單動態限制人數元素
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

// 🗺️ 南部完整的「縣市行政區資料庫」
const southernDistricts = {
    "高雄市": ["鹽埕", "鼓山", "左營", "楠梓", "三民", "新興", "前金", "苓雅", "前鎮", "旗津", "小港", "鳳山", "林園", "大寮", "大樹", "大社區", "仁武", "鳥松", "岡山", "橋頭", "燕巢", "田寮", "阿蓮", "路竹", "湖內", "茄萣", "永安", "彌陀", "梓官", "旗山", "美濃", "六龜", "甲仙", "杉林", "內門", "茂林", "桃源", "那瑪夏"],
    "臺南市": ["新營", "鹽水", "白河", "柳營", "後壁", "東山", "麻豆", "下營", "六甲", "官田", "大內", "佳里", "學甲", "西港", "七股", "將軍", "北門", "新化", "善化", "新市", "安定", "山上", "玉井", "楠西", "南化", "左鎮", "仁德", "歸仁", "關廟", "龍崎", "永康", "東區", "南區", "北區", "安南", "安平", "中西"],
    "嘉義市": ["東區", "西區"],
    "嘉義縣": ["太保", "朴子", "布袋", "大林", "民雄", "溪口", "新港", "六腳", "東石", "義竹", "鹿草", "水上", "中埔", "竹崎", "梅山", "番路", "大埔", "阿里山"],
    "屏東縣": ["屏東", "潮州", "東港", "恆春", "萬丹", "長治", "麟洛", "九如", "里港", "高樹", "萬巒", "內埔", "竹田", "新埤", "枋寮", "新園", "崁頂", "林邊", "南州", "佳冬", "琉球", "車城", "滿州", "枋山", "三地門", "霧臺", "瑪家", "泰武", "來義", "春日", "獅子", "牡丹"]
};

// 🔄 函數：根據選擇的縣市，更新行政區下拉選單
function updateDistrictDropdown(citySelect, districtSelect, includeAllOption = false) {
    const selectedCity = citySelect.value;
    districtSelect.innerHTML = ''; // 清空舊選項

    if (includeAllOption) {
        const defaultOpt = document.createElement('option');
        defaultOpt.value = 'all';
        defaultOpt.innerText = '顯示所有行政區';
        districtSelect.appendChild(defaultOpt);
    }

    if (southernDistricts[selectedCity]) {
        southernDistricts[selectedCity].forEach(dist => {
            const opt = document.createElement('option');
            opt.value = dist;
            opt.innerText = dist + (selectedCity === '嘉義市' ? '區' : (selectedCity.endsWith('縣') && !['太保','朴子','布袋','大林','潮州','東港','恆春'].includes(dist) ? '鄉' : (['太保','朴子','布袋','大林','潮州','東港','恆春'].includes(dist) ? '鎮' : '區')));
            districtSelect.appendChild(opt);
        });
    }
}

// 根據種類與大小動態計算人數上限值
function getCountLimit() {
    const type = formTypeSelect.value;
    const size = formSizeSelect.value;
    if (type === 'event' || size === '巨型') return 30;
    if (size === '大') return 20;
    return 5;
}

function updateCountLimitConstraint() {
    const limit = getCountLimit();
    formCountInput.max = limit;
    formCountInput.placeholder = `0-${limit}`;
    countHint.innerText = `上限: ${limit}人`;
    if (parseInt(formCountInput.value) > limit) {
        formCountInput.value = limit;
    }
}

// 1. 戰力計算邏輯
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
    totalScoreDisplay.innerText = base + hearts + flower + decor + match;
}

// 2. 地區雙層篩選控制邏輯
function filterLocation() {
    const selectedCity = filterCitySelect.value;
    const selectedDistrict = filterDistrictSelect.value;
    const cards = document.querySelectorAll('#mushroom-container .card');

    cards.forEach(card => {
        const cardCity = card.getAttribute('data-city');
        const cardDistrict = card.getAttribute('data-district');

        const matchCity = (selectedCity === 'all' || cardCity === selectedCity);
        const matchDistrict = (selectedDistrict === 'all' || cardDistrict === selectedDistrict);

        if (matchCity && matchDistrict) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
}

// 3. 釘選功能
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

// 4. 開發者編輯模式
function setupDeveloperMode() {
    const CORRECT_PASSWORD = "admin123";
    devModeBtn.addEventListener('click', () => {
        if (!isDevMode) {
            const inputPassword = prompt("🔐 請輸入開發者安全驗證密碼：");
            if (inputPassword === CORRECT_PASSWORD) {
                isDevMode = true;
                document.body.classList.add('dev-active');
                devModeBtn.innerText = "🔒 關閉編輯模式";
                devStatusText.innerText = "🔓 開發者編輯中 (點擊卡片左上角 ❌ 可刪除蘑菇)";
                devStatusText.style.color = "#d32f2f";
            } else if (inputPassword !== null) {
                alert("❌ 密碼錯誤！");
            }
        } else {
            isDevMode = false;
            document.body.classList.remove('dev-active');
            devModeBtn.innerText = "🛠️ 開啟開發者模式";
            devStatusText.innerText = "🔒 安全瀏覽模式";
            devStatusText.style.color = "#546e7a";
        }
    });

    mushroomContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('delete-btn')) {
            const currentCard = e.target.closest('.card');
            if (confirm("⚠️ 確定要刪除嗎？")) currentCard.remove();
        }
    });
}

// 5. 手動回報表單控制組件
function setupReportForm() {
    mushroomForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const limit = getCountLimit();
        const pCount = parseInt(formCountInput.value) || 0;

        if (pCount < 0 || pCount > limit) {
            alert(`❌ 人數超出當前限制 (0-${limit}人)。`);
            return;
        }

        const city = formCitySelect.value;
        const district = formDistrictSelect.value;
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
        newCard.setAttribute('data-city', city);
        newCard.setAttribute('data-district', district);
        newCard.innerHTML = `
            <button class="pin-btn" title="釘選此位置">📌</button>
            <button class="delete-btn" title="刪除此蘑菇">❌ 刪除</button>
            <img src="picture/${mInfo.img}" alt="蘑菇" class="card-icon">
            <h3>[${size}] ${mInfo.title}</h3>
            <p>📍 地點：${city}${district}區 ${name}</p>
            <p class="countdown" 
               data-report-time="${reportTimeString}" 
               data-initial-hours="${hours}" 
               data-initial-minutes="${minutes}"
               data-initial-seconds="${seconds}">⏳ 剩餘時間：計算中...</p>
            <p>👥 目前人數：<span class="p-count">${pCount}</span> / ${limit} 人</p>
        `;

        initSingleCountdown(newCard.querySelector('.countdown'));
        mushroomContainer.prepend(newCard);
        
        // 自動同步切換下方篩選器至該回報縣市與行政區
        filterCitySelect.value = city;
        updateDistrictDropdown(filterCitySelect, filterDistrictSelect, true);
        filterDistrictSelect.value = district;

        filterLocation();
        mushroomForm.reset();
        document.getElementById('form-seconds').value = "0"; 
        updateDistrictDropdown(formCitySelect, formDistrictSelect, false);
        updateCountLimitConstraint(); 
        alert("🎉 蘑菇回報成功！");
    });
}

// 6. GPS 自動定位模組 (自動連動雙層下拉選單)
function setupGeolocation() {
    if (!navigator.geolocation) return;

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
                    
                    let foundCity = null;
                    let foundDistrict = null;

                    // 檢查比對目前所在的南部縣市與行政區
                    for (let city in southernDistricts) {
                        if (normalizedAddress.includes(city.replace(/臺/g, "台"))) {
                            foundCity = city;
                            for (let dist of southernDistricts[city]) {
                                if (normalizedAddress.includes(dist)) {
                                    foundDistrict = dist;
                                    break;
                                }
                            }
                            break;
                        }
                    }

                    if (foundCity && foundDistrict) {
                        filterCitySelect.value = foundCity;
                        updateDistrictDropdown(filterCitySelect, filterDistrictSelect, true);
                        filterDistrictSelect.value = foundDistrict;
                        alert(`🎯 自動定位成功！已切換至：${foundCity} ${foundDistrict}`);
                    } else {
                        alert(`定位成功！但此專案暫無建立您所在的區域資料。\n您目前在：\n${address}`);
                        filterCitySelect.value = "all";
                        filterDistrictSelect.innerHTML = '<option value="all">顯示所有行政區</option>';
                    }

                    filterLocation();
                    geoBtn.innerText = "🎯 自動定位";
                } catch (error) {
                    alert("網路解碼失敗。");
                    geoBtn.innerText = "🎯 自動定位";
                } finally {
                    geoBtn.disabled = false;
                }
            },
            () => {
                alert("定位失敗，請確保在安全 HTTPS 或 Live Server 環境下開啟 GPS 授權。");
                geoBtn.innerText = "🎯 自動定位";
                geoBtn.disabled = false;
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    });
}

// 7. 智慧倒數計時器
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
    document.querySelectorAll('.countdown').forEach(el => {
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

// 8. 綁定雙層下拉選單連動事件
formCitySelect.addEventListener('change', () => updateDistrictDropdown(formCitySelect, formDistrictSelect, false));
filterCitySelect.addEventListener('change', () => {
    if (filterCitySelect.value === 'all') {
        filterDistrictSelect.innerHTML = '<option value="all">顯示所有行政區</option>';
        filterLocation();
    } else {
        updateDistrictDropdown(filterCitySelect, filterDistrictSelect, true);
        filterLocation();
    }
});
filterDistrictSelect.addEventListener('change', filterLocation);

// 全面初始化啟動
calculatePower();
updateDistrictDropdown(formCitySelect, formDistrictSelect, false); // 初始化表單行政區
setupPinFeature();
setupGeolocation();
setupDeveloperMode();
setupReportForm();
updateCountLimitConstraint(); 

document.querySelectorAll('input[name="color"]').forEach(r => r.addEventListener('change', calculatePower));
[heartsSelect, flowerSelect, decorSelect, mushroomTypeSelect].forEach(e => e.addEventListener('change', calculatePower));
document.querySelectorAll('.countdown').forEach(initSingleCountdown);

setInterval(updateCountdowns, 1000); 
updateCountdowns(); 
