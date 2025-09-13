// firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCPHo6WngPJlbZNUnzjPLpU63aHr-OdQC8",
  authDomain: "asia-23990.firebaseapp.com",
  projectId: "asia-23990",
  storageBucket: "asia-23990.firebasestorage.app",
  messagingSenderId: "175190666308",
  appId: "1:175190666308:web:df9b594af164516d7e2011",
  measurementId: "G-WJSXTQPD0Z",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
