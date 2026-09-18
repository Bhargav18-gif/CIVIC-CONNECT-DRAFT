import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig =  {
  apiKey: "AIzaSyDJAJ1lLBAiSlP5T2XbLxe7Hjjje5U7nkw",
  authDomain: "civic-b6108.firebaseapp.com",
  projectId: "civic-b6108",
  storageBucket: "civic-b6108.firebasestorage.app",
  messagingSenderId: "167012503612",
  appId: "1:167012503612:web:503bba5a466b477441b339",
  measurementId: "G-XT283NZZ76"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();