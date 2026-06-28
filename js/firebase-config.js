// js/firebase-config.js

// 引入 Firebase SDK 模組 (使用官方 CDN)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, push, onValue, update, remove } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

// ⚠️ 請在此處填入你自己的 Firebase 專案設定資訊
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_AUTH_DOMAIN",
    databaseURL: "YOUR_DATABASE_URL", // Realtime Database 必須有這行
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_STORAGE_BUCKET",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// 初始化 Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// 將資料庫核心方法匯出給全球/全域 Window 物件，方便其他非 type="module" 的普通 js 檔案調用
window.fbDB = database;
window.fbRef = ref;
window.fbPush = push;
window.fbOnValue = onValue;
window.fbUpdate = update;
window.fbRemove = remove;

console.log("🔥 Firebase 連線模組載入成功！");
