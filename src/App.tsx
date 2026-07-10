import React, { useState, useRef, useEffect } from 'react';
import { 
  Sparkles, Upload, ExternalLink, Copy, Check, RefreshCw, Download, 
  Wand2, X, MousePointerClick, Edit3, Heart, Moon, Sun, 
  Image as ImageIcon, Volume2, VolumeX, Lock, Unlock, Trash2
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, doc, setDoc, onSnapshot, collection } from 'firebase/firestore';

// Firebase 初始化設定
let app, auth, db, appId = 'sonia-gembot-app';
const firebaseConfig = {
  apiKey: "AIzaSyCEZfhySN1aUkfwnLQarcZrJRQI8LvUcs8",
  authDomain: "sonia-gembot.firebaseapp.com",
  projectId: "sonia-gembot",
  storageBucket: "sonia-gembot.firebasestorage.app",
  messagingSenderId: "487742953453",
  appId: "1:487742953453:web:0ac7a95d99d57df54bb9e4"
};

try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
} catch (error) {
  console.warn("Firebase 初始化失敗", error);
}

export default function App() {
  const [robots, setRobots] = useState(Array.from({ length: 10 }, (_, i) => ({ id: i + 1, name: '', group: '', creator: '', link: '', image: '', desc: '' })));
  
  useEffect(() => {
    if (!auth) return;
    signInAnonymously(auth).catch(console.error);
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user && db) {
        const colRef = collection(db, 'robots');
        onSnapshot(colRef, (snapshot) => {
          if (!snapshot.empty) {
            const data = [];
            snapshot.forEach(d => data.push({ id: parseInt(d.id), ...d.data() }));
            setRobots(data.sort((a, b) => a.id - b.id));
          }
        });
      }
    });
    return () => unsubscribe();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <h1 className="text-3xl font-bold mb-8">Teacher Sonia GemBot</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {robots.map(bot => (
          <div key={bot.id} className="p-6 bg-white rounded-xl shadow-md border border-gray-100">
            <h2 className="text-xl font-bold">{bot.name || `GemBot ${bot.id}`}</h2>
            <p className="text-gray-500">{bot.desc || "等待設定中..."}</p>
          </div>
        ))}
      </div>
    </div>
  );
}