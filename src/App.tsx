import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, onSnapshot, doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { Lock, Plus, Trash2, Mic, Bot, Sparkles, User, Image as ImageIcon, Volume2, VolumeX } from 'lucide-react';

const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

export default function App() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [bots, setBots] = useState([]);
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    signInAnonymously(auth);
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        const botsRef = collection(db, 'artifacts', appId, 'public', 'data', 'bots');
        onSnapshot(botsRef, (snapshot) => {
          const botsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setBots(botsData);
        });
      }
    });
    return () => unsubscribe();
  }, []);

  const handleAdminLogin = () => {
    if (adminPassword === '8888') setIsAdmin(true);
    setAdminPassword('');
  };

  const playThankYou = () => {
    const utterance = new SpeechSynthesisUtterance('Thank you!');
    utterance.pitch = 1.5;
    utterance.rate = 1.2;
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className={`min-h-screen p-6 transition-all duration-500 ${isDarkMode ? 'bg-slate-900' : 'bg-gradient-to-br from-pink-50 via-white to-purple-50'}`}>
      <header className="flex justify-between items-center mb-8">
        <h1 className={`text-2xl font-bold flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
          <Bot className="text-pink-500" /> Sonia 老師的機器人大廳
        </h1>
        <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 rounded-full hover:bg-gray-200">
          {isDarkMode ? '☀️' : '🌙'}
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {bots.map((bot) => (
          <div key={bot.id} className={`p-6 rounded-2xl shadow-lg border ${isDarkMode ? 'bg-slate-800 border-slate-600' : 'bg-white border-pink-100'}`}>
            <h2 className="text-xl font-bold text-pink-600 mb-2">{bot.name}</h2>
            <button onClick={playThankYou} className="flex items-center gap-2 text-sm text-gray-500 hover:text-pink-500">
              <Volume2 size={16} /> 說 Thank you
            </button>
          </div>
        ))}
      </div>

      {!isAdmin && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className={`p-8 rounded-3xl w-full max-w-sm ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`}>
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Lock className="text-pink-500" /> 管理員登入
            </h3>
            <input 
              type="password" 
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              placeholder="請輸入密碼"
              className="w-full p-3 mb-4 rounded-xl border border-gray-200"
            />
            <button onClick={handleAdminLogin} className="w-full bg-pink-500 text-white p-3 rounded-xl font-bold">確認登入</button>
          </div>
        </div>
      )}
    </div>
  );
}