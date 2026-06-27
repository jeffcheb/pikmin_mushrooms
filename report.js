const mushroomContainer = document.getElementById('mushroom-container');
const geoBtn = document.getElementById('geo-btn');
const mushroomForm = document.getElementById('mushroom-form');

const formCitySelect = document.getElementById('form-city');
const formDistrictSelect = document.getElementById('form-district');
const filterCitySelect = document.getElementById('filter-city');
const filterDistrictSelect = document.getElementById('filter-district');

const formTypeSelect = document.getElementById('form-type');
const formSizeSelect = document.getElementById('form-size');
const formCountInput = document.getElementById('form-count');
const countHint = document.getElementById('count-hint');

const devModeBtn = document.getElementById('dev-mode-btn');
const devStatusText = document.getElementById('dev-status');
let isDevMode = false;

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
    "高雄市": ["鹽埕", "鼓山", "左營", "楠梓", "三民", "新興", "前金", "苓雅", "前鎮", "小港", "鳳山", "林園", "大寮", "大樹", "大社區", "仁武", "鳥松", "岡山", "橋頭", "燕巢", "田寮", "阿蓮", "路竹", "湖內", "茄萣", "永安", "彌陀", "梓官", "旗山", "美濃", "六龜", "甲仙", "杉林", "內門", "茂林", "桃源", "那瑪夏"],
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

// 🎯 ===================================================
// 🔍 核心修改：優化篩選邏輯，支援「多個行政區」陣列比對
// ===================================================
function filterLocation() {
    const selectedCity = filterCitySelect.value;
    const selectedDistrict = filterDistrictSelect.value;
    const cards = document.querySelectorAll('#mushroom-container .card');

    cards.forEach(card => {
        const cardCity = card.getAttribute('data-city');
        // 將卡片上的行政區 JSON 字串轉回陣列判定
        let cardDistricts = [];
        try {
            cardDistricts = JSON.parse(card.getAttribute('data-districts'));
        } catch(e) {
            // 防呆：如果舊資料是單一字串，包成陣列處理
            cardDistricts = [card.getAttribute('data-districts')];
        }

        const matchCity = (selectedCity === 'all' || cardCity === selectedCity);
        // 只要玩家選的行政區有在該菇的「可見行政區清單」中，就判定成功！
        const matchDistrict = (selectedDistrict === 'all' || cardDistricts.includes(selectedDistrict));
        
        card.style.display = (matchCity && matchDistrict) ? 'block' : 'none';
    });
}

function setupPinFeature() {
    mushroomContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('pin-btn')) {
            const currentCard = e.target.closest('.card');
            e.target.classList.toggle('active');
            if (e.target.classList.contains('active')) { mushroomContainer.prepend(currentCard); }
            else { mushroomContainer.appendChild(currentCard); }
        }
    });
}

function setupQuickEditFeature() {
    mushroomContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('quick-edit-btn')) {
            const currentCard = e.target.closest('.card');
            const firebaseId = currentCard.getAttribute('data-id');
            
            dbRef.child(firebaseId).once('value', (snapshot) => {
                const currentData = snapshot.val();
                if (!currentData) return;

                const editChoice = prompt("📝 想要快速更新什麼？\n輸入 1 更改：目前參戰人數\n輸入 2 更改：剩餘倒數時間（時/分/秒）\n輸入 3 更改：跨區設定 (新增或修改可見行政區)");

                if (editChoice === "1") {
                    const maxLimit = getCountLimit(currentData.size);
                    const newCountInput = prompt(`👥 請輸入最新在場人數 (目前為 ${currentData.pCount} 人，上限為 ${maxLimit} 人)：`);
                    if (newCountInput !== null) {
                        const newCount = parseInt(newCountInput);
                        if (isNaN(newCount) || newCount < 0 || newCount > maxLimit) {
                            alert(`❌ 請輸入正確的人數範圍 (0-${maxLimit})！`);
                        } else {
                            dbRef.child(firebaseId).child('pCount').set(newCount).then(() => alert("✅ 參戰人數已連線更新！"));
                        }
                    }
                } else if (editChoice === "2") {
                    const newHoursInput = prompt("⏳ 請輸入最新看到的剩餘【小時】:", currentData.hours);
                    const newMinutesInput = prompt("⏳ 請輸入最新看到的剩餘【分鐘】:", currentData.minutes);
                    const newSecondsInput = prompt("⏳ 請輸入最新看到的剩餘【秒數】:", currentData.seconds || 0);
                    
                    if (newHoursInput !== null && newMinutesInput !== null && newSecondsInput !== null) {
                        const h = parseInt(newHoursInput);
                        const m = parseInt(newMinutesInput);
                        const s = parseInt(newSecondsInput);

                        if (isNaN(h) || isNaN(m) || isNaN(s) || h < 0 || m < 0 || m > 59 || s < 0 || s > 59) {
                            alert("❌ 時間格式輸入錯誤！");
                        } else {
                            const now = new Date();
                            const newReportTime = `${now.getFullYear()}-${format(now.getMonth()+1)}-${format(now.getDate())} ${format(now.getHours())}:${format(now.getMinutes())}:${format(now.getSeconds())}`;
                            
                            dbRef.child(firebaseId).update({ hours: h, minutes: m, seconds: s, reportTime: newReportTime })
                                .then(() => alert("✅ 倒數時間已校正完畢！"));
                        }
                    }
                } else if (editChoice === "3") {
                    // 🎯 讓玩家可以直接用空格追加多個行政區
                    let currentDists = Array.isArray(currentData.district) ? currentData.district.join(" ") : currentData.district;
                    const newDistsInput = prompt("🗺️ 請輸入此蘑菇可被偵測到的所有行政區 (多個請用空格隔開)：", currentDists);
                    if (newDistsInput !== null) {
                        const distArray = newDistsInput.trim().split(/\s+/);
                        dbRef.child(firebaseId).child('district').set(distArray)
                            .then(() => alert("✅ 跨區可見設定已成功更新！"));
                    }
                }
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

function renderMushroomCard(id, data) {
    const newCard = document.createElement('div');
    newCard.className = "card";
    newCard.setAttribute('data-id', id);
    newCard.setAttribute('data-city', data.city);
    
    // 🎯 處理多區資料儲存至卡片屬性上
    const districtArray = Array.isArray(data.district) ? data.district : [data.district];
    newCard.setAttribute('data-districts', JSON.stringify(districtArray));
    
    newCard.innerHTML = `
        <button class="pin-btn" title="釘選此位置">📌</button>
        <button class="quick-edit-btn" title="快速原地更新資料">📝 更新</button>
        <button class="delete-btn" title="刪除此蘑菇">❌ 刪除</button>
        <img src="picture/${data.img}" alt="蘑菇" class="card-icon">
        <h3>[${data.size}] ${data.title}</h3>
        <p>📍 地點：${data.city}(${districtArray.join('/')}) ${data.name}</p>
        <p class="countdown" 
           data-report-time="${data.reportTime}" 
           data-initial-hours="${data.hours}" 
           data-initial-minutes="${data.minutes}"
           data-initial-seconds="${data.seconds}">⏳ 剩餘時間：計算中...</p>
        <p>👥 目前人數：<span class="p-count">${data.pCount}</span> / ${data.limit} 人</p>
    `;
    initSingleCountdown(newCard.querySelector('.countdown'));
    mushroomContainer.prepend(newCard);
}

function setupReportForm() {
    mushroomForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const size = formSizeSelect.value;
        const limit = getCountLimit(size);
        const pCount = parseInt(formCountInput.value) || 0;

        if (pCount < 0 || pCount > limit) {
            alert(`❌ 人數超出當前限制 (0-${limit}人)。`); return;
        }

        const city = formCitySelect.value;
        
        // 🎯 預設抓取下拉選單的單一區，之後可用快速更新更新為多個區
        const district = [formDistrictSelect.value]; 
        
        const name = document.getElementById('form-name').value.trim();
        const type = formTypeSelect.value;
        const hours = parseInt(document.getElementById('form-hours').value) || 0;
        const minutes = parseInt(document.getElementById('form-minutes').value) || 0;
        const seconds = parseInt(document.getElementById('form-seconds').value) || 0; 

        const now = new Date();
        const reportTimeString = `${now.getFullYear()}-${format(now.getMonth()+1)}-${format(now.getDate())} ${format(now.getHours())}:${format(now.getMinutes())}:${format(now.getSeconds())}`;

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

        dbRef.once('value', (snapshot) => {
            let existingKey = null;
            snapshot.forEach((childSnapshot) => {
                const val = childSnapshot.val();
                if (val.city === city && val.name === name) { existingKey = childSnapshot.key; }
            });

            // 如果已有舊資料，融合新舊行政區
            let finalDistricts = district;
            if (existingKey && snapshot.child(existingKey).val().district) {
                const oldDist = snapshot.child(existingKey).val().district;
                const oldDistArray = Array.isArray(oldDist) ? oldDist : [oldDist];
                finalDistricts = Array.from(new Set([...oldDistArray, ...district])); // 去除重複區
            }

            const targetData = { city, district: finalDistricts, name, size, title: mInfo.title, img: mInfo.img, reportTime: reportTimeString, hours, minutes, seconds, pCount, limit };

            if (existingKey) {
                dbRef.child(existingKey).set(targetData).then(() => alert("🔄 雲端偵測到相同地點！已自動為您疊加/覆蓋可見行政區！"));
            } else {
                dbRef.push(targetData).then(() => alert("🚀 蘑菇成功同步至雲端資料庫！"));
            }

            filterCitySelect.value = city;
            updateDistrictDropdown(filterCitySelect, filterDistrictSelect, true);
            filterDistrictSelect.value = finalDistricts[0];

            mushroomForm.reset();
            document.getElementById('form-seconds').value = "0"; 
            updateDistrictDropdown(formCitySelect, formDistrictSelect, false);
            updateCountLimitConstraint(); 
        });
    });
}

function listenToCloudDatabase() {
    dbRef.on('value', (snapshot) => {
        mushroomContainer.innerHTML = ''; 
        snapshot.forEach((childSnapshot) => { renderMushroomCard(childSnapshot.key, childSnapshot.val()); });
        filterLocation(); 
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
                filterLocation(); geoBtn.innerText = "🎯 自動定位";
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
            let rSeconds = Math.floor(((respawnTime - now) / 1000) % 60);
            let rMinutes = Math.floor(((respawnTime - now) / (1000 * 60)) % 60);
            if (respawnTime - now > 0) {
                el.innerText = `🔄 下次出現倒數：${format(rMinutes)}分${format(rSeconds)}秒`;
                el.style.color = "#d32f2f"; 
            } else {
                el.innerText = `⌛ 狀態：新蘑菇待更新...`;
                el.style.color = "#c62828";
                el.style.fontWeight = "bold";
            }
        }
    });
}

formCitySelect.addEventListener('change', () => updateDistrictDropdown(formCitySelect, formDistrictSelect, false));
filterCitySelect.addEventListener('change', () => {
    if (filterCitySelect.value === 'all') {
        filterDistrictSelect.innerHTML = '<option value="all">顯示所有行政區</option>'; filterLocation();
    } else { updateDistrictDropdown(filterCitySelect, filterDistrictSelect, true); filterLocation(); }
});
filterDistrictSelect.addEventListener('change', filterLocation);
formTypeSelect.addEventListener('change', updateCountLimitConstraint);
formSizeSelect.addEventListener('change', updateCountLimitConstraint);

// 初始化執行
initCityDropdowns(); setupPinFeature(); setupGeolocation(); setupDeveloperMode(); setupReportForm(); setupQuickEditFeature(); updateCountLimitConstraint(); listenToCloudDatabase();
setInterval(updateCountdowns, 1000); updateCountdowns();
