import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBT-sw7O-SGeW_LMaSyLkWdVtN5Zp0yzUE",
  authDomain: "votacao-2efd8.firebaseapp.com",
  projectId: "votacao-2efd8",
  storageBucket: "votacao-2efd8.firebasestorage.app",
  messagingSenderId: "825102046222",
  appId: "1:825102046222:web:dc40ae8719ebf816f0985f"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export { db, auth };