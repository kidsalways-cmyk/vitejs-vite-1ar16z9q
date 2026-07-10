import React, { useState, useRef, useEffect } from 'react';
import { 
  Sparkles, Upload, ExternalLink, Copy, Check, RefreshCw, Download, 
  Wand2, X, MousePointerClick, Edit3, Heart, Moon, Sun, 
  Image as ImageIcon, Volume2, VolumeX, Lock, Unlock, Trash2
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
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
  const defaultRobots = Array.from({ length: 10 }, (_, i) => ({
    id: i + 1, name: '', group: '', creator: '', link: '', image: '', desc: ''
  }));

  const [robots, setRobots] = useState(defaultRobots);
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [toastMessage, setToastMessage] = useState(null);
  const [editingBot, setEditingBot] = useState(null);
  const [hoveredBotId, setHoveredBotId] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const fileInputRef = useRef(null);
  const audioRef = useRef(null);

  useEffect(() => {
    if (!auth) return;
    signInAnonymously(auth).catch(console.error);
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user || !db) return;
    const colRef = collection(db, 'artifacts', appId, 'public', 'data', 'robots');
    const unsubscribe = onSnapshot(colRef, (snapshot) => {
      if (!snapshot.empty) {
        const data = [];
        snapshot.forEach(d => data.push({ id: parseInt(d.id), ...d.data() }));
        data.sort((a, b) => a.id - b.id);
        setRobots(data);
      }
    });
    return () => unsubscribe();
  }, [user]);

  const updateRobot = async (id, fields) => {
    setRobots(prev => prev.map(bot => bot.id === id ? { ...bot, ...fields } : bot));
    if (editingBot && editingBot.id === id) setEditingBot(prev => ({ ...prev, ...fields }));
    if (user && db) {
      const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'robots', id.toString());
      await setDoc(docRef, fields, { merge: true });
    }
  };

  return (
    <div className={`min-h-screen font-sans ${isDarkMode ? 'bg-[#0F172A] text-slate-200' : 'bg-gradient-to-br from-[#E0F7FA] to-[#FFF9C4] text-[#4A5568]'}`}>
      <header className="p-8 text-center">
        <h1 className="text-4xl font-extrabold mb-2 flex items-center justify-center gap-3">
          <Sparkles className="text-yellow-500" /> Teacher Sonia GemBot
        </h1>
        <p className="text-lg font-bold">115 宜蘭縣教網中心研習 · 萌系 UDL 互動舞台</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-8 max-w-6xl mx-auto">
        {robots.map(bot => (
          <div key={bot.id} className="p-6 bg-white rounded-2xl shadow-lg border cursor-pointer hover:shadow-xl transition-all" onClick={() => setEditingBot(bot)}>
            <h2 className="text-xl font-bold text-indigo-900">{bot.name || `GemBot ${bot.id}`}</h2>
            <p className="text-gray-500 mt-2">{bot.desc || "點擊設定你的機器人！"}</p>
          </div>
        ))}
      </div>

      {editingBot && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white p-8 rounded-3xl w-full max-w-lg shadow-2xl">
            <h2 className="text-2xl font-bold mb-4">設定 {editingBot.id} 號機器人</h2>
            <input className="w-full p-3 mb-4 border rounded-xl text-black" placeholder="機器人名稱" value={editingBot.name} onChange={(e) => setEditingBot({...editingBot, name: e.target.value})} />
            <textarea className="w-full p-3 mb-4 border rounded-xl text-black" placeholder="任務說明" value={editingBot.desc} onChange={(e) => setEditingBot({...editingBot, desc: e.target.value})} />
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