import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCGNllZW0brNUW80SVQt1QzKGFJIM2YpgA",
  authDomain: "whypoo-67a9e.firebaseapp.com",
  projectId: "whypoo-67a9e",
  storageBucket: "whypoo-67a9e.firebasestorage.app",
  messagingSenderId: "745360462018",
  appId: "1:745360462018:web:0f1a238084f9ccaa51ab5b"
};

let app;
let db;

try {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
} catch (e) {
  console.error('Firebase 초기화 실패:', e);
}

export { db, collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy };
