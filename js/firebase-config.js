import { initializeApp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyAvJUQrp6Wau5Jz5T7qUVzcB8uUNkToxko",
  authDomain: "proyecto-integral-e07c3.firebaseapp.com",
  databaseURL: "https://proyecto-integral-e07c3-default-rtdb.firebaseio.com",
  projectId: "proyecto-integral-e07c3",
  storageBucket: "proyecto-integral-e07c3.firebasestorage.app",
  messagingSenderId: "425188968618",
  appId: "1:425188968618:web:6af2490311ec5bb40b68d3"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getDatabase(app);
