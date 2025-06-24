import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
    apiKey: "AIzaSyDq-D_-rixbIgtYVxH-RX6A3uepH2M2vbo",
    authDomain: "mapmyroute-f0107.firebaseapp.com",
    projectId: "mapmyroute-f0107",
    storageBucket: "mapmyroute-f0107.firebasestorage.app",
    messagingSenderId: "584536867845",
    appId: "1:584536867845:web:11bd0be89c854a6357486c",
    measurementId: "G-00Z78N15M7"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export default app;
