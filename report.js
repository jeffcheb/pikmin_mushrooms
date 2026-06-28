const mushroomContainer = document.getElementById('mushroom-container');
const geoBtn = document.getElementById('geo-btn');
const mushroomForm = document.getElementById('mushroom-form');

const formCitySelect = document.getElementById('form-city');
const formDistrictSelect = document.getElementById('form-district');
const filterCitySelect = document.getElementById('filter-city');
const filterDistrictSelect = document.getElementById('filter-district');

// 排序下拉選單
const cardSortSelect = document.getElementById('card-sort') || document.createElement('select');

const formTypeSelect = document.getElementById('form-type');
const formSizeSelect = document.getElementById('form-size');
const formCountInput = document.getElementById('form-count');
const countHint = document.getElementById('count-hint');

const devModeBtn = document.getElementById('dev-mode-btn');
const devStatusText = document.getElementById('dev-status');
let isDevMode = false;

// 儲存目前從雲端抓取到的所有蘑菇原始資料
let globalMushroomList = [];

// 🔔 儲存玩家主動訂閱「提醒我」的蘑菇 Firebase ID 陣列與已發送紀錄
let activeReminders = JSON.parse(localStorage.getItem('mushroom_reminders') || '[]');
let sentNotifications = new Set(); // 避免重複跳通知

// 🛜 完美對齊你的美國資料庫設定
const firebaseConfig = {
    apiKey: "AIzaSyBg9WBxj7Kb0937719661bV-bZ_r8k0M3Q",
    authDomain: "pikmin-mushroom-hub.firebaseapp.com",
    databaseURL: "https://pikmin-mushroom-hub-default-rtdb.firebaseio.com",
    projectId: "pikmin-mushroom-hub",
    storageBucket: "pikmin-mushroom-hub.appspot.com",
    messagingSenderId: "94609307791",
    appId: "1:94609307791:web:86fb196fbfbc5d71c1b18d"
};

firebase.initializeApp(firebaseConfig);
const database = firebase.database();
const dbRef = database.ref('mushrooms');

// 🗺️ 全台 22 縣市完整行政區資料庫
const allTaiwanDistricts = {
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
    "臺南市": ["中西", "東區", "南區", "北區", "安平", "安南", "永康", "歸仁", "新化", "左鎮", "玉井", "楠西", "南化", "左鎮", "仁德", "關廟", "龍崎", "官田", "麻豆", "佳里", "西港", "七股", "將軍", "學甲", "北門", "新營", "後壁", "白河", "東山", "六甲", "下營", "柳營", "鹽水", "善化", "大內", "山上", "新市", "安定"],
    "高雄市": ["鹽埕", "鼓山", "左營", "楠梓", "三民", "新興", "前金", "苓雅", "前鎮", "旗津", "小港", "鳳山", "林園", "大寮", "大樹", "大社區", "仁武", "鳥松", "岡山", "橋頭", "燕巢", "田寮", "阿蓮", "路竹", "湖內", "茄萣", "永安", "彌陀", "梓官", "旗山", "美濃", "六龜", "甲仙", "杉林", "內門", "桃源", "那瑪夏"],
    "屏東縣": ["屏東", "三地門", "霧臺", "瑪家", "九如", "里港", "高樹", "鹽埔", "長治", "麟洛", "萬丹", "內埔", "竹田", "萬巒", "泰武", "來義", "潮州", "新埤", "枋寮", "枋山", "春日", "獅子", "牡丹", "恆春", "滿州", "車城", "琉球", "佳冬", "林邊", "南州", "崁頂", "東港", "新園"],
    "宜蘭縣": ["宜蘭", "羅東", "蘇澳", "頭城", "礁溪", "壯圍", "員山", "冬山", "五結", "三星", "大同", "南澳"],
    "花蓮縣": ["花蓮", "鳳林", "玉里", "新城", "吉安", "壽豐", "光復", "豐濱", "瑞穗", "富里", "秀林", "萬榮", "卓溪"],
    "臺東縣": ["臺東", "成功", "關山", "長濱", "海端", "池上", "東河", "鹿野", "延平", "卑南", "金峰", "大武", "達仁", "綠島", "蘭嶼", "太麻里"],
    "澎湖縣": ["馬公", "湖西", "白沙", "西嶼", "望安", "七美"],
    "金門縣": ["金城", "金沙", "金湖", "金寧", "烈嶼", "烏坵"],
    "連江縣": ["南竿", "北竿", "莒光", "東引"]
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

function filterAndSortMushroomCards() {
    const selectedCity = filterCitySelect.value;
    const selectedDistrict = filterDistrictSelect.value;
    const sortWay = cardSortSelect.value;

    let filteredList = globalMushroomList.filter(item => {
        const data = item.data;
        const cardDistricts = Array.isArray(data.district) ? data.district : [data.district];
        const matchCity = (selectedCity === 'all' || data.city === selectedCity);
        const matchDistrict = (selectedDistrict === 'all' || cardDistricts.includes(selectedDistrict));
        return matchCity && matchDistrict;
    });

    const sizeWeight = { "巨型": 4, "大": 3, "普通": 2, "小": 1 };

    filteredList.sort((a, b) => {
        const dataA = a.data;
        const dataB = b.data;

        if (sortWay === "updateTime") {
            const timeA = Date.parse(dataA.reportTime.replace(/-/g, '/')) || 0;
            const timeB = Date.parse(dataB.reportTime.replace(/-/g, '/')) || 0;
            return timeB - timeA;
        } else if (sortWay === "remainingTime") {
            const now = Date.now();
            const getTimes = (d) => {
                const repTime = Date.parse(d.reportTime.replace(/-/g, '/')) || 0;
                const totalDur = ((parseInt(d.hours) || 0) * 3600 + (parseInt(d.minutes) || 0) * 60 + (parseInt(d.seconds) || 0)) * 1000;
                const expire = repTime + totalDur;
                return { expire: expire, respawn: expire + 300000 };
            };

            const tA = getTimes(dataA);
            const tB = getTimes(dataB);

            const getStatusRank = (t) => {
                if (now < t.expire) return 2;             
                if (now >= t.expire && now < t.respawn) return 1; 
                return 3;                                 
            };

            const rankA = getStatusRank(tA);
            const rankB = getStatusRank(tB);

            if (rankA !== rankB) { return rankA - rankB; }

            if (rankA === 1) { return tA.respawn - tB.respawn; } 
            else if (rankA === 2) { return tA.expire - tB.expire; } 
            else { return tB.expire - tA.expire; }

        } else if (sortWay === "totalPlayers") {
            return (dataB.pCount || 0) - (dataA.pCount || 0);
        } else if (sortWay === "mushroomSize") {
            const wA = sizeWeight[dataA.size] || 0;
            const wB = sizeWeight[dataB.size] || 0;
            return wB - wA;
        } else if (sortWay === "mushroomType") {
            return dataA.title.localeCompare(dataB.title, 'zh-Hant');
        }
        return 0;
    });

    mushroomContainer.innerHTML = '';
    filteredList.forEach(item => { renderMushroomCard(item.id, item.data); });
}

function setupPinFeature() {
    mushroomContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('pin-btn')) {
            const currentCard = e.target.closest('.card');
            e.target.classList.toggle('active');
            if (e.target.classList.contains('active')) { mushroomContainer.prepend(currentCard); }
            else { filterAndSortMushroomCards(); }
        }
    });
}

function setupTimeInfoFeature() {
    mushroomContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('time-info-btn')) {
            const reportTimeStr = e.target.getAttribute('data-time');
            if (!reportTimeStr) return;
            const reportTimestamp = Date.parse(reportTimeStr.replace(/-/g, '/'));
            const now = Date.now();
            const MathDiffMs = now - reportTimestamp;
            let timeAgoText = "未知";
            if (!isNaN(reportTimestamp)) {
                const diffMins = Math.floor(MathDiffMs / 1000 / 60);
                if (diffMins < 1) { timeAgoText = "剛剛（1 分鐘內）"; }
                else if (diffMins < 60) { timeAgoText = `${diffMins} 分鐘前`; }
                else {
                    const diffHours = Math.floor(diffMins / 60);
                    const remainMins = diffMins % 60;
                    timeAgoText = `${diffHours} 小時 ${remainMins} 分鐘前`;
                }
            } else { timeAgoText = reportTimeStr; }

            const timeOverlay = document.createElement('div');
            timeOverlay.className = 'edit-modal-overlay'; 
            timeOverlay.innerHTML = `
                <div class="time-modal-window">
                    <div class="time-modal-header">⏰ 情報最後更新歷史</div>
                    <div class="time-modal-clock">🕒</div>
                    <p style="font-size:14px; color:#546e7a; margin:4px 0 10px 0;">上報同步時間點：</p>
                    <div class="time-modal-timestamp">${reportTimeStr}</div>
                    <p style="font-size:14px; color:#546e7a; margin:14px 0 4px 0;">距離現在已過去：</p>
                    <div class="time-modal-ago">${timeAgoText}</div>
                    <button class="time-btn-close">我知道了</button>
                </div>
            `;
            document.body.appendChild(timeOverlay);
            timeOverlay.querySelector('.time-btn-close').addEventListener('click', () => timeOverlay.remove());
        }
    });
}

function setupQuickEditFeature() {
    mushroomContainer.addEventListener('click', (e) => {
        const currentCard = e.target.closest('.card');
        if (!currentCard) return;
        const firebaseId = currentCard.getAttribute('data-id');

        // ✅ 核實按鈕連線處理
        if (e.target.classList.contains('verify-fact-btn')) {
            dbRef.child(firebaseId).once('value', (snapshot) => {
                const currentData = snapshot.val();
                if (!currentData) return;

                const countdownEl = currentCard.querySelector('.countdown');
                const targetTime = parseInt(countdownEl.getAttribute('data-target')) || 0;
                const now = Date.now();
                let timeLeftMs = targetTime - now;

                let h = parseInt(currentData.hours);
                let m = parseInt(currentData.minutes);
                let s = parseInt(currentData.seconds || 0);

                if (timeLeftMs > 0) {
                    s = Math.floor((timeLeftMs / 1000) % 60);
                    m = Math.floor((timeLeftMs / (1000 * 60)) % 60);
                    h = Math.floor((timeLeftMs / (1000 * 60 * 60)) % 24);
                }

                const d = new Date();
                const newReportTime = `${d.getFullYear()}-${format(d.getMonth()+1)}-${d.getDate()} ${format(d.getHours())}:${format(d.getMinutes())}:${format(d.getSeconds())}`;

                dbRef.child(firebaseId).update({
                    hours: h, minutes: m, seconds: s, reportTime: newReportTime
                }).then(() => { alert("✅ 訊息核實成功！最後更新時間已同步刷新！"); });
            });
            return;
        }

        // 📝 更新按鈕彈出面板
        if (e.target.classList.contains('quick-edit-btn')) {
            dbRef.child(firebaseId).once('value', (snapshot) => {
                const currentData = snapshot.val();
                if (!currentData) return;

                const maxLimit = getCountLimit(currentData.size);
                let currentDists = Array.isArray(currentData.district) ? currentData.district.join(" ") : currentData.district;

                const modalOverlay = document.createElement('div');
                modalOverlay.className = 'edit-modal-overlay';
                modalOverlay.innerHTML = `
                    <div class="edit-modal-window">
                        <div class="edit-modal-header">
                            <span>📝 快速更新蘑菇現況</span>
                            <span class="edit-modal-close">&times;</span>
                        </div>
                        <div class="edit-modal-body">
                            <p style="font-size:13px; color:#78909c; margin:0 0 12px 0;">📍 地點: ${currentData.city} · ${currentData.name}</p>
                            <h4>👥 目前參戰人數 (上限 ${maxLimit} 人)</h4>
                            <input type="number" id="modal-pcount" class="edit-modal-input" value="${currentData.pCount}" min="0" max="${maxLimit}">
                            <h4>⏳ 剩餘倒數時間</h4>
                            <div class="edit-modal-input-group">
                                <input type="number" id="modal-hours" class="edit-modal-input" value="${currentData.hours}" placeholder="時" min="0">
                                <input type="number" id="modal-minutes" class="edit-modal-input" value="${currentData.minutes}" placeholder="分" min="0" max="59">
                                <input type="number" id="modal-seconds" class="edit-modal-input" value="${currentData.seconds || 0}" placeholder="秒" min="0" max="59">
                            </div>
                            <h4>🗺️ 跨區可見行政區設定 (空格隔開)</h4>
                            <input type="text" id="modal-dists" class="edit-modal-input" value="${currentDists}">
                        </div>
                        <div class="edit-modal-footer">
                            <button class="edit-btn-cancel">取消</button>
                            <button class="edit-btn-save">儲存更新</button>
                        </div>
                    </div>
                `;

                document.body.appendChild(modalOverlay);
                const closeModal = () => modalOverlay.remove();
                modalOverlay.querySelector('.edit-modal-close').addEventListener('click', closeModal);
                modalOverlay.querySelector('.edit-btn-cancel').addEventListener('click', closeModal);

                modalOverlay.querySelector('.edit-btn-save').addEventListener('click', () => {
                    const newCount = parseInt(document.getElementById('modal-pcount').value);
                    const h = parseInt(document.getElementById('modal-hours').value);
                    const m = parseInt(document.getElementById('modal-minutes').value);
                    const s = parseInt(document.getElementById('modal-seconds').value);
                    const distsRaw = document.getElementById('modal-dists').value.trim();

                    if (isNaN(newCount) || newCount < 0 || newCount > maxLimit) { alert(`❌ 人數超出範圍 (0-${maxLimit})！`); return; }
                    if (isNaN(h) || isNaN(m) || isNaN(s) || h < 0 || m < 0 || m > 59 || s < 0 || s > 59) { alert("❌ 時間格式錯誤！"); return; }
                    if (!distsRaw) { alert("❌ 行政區不能留空喔！"); return; }

                    const distArray = distsRaw.split(/\s+/);
                    const now = new Date();
                    const newReportTime = `${now.getFullYear()}-${format(now.getMonth()+1)}-${format(now.getDate())} ${format(now.getHours())}:${format(now.getMinutes())}:${format(now.getSeconds())}`;

                    dbRef.child(firebaseId).update({
                        pCount: newCount, hours: h, minutes: m, seconds: s,
                        district: distArray, reportTime: newReportTime
                    }).then(() => { alert("🚀 現況已即時全台同步更新！"); closeModal(); });
                });
            });
        }
    });
}

function setupDeveloperMode() {
    const CORRECT_PASSWORD = "admin123";
    devModeBtn.addEventListener('click', () => {
        if (!isDevMode) {
            const inputPassword = prompt("🔐 請輸入開發者安全驗證密碼：");
            if (inputPassword === CORRECT_PASSWORD) {
                isDevMode = true;
                document.body.classList.add('dev-active');
                devModeBtn.innerText = "🔒 關閉編輯模式";
                devStatusText.innerText = "🔓 開發者編輯中 (點擊卡片左上角 ❌ 可刪除雲端蘑菇)";
                devStatusText.style.color = "#d32f2f";
            } else if (inputPassword !== null) { alert("❌ 密碼錯誤！"); }
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
            const firebaseId = currentCard.getAttribute('data-id');
            if (confirm("⚠️ 確定要從雲端同步刪除這朵蘑菇嗎？")) {
                dbRef.child(firebaseId).remove().then(() => alert("🗑️ 雲端蘑菇已成功下架！"));
            }
        }
    });
}

// 🔔 智慧推播與音效提醒我監聽按鈕 (iOS/iPad 及跨裝置相容並支援【關閉提醒】優化版)
function setupNotificationFeature() {
    mushroomContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('notify-me-btn')) {
            const currentCard = e.target.closest('.card');
            const firebaseId = currentCard.getAttribute('data-id');

            // 1. 檢查是否已經訂閱過，如果已經訂閱，則執行「關閉提醒」
            if (activeReminders.includes(firebaseId)) {
                toggleSubscription(firebaseId, e.target, "🔔 提醒我");
                alert("🔕 已成功關閉並取消該蘑菇的出生提醒。");
                return;
            }

            // 2. 如果沒訂閱，開始走訂閱流程（支援系統推播與音效保底）
            if ("Notification" in window) {
                if (Notification.permission === "denied") {
                    alert("⚠️ 您先前拒絕了通知權限。系統將為您切換為【網頁音效模式】，時間到時會發出嗶嗶聲提醒！");
                    toggleSubscription(firebaseId, e.target, "🎵 音效提醒");
                    return;
                }

                Notification.requestPermission().then((permission) => {
                    if (permission === "granted") {
                        toggleSubscription(firebaseId, e.target, "🔔 已設提醒");
                        alert("✅ 設定成功！本網頁在背景執行時，該蘑菇出生前 1 分鐘會自動跳出通知提醒您！");
                    } else {
                        toggleSubscription(firebaseId, e.target, "🎵 音效提醒");
                        alert("🎵 已為您自動切換為【音效提醒模式】！只要不關閉網頁分頁，時間到時網頁會播放嗶嗶聲提醒您！");
                    }
                });
            } else {
                // 🍎 iOS Chrome 保底
                toggleSubscription(firebaseId, e.target, "🎵 音效提醒");
                alert("🎵 偵測到您的瀏覽器不支援系統推播。系統已自動啟動【網頁音效提醒】！只要保持網頁開啟，出生前 1 分鐘網頁就會發出聲音喔！");
            }
        }
    });
}

// 輔助切換訂閱狀態
function toggleSubscription(id, buttonEl, text) {
    const index = activeReminders.indexOf(id);
    if (index === -1) {
        activeReminders.push(id);
        buttonEl.classList.add('subscribed');
        buttonEl.innerText = text;
        buttonEl.style.background = "#e8f5e9";
        buttonEl.style.color = "#2e7d32";
        buttonEl.style.borderColor = "#81c784";
    } else {
        activeReminders.splice(index, 1);
        buttonEl.classList.remove('subscribed');
        buttonEl.innerText = "🔔 提醒我";
        buttonEl.style.background = "#fff8e1";
        buttonEl.style.color = "#b78103";
        buttonEl.style.borderColor = "#ffe082";
        if (sentNotifications.has(id)) { sentNotifications.delete(id); }
    }
    localStorage.setItem('mushroom_reminders', JSON.stringify(activeReminders));
}

function renderMushroomCard(id, data) {
    const newCard = document.createElement('div');
    newCard.className = "card";
    newCard.setAttribute('data-id', id);
    newCard.setAttribute('data-city', data.city);
    
    const districtArray = Array.isArray(data.district) ? data.district : [data.district];
    newCard.setAttribute('data-districts', JSON.stringify(districtArray));
    
    const isSubscribed = activeReminders.includes(id);
    let notifyBtnText = "🔔 提醒我";
    let subClass = "";
    let btnStyle = "background: #fff8e1; border: 1px solid #ffe082; color: #b78103;";
    
    if (isSubscribed) {
        subClass = " subscribed";
        notifyBtnText = ("Notification" in window && Notification.permission === "granted") ? "🔔 已設提醒" : "🎵 音效提醒";
        btnStyle = "background: #e8f5e9; border: 1px solid #81c784; color: #2e7d32;";
    }
    
    newCard.innerHTML = `
        <button class="pin-btn" title="釘選此位置">📌</button>
        <button class="quick-edit-btn" title="快速原地修改人數時間">📝 更新</button>
        <button class="delete-btn" title="刪除此蘑菇">❌ 刪除</button>
        <img src="picture/${data.img}" alt="蘑菇" class="card-icon">
        <h3>[${data.size}] ${data.title} <span class="time-info-btn" data-time="${data.reportTime}" title="查看最後更新時間" style="cursor:pointer; color:#0288d1; margin-left:5px;">◉</span></h3>
        <p>📍 地點：${data.city}(${districtArray.join('/')}) ${data.name}</p>
        <p class="countdown" 
           data-report-time="${data.reportTime}" 
           data-initial-hours="${data.hours}" 
           data-initial-minutes="${data.minutes}"
           data-initial-seconds="${data.seconds}">⏳ 剩餘時間：計算中...</p>
        <p style="display: flex; align-items: center; justify-content: center; gap: 8px; margin-bottom: 8px;">
            <span>👥 目前人數：<span class="p-count">${data.pCount}</span> / ${data.limit} 人</span>
            <button class="verify-fact-btn" title="現場勘查無誤！一鍵刷新回報時間" style="display: none; background: #e8f5e9; border: 1px solid #81c784; border-radius: 4px; cursor: pointer; font-size: 11px; padding: 2px 6px; color: #2e7d32; font-weight: bold;">✅ 核實</button>
        </p>
        <button class="notify-me-btn${subClass}" style="${btnStyle} border-radius: 20px; padding: 4px 14px; font-size: 12px; cursor: pointer; font-weight: bold; transition: all 0.2s;" title="冷卻倒數前 1 分鐘傳送推播提醒">${notifyBtnText}</button>
    `;
    initSingleCountdown(newCard.querySelector('.countdown'));
    mushroomContainer.appendChild(newCard);
}

function setupReportForm() {
    mushroomForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const size = formSizeSelect.value;
        const limit = getCountLimit(size);
        const pCount = parseInt(formCountInput.value) || 0;

        if (pCount < 0 || pCount > limit) { alert(`❌ 人數超出當前限制 (0-${limit}人)。`); return; }

        const city = formCitySelect.value;
        const district = formDistrictSelect.value; 
        const name = document.getElementById('form-name').value.trim();
        const type = formTypeSelect.value;
        const hours = parseInt(document.getElementById('form-hours').value) || 0;
        const minutes = parseInt(document.getElementById('form-minutes').value) || 0;
        const seconds = parseInt(document.getElementById('form-seconds').value) || 0; 

        if (!name) { alert("❌ 請輸入具體地點名稱！"); return; }

        const typeMapping = {
            red: { title: "紅色蘑菇", img: "mushroom_red.png" },
            blue: { title: "藍色蘑菇", img: "mushroom_blue.png" },
            yellow: { title: "黃色蘑菇", img: "mushroom_yellow.png" },
            purple: { title: "紫色蘑菇", img: "mushroom_purple.png" },
            white: { title: "白色蘑菇", img: "mushroom_white.png" },
            rock: { title: "灰色蘑菇", img: "mushroom_rock.png" },
            wing: { title: "粉紅色蘑菇", img: "mushroom_wing.png" },
            ice: { title: "冰藍蘑菇", img: "mushroom_ice.png" },
            rock_crystal: { title: "特殊水晶蘑菇", img: "mushroom_crystal.png" },
            red_fire: { title: "元素火蘑菇", img: "mushroom_fire.png" },
            blue_water: { title: "元素水蘑菇", img: "mushroom_water.png" },
            white_poison: { title: "元素毒蘑菇", img: "mushroom_poison.png" },
            yellow_electric: { title: "元素電子蘑菇", img: "mushroom_electric.png" },
            event_special: { title: "本月限定活動蘑菇", img: "mushroom_event.png" }
        };
        const mInfo = typeMapping[type] || { title: "未知蘑菇", img: "mushroom_red.png" };

        const now = new Date();
        const reportTimeString = `${now.getFullYear()}-${format(now.getMonth()+1)}-${format(now.getDate())} ${format(now.getHours())}:${format(now.getMinutes())}:${format(now.getSeconds())}`;

        dbRef.once('value', (snapshot) => {
            let existingKey = null;
            snapshot.forEach((childSnapshot) => {
                const val = childSnapshot.val();
                if (val.city === city && val.name === name) { existingKey = childSnapshot.key; }
            });

            let finalDistricts = [district];
            if (existingKey && snapshot.child(existingKey).val().district) {
                const oldDist = snapshot.child(existingKey).val().district;
                const oldDistArray = Array.isArray(oldDist) ? oldDist : [oldDist];
                finalDistricts = Array.from(new Set([...oldDistArray, district]));
            }

            const targetData = { city, district: finalDistricts, name, size, title: mInfo.title, img: mInfo.img, reportTime: reportTimeString, hours, minutes, seconds, pCount, limit };

            if (existingKey) { dbRef.child(existingKey).set(targetData).then(() => alert("🔄 偵測到相同地點！已合併情報並刷新校準時間！")); }
            else { dbRef.push(targetData).then(() => alert("🚀 蘑菇情報已成功同步至雲端！")); }

            filterCitySelect.value = city;
            updateDistrictDropdown(filterCitySelect, filterDistrictSelect, true);
            filterDistrictSelect.value = finalDistricts[0];

            mushroomForm.reset();
            document.getElementById('form-seconds').value = "0"; 
            updateDistrictDropdown(formCitySelect, formDistrictSelect, false);
            updateCountLimitConstraint(); 
            filterAndSortMushroomCards();
        });
    });
}

function listenToCloudDatabase() {
    dbRef.on('value', (snapshot) => {
        globalMushroomList = [];
        snapshot.forEach((childSnapshot) => {
            globalMushroomList.push({ id: childSnapshot.key, data: childSnapshot.val() });
        });
        filterAndSortMushroomCards();
    });
}

function setupGeolocation() {
    if (!navigator.geolocation) return;
    geoBtn.addEventListener('click', () => {
        geoBtn.innerText = "⌛ 定位中..."; geoBtn.disabled = true;
        navigator.geolocation.getCurrentPosition(async (position) => {
            try {
                const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${position.coords.latitude}&lon=${position.coords.longitude}&accept-language=zh-TW`);
                const data = await response.json();
                const address = data.display_name || "";
                const normalizedAddress = address.toLowerCase().replace(/臺/g, "台");
                let foundCity = null, foundDistrict = null;

                for (let city in allTaiwanDistricts) {
                    if (normalizedAddress.includes(city.replace(/臺/g, "台"))) {
                        foundCity = city;
                        for (let dist of allTaiwanDistricts[city]) {
                            if (normalizedAddress.includes(dist)) { foundDistrict = dist; break; }
                        } break;
                    }
                }
                if (foundCity && foundDistrict) {
                    filterCitySelect.value = foundCity; updateDistrictDropdown(filterCitySelect, filterDistrictSelect, true); filterDistrictSelect.value = foundDistrict;
                    alert(`🎯 自動定位成功！已切換至：${foundCity} ${foundDistrict}`);
                } else {
                    alert(`定位成功！但此專案暫無建立您所在的區域資料。\n您目前在：\n${address}`);
                    filterCitySelect.value = "all"; filterDistrictSelect.innerHTML = '<option value="all">顯示所有行政區</option>';
                }
                filterAndSortMushroomCards(); geoBtn.innerText = "🎯 自動定位";
            } catch (e) { alert("網路解碼失敗。"); geoBtn.innerText = "🎯 自動定位"; }
            finally { geoBtn.disabled = false; }
        }, () => { alert("定位失敗，請授權瀏覽器位置權限。"); geoBtn.innerText = "🎯 自動定位"; geoBtn.disabled = false; }, { enableHighAccuracy: true, timeout: 10000 });
    });
}

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
        
        const currentCard = el.closest('.card');
        const cardId = currentCard.getAttribute('data-id');
        const h3Title = currentCard.querySelector('h3');
        const reportTimeString = el.getAttribute('data-report-time');
        const verifyBtn = currentCard.querySelector('.verify-fact-btn');
        const notifyBtn = currentCard.querySelector('.notify-me-btn'); // 抓取提醒按鈕
        
        const reportTimestamp = Date.parse(reportTimeString.replace(/-/g, '/'));
        const alertThreshold = 15 * 60 * 1000; 
        
        let existWarning = h3Title.querySelector('.time-warning-tag');
        
        if (!isNaN(reportTimestamp) && (now - reportTimestamp > alertThreshold)) {
            if (!existWarning) {
                const warningSpan = document.createElement('span');
                warningSpan.className = 'time-warning-tag';
                warningSpan.innerHTML = ' ⚠️';
                warningSpan.title = '注意：此情報已超過 15 分鐘未更新，準確性可能降低！';
                warningSpan.style.cursor = 'help';
                h3Title.appendChild(warningSpan);
            }
        } else {
            if (existWarning) { existWarning.remove(); }
        }

        const targetTime = parseInt(el.getAttribute('data-target'));
        const respawnTime = parseInt(el.getAttribute('data-respawn'));
        let timeLeft = targetTime - now;

        if (timeLeft > 0) {
            // ⏳ 正在被摧毀倒數中：顯示核實按鈕，且完全隱藏提醒按鈕 (打完冷卻中才能用提醒)
            if (verifyBtn) verifyBtn.style.display = 'inline-block';
            if (notifyBtn) notifyBtn.style.display = 'none';

            let seconds = Math.floor((timeLeft / 1000) % 60);
            let minutes = Math.floor((timeLeft / (1000 * 60)) % 60);
            let hours = Math.floor((timeLeft / (1000 * 60 * 60)) % 24);
            el.innerText = `⏳ 剩餘時間：${format(hours)}:${format(minutes)}:${format(seconds)}`;
            el.style.color = "#333";
        } else {
            if (verifyBtn) verifyBtn.style.display = 'none';

            let respawnLeftMs = respawnTime - now;
            let rSeconds = Math.floor((respawnLeftMs / 1000) % 60);
            let rMinutes = Math.floor((respawnLeftMs / (1000 * 60)) % 60);
            
            if (respawnLeftMs > 0) {
                // 🔄 下次出現倒數中（冷卻期）：這時才強制開啟「提醒我」按鈕！
                if (notifyBtn) notifyBtn.style.display = 'inline-block';

                el.innerText = `🔄 下次出現倒數：${format(rMinutes)}分${format(rSeconds)}秒`;
                el.style.color = "#d32f2f"; 
                if (h3Title.querySelector('.time-warning-tag')) { h3Title.querySelector('.time-warning-tag').remove(); }

                // 🔔 推播判定
                if (activeReminders.includes(cardId) && !sentNotifications.has(cardId)) {
                    const totalCooldownSecondsLeft = Math.floor(respawnLeftMs / 1000);
                    if (totalCooldownSecondsLeft <= 60 && totalCooldownSecondsLeft > 0) {
                        sentNotifications.add(cardId);

                        const mTitle = h3Title ? h3Title.innerText.replace(/◉|⚠️/g, '').trim() : "新蘑菇";
                        const mLoc = currentCard.querySelector('p') ? currentCard.querySelector('p').innerText.replace('📍 地點：', '').trim() : "未知地點";

                        if ("Notification" in window && Notification.permission === "granted") {
                            new Notification("🍄 皮克敏孵化準備！", {
                                body: `📍 位置：${mLoc}\n【${mTitle}】即將在 1 分鐘後出生，請立刻上線卡位！`,
                                icon: "picture/mushroom_event.png"
                            });
                        }

                        try {
                            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                            [0, 200, 400].forEach(delay => {
                                setTimeout(() => {
                                    const oscillator = audioCtx.createOscillator();
                                    const gainNode = audioCtx.createGain();
                                    oscillator.type = 'sine';
                                    oscillator.frequency.setValueAtTime(880, audioCtx.currentTime);
                                    gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
                                    oscillator.connect(gainNode);
                                    gainNode.connect(audioCtx.destination);
                                    oscillator.start();
                                    oscillator.stop(audioCtx.currentTime + 0.15);
                                }, delay);
                            });
                        } catch (audioErr) { console.log(audioErr); }
                    }
                }

            } else {
                // 🌟 【重大優化】：進入「待更新」狀態，徹底將提醒按鈕隱藏 (display: none)
                if (notifyBtn) notifyBtn.style.display = 'none';

                el.innerText = `⌛ 狀態：新蘑菇待更新...`;
                el.style.color = "#c62828";
                el.style.fontWeight = "bold";
                if (h3Title.querySelector('.time-warning-tag')) { h3Title.querySelector('.time-warning-tag').remove(); }
                
                if (sentNotifications.has(cardId)) {
                    sentNotifications.delete(cardId);
                    const remIndex = activeReminders.indexOf(cardId);
                    if (remIndex !== -1) {
                        activeReminders.splice(remIndex, 1);
                        localStorage.setItem('mushroom_reminders', JSON.stringify(activeReminders));
                    }
                }
            }
        }
    });
}

formCitySelect.addEventListener('change', () => updateDistrictDropdown(formCitySelect, formDistrictSelect, false));
filterCitySelect.addEventListener('change', () => {
    if (filterCitySelect.value === 'all') {
        filterDistrictSelect.innerHTML = '<option value="all">顯示所有行政區</option>'; filterAndSortMushroomCards();
    } else { updateDistrictDropdown(filterCitySelect, filterDistrictSelect, true); filterAndSortMushroomCards(); }
});
filterDistrictSelect.addEventListener('change', filterAndSortMushroomCards);
cardSortSelect.addEventListener('change', filterAndSortMushroomCards);

formTypeSelect.addEventListener('change', updateCountLimitConstraint);
formSizeSelect.addEventListener('change', updateCountLimitConstraint);

// 初始化執行
initCityDropdowns(); setupPinFeature(); setupGeolocation(); setupDeveloperMode(); setupReportForm(); setupQuickEditFeature(); setupTimeInfoFeature(); setupNotificationFeature(); updateCountLimitConstraint(); listenToCloudDatabase();
setInterval(updateCountdowns, 1000); updateCountdowns();
