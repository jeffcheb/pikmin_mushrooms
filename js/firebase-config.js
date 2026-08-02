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

// 請確認這裡填入你自己的 Firebase 設定
const firebaseConfig = {
    // ... 你的 Firebase 設定資訊 ...
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

console.log("🔥 皮克敏工具站：Firebase 雲端資料庫連線成功！");
