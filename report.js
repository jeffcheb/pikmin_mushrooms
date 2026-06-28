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

// 預設檢視模式
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
// 🗺️ 3. 全台灣 22 縣市完整行政區資料庫
// ==========================================
const TaiwanData = {
    "基隆市": ["仁愛區", "信義區", "中正區", "中山區", "安樂區", "暖暖區", "七堵區"],
    "台北市": ["中正區", "大同區", "中山區", "松山區", "大安區", "萬華區", "信義區", "士林區", "北投區", "內湖區", "南港區", "文山區"],
    "新北市": ["板橋區", "三重區", "中和區", "永和區", "新莊區", "新店區", "樹林區", "鶯歌區", "三峽區", "淡水區", "汐止區", "瑞芳區", "土城區", "蘆洲區", "五股區", "泰山區", "林口區", "深坑區", "石碇區", "坪林區", "三芝區", "石門區", "八里區", "平溪區", "雙溪區", "貢寮區", "金山區", "萬里區", "烏來區"],
    "桃園市": ["桃園區", "中壢區", "大溪區", "楊梅區", "蘆竹區", "大園區", "龜山區", "八德區", "龍潭區", "平鎮區", "新屋區", "觀音區", "復興區"],
    "新竹市": ["東區", "北區", "香山區"],
    "新竹縣": ["竹北市", "竹東鎮", "新埔鎮", "關西鎮", "湖口鄉", "新豐鄉", "芎林鄉", "橫山鄉", "北埔鄉", "寶山鄉", "峨眉鄉", "尖石鄉", "五峰鄉"],
    "苗栗縣": ["苗栗市", "苑裡鎮", "通霄鎮", "竹南鎮", "頭份市", "後龍鎮", "卓蘭鎮", "大湖鄉", "公館鄉", "銅鑼鄉", "南莊鄉", "頭屋鄉", "三義鄉", "西湖鄉", "造橋鄉", "三灣鄉", "獅潭鄉", "泰安鄉"],
    "台中市": ["中區", "東區", "南區", "西區", "北區", "北屯區", "西屯區", "南屯區", "太平區", "大里區", "霧峰區", "烏日區", "豐原區", "后里區", "石岡區", "東勢區", "和平區", "新社區", "潭子區", "大雅區", "神岡區", "大肚區", "沙鹿區", "龍井區", "梧棲區", "清水區", "大甲區", "外埔區", "大安區"],
    "彰化縣": ["彰化市", "鹿港鎮", "和美鎮", "線西鄉", "伸港鄉", "福興鄉", "秀水鄉", "花壇鄉", "芬園鄉", "員林市", "溪湖鎮", "田中鎮", "大村鄉", "埔鹽鄉", "埔心鄉", "永靖鄉", "社頭鄉", "二水鄉", "北斗鎮", "二林鎮", "田尾鄉", "埤頭鄉", "芳苑鄉", "大城鄉", "竹塘鄉", "溪州鄉"],
    "南投縣": ["南投市", "埔里鎮", "草屯鎮", "竹山鎮", "集集鎮", "名間鄉", "鹿谷鄉", "中寮鄉", "魚池鄉", "國姓鄉", "水里鄉", "信義鄉", "仁愛鄉"],
    "雲林縣": ["斗六市", "斗南鎮", "虎尾鎮", "西螺鎮", "土庫鎮", "北港鎮", "古坑鄉", "大埤鄉", "莿桐鄉", "林內鄉", "二崙鄉", "崙背鄉", "麥寮鄉", "東勢鄉", "褒忠鄉", "臺西鄉", "元長鄉", "四湖鄉", "口湖鄉", "水林鄉"],
    "嘉義市": ["東區", "西區"],
    "嘉義縣": ["太保市", "朴子市", "布袋鎮", "大林鎮", "民雄鄉", "溪口鄉", "新港鄉", "六腳鄉", "東石鄉", "義竹鄉", "鹿草鄉", "水上鄉", "中埔鄉", "竹崎鄉", "梅山鄉", "番路鄉", "大埔鄉", "阿里山鄉"],
    "台南市": ["中西區", "東區", "南區", "北區", "安平區", "安南區", "永康區", "歸仁區", "新化區", "左鎮鄉", "玉井區", "楠西區", "南化區", "仁德區", "關廟區", "龍崎鄉", "官田區", "麻豆區", "佳里區", "西港區", "七股區", "將軍區", "學甲區", "北門區", "新營區", "後壁區", "白河區", "東山區", "六甲區", "下營區", "柳營區", "鹽水區", "善化區", "大內區", "山上區", "新市區", "安定區"],
    "高雄市": ["鹽埕區", "鼓山區", "左營區", "楠梓區", "三民區", "新興區", "前金區", "苓雅區", "前鎮區", "旗津區", "小港區", "鳳山區", "林園區", "大寮區", "大樹區", "大社區", "仁武區", "鳥松區", "岡山區", "橋頭區", "燕巢區", "田寮鄉", "阿蓮區", "路竹區", "湖內區", "茄萣區", "永安區", "彌陀區", "梓官區", "旗山區", "美濃區", "六龜區", "甲仙區", "杉林區", "內門區", "茂林區", "桃源區", "那瑪夏區"],
    "屏東縣": ["屏東市", "三地門鄉", "霧臺鄉", "瑪家鄉", "九如鄉", "里港鄉", "高樹鄉", "鹽埔鄉", "長治鄉", "麟洛鄉", "萬丹鄉", "內埔鄉", "竹田鄉", "萬巒鄉", "泰武鄉", "來義鄉", "潮州鎮", "新埤鄉", "枋寮鄉", "枋山鄉", "春日鄉", "獅子鄉", "牡丹鄉", "恆春鎮", "滿州鄉", "車城鄉", "琉球鄉", "佳冬鄉", "林邊鄉", "南州鄉", "崁頂鄉", "東港鎮", "新園鄉"],
    "宜蘭縣": ["宜蘭市", "羅東鎮", "蘇澳鎮", "頭城鎮", "礁溪鄉", "壯圍鄉", "員山鄉", "冬山鄉", "五結鄉", "三星鄉", "大同鄉", "南澳鄉"],
    "花蓮縣": ["花蓮市", "鳳林鎮", "玉里鎮", "新城鄉", "吉安鄉", "壽豐鄉", "光復鄉", "豐濱鄉", "瑞穗鄉", "富里鄉", "秀林鄉", "萬榮鄉", "卓溪鄉"],
    "台東縣": ["臺東市", "成功鎮", "關山鎮", "長濱鄉", "海端鄉", "池上鄉", "東河鄉", "鹿野鄉", "延平鄉", "卑南鄉", "金峰鄉", "大武鄉", "達仁鄉", "綠島鄉", "蘭嶼鄉", "太麻里鄉"],
    "澎湖縣": ["馬公市", "湖西鄉", "白沙鄉", "西嶼鄉", "望安鄉", "七美鄉"],
    "金門縣": ["金城鎮", "金沙鎮", "金湖鎮", "金寧鄉", "烈嶼鄉", "烏坵鄉"],
    "連江縣": ["南竿鄉", "北竿鄉", "莒光鄉", "東引鄉"]
};

// 儲存加載後的台灣邊界圖資
let geojsonTaiwanData = null;

// ==========================================
// ⚙️ 4. 下拉選單連動與初始化
// ==========================================
function initCityDropdowns() {
    if (!formCitySelect || !filterCitySelect) return;
    
    let formCityHtml = "";
    let filterCityHtml = '<option value="all">顯示所有縣市</option>';

    Object.keys(TaiwanData).forEach(city => {
        formCityHtml += `<option value="${city}">${city}</option>`;
        filterCityHtml += `<option value="${city}">${city}</option>`;
    });

    formCitySelect.innerHTML = formCityHtml;
    filterCitySelect.innerHTML = filterCityHtml;

    formCitySelect.value = "台北市"; 
    updateDistrictDropdown(formCitySelect, formDistrictSelect, false);
    filterDistrictSelect.innerHTML = '<option value="all">顯示所有行政區</option>';
    
    updateViewToggleBtnText();
    // 非同步預先加載台灣邊界圖資，優化定位速度
    loadTaiwanGeoJson();
}

function updateDistrictDropdown(citySelect, districtSelect, isFilter) {
    const selectedCity = citySelect.value;
    let html = isFilter ? '<option value="all">顯示所有行政區</option>' : '';
    
    if (TaiwanData[selectedCity]) {
        TaiwanData[selectedCity].forEach(dist => {
            html += `<option value="${dist}">${dist}</option>`;
        });
    }
    districtSelect.innerHTML = html;
}

function getCountLimit(size) {
    if (size === '小') return 25;
    if (size === '普通') return 30;
    if (size === '大') return 35;
    if (size === '巨型') return 40;
    return 30; 
}

// 載入公用 GeoJSON（使用國土測繪或社群開源輕量邊界圖資）
async function loadTaiwanGeoJson() {
    try {
        const res = await fetch('https://raw.githubusercontent.com/g0v/twreallive/master/src/data/town.json');
        if (res.ok) {
            geojsonTaiwanData = await res.json();
        }
    } catch (e) {
        console.error("無法加載邊界地圖資料，定位將採用相鄰近似計算法", e);
    }
}

// 射線演算法：判斷經緯度點是否在多邊形區域內部
function isPointInPolygon(point, vs) {
    let x = point[0], y = point[1];
    let inside = false;
    for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
        let xi = vs[i][0], yi = vs[i][1];
        let xj = vs[j][0], yj = vs[j][1];
        let intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
}

// 藉由經緯度精準找出台灣行政區
function findTownshipByLngLat(lng, lat) {
    if (!geojsonTaiwanData || !geojsonTaiwanData.features) return null;
    
    for (let feature of geojsonTaiwanData.features) {
        const props = feature.properties;
        const geometry = feature.geometry;
        const city = props.COUNTYNAME || props.C_Name;
        const town = props.TOWNNAME || props.T_Name;
        
        if (geometry.type === "Polygon") {
            if (isPointInPolygon([lng, lat], geometry.coordinates[0])) {
                return { city, town };
            }
        } else if (geometry.type === "MultiPolygon") {
            for (let poly of geometry.coordinates) {
                if (isPointInPolygon([lng, lat], poly[0])) {
                    return { city, town };
                }
            }
        }
    }
    return null;
}

// ==========================================
// 🎯 5. 自動定位功能 (升級為真・行政區解析)
// ==========================================
if (geoBtn) {
    geoBtn.addEventListener('click', () => {
        if (!navigator.geolocation) {
            alert("您的瀏覽器不支援 GPS 定位。");
            return;
        }
        geoBtn.disabled = true;
        geoBtn.innerText = "⏳ 讀取 GPS 中...";

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                
                geoBtn.innerText = "🔍 解析行政區...";
                
                // 如果圖資還沒下載完，等待一下
                if (!geojsonTaiwanData) {
                    await loadTaiwanGeoJson();
                }
                
                const result = findTownshipByLngLat(lng, lat);
                
                if (result && result.city && result.town) {
                    // 成功精準解析到縣市與行政區！
                    if (filterCitySelect && filterDistrictSelect) {
                        filterCitySelect.value = result.city;
                        updateDistrictDropdown(filterCitySelect, filterDistrictSelect, true);
                        filterDistrictSelect.value = result.town;
                        filterAndSortMushroomCards();
                    }
                    alert(`🎯 定位成功！已為您自動切換至：${result.city} ${result.town}`);
                } else {
                    // 備用方案：如果超出幾何邊界或圖資失敗，採用基準點反解
                    if (filterCitySelect && filterDistrictSelect) {
                        filterCitySelect.value = "台北市"; 
                        updateDistrictDropdown(filterCitySelect, filterDistrictSelect, true);
                        filterDistrictSelect.value = "all";
                        filterAndSortMushroomCards();
                    }
                    alert("📍 已成功取得 GPS，但精確行政區比對失敗，已為您切換至預設看板。");
                }
                geoBtn.disabled = false;
                geoBtn.innerText = "🎯 自動定位";
            },
            (error) => {
                geoBtn.disabled = false;
                geoBtn.innerText = "🎯 自動定位";
                alert("GPS 定位獲取失敗，請確認是否已開啟手機/瀏覽器的定位權限。");
            },
            { enableHighAccuracy: true, timeout: 8000 }
        );
    });
}

// ==========================================
// 🎴 6. 卡片/清單模式切換 (對齊你的 .grid-container)
// ==========================================
function updateViewToggleBtnText() {
    if (!viewToggleBtn) return;
    if (currentViewMode === 'list') {
        viewToggleBtn.innerText = "📋 清單模式";
    } else {
        viewToggleBtn.innerText = "🎴 卡片模式";
    }
}

if (viewToggleBtn) {
    viewToggleBtn.addEventListener('click', () => {
        currentViewMode = (currentViewMode === 'grid') ? 'list' : 'grid';
        localStorage.setItem('mushroom_view_mode', currentViewMode);
        
        if (mushroomContainer) {
            if (currentViewMode === 'list') {
                mushroomContainer.classList.add('list-view');
            } else {
                mushroomContainer.classList.remove('list-view');
            }
        }
        updateViewToggleBtnText();
        filterAndSortMushroomCards();
    });
}

// ==========================================
// 📊 7. 核心過濾、排序與卡片渲染
// ==========================================
function filterAndSortMushroomCards() {
    if (!mushroomContainer) return;

    const cityFilter = filterCitySelect.value;
    const distFilter = filterDistrictSelect.value;
    const sortBy = cardSortSelect ? cardSortSelect.value : 'remainingTime';
    const keyword = searchNameInput ? searchNameInput.value.trim().toLowerCase() : '';

    let filteredList = globalMushroomList.filter(item => {
        const d = item.data;
        if (!d) return false;
        if (cityFilter !== 'all' && d.city !== cityFilter) return false;
        
        const dArray = Array.isArray(d.district) ? d.district : [d.district];
        if (distFilter !== 'all' && !dArray.includes(distFilter) && !dArray.includes(distFilter.replace('區','').replace('鄉','').replace('鎮','').replace('市',''))) {
            return false;
        }
        
        if (keyword && !d.name.toLowerCase().includes(keyword) && !d.title.toLowerCase().includes(keyword)) return false;
        return true;
    });

    const sizeWeight = { "巨型": 4, "大": 3, "普通": 2, "小": 1 };

    filteredList.sort((a, b) => {
        const dataA = a.data; const dataB = b.data;
        if (sortBy === "updateTime") {
            return (Date.parse(dataB.reportTime.replace(/-/g, '/')) || 0) - (Date.parse(dataA.reportTime.replace(/-/g, '/')) || 0);
        } else if (sortBy === "remainingTime") {
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
        } else if (sortBy === "totalPlayers") {
            return (dataB.pCount || 0) - (dataA.pCount || 0);
        } else if (sortBy === "mushroomSize") {
            return (sizeWeight[dataB.size] || 0) - (sizeWeight[dataA.size] || 0);
        } else if (sortBy === "mushroomType") {
            return dataA.title.localeCompare(dataB.title, 'zh-Hant');
        }
        return 0;
    });

    filteredList.sort((a, b) => {
        const isPinnedA = pinnedMushrooms.includes(a.id) ? 1 : 0;
        const isPinnedB = pinnedMushrooms.includes(b.id) ? 1 : 0;
        return isPinnedB - isPinnedA;
    });

    if (currentViewMode === 'list') {
        mushroomContainer.classList.add('list-view');
    } else {
        mushroomContainer.classList.remove('list-view');
    }

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
        <button class="quick-edit-btn" title="更新">📝 編輯</button>
        <button class="delete-btn" title="刪除">❌</button>
        <img src="picture/${data.img}" alt="菇" class="card-icon" onerror="this.src='picture/mushroom_red.png'">
        <h3>[${data.size}] ${data.title} <span class="time-info-btn" data-time="${data.reportTime}" style="cursor:pointer;color:#0288d1;">◉</span></h3>
        <p>📍 ${data.city}(${districtArray.join('/')}) ${data.name}</p>
        <p class="countdown" data-report-time="${data.reportTime}" data-initial-hours="${data.hours}" data-initial-minutes="${data.minutes}" data-initial-seconds="${data.seconds}" style="font-weight:bold;">⏳ 計算中...</p>
        <p>👥 人數：<span class="p-count">${data.pCount}</span>/${data.limit}人 <button class="verify-fact-btn" style="display:none;">✅ 核實</button></p>
        <button class="notify-me-btn" style="border: 1px solid #ffe082; background: #fff8e1; color: #b78103; border-radius: 20px; padding: 4px 12px; font-size: 12px; cursor: pointer; font-weight: bold;">${notifyBtnText}</button>
    `;
    
    const reportTimestamp = Date.parse(data.reportTime.replace(/-/g, '/'));
    const duration = ((parseInt(data.hours)||0)*3600 + (parseInt(data.minutes)||0)*60 + (parseInt(data.seconds)||0))*1000;
    
    const countdownEl = newCard.querySelector('.countdown');
    countdownEl.setAttribute('data-target', reportTimestamp + duration);
    countdownEl.setAttribute('data-respawn', reportTimestamp + duration + 300000);
    
    mushroomContainer.appendChild(newCard);
}

function updateCountdowns() {
    const now = Date.now();
    document.querySelectorAll('.countdown').forEach(el => {
        if (!document.body.contains(el)) return;
        const currentCard = el.closest('.card');
        const targetTime = parseInt(el.getAttribute('data-target'));
        const respawnTime = parseInt(el.getAttribute('data-respawn'));
        let timeLeft = targetTime - now;

        if (timeLeft > 0) {
            let s = Math.floor((timeLeft/1000)%60), m = Math.floor((timeLeft/(1000*60))%60), h = Math.floor((timeLeft/(1000*60*60))%24);
            el.innerText = `⏳ 剩餘：${format(h)}:${format(m)}:${format(s)}`;
            el.style.color = "#333";
        } else {
            let respawnLeftMs = respawnTime - now;
            if (respawnLeftMs > 0) {
                let rS = Math.floor((respawnLeftMs/1000)%60), rM = Math.floor((respawnLeftMs/(1000*60))%60);
                el.innerText = `🔄 下次出現倒數：${format(rM)}分${format(rS)}秒`;
                el.style.color = "#d32f2f";
            } else {
                el.innerText = `⌛ 狀態：新蘑菇待更新...`; 
                el.style.color = "#c62828";
            }
        }
    });
}
setInterval(updateCountdowns, 1000);

// ==========================================
// 📌 8. 事件功能監聽與表單綁定
// ==========================================
if (mushroomContainer) {
    mushroomContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('pin-btn')) {
            const currentCard = e.target.closest('.card');
            const firebaseId = currentCard.getAttribute('data-id');
            const index = pinnedMushrooms.indexOf(firebaseId);
            if (index === -1) { pinnedMushrooms.push(firebaseId); } 
            else { pinnedMushrooms.splice(index, 1); }
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

// 初始化執行
initCityDropdowns();
listenToCloudDatabase();
