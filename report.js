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
let pinnedMushrooms = JSON.parse(localStorage.getItem('mushroom_pinned') || '[]');

let currentViewMode = localStorage.getItem('mushroom_view_mode') || 'grid';

const firebaseConfig = {
    apiKey: "AIzaSyBg9WBxj7Kb0937719661bV-bZ_r8k0M3Q",
    authDomain: "pikmin-mushroom-hub.firebaseapp.com",
    databaseURL: "https://pikmin-mushroom-hub-default-rtdb.firebaseio.com",
    projectId: "pikmin-mushroom-hub"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const dbRef = firebase.database().ref('mushrooms');

const allTaiwanDistricts = {
    "台北市": ["中正", "大同", "中山", "松山", "大安", "萬華", "信義", "士林", "北投", "內湖", "南港", "文山"],
    "新北市": ["板橋", "三重", "中和", "永和", "新莊", "新店", "樹林", "鶯歌", "三峽", "淡水", "汐止", "瑞芳", "土城", "蘆洲", "五股", "泰山", "林口", "深坑"],
    "桃園市": ["桃園", "中壢", "大溪", "楊梅", "蘆竹", "大園", "龜山", "八德", "龍潭", "平鎮", "新屋", "觀音", "復興"],
    "台中市": ["中區", "東區", "南區", "西區", "北區", "北屯", "西屯", "南屯", "太平", "大里", "霧峰", "烏日", "豐原", "后里", "石岡", "東勢", "和平", "新社", "潭子", "大雅", "神岡", "大肚", "沙鹿", "龍井", "梧棲", "清水", "大甲", "外埔", "大安"],
    "台南市": ["中西", "東區", "南區", "北區", "安平", "安南", "永康", "歸仁", "新化", "左鎮", "玉井", "楠西", "南化", "仁德", "關廟", "龍崎", "官田", "麻豆", "佳里", "西港", "七股", "將軍", "學甲", "北門", "新營", "後壁", "白河", "東山", "六甲", "下營", "柳營", "鹽水", "善化", "大內", "山上", "新市", "安定"],
    "高雄市": ["鹽埕", "鼓山", "左營", "楠梓", "三民", "新興", "前金", "苓雅", "前鎮", "旗津", "小港", "鳳山", "林園", "大寮", "大樹", "大社", "仁武", "鳥松", "岡山", "橋頭", "燕巢", "田寮", "阿蓮", "路竹", "湖內", "茄萣", "永安", "彌陀", "梓官", "旗山", "美濃", "六龜", "甲仙", "杉林", "內門", "桃源", "那瑪夏"]
};

function initCityDropdowns() {
    const cities = Object.keys(allTaiwanDistricts);
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
    if (allTaiwanDistricts[selectedCity]) {
        allTaiwanDistricts[selectedCity].forEach(dist => {
            const opt = document.createElement('option');
            opt.value = dist;
            opt.innerText = dist + "區";
            districtSelect.appendChild(opt);
        });
    }
}

function updateViewToggleBtnText() {
    if (!viewToggleBtn) return;
    if (currentViewMode === 'list') {
        viewToggleBtn.innerText = "📋 切換卡片";
        mushroomContainer.classList.add('list-view');
    } else {
        viewToggleBtn.innerText = "🎴 切換清單";
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
        const matchDistrict = (selectedDistrict === 'all' || cardDistricts.includes(selectedDistrict) || cardDistricts.includes(selectedDistrict.replace('區','')));
        const matchKeyword = (!searchKeyword || data.name.toLowerCase().includes(searchKeyword) || data.title.toLowerCase().includes(searchKeyword));
        return matchCity && matchDistrict && matchKeyword;
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
    const isPinned = pinnedMushrooms.includes(id);
    const districtArray = Array.isArray(data.district) ? data.district : [data.district];
    
    newCard.innerHTML = `
        <button class="pin-btn ${isPinned?'active':''}" title="釘選">📌</button>
        <button class="quick-edit-btn" title="更新">📝 更新</button>
        <button class="delete-btn" title="刪除">❌</button>
        <img src="picture/${data.img}" alt="菇" class="card-icon" onerror="this.src='picture/mushroom_red.png'">
        <h3>[${data.size}] ${data.title} <span class="time-info-btn" data-time="${data.reportTime}" style="cursor:pointer;color:#0288d1;font-weight:bold;">◉</span></h3>
        <p>📍 ${data.city}(${districtArray.join('/')}) ${data.name}</p>
        <p class="countdown" data-report-time="${data.reportTime}" data-initial-hours="${data.hours}" data-initial-minutes="${data.minutes}" data-initial-seconds="${data.seconds}" style="font-weight:bold;">⏳ 計算中...</p>
        <p>👥 人數：<span class="p-count">${data.pCount}</span> 人</p>
    `;
    
    const reportTimestamp = Date.parse(data.reportTime.replace(/-/g, '/'));
    const duration = ((parseInt(data.hours)||0)*3600 + (parseInt(data.minutes)||0)*60 + (parseInt(data.seconds)||0))*1000;
    newCard.querySelector('.countdown').setAttribute('data-target', reportTimestamp + duration);
    newCard.querySelector('.countdown').setAttribute('data-respawn', reportTimestamp + duration + 300000);
    
    mushroomContainer.appendChild(newCard);
}

const format = (n) => String(n).padStart(2, '0');

function updateCountdowns() {
    const now = Date.now();
    document.querySelectorAll('.countdown').forEach(el => {
        if (!document.body.contains(el)) return;
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
                el.innerText = `🔄 倒數：${format(rM)}分${format(rS)}秒`;
                el.style.color = "#d32f2f";
            } else {
                el.innerText = `⌛ 待更新...`; el.style.color = "#c62828";
            }
        }
    });
}

function setupCardClicks() {
    mushroomContainer.addEventListener('click', (e) => {
        const currentCard = e.target.closest('.card');
        if (!currentCard) return;
        const firebaseId = currentCard.getAttribute('data-id');

        if (e.target.classList.contains('pin-btn')) {
            const index = pinnedMushrooms.indexOf(firebaseId);
            if (index === -1) pinnedMushrooms.push(firebaseId);
            else pinnedMushrooms.splice(index, 1);
            localStorage.setItem('mushroom_pinned', JSON.stringify(pinnedMushrooms));
            filterAndSortMushroomCards();
        }

        if (e.target.classList.contains('quick-edit-btn')) {
            dbRef.child(firebaseId).once('value', (snapshot) => {
                const currentData = snapshot.val(); if (!currentData) return;
                const modalOverlay = document.createElement('div');
                modalOverlay.className = 'edit-modal-overlay';
                modalOverlay.innerHTML = `
                    <div class="edit-modal-window">
                        <div class="edit-modal-header"><span>📝 快速更新</span><span class="edit-modal-close">&times;</span></div>
                        <input type="number" id="modal-pcount" class="edit-modal-input" value="${currentData.pCount || 0}">
                        <div class="edit-modal-input-group">
                            <input type="number" id="modal-hours" class="edit-modal-input" value="${currentData.hours || 0}">
                            <input type="number" id="modal-minutes" class="edit-modal-input" value="${currentData.minutes || 0}">
                        </div>
                        <div class="edit-modal-footer"><button class="edit-btn-save">儲存更新</button></div>
                    </div>
                `;
                document.body.appendChild(modalOverlay);
                modalOverlay.querySelector('.edit-modal-close').addEventListener('click', () => modalOverlay.remove());
                modalOverlay.querySelector('.edit-btn-save').addEventListener('click', () => {
                    const newCount = parseInt(document.getElementById('modal-pcount').value) || 0;
                    const h = parseInt(document.getElementById('modal-hours').value) || 0;
                    const m = parseInt(document.getElementById('modal-minutes').value) || 0;
                    const now = new Date();
                    const newReportTime = `${now.getFullYear()}-${format(now.getMonth()+1)}-${format(now.getDate())} ${format(now.getHours())}:${format(now.getMinutes())}:${format(now.getSeconds())}`;
                    dbRef.child(firebaseId).update({ pCount: newCount, hours: h, minutes: m, reportTime: newReportTime }).then(() => modalOverlay.remove());
                });
            });
        }

        if (e.target.classList.contains('time-info-btn')) {
            const reportTimeStr = e.target.getAttribute('data-time');
            alert(`⏰ 此情報最後更新時間為：\n${reportTimeStr}`);
        }
        
        if (e.target.classList.contains('delete-btn') && isDevMode) {
            if (confirm("⚠️ 確定刪除嗎？")) dbRef.child(firebaseId).remove();
        }
    });
}

function setupDeveloperMode() {
    devModeBtn.addEventListener('click', () => {
        if (!isDevMode) {
            if (prompt("🔐 請輸入驗證密碼：") === "admin123") {
                isDevMode = true; document.body.classList.add('dev-active'); devModeBtn.innerText = "🔒 關閉編輯模式";
            }
        } else {
            isDevMode = false; document.body.classList.remove('dev-active'); devModeBtn.innerText = "🛠️ 開啟開發者模式";
        }
    });
}

if (mushroomForm) {
    mushroomForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const city = formCitySelect.value, district = formDistrictSelect.value, name = document.getElementById('form-name').value.trim();
        const type = formTypeSelect.value, size = formSizeSelect.value, pCount = parseInt(formCountInput.value)||0;
        const h = parseInt(document.getElementById('form-hours').value)||0, m = parseInt(document.getElementById('form-minutes').value)||0, s = parseInt(document.getElementById('form-seconds').value)||0;
        const now = new Date();
        const repTime = `${now.getFullYear()}-${format(now.getMonth()+1)}-${format(now.getDate())} ${format(now.getHours())}:${format(now.getMinutes())}:${format(now.getSeconds())}`;
        const targetData = { city, district: [district], name, size, title: "蘑菇", img: `mushroom_${type}.png`, reportTime: repTime, hours: h, minutes: m, seconds: s, pCount };
        dbRef.push(targetData).then(() => { alert("🚀 上報成功！"); mushroomForm.reset(); });
    });
}

function listenToCloudDatabase() { dbRef.on('value', (snap) => { globalMushroomList = []; snap.forEach(c => { globalMushroomList.push({ id: c.key, data: c.val() }); }); filterAndSortMushroomCards(); }); }

formCitySelect.addEventListener('change', () => updateDistrictDropdown(formCitySelect, formDistrictSelect, false));
filterCitySelect.addEventListener('change', () => {
    if (filterCitySelect.value === 'all') { filterDistrictSelect.innerHTML = '<option value="all">顯示所有行政區</option>'; filterAndSortMushroomCards(); } 
    else { updateDistrictDropdown(filterCitySelect, filterDistrictSelect, true); filterAndSortMushroomCards(); }
});
filterDistrictSelect.addEventListener('change', filterAndSortMushroomCards);
cardSortSelect.addEventListener('change', filterAndSortMushroomCards);
if (searchNameInput) searchNameInput.addEventListener('input', filterAndSortMushroomCards);

initCityDropdowns();
setupCardClicks();
setupDeveloperMode();
listenToCloudDatabase();
setInterval(updateCountdowns, 1000);
