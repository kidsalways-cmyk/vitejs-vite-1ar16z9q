import React, { useState, useRef, useEffect } from 'react';
import { 
  Sparkles, Upload, ExternalLink, Copy, Check, RefreshCw, Download, 
  Wand2, X, MousePointerClick, Edit3, Heart, Moon, Sun, 
  Image as ImageIcon, Volume2, VolumeX, Lock, Unlock, Trash2, AlertTriangle
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, onSnapshot, collection } from 'firebase/firestore';

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
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [toastMessage, setToastMessage] = useState(null);
  const [editingBot, setEditingBot] = useState(null);
  const [hoveredBotId, setHoveredBotId] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const fileInputRef = useRef(null);
  const audioRef = useRef(null);

  useEffect(() => {
    signInAnonymously(auth).catch(console.error);
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
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

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const updateRobot = async (id, fields) => {
    setRobots(prev => prev.map(bot => bot.id === id ? { ...bot, ...fields } : bot));
    const docRef = doc(db, 'robots', id.toString());
    await setDoc(docRef, fields, { merge: true });
  };

  const handleReset = async () => {
    for (const bot of defaultRobots) {
      await setDoc(doc(db, 'robots', bot.id.toString()), bot);
    }
    setRobots(defaultRobots);
    showToast('🔄 已重置所有資料！');
    setConfirmDialog(null);
  };

  const clearSingleRobot = async (id) => {
    const defaultData = { name: '', group: '', creator: '', link: '', image: '', desc: '' };
    await updateRobot(id, defaultData);
    showToast(`🧹 已清空 ${id} 號機器人資料！`);
    setConfirmDialog(null);
  };

  const GemStone = ({ cx, cy, rotation, isHovered }) => (
    <g transform={`translate(${cx}, ${cy}) rotate(${rotation}) ${isHovered ? 'scale(1.6)' : 'scale(1.3)'}`} className="transition-transform duration-500 pointer-events-none">
      <circle cx="0" cy="0" r="16" fill="url(#gemGlowGrad)" className={isHovered ? "animate-pulse" : ""} />
      <path d="M -8,-10 L 8,-10 L 0,16 Z" fill="rgba(255,255,255,0.4)" />
    </g>
  );

  const MinionCuteRobotSVG = ({ bot, theme, isHovered }) => {
    const { id, image } = bot;
    return (
      <svg viewBox="0 0 100 135" className="w-full h-full overflow-visible">
        <defs>
            <radialGradient id="gemGlowGrad" cx="50%" cy="50%" r="50%"><stop offset="0%" stopColor="#FFFFFF" /><stop offset="100%" stopColor="#81D4FA" /></radialGradient>
        </defs>
        <rect x="20" y="20" width="60" height="90" rx="30" fill={theme.main} />
        <rect x="25" y="65" width="50" height="34" rx="6" fill="#202124" />
        {image && <image href={image} x="25" y="65" width="50" height="34" preserveAspectRatio="xMidYMid slice" />}
        <circle cx="40" cy="45" r="8" fill="white" />
        <circle cx="60" cy="45" r="8" fill="white" />
      </svg>
    );
  };

  return (
    <div className={`min-h-screen font-sans ${isDarkMode ? 'bg-slate-900 text-white' : 'bg-gradient-to-br from-[#E0F7FA] via-[#F1F8E9] to-[#FFF9C4]'}`}>
      <header className="p-8 flex justify-between items-center">
        <h1 className="text-4xl font-bold">Teacher Sonia GemBot</h1>
        <div className="flex gap-4">
          <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 bg-white rounded-full shadow"><Sun /></button>
          <button onClick={() => setShowAdminLogin(true)} className="p-2 bg-white rounded-full shadow"><Lock /></button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 p-8">
        {robots.map(bot => (
          <div key={bot.id} className="p-4 bg-white rounded-2xl shadow-lg border-2 border-transparent hover:border-pink-300 transition-all cursor-pointer" 
               onClick={() => setEditingBot(bot)}>
            <MinionCuteRobotSVG bot={bot} theme={{main: '#4285F4'}} isHovered={false} />
            <h2 className="text-xl font-bold mt-2">{bot.name || `${bot.id} 號機器人`}</h2>
            <p className="text-sm text-gray-600">{bot.desc || "點擊設定任務"}</p>
          </div>
        ))}
      </div>

      {/* Editing Modal */}
      {editingBot && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg text-black">
            <h2 className="text-2xl font-bold mb-4">設定 {editingBot.id} 號</h2>
            <input className="w-full p-2 border rounded mb-4" placeholder="名稱" value={editingBot.name} onChange={(e) => updateRobot(editingBot.id, {name: e.target.value})} />
            <textarea className="w-full p-2 border rounded mb-4" placeholder="描述" value={editingBot.desc} onChange={(e) => updateRobot(editingBot.id, {desc: e.target.value})} />
            <div className="flex justify-end gap-2">
              <button onClick={() => setEditingBot(null)} className="px-4 py-2 bg-gray-200 rounded">關閉</button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Dialog */}
      {confirmDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl text-black">
            <h3 className="font-bold text-lg mb-2 flex items-center gap-2"><AlertTriangle className="text-yellow-500" /> 確認執行</h3>
            <p className="mb-4">{confirmDialog.message}</p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmDialog(null)} className="px-4 py-2 bg-gray-200 rounded">取消</button>
              <button onClick={confirmDialog.onConfirm} className="px-4 py-2 bg-red-500 text-white rounded">確定</button>
            </div>
          </div>
        </div>
      )}

      {toastMessage && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-slate-800 text-white px-6 py-3 rounded-full shadow-lg">
          {toastMessage}
        </div>
      )}
    </div>
  );
}