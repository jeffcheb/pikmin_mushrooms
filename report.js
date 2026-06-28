// ==========================================
// 🎯 1. 核心 DOM 元素獲取與宣告
// ==========================================
const mushroomContainer = document.getElementById('mushroom-container');
const geoBtn = document.getElementById('geo-btn');
const mushroomForm = document.getElementById('mushroom-form');

const formCitySelect = document.getElementById('form-city');
const formDistrictSelect = document.getElementById('form-district');
const filterCitySelect = document.getElementById('filter-city');
const filterDistrictSelect = document.getElementById('filter-district');

const cardSortSelect = document.getElementById('card-sort');
const searchNameInput = document.getElementById('search-name');
const viewToggleBtn = document.getElementById('view-toggle-btn');

const formTypeSelect = document.getElementById('form-type');
const formSizeSelect = document.getElementById('form-size');
const formCountInput = document.getElementById('form-count');
const countHint = document.getElementById('count-hint');

const devModeBtn = document.getElementById('dev-mode-btn');
const devStatusText = document.getElementById('dev-status');
let isDevMode = false;

let globalMushroomList = [];
let activeReminders = JSON.parse(localStorage.getItem('mushroom_reminders') || '[]');
let sentNotifications = new Set(); 
let pinnedMushrooms = JSON.parse(localStorage.getItem('mushroom_pinned') || '[]');

let currentViewMode = localStorage.getItem('mushroom_view_mode') || 'grid';

// ==========================================
// 📡 2. Firebase 初始化
// ==========================================
const firebaseConfig = {
    apiKey: "AIzaSyBg9WBxj7Kb0937719661bV-bZ_r8k0M3Q",
    authDomain: "pikmin-mushroom-hub.firebaseapp.com",
    databaseURL: "https://pikmin-mushroom-hub-default-rtdb.firebaseio.com",
    projectId: "pikmin-mushroom-hub",
    storageBucket: "pikmin-mushroom-hub.appspot.com",
    messagingSenderId: "94609307791",
    appId: "1:94609307791:web:86fb196fbfbc5d71c1b18d"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const database = firebase.database();
const dbRef = database.ref('mushrooms');

// ==========================================
// 🗺️ 3. 全台灣 22 縣市完整行政區資料庫 (修正語法錯誤)
// ==========================================
const TaiwanData = {
    "基隆市": ["仁愛", "信義", "中正", "中山", "安樂", "暖暖", "七堵"],
    "臺北市": ["中正", "大同", "中山", "松山", "大安", "萬華", "信義", "士林", "北投", "內湖", "南港", "文山"],
    "新北市": ["板橋", "三重", "中和", "永和", "新莊", "新店", "樹林", "鶯歌", "三峽", "淡水", "汐止", "瑞芳", "土城", "蘆洲", "五股", "泰山", "林口", "深坑", "石碇", "坪林", "三芝", "石門", "八里", "平溪", "雙溪", "貢寮", "金山", "萬里", "烏來"],
    "桃園市": ["桃園", "中壢", "大溪", "楊梅", "蘆竹", "大園", "龜山", "八德", "龍潭", "平鎮", "新屋", "觀音", "復興"],
    "新竹市": ["東區", "北區", "香山"],
    "新竹縣": ["竹北", "竹東", "新埔", "關西", "湖口", "新豐", "芎林", "橫山", "北埔", "寶山", "峨眉", "尖石", "五峰"],
    "苗栗縣": ["苗栗", "苑裡", "通霄", "竹南", "頭份", "後龍", "卓蘭", "大湖", "公館", "銅鑼", "南庄", "頭屋", "三義", "西湖", "造橋", "三灣", "獅潭", "泰安"],
    "臺中市": ["中區", "東區", "南區", "西區", "北區", "北屯", "西屯", "南屯", "太平", "大里", "霧峰", "烏日", "豐原", "后里", "石岡", "東勢", "和平", "新社", "潭子", "大雅", "神岡", "大肚", "沙鹿", "龍井", "梧棲", "清水", "大甲", "外埔", "大安"],
    "彰化縣": ["彰化", "鹿港", "和美", "線西", "伸港", "福興", "秀水", "花壇", "芬園", "員林", "溪湖", "田中", "大村", "埔鹽", "埔心", "永靖", "社頭", "二水", "北斗", "二林", "田尾", "埤頭", "芳苑", "大城", "竹塘", "溪州"],
    "南投縣": ["南投", "埔里", "草屯", "竹山", "集集", "名間", "鹿谷", "中寮", "魚池", "國姓", "水里", "信義", "仁愛"],
    "雲林縣": ["斗六", "斗南", "虎尾", "西螺", "土庫", "北港", "古坑", "大埤", "莿桐", "林內", "二崙", "崙背", "麥寮", "東勢", "褒忠", "臺西", "元長", "四湖", "口湖", "水林"],
    "嘉義市": ["東區", "西區"],
    "嘉義縣": ["太保", "朴子", "布袋", "大林", "民雄", "溪口", "新港", "六腳", "東石", "義竹", "鹿草", "水上", "中埔", "竹崎", "梅山", "番路", "大埔", "阿里山"],
    "臺南市": ["中西", "東區", "南區", "北區", "安平", "安南", "永康", "歸仁", "新化", "左鎮", "玉井", "楠西", "南化", "仁德", "關廟", "龍崎", "官田", "麻豆", "佳里", "西港", "七股", "將軍", "學甲", "北門", "新營", "後壁", "白河", "東山", "六甲", "下營", "柳營", "鹽水", "善化", "大內", "山上", "新市", "安定"],
    "高雄市": ["鹽埕", "鼓山", "左營", "楠梓", "三民", "新興", "前金", "苓雅", "前鎮", "旗津", "小港", "鳳山", "林園", "大寮", "大樹", "大社", "仁武", "鳥松", "岡山", "橋頭", "燕巢", "田寮", "阿蓮", "路竹", "湖內", "茄萣", "永安", "彌陀", "梓官", "旗山", "美濃", "六龜", "甲仙", "杉林", "內門", "桃源", "那瑪夏"],
    "屏東縣": ["屏東", "三地門", "霧臺", "瑪家", "九如", "里港", "高樹", "鹽埔", "長治", "麟洛", "萬丹", "內埔", "竹田", "萬巒", "泰武", "來義", "潮州", "新埤", "枋寮", "枋山", "春日", "獅子", "牡丹", "恆春", "滿州", "車城", "琉球", "佳冬", "林邊", "南州", "崁頂", "東港", "新園"],
    "宜蘭縣": ["宜蘭", "羅東", "蘇澳", "頭城", "礁溪", "壯圍", "員山", "冬山", "五結", "三星", "大同", "南澳"],
    "花蓮縣": ["花蓮", "鳳林", "玉里", "新城", "吉安", "壽豐", "光復", "豐濱", "瑞穗", "富里", "秀林", "萬榮", "卓溪"],
    "臺東縣": ["臺東", "成功", "關山", "長濱", "海端", "池上", "東河", "鹿野", "延平", "卑南", "金峰", "大武", "達仁", "綠島", "蘭嶼", "太麻里"],
    "澎湖縣": ["馬公", "湖西", "白沙", "西嶼", "望安", "七美"],
    "金門縣": ["金城", "金沙", "金湖", "金寧", "烈嶼", "烏坵"],
    "連江縣": ["南竿", "北竿", "莒光", "東引"]
};

// ==========================================
// ⚙️ 4. 下拉選單連動與初始化
// ==========================================
function initCityDropdowns() {
    const cities = Object.keys(TaiwanData);
    formCitySelect.innerHTML = '';
    cities.forEach(city => {
        const opt = document.createElement('option');
        opt.value = city; opt.innerText = city;
        formCitySelect.appendChild(opt);
    });
    formCitySelect.value = "高雄市"; 
    updateDistrictDropdown(formCitySelect, formDistrictSelect, false);

    filterCitySelect.innerHTML = '<option value="all">顯示所有縣市</option>';
    cities.forEach(city => {
        const opt = document.createElement('option');
        opt.value = city; opt.innerText = city;
        filterCitySelect.appendChild(opt);
    });
    updateViewToggleBtnText();
}

function updateDistrictDropdown(citySelect, districtSelect, includeAllOption = false) {
    const selectedCity = citySelect.value;
    districtSelect.innerHTML = ''; 
    if (includeAllOption) {
        const defaultOpt = document.createElement('option');
        defaultOpt.value = 'all'; defaultOpt.innerText = '顯示所有行政區';
        districtSelect.appendChild(defaultOpt);
    }
    if (TaiwanData[selectedCity]) {
        TaiwanData[selectedCity].forEach(dist => {
            const opt = document.createElement('option');
            opt.value = dist;
            let suffix = '區';
            if (selectedCity.endsWith('縣')) {
                if (['太保','朴子','布袋','大林','潮州','東港','恆春','員林','和美','鹿港','草屯','竹東','竹北','頭份','竹南','後龍','通霄','苑裡','頭屋','公館','西湖','三義','大湖','銅鑼','礁溪','頭城','蘇澳','羅東','三星','冬山','五結','壯圍','員山','吉安','新城','壽豐','光復','瑞穗','富里','鳳林','玉里','成功','關山','池上','鹿野','卑南','大武','太麻里','城中','金沙','金湖','金寧','烈嶼'].includes(dist)) {
                    suffix = (['太保','朴子','馬公','竹北','員林','頭份'].includes(dist)) ? '市' : (['布袋','大林','潮州','東港','恆春','和美','鹿港','草屯','竹東','關西','新埔','頭份','竹南','後龍','通霄','苑裡','礁溪','頭城','蘇澳','羅東','鳳林','玉里','成功','關山','金城','金沙','金湖'].includes(dist) ? '鎮' : '鄉');
                } else { suffix = '鄉'; }
            } else if (selectedCity === '澎湖縣' && dist === '馬公') { suffix = '市'; }
            else if (selectedCity === '澎湖縣') { suffix = '鄉'; }
            opt.innerText = dist + suffix;
            districtSelect.appendChild(opt);
        });
    }
}

function getCountLimit(size) {
    if (size === '小') return 25;
    if (size === '普通') return 30;
    if (size === '大') return 35;
    if (size === '巨型') return 40;
    return 30; 
}

function updateCountLimitConstraint() {
    const limit = getCountLimit(formSizeSelect.value);
    formCountInput.max = limit;
    formCountInput.placeholder = `0-${limit}`;
    countHint.innerText = `上限: ${limit}人`;
    if (parseInt(formCountInput.value) > limit) { formCountInput.value = limit; }
}

// ==========================================
// 🎴 5. 檢視模式控制與按鈕文字切換
// ==========================================
function updateViewToggleBtnText() {
    if (!viewToggleBtn) return;
    if (currentViewMode === 'list') {
        viewToggleBtn.innerText = "📋 清單模式";
        mushroomContainer.classList.add('list-view');
    } else {
        viewToggleBtn.innerText = "🎴 卡片模式";
        mushroomContainer.classList.remove('list-view');
    }
}

if (viewToggleBtn) {
    viewToggleBtn.addEventListener('click', () => {
        currentViewMode = (currentViewMode === 'grid') ? 'list' : 'grid';
        localStorage.setItem('mushroom_view_mode', currentViewMode);
        updateViewToggleBtnText();
        filterAndSortMushroomCards();
    });
}

// ==========================================
// 🎯 6. 真・自動定位反查模組 (修復功能)
// ==========================================
if (geoBtn) {
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
                    
                    const normalizedAddress = address.toLowerCase().replace(/臺/g, "臺");
                    let matchedCity = null;
                    let matchedDistrict = null;
                    
                    // 1. 先比對縣市
                    for (let city of Object.keys(TaiwanData)) {
                        if (normalizedAddress.includes(city)) {
                            matchedCity = city;
                            break;
                        }
                    }

                    if (matchedCity) {
                        filterCitySelect.value = matchedCity;
                        updateDistrictDropdown(filterCitySelect, filterDistrictSelect, true);
                        
                        // 2. 再比對行政區
                        for (let dist of TaiwanData[matchedCity]) {
                            if (normalizedAddress.includes(dist)) {
                                matchedDistrict = dist;
                                break;
                            }
                        }

                        if (matchedDistrict) {
                            filterDistrictSelect.value = matchedDistrict;
                            alert(`🎯 定位成功！您目前位於：[${matchedCity} ${matchedDistrict}]`);
                        } else {
                            filterDistrictSelect.value = "all";
                            alert(`🎯 定位到縣市：[${matchedCity}]，但找不到精確行政區，已為您開啟全區顯示。`);
                        }
                    } else {
                        alert("定位成功，但找不到對應的台灣縣市資料，已開啟全部顯示。");
                        filterCitySelect.value = "all";
                        filterDistrictSelect.innerHTML = '<option value="all">顯示所有行政區</option>';
                    }

                    filterAndSortMushroomCards();
                    geoBtn.innerText = "🎯 自動定位";
                } catch (error) {
                    alert("網路請求失敗，無法解析 GPS 座標。");
                    geoBtn.innerText = "🎯 自動定位";
                } finally {
                    geoBtn.disabled = false;
                }
            },
            (error) => {
                alert("GPS 定位獲取失敗，請確認是否允許瀏覽器位置權限。");
                geoBtn.innerText = "🎯 自動定位";
                geoBtn.disabled = false;
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    });
}

// ==========================================
// 📊 7. 核心篩選、排序與卡片生成
// ==========================================
function filterAndSortMushroomCards() {
    const selectedCity = filterCitySelect.value;
    const selectedDistrict = filterDistrictSelect.value;
    const sortWay = cardSortSelect.value;
    const searchKeyword = searchNameInput ? searchNameInput.value.trim().toLowerCase() : "";

    let filteredList = globalMushroomList.filter(item => {
        const data = item.data;
        if (!data) return false;
        const cardDistricts = Array.isArray(data.district) ? data.district : [data.district];
        const matchCity = (selectedCity === 'all' || data.city === selectedCity);
        const matchDistrict = (selectedDistrict === 'all' || cardDistricts.includes(selectedDistrict));
        const matchKeyword = (!searchKeyword || data.name.toLowerCase().includes(searchKeyword) || data.title.toLowerCase().includes(searchKeyword));
        return matchCity && matchDistrict && matchKeyword;
    });

    const sizeWeight = { "巨型": 4, "大": 3, "普通": 2, "小": 1 };

    filteredList.sort((a, b) => {
        const dataA = a.data; const dataB = b.data;
        if (sortWay === "updateTime") {
            return (Date.parse(dataB.reportTime.replace(/-/g, '/')) || 0) - (Date.parse(dataA.reportTime.replace(/-/g, '/')) || 0);
        } else if (sortWay === "remainingTime") {
            const now = Date.now();
            const getTimes = (d) => {
                const repTime = Date.parse(d.reportTime.replace(/-/g, '/')) || 0;
                const totalDur = ((parseInt(d.hours) || 0) * 3600 + (parseInt(d.minutes) || 0) * 60 + (parseInt(d.seconds) || 0)) * 1000;
                return { expire: repTime + totalDur, respawn: repTime + totalDur + 300000 };
            };
            const tA = getTimes(dataA); const tB = getTimes(dataB);
            const getStatusRank = (t) => { if (now < t.expire) return 2; if (now >= t.expire && now < t.respawn) return 1; return 3; };
            const rankA = getStatusRank(tA); const rankB = getStatusRank(tB);
            if (rankA !== rankB) return rankA - rankB;
            return (rankA === 1) ? tA.respawn - tB.respawn : (rankA === 2 ? tA.expire - tB.expire : tB.expire - tA.expire);
        } else if (sortWay === "totalPlayers") {
            return (dataB.pCount || 0) - (dataA.pCount || 0);
        } else if (sortWay === "mushroomSize") {
            return (sizeWeight[dataB.size] || 0) - (sizeWeight[dataA.size] || 0);
        } else if (sortWay === "mushroomType") {
            return dataA.title.localeCompare(dataB.title, 'zh-Hant');
        }
        return 0;
    });

    filteredList.sort((a, b) => {
        const isPinnedA = pinnedMushrooms.includes(a.id) ? 1 : 0;
        const isPinnedB = pinnedMushrooms.includes(b.id) ? 1 : 0;
        return isPinnedB - isPinnedA;
    });

    mushroomContainer.innerHTML = '';
    filteredList.forEach(item => { renderMushroomCard(item.id, item.data); });
}

function renderMushroomCard(id, data) {
    const newCard = document.createElement('div');
    newCard.className = "card";
    newCard.setAttribute('data-id', id);

    const isSubscribed = activeReminders.includes(id);
    const isPinned = pinnedMushrooms.includes(id);
    let notifyBtnText = isSubscribed ? "🔔 已設提醒" : "🔔 提醒我";
    const districtArray = Array.isArray(data.district) ? data.district : [data.district];
    
    newCard.innerHTML = `
        <button class="pin-btn ${isPinned?'active':''}" title="釘選">📌</button>
        <button class="quick-edit-btn" title="更新">📝 更新</button>
        <button class="delete-btn" title="刪除">❌</button>
        <img src="picture/${data.img}" alt="菇" class="card-icon" onerror="this.src='picture/mushroom_red.png'">
        <h3>[${data.size}] ${data.title} <span class="time-info-btn" data-time="${data.reportTime}" style="cursor:pointer;">◉</span></h3>
        <p>📍 ${data.city}(${districtArray.join('/')}) ${data.name}</p>
        <p class="countdown" data-report-time="${data.reportTime}" data-initial-hours="${data.hours}" data-initial-minutes="${data.minutes}" data-initial-seconds="${data.seconds}" style="font-weight:bold;">⏳ 計算中...</p>
        <p>👥 人數：<span class="p-count">${data.pCount}</span>/${data.limit}人 <button class="verify-fact-btn" style="display:none;">✅ 核實</button></p>
        <button class="notify-me-btn" style="border-radius:20px; padding:3px 12px; font-size:12px; cursor:pointer;">${notifyBtnText}</button>
    `;
    
    const reportTimestamp = Date.parse(data.reportTime.replace(/-/g, '/'));
    const duration = ((parseInt(data.hours)||0)*3600 + (parseInt(data.minutes)||0)*60 + (parseInt(data.seconds)||0))*1000;
    newCard.querySelector('.countdown').setAttribute('data-target', reportTimestamp + duration);
    newCard.querySelector('.countdown').setAttribute('data-respawn', reportTimestamp + duration + 300000);
    
    mushroomContainer.appendChild(newCard);
}

function updateCountdowns() {
    const now = Date.now();
    document.querySelectorAll('.countdown').forEach(el => {
        if (!document.body.contains(el)) return;
        const currentCard = el.closest('.card');
        const cardId = currentCard.getAttribute('data-id');
        const verifyBtn = currentCard.querySelector('.verify-fact-btn');
        const notifyBtn = currentCard.querySelector('.notify-me-btn');
        
        const targetTime = parseInt(el.getAttribute('data-target'));
        const respawnTime = parseInt(el.getAttribute('data-respawn'));
        let timeLeft = targetTime - now;

        if (timeLeft > 0) {
            if (verifyBtn) verifyBtn.style.display = 'inline-block';
            if (notifyBtn) notifyBtn.style.display = 'inline-block';
            let s = Math.floor((timeLeft/1000)%60), m = Math.floor((timeLeft/(1000*60))%60), h = Math.floor((timeLeft/(1000*60*60))%24);
            el.innerText = `⏳ 剩餘：${format(h)}:${format(m)}:${format(s)}`;
            el.style.color = "#333";
        } else {
            if (verifyBtn) verifyBtn.style.display = 'none';
            let respawnLeftMs = respawnTime - now;
            if (respawnLeftMs > 0) {
                if (notifyBtn) notifyBtn.style.display = 'inline-block';
                let rS = Math.floor((respawnLeftMs/1000)%60), rM = Math.floor((respawnLeftMs/(1000*60))%60);
                el.innerText = `🔄 下次出現倒數：${format(rM)}分${format(rS)}秒`;
                el.style.color = "#d32f2f";
            } else {
                if (notifyBtn) notifyBtn.style.display = 'none';
                el.innerText = `⌛ 狀態：新蘑菇待更新...`; el.style.color = "#c62828";
            }
        }
    });
}

// ==========================================
// 📌 8. 功能組件與 Firebase 交互
// ==========================================
function setupPinFeature() {
    mushroomContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('pin-btn')) {
            const firebaseId = e.target.closest('.card').getAttribute('data-id');
            const index = pinnedMushrooms.indexOf(firebaseId);
            if (index === -1) pinnedMushrooms.push(firebaseId);
            else pinnedMushrooms.splice(index, 1);
            localStorage.setItem('mushroom_pinned', JSON.stringify(pinnedMushrooms));
            filterAndSortMushroomCards();
        }
    });
}

if (mushroomForm) {
    mushroomForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const city = formCitySelect.value, district = formDistrictSelect.value, name = document.getElementById('form-name').value.trim();
        if (!name) return alert("❌ 請輸入名稱");
        const type = formTypeSelect.value, size = formSizeSelect.value, pCount = parseInt(formCountInput.value)||0;
        const h = parseInt(document.getElementById('form-hours').value)||0, m = parseInt(document.getElementById('form-minutes').value)||0, s = parseInt(document.getElementById('form-seconds').value)||0;
        
        const typeMap = { red: "紅色蘑菇", blue: "藍色蘑菇", yellow: "黃色蘑菇", purple: "紫色蘑菇", white: "白色蘑菇", rock: "灰色蘑菇", wing: "粉紅色蘑菇", ice: "冰藍蘑菇", rock_crystal: "特殊水晶蘑菇", red_fire: "元素火蘑菇", blue_water: "元素水蘑菇", white_poison: "元素毒蘑菇", yellow_electric: "元素電子蘑菇", event_special: "本月限定活動蘑菇" };
        const now = new Date();
        const repTime = `${now.getFullYear()}-${format(now.getMonth()+1)}-${format(now.getDate())} ${format(now.getHours())}:${format(now.getMinutes())}:${format(now.getSeconds())}`;

        const targetData = { city, district: [district], name, size, title: typeMap[type]||"未知蘑菇", img: `mushroom_${type}.png`, reportTime: repTime, hours: h, minutes: m, seconds: s, pCount, limit: getCountLimit(size) };
        dbRef.push(targetData).then(() => { alert("🚀 上報成功！"); mushroomForm.reset(); filterAndSortMushroomCards(); });
    });
}

function listenToCloudDatabase() { dbRef.on('value', (snap) => { globalMushroomList = []; snap.forEach(c => { globalMushroomList.push({ id: c.key, data: c.val() }); }); filterAndSortMushroomCards(); }); }
const format = (n) => String(n).padStart(2, '0');

formCitySelect.addEventListener('change', () => updateDistrictDropdown(formCitySelect, formDistrictSelect, false));
filterCitySelect.addEventListener('change', () => {
    if (filterCitySelect.value === 'all') { filterDistrictSelect.innerHTML = '<option value="all">顯示所有行政區</option>'; filterAndSortMushroomCards(); } 
    else { updateDistrictDropdown(filterCitySelect, filterDistrictSelect, true); filterAndSortMushroomCards(); }
});
filterDistrictSelect.addEventListener('change', filterAndSortMushroomCards);
if (cardSortSelect) cardSortSelect.addEventListener('change', filterAndSortMushroomCards);
if (searchNameInput) searchNameInput.addEventListener('input', filterAndSortMushroomCards);

// 全面初始化
initCityDropdowns();
setupPinFeature();
listenToCloudDatabase();
setInterval(updateCountdowns, 1000);
