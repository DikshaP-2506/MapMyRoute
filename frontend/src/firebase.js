import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

const firebaseConfig = {
  apiKey: "AIzaSyAhpcfOo56589XYBJ1zqWfLM86XxweDJSI",
  authDomain: "mmr1-22c02.firebaseapp.com",
  projectId: "mmr1-22c02",
  storageBucket: "mmr1-22c02.firebasestorage.app",
  messagingSenderId: "888104592448",
  appId: "1:888104592448:web:e86c9a90ebe766f8126ba5",
  measurementId: "G-NFLL3XJCP5"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export { app, analytics };
