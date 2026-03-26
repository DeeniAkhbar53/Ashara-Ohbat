import { initializeApp, getApps } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyB6xlhO0pOs2R98vfDuartkagWHwo4uL3w",
  authDomain: "ashara-ohbat-60578.firebaseapp.com",
  projectId: "ashara-ohbat-60578",
  storageBucket: "ashara-ohbat-60578.firebasestorage.app",
  messagingSenderId: "282554712066",
  appId: "1:282554712066:web:3e3c0e375e902ba896e71b"
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

export { auth, db, googleProvider };
