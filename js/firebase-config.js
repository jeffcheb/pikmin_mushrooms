// js/firebase-config.js

// 引入 Firebase SDK 模組 (使用官方 CDN)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, push, onValue, update, remove } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

// 🚀 依據你的 Firebase Console 圖片自動填入的真實設定資訊
const firebaseConfig = {
    apiKey: "AIzaSyBg9WBxj7KbOr0DRYtotI7IxyjkRkaVRzI",
    authDomain: "pikmin-mushroom-hub.firebaseapp.com",
    databaseURL: "https://pikmin-mushroom-hub-default-rtdb.firebaseio.com", // 依據你的專案 ID 補全的 Realtime Database 位址
    projectId: "pikmin-mushroom-hub",
    storageBucket: "pikmin-mushroom-hub.firebasestorage.app",
    messagingSenderId: "94609307791",
    appId: "1:94609307791:web:ec9e5fb8e7tcfe62d658fa"
};

// 初始化 Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// 將資料庫核心方法匯出給全域 Window 物件，方便其他普通 JS 檔案調用
window.fbDB = database;
window.fbRef = ref;
window.fbPush = push;
window.fbOnValue = onValue;
window.fbUpdate = update;
window.fbRemove = remove;

console.log("🔥 皮克敏工具站：Firebase 雲端資料庫連線成功！");
