// js/firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
    getDatabase, 
    ref, 
    get, 
    set, 
    push, 
    update, 
    remove, 
    onValue, 
    query, 
    limitToLast 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const firebaseConfig = {
    apiKey: "eMV7OAD1nRr0X4ZRx2AGyghYogK7DlFZEL9QiZTI",
    authDomain: "https://console.firebase.google.com/project/pikmin-mushroom-hub/database/pikmin-mushroom-hub-default-rtdb/data/~2F?hl=zh-cn",
    // 🌟 關鍵！一定要有這一行 Realtime Database 的完整網址：
    databaseURL: "https://pikmin-mushroom-hub-default-rtdb.firebaseio.com",
    projectId: "pikmin-mushroom-hub",
    storageBucket: "pikmin-mushroom-hub.appspot.com",
    messagingSenderId: "1234567890",
    appId: "1:1234567890:web:abcdef123456"
};

// 初始化
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// 🌟 將所有控制函式掛載到 window，供全域（如 admin.js）使用
window.fbDB = db;
window.fbRef = ref;
window.fbGet = get;
window.fbSet = set;
window.fbPush = push;
window.fbUpdate = update;
window.fbRemove = remove;
window.fbOnValue = onValue;
window.fbQuery = query;
window.fbLimitToLast = limitToLast;
// js/firebase-config.js


console.log("🔥 皮克敏工具站：Firebase 雲端資料庫連線成功！");
