// Import Firebase SDK (modular)
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyCPHo6WngPJlbZNUnzjPLpU63aHr-OdQC8",
  authDomain: "asia-23990.firebaseapp.com",
  projectId: "asia-23990",
  storageBucket: "asia-23990.firebasestorage.app",
  messagingSenderId: "175190666308",
  appId: "1:175190666308:web:df9b594af164516d7e2011",
  measurementId: "G-WJSXTQPD0Z"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage };
