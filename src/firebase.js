

import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, GithubAuthProvider } from "firebase/auth";
import { initializeFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBh35IQrM-HYLHZLiZWdSXyDV5tvOT1y-8",
  authDomain: "articulate-bot-481502-h0.firebaseapp.com",
  projectId: "articulate-bot-481502-h0",
  storageBucket: "articulate-bot-481502-h0.firebasestorage.app",
  messagingSenderId: "627949468974",
  appId: "1:627949468974:web:45fbac27ba5bfaca5d8ebf",
  measurementId: "G-8SCMTD2RE8"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const githubProvider = new GithubAuthProvider();

export const db = initializeFirestore(app, {
  experimentalAutoDetectLongPolling: true,
  useFetchStreams: false 
});
