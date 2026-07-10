import React, { useState, useRef, useEffect } from 'react';
import { 
  Sparkles, Upload, ExternalLink, Copy, Check, RefreshCw, Download, 
  UploadCloud, BookOpen, Wand2, X, MousePointerClick, Edit3, Heart, 
  Moon, Sun, Image as ImageIcon, Volume2, VolumeX, Lock, Unlock, Trash2
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, onSnapshot, collection } from 'firebase/firestore';

// Firebase 初始化設定
const firebaseConfig = {
  apiKey: "AIzaSyCEZfhySN1aUkfwnLQarcZrJRQI8LvUcs8",
  authDomain: "sonia-gembot.firebaseapp.com",
  projectId: "sonia-gembot",
  storageBucket: "sonia-gembot.firebasestorage.app",
  messagingSenderId: "487742953453",
  appId: "1:487742953453:web:0ac7a95d99d57df54bb9e4"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export default function App() {
  const defaultRobots = Array.from({ length: 10 }, (_, i) => ({
    id: i + 1, name: '', group: '', creator: '', link: '', image: '', desc: ''
  }));

  const [robots, setRobots] = useState(defaultRobots);
  const [editingBot, setEditingBot] = useState(null);

  useEffect(() => {
    signInAnonymously(auth);
    const colRef = collection(db, 'robots');
    const unsubscribe = onSnapshot(colRef, (snapshot) => {
      if (!snapshot.empty) {
        const data = [];
        snapshot.forEach(d => data.push({ id: parseInt(d.id), ...d.data() }));
        setRobots(data.sort((a, b) => a.id - b.id));
      }
    });
    return unsubscribe;
  }, []);

  const updateRobot = async (id, fields) => {
    setRobots(prev => prev.map(bot => bot.id === id ? { ...bot, ...fields } : bot));
    const docRef = doc(db, 'robots', id.toString());
    await setDoc(docRef, fields, { merge: true });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-pink-50 p-8 font-sans">
      <header className="max-w-6xl mx-auto mb-12 text-center">
        <h1 className="text-4xl font-extrabold text-indigo-900 mb-2 flex items-center justify-center gap-3">
          <Sparkles className="text-yellow-500" /> Teacher Sonia GemBot
        </h1>
        <p className="text-gray-600">宜蘭教網中心 · UDL 互動教學舞台</p>
      </header>

      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {robots.map(bot => (
          <div key={bot.id} className="p-6 bg-white rounded-2xl shadow-lg border border-indigo-100 hover:shadow-xl transition-all cursor-pointer" onClick={() => setEditingBot(bot)}>
            <h2 className="text-xl font-bold text-indigo-900">{bot.name || `GemBot ${bot.id}`}</h2>
            <p className="text-gray-500 mt-2">{bot.desc || "點擊設定你的機器人！"}</p>
          </div>
        ))}
      </div>

      {editingBot && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white p-8 rounded-3xl w-full max-w-lg shadow-2xl">
            <h2 className="text-2xl font-bold mb-4">設定 {editingBot.id} 號機器人</h2>
            <input 
              className="w-full p-3 mb-4 border rounded-xl"
              placeholder="機器人名稱"
              value={editingBot.name}
              onChange={(e) => setEditingBot({...editingBot, name: e.target.value})}
            />
            <textarea 
              className="w-full p-3 mb-4 border rounded-xl"
              placeholder="任務說明"
              value={editingBot.desc}
              onChange={(e) => setEditingBot({...editingBot, desc: e.target.value})}
            />
            <div className="flex gap-4">
              <button onClick={() => setEditingBot(null)} className="flex-1 py-3 bg-gray-200 rounded-xl font-bold">取消</button>
              <button onClick={() => { updateRobot(editingBot.id, editingBot); setEditingBot(null); }} className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold">儲存</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}