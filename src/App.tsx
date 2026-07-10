import React, { useState, useRef, useEffect } from 'react';
import { 
  Sparkles, 
  Upload, 
  ExternalLink, 
  Copy, 
  Check, 
  RefreshCw, 
  Download, 
  UploadCloud, 
  BookOpen, 
  Wand2,
  X,
  MousePointerClick,
  Edit3,
  Heart,
  Moon,
  Sun,
  Image as ImageIcon,
  Volume2,
  VolumeX,
  Lock,
  Unlock,
  Trash2
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, onSnapshot, collection } from 'firebase/firestore';

// Firebase 初始化設定 (雲端即時同步)
let app, auth, db, appId;
try {
  // Your web app's Firebase configuration
  const firebaseConfig = {
    apiKey: "AIzaSyCEZfhySN1aUkfwnLQarcZrJRQI8LvUcs8",
    authDomain: "sonia-gembot.firebaseapp.com",
    projectId: "sonia-gembot",
    storageBucket: "sonia-gembot.firebasestorage.app",
    messagingSenderId: "487742953453",
    appId: "1:487742953453:web:0ac7a95d99d57df54bb9e4"
  };

  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
} catch (error) {
  console.warn("Firebase 初始化失敗，將以本地模式運行", error);
}

export default function App() {
  const defaultRobots = Array.from({ length: 10 }, (_, i) => ({
    id: i + 1,
    name: '',
    group: '',
    creator: '',
    link: '',
    image: '',
    desc: ''
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

  // 1. 初始化驗證
  useEffect(() => {
    if (!auth) return;
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          try {
            await signInWithCustomToken(auth, __initial_auth_token);
          } catch (tokenError) {
            // 當使用自訂 Firebase 設定時，系統的 custom token 會不吻合而報錯，這裡加上 try-catch 後自動降級使用匿名登入
            console.warn("Custom token mismatch (likely due to custom Firebase config), falling back to anonymous auth.", tokenError);
            await signInAnonymously(auth);
          }
        } else {
          await signInAnonymously(auth);
        }
      } catch (error) {
        console.error("Auth initialization error:", error);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  // 2. 監聽雲端資料庫變化 (公開共用資料)
  useEffect(() => {
    if (!user || !db) return;
    const colRef = collection(db, 'artifacts', appId, 'public', 'data', 'robots');
    const unsubscribe = onSnapshot(colRef, (snapshot) => {
      if (!snapshot.empty) {
        const data = [];
        snapshot.forEach(d => data.push({ id: parseInt(d.id), ...d.data() }));
        data.sort((a, b) => a.id - b.id); // 確保 1~10 號順序正確
        setRobots(data);
      } else {
        // 如果資料庫是空的，初始化 10 隻小機器人上去
        defaultRobots.forEach(bot => {
          setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'robots', bot.id.toString()), bot);
        });
      }
    }, (error) => {
      console.error("雲端同步發生錯誤:", error);
    });
    return () => unsubscribe();
  }, [user]);

  const toggleMusic = () => {
    if (audioRef.current) {
      if (isMusicPlaying) {
        audioRef.current.pause();
        showToast('🔇 音樂已暫停');
      } else {
        audioRef.current.play().catch(e => {
          showToast('⚠️ 瀏覽器阻擋了自動播放，請再試一次');
        });
        showToast('🎵 音樂播放中，享受研習時光吧！');
      }
      setIsMusicPlaying(!isMusicPlaying);
    }
  };

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const updateRobot = async (id, fields) => {
    // 1. 本地即時更新 UI
    setRobots(prev => prev.map(bot => bot.id === id ? { ...bot, ...fields } : bot));
    if (editingBot && editingBot.id === id) {
      setEditingBot(prev => ({ ...prev, ...fields }));
    }
    
    // 2. 背景非同步更新到雲端資料庫
    if (user && db) {
      const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'robots', id.toString());
      await setDoc(docRef, fields, { merge: true });
    }
  };

  const handleCopyLink = (link, botName, botId) => {
    if (!link) {
      showToast('⚠️ 老師，請先輸入分享連結喔！');
      return;
    }
    const textSpace = document.createElement("textarea");
    textSpace.value = link;
    textSpace.style.position = "fixed";
    document.body.appendChild(textSpace);
    textSpace.select();
    try {
      document.execCommand('copy');
      const displayName = botName || `${botId} 號小傢伙`;
      showToast(`✨ 太棒了！已成功複製 ${displayName} 的連結！`);
    } catch (err) {
      showToast('⚠️ 複製失敗，請手動複製。');
    } finally {
      document.body.removeChild(textSpace);
    }
  };

  const handleImageUpload = (id, file) => {
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 400; 
          const MAX_HEIGHT = 400;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, width, height);
          
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7);
          
          updateRobot(id, { image: compressedDataUrl });
          showToast('📸 哇！肚肚螢幕換上新截圖了！(已自動最佳化儲存)');
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    } else {
      showToast('⚠️ 請上傳圖片格式檔案喔');
    }
  };

  const handlePasteImage = (e, id) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const blob = items[i].getAsFile();
        handleImageUpload(id, blob);
        e.preventDefault();
        break;
      }
    }
  };

  const exportData = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(robots, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `Teacher_Sonia_GemBot.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast('💾 成功儲存所有小傢伙的資料！');
  };

  const handleAdminLogin = () => {
    if (adminPassword === '8888') {
      setIsAdmin(true);
      setShowAdminLogin(false);
      setAdminPassword('');
      showToast('🔓 管理員登入成功！擁有重置權限。');
    } else {
      showToast('❌ 密碼錯誤，請再試一次');
    }
  };

  const handleReset = async () => {
    if (!isAdmin) {
      showToast('⚠️ 需要管理員權限才能執行此動作');
      return;
    }
    if (window.confirm('確定要讓所有小傢伙回到最初的狀態嗎？ (這將會清除雲端上所有人填寫的資料)')) {
      setRobots(defaultRobots);
      // 清空雲端該專案的所有機器人資料
      if (user && db) {
        for (const bot of defaultRobots) {
          await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'robots', bot.id.toString()), bot);
        }
      }
      showToast('🔄 已重新變回小精靈編號！');
    }
  };

  const clearSingleRobot = async (id) => {
    if (window.confirm(`確定要清除 ${id} 號小傢伙的所有設定資料嗎？`)) {
      const defaultData = { name: '', group: '', creator: '', link: '', image: '', desc: '' };
      await updateRobot(id, defaultData);
      showToast(`🧹 已將 ${id} 號寶貝的資料清空！`);
    }
  };

  const gColors = {
    blue: { main: '#4285F4', light: '#8AB4F8', dark: '#1967D2', screen: '#E8F0FE' },
    red: { main: '#EA4335', light: '#F28B82', dark: '#C5221F', screen: '#FCE8E6' },
    yellow: { main: '#FBBC05', light: '#FDE293', dark: '#E37400', screen: '#FEF7E0' },
    green: { main: '#34A853', light: '#81C995', dark: '#137333', screen: '#E6F4EA' },
  };

  const getBotTheme = (id) => {
    const colors = [gColors.blue, gColors.red, gColors.yellow, gColors.green];
    return colors[(id - 1) % 4];
  };

  const getPoseConfig = (id) => {
    const poses = [
      { lArm: 10, rArm: -80, body: -3, gem: 'R', eyeX: 3 },    
      { lArm: -80, rArm: 10, body: 3, gem: 'L', eyeX: -3 },    
      { lArm: -45, rArm: -45, body: 0, gem: 'R', eyeX: 0 },    
      { lArm: 0, rArm: 20, body: 5, gem: 'L', eyeX: -2 },      
      { lArm: 20, rArm: -75, body: -5, gem: 'R', eyeX: 2 },    
      { lArm: -75, rArm: 20, body: 5, gem: 'L', eyeX: -2 },    
      { lArm: -30, rArm: -60, body: 0, gem: 'R', eyeX: 0 },    
      { lArm: -60, rArm: -30, body: 0, gem: 'L', eyeX: 0 },    
      { lArm: 15, rArm: -90, body: -6, gem: 'R', eyeX: 4 },    
      { lArm: -90, rArm: 15, body: 6, gem: 'L', eyeX: -4 }     
    ];
    return poses[(id - 1) % 10];
  };

  const playCuteSound = (id) => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      if (ctx.state === 'suspended') ctx.resume();

      const playTone = (freq, type, startTime, duration, sweep = false) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, ctx.currentTime + startTime);
        if (sweep) {
          osc.frequency.exponentialRampToValueAtTime(freq * 1.5, ctx.currentTime + startTime + duration);
        }
        
        gain.gain.setValueAtTime(0, ctx.currentTime + startTime);
        gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + startTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + startTime + duration);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + startTime);
        osc.stop(ctx.currentTime + startTime + duration);
      };

      const soundType = id % 4;
      if (soundType === 0) { 
        playTone(880, 'sine', 0, 0.1);
        playTone(1108, 'sine', 0.15, 0.15);
      } else if (soundType === 1) { 
        playTone(400, 'triangle', 0, 0.2, true);
      } else if (soundType === 2) { 
         playTone(600, 'square', 0, 0.08);
         playTone(750, 'square', 0.1, 0.08);
         playTone(900, 'square', 0.2, 0.15);
      } else { 
        playTone(500, 'sine', 0, 0.1);
        playTone(350, 'sine', 0.12, 0.15);
      }
    } catch (e) {
      console.log('音效播放失敗:', e);
    }
  };

  const GemStone = ({ cx, cy, rotation, isHovered }) => (
    <g transform={`translate(${cx}, ${cy}) rotate(${rotation}) ${isHovered ? 'scale(1.6)' : 'scale(1.3)'}`} className="transition-transform duration-500 pointer-events-none z-50">
      <circle cx="0" cy="0" r="16" fill="url(#gemGlowGrad)" className={isHovered ? "animate-pulse" : "gem-glow-anim"} />
      
      <g transform="translate(0, -2)">
        <path d="M -8,-10 L 8,-10 L 0,16 Z" fill="rgba(255,255,255,0.4)" />
        
        <path d="M -8,-10 L -5,-2 L -16,-2 Z" fill="rgba(225, 245, 254, 0.95)" stroke="#81D4FA" strokeWidth="0.5" strokeLinejoin="round"/>
        <path d="M 8,-10 L 16,-2 L 5,-2 Z" fill="rgba(179, 229, 252, 0.85)" stroke="#81D4FA" strokeWidth="0.5" strokeLinejoin="round"/>
        <path d="M -8,-10 L 8,-10 L 5,-2 L -5,-2 Z" fill="rgba(255, 255, 255, 1)" stroke="#B3E5FC" strokeWidth="0.5" strokeLinejoin="round"/>
        
        <path d="M -16,-2 L -5,-2 L 0,16 Z" fill="rgba(79, 195, 247, 0.7)" stroke="#4FC3F7" strokeWidth="0.5" strokeLinejoin="round"/>
        <path d="M 16,-2 L 5,-2 L 0,16 Z" fill="rgba(3, 169, 244, 0.6)" stroke="#4FC3F7" strokeWidth="0.5" strokeLinejoin="round"/>
        <path d="M -5,-2 L 5,-2 L 0,16 Z" fill="rgba(129, 212, 250, 0.8)" stroke="#81D4FA" strokeWidth="0.5" strokeLinejoin="round"/>
        
        <g transform="translate(0, 3) scale(0.8)">
           <path d="M 0,-8 Q 0,0 8,0 Q 0,0 0,8 Q 0,0 -8,0 Q 0,0 0,-8 Z" fill="none" stroke="url(#magicSparkleGrad)" strokeWidth="1.5" opacity="0.9" />
           <path d="M 0,-5 Q 0,0 5,0 Q 0,0 0,5 Q 0,0 -5,0 Q 0,0 0,-5 Z" fill="#FFFFFF" />
        </g>
        
        <path d="M -13,-1 L -5,11" stroke="#FFFFFF" strokeWidth="1.2" strokeLinecap="round" opacity="0.8" />
        <path d="M 6,-1 L 14,-1" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" opacity="0.9" />
        <path d="M -6,-9 L 6,-9" stroke="#FFFFFF" strokeWidth="1" strokeLinecap="round" opacity="0.9" />
      </g>

      {isHovered && (
        <g className="animate-spin" style={{ animationDuration: '4s', transformOrigin: '0px 0px' }}>
          <path d="M -14,-14 L -8,-8 M -8,-14 L -14,-8" stroke="rgba(255, 255, 255, 0.9)" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M 10,12 L 16,12 M 13,9 L 13,15" stroke="rgba(255, 255, 255, 0.8)" strokeWidth="1.5" strokeLinecap="round" />
        </g>
      )}
    </g>
  );

  const MinionCuteRobotSVG = ({ bot, theme, isHovered, isCompleted }) => {
    const { id, image } = bot;
    const clipId = `screen-clip-${id}`;
    const pose = getPoseConfig(id);
    
    return (
      <svg viewBox="0 0 100 135" className="w-full h-full overflow-visible">
        <defs>
          <clipPath id={clipId}>
            <rect x="25" y="65" width="50" height="34" rx="6" />
          </clipPath>
          <linearGradient id={`bodyGrad-${id}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={theme.light} />
            <stop offset="40%" stopColor={theme.main} />
            <stop offset="100%" stopColor={theme.dark} />
          </linearGradient>
          <linearGradient id="metalGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="50%" stopColor="#BDC1C6" />
            <stop offset="100%" stopColor="#9AA0A6" />
          </linearGradient>
          <radialGradient id="gemGlowGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.9" />
            <stop offset="40%" stopColor="#B3E5FC" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#81D4FA" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="magicSparkleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FF9A9E" /> 
            <stop offset="50%" stopColor="#FECFEF" />
            <stop offset="100%" stopColor="#A1C4FD" />
          </linearGradient>
        </defs>

        <style dangerouslySetInnerHTML={{__html: `
          @keyframes minionBreathe {
            0% { transform: scaleY(1) translateY(0px); }
            100% { transform: scaleY(0.98) translateY(2px); }
          }
          @keyframes lookAround {
            0%, 20% { transform: translateX(0) translateY(0); }
            25%, 40% { transform: translateX(-4px) translateY(1px); } 
            45%, 60% { transform: translateX(4px) translateY(-1px); } 
            65%, 80% { transform: translateX(0) translateY(0); }
            85%, 90% { transform: translateX(0) translateY(0) scaleY(0.1); } 
            95%, 100% { transform: translateX(0) translateY(0) scaleY(1); }
          }
          @keyframes waveHandsLeft {
            0% { transform: rotate(-30deg) translateY(-5px); }
            100% { transform: rotate(-70deg) translateY(-15px); }
          }
          @keyframes waveHandsRight {
            0% { transform: rotate(30deg) translateY(-5px); }
            100% { transform: rotate(70deg) translateY(-15px); }
          }
          @keyframes happyJump {
            0%, 100% { transform: translateY(-15px) scale(1.05); }
            50% { transform: translateY(-25px) scale(1.08); }
          }
          
          @keyframes headLightGlow {
            0% { opacity: 0.3; transform: scale(0.8); filter: drop-shadow(0 0 2px ${theme.main}); }
            100% { opacity: 0.9; transform: scale(1.5); filter: drop-shadow(0 0 8px ${theme.main}); }
          }
          @keyframes gemGlow {
            0% { opacity: 0.4; transform: scale(0.9); filter: drop-shadow(0 0 2px rgba(129, 212, 250, 0.3)); }
            100% { opacity: 0.8; transform: scale(1.15); filter: drop-shadow(0 0 10px rgba(129, 212, 250, 0.7)); }
          }

          .breathe-anim { animation: minionBreathe 1.5s ease-in-out infinite alternate; }
          .look-anim { animation: lookAround 6s ease-in-out infinite; transform-origin: center; }
          .wave-l { animation: waveHandsLeft 0.15s ease-in-out infinite alternate; }
          .wave-r { animation: waveHandsRight 0.15s ease-in-out infinite alternate; }
          .jump-anim { animation: happyJump ${isCompleted ? '0.6s' : '0.4s'} ease-in-out infinite; }
          
          .headlight-anim { animation: headLightGlow 1.5s ease-in-out infinite alternate; transform-origin: 50px 8px; }
          .gem-glow-anim { animation: gemGlow 2.5s ease-in-out infinite alternate; transform-origin: 0px 0px; }
        `}} />

        <g style={{ transformOrigin: '50px 115px', transform: !isHovered ? `rotate(${pose.body}deg)` : 'rotate(0deg)' }} className="transition-transform duration-500">
          
          <g className={`transition-all duration-300 origin-bottom ${isHovered || isCompleted ? 'jump-anim' : 'breathe-anim'}`}>
            
            <line x1="50" y1="20" x2="50" y2="10" stroke="#9AA0A6" strokeWidth="3" strokeLinecap="round" />
            
            <circle cx="50" cy="8" r="6" fill={theme.main} className="headlight-anim" />
            <circle cx="50" cy="8" r="3" fill="#FFFFFF" />
            
            { (isHovered || isCompleted) && <circle cx="50" cy="8" r="5" fill={theme.main} className="animate-ping" /> }

            <path d="M 32 105 L 32 115 A 5 5 0 0 0 42 115 L 42 105 Z" fill="#5F6368" />
            <path d="M 58 105 L 58 115 A 5 5 0 0 0 68 115 L 68 105 Z" fill="#5F6368" />

            <g style={{ transformOrigin: '25px 70px', transform: (!isHovered && !isCompleted) ? `rotate(${pose.lArm}deg)` : '' }} className={`transition-transform duration-300 ${isHovered || isCompleted ? 'wave-l' : ''}`}>
              <rect x="5" y="65" width="20" height="8" rx="4" fill="#BDC1C6" />
              <circle cx="23" cy="69" r="6" fill={theme.dark} />
              <circle cx="5" cy="69" r="7" fill={theme.dark} />
              <circle cx="5" cy="69" r="4" fill="#FFF" opacity="0.3" />
              {pose.gem === 'L' && <GemStone cx={5} cy={69} rotation={-90} isHovered={isHovered} />}
            </g>
            
            <g style={{ transformOrigin: '75px 70px', transform: (!isHovered && !isCompleted) ? `rotate(${pose.rArm}deg)` : '' }} className={`transition-transform duration-300 ${isHovered || isCompleted ? 'wave-r' : ''}`}>
              <rect x="75" y="65" width="20" height="8" rx="4" fill="#BDC1C6" />
              <circle cx="77" cy="69" r="6" fill={theme.dark} />
              <circle cx="95" cy="69" r="7" fill={theme.dark} />
              <circle cx="95" cy="69" r="4" fill="#FFF" opacity="0.3" />
              {pose.gem === 'R' && <GemStone cx={95} cy={69} rotation={90} isHovered={isHovered} />}
            </g>

            <rect x="20" y="20" width="60" height="90" rx="30" fill={`url(#bodyGrad-${id})`} stroke="#000" strokeWidth="1.5" strokeOpacity="0.1" />
            <path d="M 25 35 Q 50 22 75 35 A 25 25 0 0 0 25 35 Z" fill="#FFFFFF" opacity="0.4" />
            
            <path d="M 20 60 L 80 60 L 80 80 A 30 30 0 0 1 20 80 Z" fill="#FFFFFF" opacity="0.95" />
            <line x1="20" y1="60" x2="80" y2="60" stroke="#000" strokeWidth="1" strokeOpacity="0.1" />

            <rect x="25" y="65" width="50" height="34" rx="6" fill="#202124" stroke="#BDC1C6" strokeWidth="2" />
            {image ? (
              <image href={image} x="25" y="65" width="50" height="34" preserveAspectRatio="xMidYMid slice" clipPath={`url(#${clipId})`} />
            ) : (
              <g>
                <text x="50" y="88" fill={theme.light} fontSize="22" fontWeight="900" fontFamily="system-ui, sans-serif" textAnchor="middle">{id}</text>
                <circle cx="30" cy="72" r="1.5" fill="#5F6368" />
                <circle cx="70" cy="72" r="1.5" fill="#5F6368" />
              </g>
            )}
            <path d="M 25 65 L 55 65 L 45 99 L 25 99 Z" fill="#FFF" opacity="0.1" clipPath={`url(#${clipId})`} />

            <rect x="18" y="36" width="64" height="12" fill="#202124" />
            
            <circle cx="36" cy="42" r="16" fill="url(#metalGrad)" stroke="#5F6368" strokeWidth="1.5" />
            <circle cx="36" cy="42" r="12" fill="#FFFFFF" />
            <circle cx="64" cy="42" r="16" fill="url(#metalGrad)" stroke="#5F6368" strokeWidth="1.5" />
            <circle cx="64" cy="42" r="12" fill="#FFFFFF" />
            
            {(!isHovered && !isCompleted) ? (
              <g className="look-anim">
                <circle cx={36 + pose.eyeX} cy="42" r="6" fill="#202124" />
                <circle cx={34 + pose.eyeX} cy="40" r="2" fill="#FFFFFF" /> 
                <circle cx={64 + pose.eyeX} cy="42" r="6" fill="#202124" />
                <circle cx={62 + pose.eyeX} cy="40" r="2" fill="#FFFFFF" />
              </g>
            ) : (
              <g>
                <path d="M 30 44 Q 36 34 42 44" stroke="#202124" strokeWidth="3" fill="none" strokeLinecap="round" />
                <ellipse cx="30" cy="48" rx="4" ry="2" fill="#FF8A80" opacity="0.8" />
                <path d="M 58 44 Q 64 34 70 44" stroke="#202124" strokeWidth="3" fill="none" strokeLinecap="round" />
                <ellipse cx="70" cy="48" rx="4" ry="2" fill="#FF8A80" opacity="0.8" />
              </g>
            )}

            <g className={`transition-opacity duration-300 ${isHovered || isCompleted ? 'opacity-100' : 'opacity-0'}`}>
              <path d="M 20 15 Q 25 10 30 15 Q 25 25 20 15 Z" fill="#FF8A80" className="animate-ping" style={{ animationDuration: '0.8s' }} />
              <path d="M 80 20 Q 85 15 90 20 Q 85 30 80 20 Z" fill="#FFD54F" className="animate-ping" style={{ animationDuration: '1.2s' }} />
            </g>

          </g>
        </g>
      </svg>
    );
  };

  const getTransformForBot = (index, isHovered) => {
    const isFrontRow = index % 2 === 0; 
    const logicalXIndex = Math.floor(index / 2); 
    const baseSpacing = 240; 
    
    let xOffsetPx = (logicalXIndex - 2) * baseSpacing;
    if (!isFrontRow) {
      xOffsetPx += (baseSpacing / 2);
    }
    
    const yOffsetPx = isFrontRow ? 80 : -70; 
    const depthScale = 1; 
    const hoverScaleMultiplier = isHovered ? 1.15 : 1;
    const finalScale = depthScale * hoverScaleMultiplier;
    const lift = isHovered ? '-15px' : '0px'; 

    return `translate(${xOffsetPx}px, calc(${yOffsetPx}px + ${lift})) scale(${finalScale})`;
  };

  return (
    <div className={`min-h-screen font-sans pb-16 overflow-x-hidden selection:bg-pink-200 transition-colors duration-1000 relative ${isDarkMode ? 'bg-[#0F172A] text-slate-200' : 'bg-gradient-to-br from-[#E0F7FA] via-[#F1F8E9] to-[#FFF9C4] text-[#4A5568]'}`}>
      
      {/* 深色舞台專屬：環境劇院背光效果 */}
      <div 
        className={`pointer-events-none fixed inset-0 z-0 transition-opacity duration-1000 ${isDarkMode ? 'opacity-100' : 'opacity-0'}`}
        style={{
          background: 'radial-gradient(circle at 50% -20%, rgba(30, 58, 138, 0.4) 0%, rgba(88, 28, 135, 0.15) 40%, rgba(15, 23, 42, 1) 80%)'
        }}
      />

      <header className={`sticky top-0 z-40 backdrop-blur-xl border-b shadow-sm transition-all duration-500 ${isDarkMode ? 'bg-slate-900/85 border-slate-800' : 'bg-white/85 border-gray-200/50'}`}>
        <div className="max-w-[1500px] mx-auto px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-5 relative z-10">
          
          <div className="flex items-center gap-4 group cursor-default">
            <div className={`p-3 rounded-2xl shadow-sm transition-all duration-500 group-hover:rotate-12 group-hover:scale-110 ${isDarkMode ? 'bg-slate-800 border border-slate-700' : 'bg-gradient-to-br from-[#A8DAB5] to-[#81C995] text-white'}`}>
              <Wand2 className={`w-7 h-7 ${isDarkMode ? 'text-[#A8DAB5]' : 'text-white'}`} />
            </div>
            <div>
              <h1 className={`text-xl md:text-2xl font-extrabold flex items-center gap-2.5 flex-wrap transition-colors ${isDarkMode ? 'text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]' : 'text-[#2D3748] drop-shadow-sm'}`}>
                教學 Gem 寶石 2.0 
                <span className={`text-xs md:text-sm px-3.5 py-1 rounded-full shadow-sm border transition-colors ${isDarkMode ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' : 'bg-[#FFF3E0] text-[#E65100] border-[#FFE0B2]'}`}>
                  Teacher Sonia 研習分享
                </span>
              </h1>
              <p className={`text-sm font-bold mt-1 tracking-wide transition-colors ${isDarkMode ? 'text-slate-400' : 'text-[#718096]'}`}>
                115 宜蘭縣教網中心研習 ‧ 萌系 UDL 互動大廳
              </p>
            </div>
          </div>
          
          <div className="flex flex-wrap justify-center items-center gap-3 md:gap-4">
            
            <div className={`flex items-center gap-2 p-1.5 rounded-full border transition-colors ${isDarkMode ? 'bg-slate-800/80 border-slate-700' : 'bg-gray-50/80 border-gray-100'}`}>
              <button
                onClick={toggleMusic}
                className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm transition-all duration-300 hover:-translate-y-0.5 active:scale-95 ${isDarkMode ? 'text-purple-400 hover:bg-slate-700 hover:text-purple-300' : 'text-purple-600 hover:bg-white hover:shadow-sm'}`}
                title="播放/暫停背景音樂"
              >
                {isMusicPlaying ? <Volume2 className="w-4 h-4 animate-pulse" /> : <VolumeX className="w-4 h-4 opacity-70" />}
                <span className="hidden sm:inline">{isMusicPlaying ? '音樂播放中' : '開啟音樂'}</span>
              </button>
              <div className={`w-px h-5 ${isDarkMode ? 'bg-slate-700' : 'bg-gray-200'}`}></div>
              <button
                onClick={() => setIsDarkMode(!isDarkMode)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm transition-all duration-300 hover:-translate-y-0.5 active:scale-95 ${isDarkMode ? 'text-yellow-400 hover:bg-slate-700' : 'text-indigo-600 hover:bg-white hover:shadow-sm'}`}
              >
                {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                <span className="hidden sm:inline">{isDarkMode ? '日光模式' : '深色舞台'}</span>
              </button>
            </div>

            <div className="flex items-center gap-2.5">
              {isAdmin && (
                <button 
                  onClick={exportData}
                  className="bg-gradient-to-r from-[#8AB4F8] to-[#669DF6] hover:from-[#669DF6] hover:to-[#4285F4] text-white font-bold text-sm px-5 py-2.5 rounded-full inline-flex items-center gap-2 transition-all duration-300 hover:-translate-y-0.5 active:scale-95 shadow-md hover:shadow-lg border-none"
                >
                  <Download className="w-4 h-4" />
                  <span>儲存魔法陣</span>
                </button>
              )}
              
              {isAdmin ? (
                <button 
                  onClick={() => {
                    setIsAdmin(false);
                    showToast('🔒 管理員已登出');
                  }}
                  className={`px-4 py-2.5 rounded-full border transition-all duration-300 hover:-translate-y-0.5 active:scale-95 shadow-sm font-bold text-sm flex items-center gap-2 ${isDarkMode ? 'bg-slate-700 border-slate-600 text-pink-400 hover:bg-slate-600' : 'bg-pink-50 border-pink-200 text-pink-600 hover:bg-pink-100'}`}
                  title="登出管理員"
                >
                  <Unlock className="w-4 h-4" /> 退出管理
                </button>
              ) : (
                <button 
                  onClick={() => setShowAdminLogin(true)}
                  className={`p-2.5 rounded-full border transition-all duration-300 hover:-translate-y-0.5 active:scale-95 shadow-sm ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-400 hover:text-pink-400 hover:border-pink-900/50 hover:bg-slate-700' : 'bg-white border-gray-200 text-gray-400 hover:text-pink-500 hover:border-pink-200 hover:bg-pink-50'}`}
                  title="管理員登入"
                >
                  <Lock className="w-4 h-4" />
                </button>
              )}

              {isAdmin && (
                <button 
                  onClick={handleReset}
                  className={`p-2.5 rounded-full border transition-all duration-300 hover:-translate-y-0.5 active:scale-95 shadow-sm ${isDarkMode ? 'bg-slate-800 border-slate-700 text-red-400 hover:text-red-300 hover:border-red-900/50 hover:bg-slate-700' : 'bg-white border-gray-200 text-red-500 hover:text-red-600 hover:border-red-200 hover:bg-red-50'}`}
                  title="魔法重置 (清除所有人上傳的資料)"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              )}
            </div>

          </div>
        </div>
      </header>

      <main className="max-w-[1500px] mx-auto px-6 mt-12 relative z-10">
        
        <div className={`backdrop-blur-lg p-8 rounded-[32px] shadow-lg border-4 mb-14 relative overflow-hidden flex flex-col md:flex-row items-center gap-8 transition-colors duration-500 ${isDarkMode ? 'bg-slate-800/60 border-slate-700' : 'bg-white/80 border-white'}`}>
          <div className="absolute -top-4 -right-4 text-6xl opacity-20">✨</div>
          <div className="absolute bottom-4 -left-4 text-6xl opacity-20 text-yellow-300">⭐</div>

          <div className="flex-1 relative z-10 pl-4">
            <div className="inline-flex items-center gap-1.5 bg-pink-100 text-pink-600 px-4 py-1.5 rounded-full text-xs font-bold mb-4 shadow-sm">
              <Heart className="w-3.5 h-3.5 fill-pink-600" /> UDL 魔法任務：給予選擇與表達
            </div>
            <h2 className={`text-2xl sm:text-3xl font-extrabold mt-1 mb-4 flex items-center gap-3 transition-colors ${isDarkMode ? 'text-white' : 'text-[#2D3748]'}`}>
              <MousePointerClick className="w-8 h-8 text-[#A8DAB5] drop-shadow-md animate-bounce" />
              點選超萌小機器人，為他們換上教材新裝！
            </h2>
            <ul className={`text-sm sm:text-base font-medium leading-relaxed space-y-4 list-none p-0 mt-6 transition-colors ${isDarkMode ? 'text-slate-300' : 'text-[#4A5568]'}`}>
              <li className={`flex items-center gap-3 p-2 rounded-2xl transition-colors ${isDarkMode ? 'bg-slate-700/60' : 'bg-white/60'}`}>
                <span className="w-8 h-8 rounded-full bg-[#AECBFA] text-white flex items-center justify-center font-bold text-sm shadow-md shrink-0">1</span> 
                <span>找尋舞台上對應您組別、**手拿發光水藍寶石**的GemBot。</span>
              </li>
              <li className={`flex items-center gap-3 p-2 rounded-2xl transition-colors ${isDarkMode ? 'bg-slate-700/60' : 'bg-white/60'}`}>
                <span className="w-8 h-8 rounded-full bg-[#F28B82] text-white flex items-center justify-center font-bold text-sm shadow-md shrink-0">2</span> 
                <span>親手為他**命名**，並寫下他在教材中扮演的特殊任務。</span>
              </li>
              <li className={`flex items-center gap-3 p-2 rounded-2xl transition-colors ${isDarkMode ? 'bg-slate-700/60' : 'bg-white/60'}`}>
                <span className="w-8 h-8 rounded-full bg-[#FDE293] text-orange-500 flex items-center justify-center font-bold text-sm shadow-md shrink-0">3</span> 
                <span>按 <kbd className={`border-2 px-2 py-1 rounded-lg font-bold text-xs shadow-sm ${isDarkMode ? 'bg-slate-800 border-slate-600 text-slate-300' : 'bg-white border-gray-200 text-gray-600'}`}>Ctrl+V</kbd> 貼上截圖與 Gem 連結，機器人就會開心說 <strong>Thank you!</strong></span>
              </li>
            </ul>
          </div>
          
          <div className={`hidden md:flex flex-col items-center justify-center p-8 rounded-[32px] border-4 shadow-inner transition-colors duration-500 ${isDarkMode ? 'bg-gradient-to-b from-slate-700 to-slate-800 border-slate-600' : 'bg-gradient-to-b from-[#FFF9C4] to-white border-white'}`}>
             <div className="w-32 h-32 relative mb-4 flex items-center justify-center">
                <svg viewBox="-30 -30 60 60" className="w-full h-full drop-shadow-xl animate-pulse" style={{ animationDuration: '3s' }}>
                  <defs>
                    <radialGradient id="bigGemGlowGrad" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.9" />
                      <stop offset="40%" stopColor="#81D4FA" stopOpacity="0.6" />
                      <stop offset="100%" stopColor="#0288D1" stopOpacity="0" />
                    </radialGradient>
                    <linearGradient id="bigMagicSparkleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#FF9A9E" /> 
                      <stop offset="50%" stopColor="#FECFEF" />
                      <stop offset="100%" stopColor="#A1C4FD" />
                    </linearGradient>
                  </defs>
                  
                  <circle cx="0" cy="0" r="28" fill="url(#bigGemGlowGrad)" />
                  
                  <g transform="scale(1.4) translate(0, -2)">
                    <path d="M -8,-10 L 8,-10 L 0,16 Z" fill="rgba(255,255,255,0.4)" />
                    
                    <path d="M -8,-10 L -5,-2 L -16,-2 Z" fill="rgba(225, 245, 254, 0.95)" stroke="#81D4FA" strokeWidth="0.5" strokeLinejoin="round"/>
                    <path d="M 8,-10 L 16,-2 L 5,-2 Z" fill="rgba(179, 229, 252, 0.85)" stroke="#81D4FA" strokeWidth="0.5" strokeLinejoin="round"/>
                    <path d="M -8,-10 L 8,-10 L 5,-2 L -5,-2 Z" fill="rgba(255, 255, 255, 1)" stroke="#B3E5FC" strokeWidth="0.5" strokeLinejoin="round"/>
                    
                    <path d="M -16,-2 L -5,-2 L 0,16 Z" fill="rgba(79, 195, 247, 0.7)" stroke="#4FC3F7" strokeWidth="0.5" strokeLinejoin="round"/>
                    <path d="M 16,-2 L 5,-2 L 0,16 Z" fill="rgba(3, 169, 244, 0.6)" stroke="#4FC3F7" strokeWidth="0.5" strokeLinejoin="round"/>
                    <path d="M -5,-2 L 5,-2 L 0,16 Z" fill="rgba(129, 212, 250, 0.8)" stroke="#81D4FA" strokeWidth="0.5" strokeLinejoin="round"/>
                    
                    <g transform="translate(0, 3) scale(0.9)">
                       <path d="M 0,-8 Q 0,0 8,0 Q 0,0 0,8 Q 0,0 -8,0 Q 0,0 0,-8 Z" fill="none" stroke="url(#bigMagicSparkleGrad)" strokeWidth="1.5" opacity="0.9" />
                       <path d="M 0,-5 Q 0,0 5,0 Q 0,0 0,5 Q 0,0 -5,0 Q 0,0 0,-5 Z" fill="#FFFFFF" />
                       <circle cx="0" cy="0" r="1.5" fill="#FFF9C4" />
                    </g>
                    
                    <path d="M -13,-1 L -5,11" stroke="#FFFFFF" strokeWidth="1.2" strokeLinecap="round" opacity="0.8" />
                    <path d="M 6,-1 L 14,-1" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" opacity="0.9" />
                    <path d="M -6,-9 L 6,-9" stroke="#FFFFFF" strokeWidth="1" strokeLinecap="round" opacity="0.9" />
                  </g>
                  
                  <g className="animate-spin" style={{ animationDuration: '6s' }}>
                    <path d="M -16,-16 L -10,-10 M -10,-16 L -16,-10" stroke="rgba(255, 255, 255, 0.9)" strokeWidth="1.5" strokeLinecap="round" />
                    <path d="M 14,10 L 20,10 M 17,7 L 17,13" stroke="rgba(255, 255, 255, 0.8)" strokeWidth="1.5" strokeLinecap="round" />
                  </g>
                </svg>
             </div>
             <p className={`font-bold px-4 py-1.5 rounded-full shadow-sm text-sm transition-colors ${isDarkMode ? 'text-[#8AB4F8] bg-slate-800' : 'text-[#669DF6] bg-white'}`}>小機器人準備就緒</p>
          </div>
        </div>

        {/* 🌟 歡樂小寶貝展演舞台 */}
        <div className={`w-full relative py-24 flex justify-center items-center overflow-x-auto overflow-y-hidden rounded-[40px] border-4 shadow-xl backdrop-blur-sm transition-colors duration-500 ${isDarkMode ? 'bg-slate-800/40 border-slate-700' : 'bg-white/40 border-white'}`} 
             style={{ perspective: '1600px', minHeight: '750px' }}>
             
          {/* 舞台地板光影 */}
          <div className="absolute top-[40%] w-[1600px] h-[700px] pointer-events-none transition-all duration-1000"
               style={{ 
                 transform: 'rotateX(75deg) translateZ(-80px)',
                 background: isDarkMode
                   ? 'radial-gradient(ellipse at 50% 50%, rgba(253, 224, 71, 0.25) 0%, transparent 50%), radial-gradient(ellipse at 20% 60%, rgba(147, 197, 253, 0.25) 0%, transparent 40%), radial-gradient(ellipse at 80% 60%, rgba(196, 181, 253, 0.25) 0%, transparent 40%)'
                   : 'radial-gradient(ellipse at center, rgba(253, 226, 147, 0.4) 0%, transparent 70%)',
               }}>
            <div className={`w-full h-full transition-opacity duration-1000 ${isDarkMode ? 'opacity-10' : 'opacity-30'}`}
                 style={{
                   backgroundImage: 'radial-gradient(#F4B400 3px, transparent 3px)',
                   backgroundSize: '40px 40px'
                 }}>
            </div>
          </div>

          <div className="relative w-[1400px] h-[500px] flex justify-center items-center">
            
            {/* 3D 質感聚光燈陣列 (深色模式專屬) */}
            <div className={`absolute top-[-250px] w-full h-[1200px] flex justify-center pointer-events-none z-30 transition-opacity duration-1000 ${isDarkMode ? 'opacity-100' : 'opacity-0'}`}>
              
              <div className="absolute left-[5%] w-[600px] h-full beam-l" style={{ transformOrigin: 'top center' }}>
                <div className="absolute inset-0 w-full h-full" style={{ background: 'linear-gradient(to bottom, rgba(253, 224, 71, 0.08) 0%, transparent 75%)', clipPath: 'polygon(35% 0, 65% 0, 90% 100%, 10% 100%)', filter: 'blur(50px)' }} />
                <div className="absolute inset-0 w-full h-full" style={{ background: 'linear-gradient(to bottom, rgba(255, 255, 255, 0.12) 0%, transparent 45%)', clipPath: 'polygon(45% 0, 55% 0, 75% 100%, 25% 100%)', filter: 'blur(25px)' }} />
              </div>

              <div className="absolute left-[50%] -translate-x-1/2 w-[700px] h-full beam-c" style={{ transformOrigin: 'top center' }}>
                <div className="absolute inset-0 w-full h-full" style={{ background: 'linear-gradient(to bottom, rgba(253, 224, 71, 0.1) 0%, transparent 80%)', clipPath: 'polygon(30% 0, 70% 0, 95% 100%, 5% 100%)', filter: 'blur(60px)' }} />
                <div className="absolute inset-0 w-full h-full" style={{ background: 'linear-gradient(to bottom, rgba(255, 255, 255, 0.15) 0%, transparent 50%)', clipPath: 'polygon(42% 0, 58% 0, 70% 100%, 30% 100%)', filter: 'blur(30px)' }} />
              </div>

              <div className="absolute right-[5%] w-[600px] h-full beam-r" style={{ transformOrigin: 'top center' }}>
                 <div className="absolute inset-0 w-full h-full" style={{ background: 'linear-gradient(to bottom, rgba(253, 224, 71, 0.08) 0%, transparent 75%)', clipPath: 'polygon(35% 0, 65% 0, 90% 100%, 10% 100%)', filter: 'blur(50px)' }} />
                 <div className="absolute inset-0 w-full h-full" style={{ background: 'linear-gradient(to bottom, rgba(255, 255, 255, 0.12) 0%, transparent 45%)', clipPath: 'polygon(45% 0, 55% 0, 75% 100%, 25% 100%)', filter: 'blur(25px)' }} />
              </div>
              
              <div className="absolute inset-0 w-full h-[60%] dust-particles opacity-40 mix-blend-screen" 
                   style={{ maskImage: 'linear-gradient(to bottom, black 0%, transparent 100%)', WebkitMaskImage: 'linear-gradient(to bottom, black 0%, transparent 100%)' }}>
              </div>
            </div>

            {/* 加上 -translate-x-[90px] 將整個群組向左拉回中心，並補回置中對齊屬性 */}
            <div className="absolute inset-0 flex justify-center items-center -translate-x-[90px]">
              {robots.map((bot, index) => {
                const isHovered = hoveredBotId === bot.id;
                const theme = getBotTheme(bot.id);
                const zIndexBase = index % 2 === 0 ? 20 : 10; 
                const displayName = bot.name || `我是 ${bot.id} 號`;
                
                const isCompleted = Boolean(bot.name && bot.link && bot.image);

                return (
                  <div 
                    key={bot.id}
                    className="absolute cursor-pointer group"
                    style={{ 
                      transform: getTransformForBot(index, isHovered),
                      zIndex: isHovered ? 50 : zIndexBase,
                      width: '180px',
                      height: '243px',
                      transition: 'all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)' 
                    }}
                    onMouseEnter={() => setHoveredBotId(bot.id)}
                    onMouseLeave={() => setHoveredBotId(null)}
                    onClick={() => {
                      playCuteSound(bot.id);
                      setEditingBot(bot);
                    }}
                  >
                    {isCompleted && !isHovered && (
                      <div className={`absolute -top-16 left-1/2 -translate-x-1/2 whitespace-nowrap px-4 py-2 rounded-2xl border-2 text-pink-500 font-extrabold text-sm flex flex-col items-center animate-bounce shadow-xl z-20 transition-colors ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`}
                           style={{ borderColor: theme.main }}>
                        <span className="flex items-center gap-1.5">
                          <Heart className="w-4 h-4 fill-pink-500" /> Thank you!
                        </span>
                        <div className={`absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 border-b-2 border-r-2 rotate-45 transition-colors ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`} style={{ borderColor: theme.main }}></div>
                      </div>
                    )}

                    <div className={`absolute -top-20 left-1/2 -translate-x-1/2 whitespace-nowrap px-4 py-3 rounded-2xl border-2 font-bold text-sm flex flex-col items-center transition-all duration-300 shadow-xl z-30 ${isHovered ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-4 scale-50 pointer-events-none'} ${isDarkMode ? 'bg-slate-800 text-white' : 'bg-white text-[#4A5568]'}`}
                         style={{ borderColor: theme.main }}>
                      {bot.group && <span className="text-[10px] text-gray-400 mb-0.5 font-bold">第 {bot.group} 組的寶貝</span>}
                      {bot.creator && <span className="text-[10px] text-pink-500 mb-0.5 font-bold">創作者: {bot.creator}</span>}
                      <span className="flex items-center gap-1.5">
                        {!bot.name && <Sparkles className="w-3.5 h-3.5 text-yellow-400" />}
                        {displayName}
                      </span>
                      <div className={`absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 border-b-2 border-r-2 rotate-45 transition-colors ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`} style={{ borderColor: theme.main }}></div>
                    </div>

                    {bot.link && !isHovered && (
                      <div className="absolute top-0 right-0 bg-pink-400 text-white p-2 rounded-full z-10 shadow-md border-2 border-white animate-pulse">
                        <Heart className="w-4 h-4 fill-white" />
                      </div>
                    )}

                    <MinionCuteRobotSVG bot={bot} theme={theme} isHovered={isHovered} isCompleted={isCompleted} />
                    
                    <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-24 h-6 bg-black/10 rounded-[100%] blur-[4px] transition-all duration-500 pointer-events-none" 
                         style={{ 
                           transform: isHovered || isCompleted ? 'scale(0.8)' : 'scale(1)', 
                           opacity: isHovered || isCompleted ? 0.05 : 0.25 
                         }}></div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </main>

      {/* 獨立彈出視窗 */}
      {editingBot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
             onPaste={(e) => handlePasteImage(e, editingBot.id)}>
          <div className="absolute inset-0 bg-[#4A5568]/70 backdrop-blur-sm transition-opacity" onClick={() => setEditingBot(null)}></div>
          
          <div className={`relative border-4 rounded-[40px] shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col md:flex-row animate-in fade-in zoom-in-95 duration-300 transition-colors ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-white'}`}>
            
            <button onClick={() => setEditingBot(null)} className={`absolute top-4 right-4 p-2 rounded-full transition-colors z-20 shadow-sm ${isDarkMode ? 'bg-slate-700 hover:bg-pink-900/50 text-slate-300 hover:text-pink-400' : 'bg-gray-100 hover:bg-pink-100 text-gray-500 hover:text-pink-500'}`}>
              <X className="w-6 h-6" />
            </button>

            <div className="w-full md:w-2/5 p-8 flex flex-col items-center justify-center relative" 
                 style={{ background: isDarkMode ? `linear-gradient(to bottom, #1E293B, ${getBotTheme(editingBot.id).dark}40)` : `linear-gradient(to bottom, #FFFFFF, ${getBotTheme(editingBot.id).screen})` }}>
              <div className="absolute inset-0 opacity-40" style={{ backgroundImage: `radial-gradient(${getBotTheme(editingBot.id).main} 2px, transparent 2px)`, backgroundSize: '20px 20px' }}></div>
              
              <div className={`backdrop-blur-sm px-6 py-2 rounded-full shadow-sm mb-6 z-10 border-2 transition-colors ${isDarkMode ? 'bg-slate-900/80' : 'bg-white/80'}`} style={{ borderColor: getBotTheme(editingBot.id).light }}>
                <h4 className={`text-lg font-extrabold transition-colors ${isDarkMode ? 'text-white' : 'text-[#4A5568]'}`}>
                  寶貝編號：{editingBot.id} 號
                </h4>
              </div>
              
              <div className="w-64 h-80 relative drop-shadow-xl z-10 pointer-events-none">
                <MinionCuteRobotSVG bot={editingBot} theme={getBotTheme(editingBot.id)} isHovered={true} isCompleted={false} />
              </div>
            </div>

            <div className={`w-full md:w-3/5 p-8 flex flex-col h-full transition-colors relative z-10 ${isDarkMode ? 'text-slate-200' : 'text-[#4A5568]'}`}>
              <h3 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <Edit3 className="text-pink-500 w-6 h-6"/>
                為你的小傢伙設計專屬任務
              </h3>
              
              <div className="space-y-5 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                
                <div className="flex gap-4">
                  <div className="w-1/4">
                    <label className="block text-sm font-bold mb-1.5 opacity-80">組別</label>
                    <input 
                      type="text" 
                      value={editingBot.group || ''} 
                      onChange={(e) => updateRobot(editingBot.id, {group: e.target.value})} 
                      className={`w-full p-3 rounded-2xl border-2 outline-none focus:border-pink-400 transition-colors shadow-sm font-medium ${isDarkMode ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' : 'bg-gray-50 border-gray-200 text-gray-800 placeholder-gray-400'}`} 
                      placeholder="例如: 1" 
                    />
                  </div>
                  <div className="w-1/4">
                    <label className="block text-sm font-bold mb-1.5 opacity-80">創作者/團隊</label>
                    <input 
                      type="text" 
                      value={editingBot.creator || ''} 
                      onChange={(e) => updateRobot(editingBot.id, {creator: e.target.value})} 
                      className={`w-full p-3 rounded-2xl border-2 outline-none focus:border-pink-400 transition-colors shadow-sm font-medium ${isDarkMode ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' : 'bg-gray-50 border-gray-200 text-gray-800 placeholder-gray-400'}`} 
                      placeholder="創作者姓名" 
                    />
                  </div>
                  <div className="w-2/4">
                    <label className="block text-sm font-bold mb-1.5 opacity-80">寶貝名稱</label>
                    <input 
                      type="text" 
                      value={editingBot.name || ''} 
                      onChange={(e) => updateRobot(editingBot.id, {name: e.target.value})} 
                      className={`w-full p-3 rounded-2xl border-2 outline-none focus:border-pink-400 transition-colors shadow-sm font-medium ${isDarkMode ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' : 'bg-gray-50 border-gray-200 text-gray-800 placeholder-gray-400'}`} 
                      placeholder="給他取個可愛的名字" 
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold mb-1.5 opacity-80 flex items-center gap-1.5">
                    <ExternalLink className="w-4 h-4 text-pink-500" />
                    Gem 專屬連結
                  </label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={editingBot.link} 
                      onChange={(e) => updateRobot(editingBot.id, {link: e.target.value})} 
                      className={`flex-1 p-3 rounded-2xl border-2 outline-none focus:border-pink-400 transition-colors shadow-sm font-medium ${isDarkMode ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' : 'bg-gray-50 border-gray-200 text-gray-800 placeholder-gray-400'}`} 
                      placeholder="貼上你的分享連結 (URL)" 
                    />
                    <button 
                      onClick={() => handleCopyLink(editingBot.link, editingBot.name, editingBot.id)} 
                      className="px-4 py-2 bg-pink-100 text-pink-600 hover:bg-pink-200 font-bold rounded-2xl transition-colors shadow-sm whitespace-nowrap flex items-center justify-center gap-1.5"
                    >
                      <Copy className="w-4 h-4" /> 複製
                    </button>
                    {editingBot.link && (
                      <a 
                        href={editingBot.link} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="px-4 py-2 bg-[#A8DAB5] hover:bg-[#81C995] text-white font-bold rounded-2xl transition-colors shadow-sm whitespace-nowrap flex items-center justify-center gap-1.5"
                      >
                        <Check className="w-4 h-4" /> 測試
                      </a>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold mb-1.5 opacity-80 flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-yellow-500" />
                    任務說明
                  </label>
                  <textarea 
                    value={editingBot.desc} 
                    onChange={(e) => updateRobot(editingBot.id, {desc: e.target.value})} 
                    className={`w-full p-3 rounded-2xl border-2 outline-none focus:border-pink-400 transition-colors shadow-sm font-medium resize-none ${isDarkMode ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' : 'bg-gray-50 border-gray-200 text-gray-800 placeholder-gray-400'}`} 
                    rows={3} 
                    placeholder="這個機器人在教材中負責什麼特殊任務呢？"
                  ></textarea>
                </div>

                <div>
                  <label className="block text-sm font-bold mb-1.5 opacity-80 flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-blue-500" />
                    肚肚螢幕截圖 (可直接 Ctrl+V 貼上)
                  </label>
                  <button 
                    onClick={() => fileInputRef.current?.click()} 
                    className={`px-4 py-2 mt-1 font-bold rounded-2xl transition-colors shadow-sm flex items-center justify-center gap-1.5 text-sm ${isDarkMode ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}
                  >
                    <Upload className="w-4 h-4" /> 選擇圖片檔案
                  </button>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={(e) => handleImageUpload(editingBot.id, e.target.files[0])} 
                    className="hidden" 
                    accept="image/*" 
                  />
                </div>

              </div>

              <div className="mt-6 pt-4 border-t border-dashed border-gray-200/50 flex gap-3">
                {isAdmin && (
                  <button 
                    onClick={() => clearSingleRobot(editingBot.id)} 
                    className={`px-5 py-3.5 rounded-2xl font-bold text-lg shadow-sm hover:shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-2 ${isDarkMode ? 'bg-slate-700 hover:bg-red-900/50 text-red-400' : 'bg-red-50 hover:bg-red-100 text-red-500'}`}
                    title="單獨清除此寶貝資料"
                  >
                    <Trash2 className="w-5 h-5" /> 清除
                  </button>
                )}
                <button 
                  onClick={() => setEditingBot(null)} 
                  className="flex-1 bg-gradient-to-r from-pink-400 to-pink-500 hover:from-pink-500 hover:to-pink-600 text-white rounded-2xl py-3.5 font-bold text-lg shadow-md hover:shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-5 h-5" /> 完成設定
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showAdminLogin && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#4A5568]/70 backdrop-blur-sm transition-opacity" onClick={() => setShowAdminLogin(false)}></div>
          <div className={`relative p-8 rounded-3xl shadow-2xl w-full max-w-sm animate-in zoom-in-95 duration-200 border-2 ${isDarkMode ? 'bg-slate-800 border-slate-600' : 'bg-white border-pink-200'}`}>
            <h3 className={`text-xl font-bold mb-4 flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-[#4A5568]'}`}>
              <Lock className="w-5 h-5 text-pink-500" /> 管理員登入
            </h3>
            <p className={`text-sm mb-4 font-bold ${isDarkMode ? 'text-slate-300' : 'text-gray-600'}`}>請輸入密碼以解鎖資料管理權限</p>
            <input 
              type="password" 
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdminLogin()}
              placeholder="請輸入密碼"
              autoFocus
              className={`w-full p-3 mb-6 rounded-xl border-2 outline-none focus:border-pink-400 transition-colors font-bold tracking-widest ${isDarkMode ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' : 'bg-gray-50 border-gray-200 text-gray-800 placeholder-gray-400'}`} 
            />
            <div className="flex gap-3">
              <button 
                onClick={() => setShowAdminLogin(false)}
                className={`flex-1 py-2.5 rounded-xl font-bold transition-colors ${isDarkMode ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                取消
              </button>
              <button 
                onClick={handleAdminLogin}
                className="flex-1 py-2.5 rounded-xl font-bold text-white bg-pink-500 hover:bg-pink-600 transition-colors shadow-sm flex items-center justify-center gap-2"
              >
                <Unlock className="w-4 h-4" /> 登入解鎖
              </button>
            </div>
          </div>
        </div>
      )}

      {toastMessage && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-bottom-8 fade-in duration-300">
          <div className="bg-slate-800 text-white px-6 py-3.5 rounded-full shadow-xl font-bold flex items-center gap-3 border-2 border-slate-700">
            {toastMessage}
          </div>
        </div>
      )}

      <footer className={`relative z-10 w-full mt-auto py-8 transition-colors duration-500 ${isDarkMode ? 'bg-slate-900/80 border-t border-slate-800' : 'bg-white/60 border-t border-white/50 backdrop-blur-md'}`}>
        <div className="max-w-[1500px] mx-auto px-6 flex flex-col items-center justify-center gap-4">
          <p className={`text-sm font-bold tracking-wide text-center flex flex-wrap items-center justify-center gap-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            © 2026 Gem 機器人成果展示平台 · 基於 UDL 多元參與、表徵與表達精神設計
          </p>
          <p className={`text-xs font-medium opacity-80 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
            Credit: @Teacher Sonia via Gemini AI 2026
          </p>
          
          <a 
            href="https://gem.ilc.edu.tw" 
            target="_blank" 
            rel="noopener noreferrer"
            className="group mt-2 relative inline-flex items-center justify-center"
          >
            <div className={`absolute inset-0 rounded-2xl transition-all duration-300 translate-y-1.5 ${isDarkMode ? 'bg-blue-900/50' : 'bg-blue-200'}`}></div>
            <div className={`relative px-6 py-3 rounded-2xl font-bold text-sm flex items-center gap-2 transition-all duration-300 active:translate-y-1.5 shadow-sm border-2 ${isDarkMode ? 'bg-slate-800 border-blue-500/30 text-blue-300 group-hover:bg-slate-700' : 'bg-white border-blue-100 text-blue-600 group-hover:bg-blue-50'}`}>
              <Sparkles className="w-4 h-4 text-yellow-500 group-hover:animate-spin" style={{ animationDuration: '3s' }} />
              【宜蘭縣gem的平台】AI 教學靈感庫
              <ExternalLink className="w-3.5 h-3.5 opacity-50 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
            </div>
          </a>
        </div>
      </footer>

      <audio 
        ref={audioRef} 
        src="https://cdn.pixabay.com/audio/2022/05/27/audio_1808fbf07a.mp3" 
        loop 
      />

      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #CBD5E1;
          border-radius: 20px;
        }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #475569;
        }

        @keyframes spotlightL {
          0%, 100% { transform: rotate(25deg); }
          50% { transform: rotate(15deg); }
        }
        @keyframes spotlightR {
          0%, 100% { transform: rotate(-25deg); }
          50% { transform: rotate(-15deg); }
        }
        @keyframes spotlightC {
          0%, 100% { transform: rotate(-8deg); }
          50% { transform: rotate(8deg); }
        }
        .beam-l { animation: spotlightL 12s ease-in-out infinite alternate; }
        .beam-r { animation: spotlightR 14s ease-in-out infinite alternate; }
        .beam-c { animation: spotlightC 16s ease-in-out infinite alternate; }

        @keyframes dustFloat {
          0% { background-position: 0px 0px, 0px 0px; }
          100% { background-position: 100px 200px, -50px 150px; }
        }
        .dust-particles {
          background-image: radial-gradient(white 1px, transparent 1.5px), radial-gradient(white 1.5px, transparent 2px);
          background-size: 60px 60px, 100px 100px;
          background-position: 0 0, 30px 30px;
          animation: dustFloat 40s linear infinite;
        }
      `}} />
    </div>
  );
}