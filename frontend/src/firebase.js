import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
// import { getAnalytics } from "firebase/analytics"; // Optional, only if you use analytics

const firebaseConfig = {
  apiKey: "AIzaSyDeAp3TRJQaN34Mjde_Lc_0MnvTMYCy-7c",
  authDomain: "mapmyroute-7f63b.firebaseapp.com",
  projectId: "mapmyroute-7f63b",
  storageBucket: "mapmyroute-7f63b.appspot.com", // <-- FIXED!
  messagingSenderId: "489797150100",
  appId: "1:489797150100:web:0f2b6e3309af4fe3169b81",
  measurementId: "G-0WQSV7Y8D8"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
// export const analytics = getAnalytics(app); // Optional, only if you use analytics
export default app;
