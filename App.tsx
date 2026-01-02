
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { translations } from './lib/translations';
import { 
  initializeFirebase, 
  getAuthInstance, 
  getUserProfile, 
  login, 
  logout
} from './services/firebaseService';
import { onAuthStateChanged } from 'firebase/auth';
import { generateImageWithGemini, editImageWithGemini, refinePrompt, callBackendGemini } from './services/geminiService';
import { CanvasEditor, CanvasEditorRef } from './components/CanvasEditor';
import { Toolbar } from './components/Toolbar';
import { ThumbnailManager } from './components/ThumbnailManager';
import { ResultDisplay } from './components/ResultDisplay';
import { QuickPrompts } from './components/QuickPrompts';
import { LayoutEditor } from './components/LayoutEditor';
import { PhotoEditor } from './components/PhotoEditor';
import { AdminUserList } from './components/AdminUserList';
import { WatermarkModal } from './components/WatermarkModal';
import { VideoPromptModal } from './components/VideoPromptModal';
import { UserManualModal } from './components/UserManualModal';
import { PromptEngineerModal } from './components/PromptEngineerModal';
import { 
  SparklesIcon, UserCircleIcon, RedrawIcon, UploadIcon, CloseIcon, RefreshIcon, VideoCameraIcon,
  ZoomInIcon, ZoomOutIcon, ArrowsPointingOutIcon, HandIcon, HdIcon, DevicePhoneMobileIcon, GlobeAltIcon, BookOpenIcon, CommandLineIcon, MagicWandIcon, KeyIcon, ArrowDownIcon, ArrowUpIcon
} from './components/Icons';
import type { TFunction, Language, UserProfile, UploadedImage, ApiResult, GeminiImagePart } from './types';

// 大師指令資料集
const MASTER_COMMANDS = [
    { label: "夢幻唯美人像", prompt: "將背景轉化為夢幻且朦朧的散景效果，色彩柔和，主體特徵與姿式保持原樣。皮膚要變好,去除畫面上多餘的光斑，營造出高端時尚雜誌的高級質感。" },
    { label: "氛圍感人像柔焦", prompt: "創造如夢似幻的氛圍，背景使用大光圈虛化，不變動主體的姿式與容貌特徵。透過專業調色提升畫面層次，展現大師級的修圖藝術。" },
    { label: "大師級人像光影重塑", prompt: "運用大師級修圖風格，在不改變主體特徵與姿式的前提下，強化電影感光影氛圍，模擬 85mm f/1.2 大光圈鏡頭效果，創造極致的模糊散景，並讓皮膚變很好很柔美。" },
    { label: "紀實人像光影風格", prompt: "採用國家地理雜誌風格，優化面部光影層次，嚴格保持主體原始特徵與姿式。消除強光產生的光斑，讓整體畫面顯得通透且具備故事感。" },
    { label: "清晰度修復與優化", prompt: "專業修復技術將模糊恢復成清晰，特別加強眼睛與髮絲的細節，同時確保主體特徵與姿式不產生任何變動，呈現國家地理雜誌般的紀實高畫質。" },
    { label: "野生動物攝影大師", prompt: "展現國家地理雜誌攝影風格，主體鳥類的特徵、品種與姿式必須與原圖完全一致。將模糊恢復成清晰，展現羽毛的極致細節，背景呈現自然的大光圈散景。" },
    { label: "夢幻生態氛圍", prompt: "營造夢幻且溫柔的森林光影氛圍，鳥類特徵與姿式保持不變。使用大師級修圖手法去除干擾的光斑，並強化背景的夢幻虛化效果。" },
    { label: "羽毛細節增強", prompt: "專業級清晰度提升，將受損或模糊的羽毛區域修復成清晰銳利。嚴格保留主體鳥類的原始姿式，並模擬 600mm 專業長焦鏡頭的大光圈散景感。" },
    { label: "純淨自然光影", prompt: "去除鏡頭產生的雜亂光斑，優化逆光下的光線氛圍。主體特徵與姿式不可變動，背景呈現乾淨且具備層次感的朦朧美。" },
    { label: "高端藝術生態", prompt: "運用大師級修圖風格，強化主體與背景的空間感，背景需呈現夢幻散景。主體鳥類的姿式與細節特徵維持原樣，整體呈現專業野生動物雜誌質感。" },
    { label: "國家地理壯闊風格", prompt: "提升畫面的宏偉感，保持地景原有的結構特徵。將遠景的模糊恢復成清晰，去除鏡頭眩光與光斑，呈現極高動態範圍的專業風景畫質。" },
    { label: "夢幻晨曦光影", prompt: "為畫面增添夢幻的晨霧與光線氛圍，利用大光圈鏡頭效果產生自然的遠景散景。不改變風景中的原有特徵要素，呈現大師級的色調處理。" },
    { label: "藝術化風景重塑", prompt: "在不改變原有風景特徵的前提下，注入夢幻的藝術色彩，模擬專業攝影師的大光圈取景效果，使畫面呈現純淨、無光斑的頂級質感。" },
    { label: "寵物溫馨夢幻寫真", prompt: "打造溫馨且夢幻的背景散景，寵物的容貌特徵與坐臥姿式必須保持原狀。使用大師級修圖風格，讓光影溫柔地包裹主體。" },
    { label: "大師級寵物毛髮質感", prompt: "專業提升毛髮的蓬鬆感與光澤，主體姿式與原始特徵維持不變。背景處理為極致夢幻的散景，去除所有不自然的光影雜點。" },
    { label: "寵物戶外自然光影", prompt: "優化戶外拍攝的光影氛圍，增加陽光灑落的質感，背景展現大光圈朦朧美。寵物的特徵與姿式需與原圖一致，將原本模糊的部分優化為清晰。" }
];

// In-App Browser Overlay Component
const InAppBrowserOverlay: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    return (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center animate-fade-in">
            <div className="bg-gray-800 p-6 rounded-2xl shadow-2xl max-w-sm border border-gray-700 relative">
                <button onClick={onClose} className="absolute top-2 right-2 text-gray-400 hover:text-white p-2">
                    <CloseIcon className="w-6 h-6" />
                </button>
                <GlobeAltIcon className="w-16 h-16 text-blue-400 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">建議使用系統瀏覽器</h3>
                <p className="text-gray-300 text-sm mb-4 leading-relaxed">
                    偵測到您正在使用 LINE 或內建瀏覽器，這可能會導致<b>無法下載圖片</b>或<b>無法安裝 App</b>。
                </p>
                <div className="text-left bg-gray-900/50 p-4 rounded-lg border border-gray-600 mb-6">
                    <p className="text-gray-200 text-sm font-semibold mb-2">請依照以下步驟切換：</p>
                    <ol className="list-decimal list-inside text-gray-400 text-sm space-y-1.5">
                        <li>點擊螢幕角落的 <span className="text-white">⋮</span> 或 <span className="text-white">分享圖示</span></li>
                        <li>選擇 <span className="text-white font-bold">以預設瀏覽器開啟</span></li>
                    </ol>
                </div>
                <button 
                    onClick={onClose}
                    className="w-full py-3 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg transition-colors"
                >
                    我知道了 (繼續使用)
                </button>
            </div>
        </div>
    );
};

// ZoomControls Component
const ZoomControls: React.FC<{
    zoom: number;
    minZoom: number;
    onZoomChange: (zoom: number) => void;
    onFit: () => void;
    t: TFunction;
    isPanMode: boolean;
    onTogglePan: () => void;
}> = ({ zoom, minZoom, onZoomChange, onFit, t, isPanMode, onTogglePan }) => {
    return (
        <div className="flex items-center gap-2 bg-gray-700/50 p-1.5 rounded-lg border border-gray-600">
            <button onClick={() => onZoomChange(Math.max(minZoom, zoom - 0.1))} className="p-1.5 hover:bg-gray-600 rounded text-gray-300" title={t('zoomOutButton')}>
                <ZoomOutIcon className="w-4 h-4" />
            </button>
            <span className="text-xs font-mono text-gray-300 min-w-[3ch] text-center">{Math.round(zoom * 100)}%</span>
            <button onClick={() => onZoomChange(Math.min(3, zoom + 0.1))} className="p-1.5 hover:bg-gray-600 rounded text-gray-300" title={t('zoomInButton')}>
                <ZoomInIcon className="w-4 h-4" />
            </button>
            <div className="w-px h-4 bg-gray-600 mx-1"></div>
            <button onClick={onFit} className="p-1.5 hover:bg-gray-600 rounded text-gray-300" title={t('resetViewButton')}>
                <ArrowsPointingOutIcon className="w-4 h-4" />
            </button>
            <button 
                onClick={onTogglePan} 
                className={`p-1.5 rounded transition-colors ${isPanMode ? 'bg-purple-600 text-white' : 'hover:bg-gray-600 text-gray-300'}`}
                title={t('panModeButton')}
            >
                <HandIcon className="w-4 h-4" />
            </button>
        </div>
    );
};

// Landing Screen Component
const LandingScreen: React.FC<{ onAuthSuccess: () => void; t: TFunction }> = ({ onAuthSuccess, t }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleAuthSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            await login(email, password);
            onAuthSuccess();
        } catch (err: any) {
            console.error(err);
            let msg = err.message;
            if (msg.includes('user-not-found')) msg = '找不到該帳號，請聯繫管理員。';
            if (msg.includes('wrong-password')) msg = '密碼錯誤，請再試一次。';
            setError(msg || 'Authentication failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4">
             <div className="bg-gray-800 rounded-2xl shadow-xl w-full max-w-4xl border border-gray-700 overflow-hidden flex flex-col md:flex-row">
                <div className="bg-gradient-to-br from-purple-900 to-indigo-900 p-8 md:w-5/12 flex flex-col justify-center items-center text-center">
                    <div className="p-4 bg-white/5 rounded-3xl mb-6 shadow-2xl border border-white/10">
                        <SparklesIcon className="w-20 h-20 text-purple-400" />
                    </div>
                    <h1 className="text-3xl font-black text-white mb-2 tracking-tighter">
                        {t('landingTitle' as any) || 'Ivan Ai photo'} 
                        <span className="ml-2 text-[10px] align-top bg-green-600 text-white px-2 py-0.5 rounded-full border border-green-400 shadow-sm font-mono animate-pulse">v1.0.286</span>
                    </h1>
                    <p className="text-purple-200/70 text-sm font-medium tracking-widest uppercase">{t('landingSubtitle' as any) || 'Professional AI Editor'}</p>
                </div>
                
                <div className="p-8 md:w-7/12 bg-[#151825] flex flex-col justify-center">
                    <form onSubmit={handleAuthSubmit} className="space-y-4 animate-fade-in">
                        <h2 className="text-2xl font-black text-white mb-6 text-center tracking-tight">
                            用戶登入 (Enterprise)
                        </h2>
                        
                        {error && <div className="bg-red-900/50 text-red-200 p-3 rounded-xl text-sm border border-red-700 animate-shake">{error}</div>}
                        
                        <div className="space-y-1">
                            <label className="block text-gray-400 text-xs font-bold uppercase tracking-widest ml-1">{t('emailLabel')}</label>
                            <input 
                                type="email" required autoComplete="username"
                                className="w-full bg-gray-900 text-white p-4 rounded-2xl border border-gray-700 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all placeholder-gray-700"
                                value={email} onChange={e => setEmail(e.target.value)}
                                placeholder="name@example.com"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="block text-gray-400 text-xs font-bold uppercase tracking-widest ml-1">{t('passwordLabel')}</label>
                            <input 
                                type="password" required autoComplete="current-password"
                                className="w-full bg-gray-900 text-white p-4 rounded-2xl border border-gray-700 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all placeholder-gray-700"
                                value={password} onChange={e => setPassword(e.target.value)}
                                placeholder="••••••"
                            />
                        </div>
                        <button 
                            type="submit" 
                            disabled={loading}
                            className="w-full py-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black rounded-2xl transition-all disabled:opacity-50 shadow-xl shadow-purple-500/20 mt-4 active:scale-[0.98]"
                        >
                            {loading ? <span className="flex items-center justify-center gap-2"><RefreshIcon className="w-5 h-5 animate-spin"/>驗證中...</span> : t('loginButton')}
                        </button>
                        
                        <div className="text-center mt-6">
                            <p className="text-xs font-bold text-gray-600 uppercase tracking-widest">
                                系統僅限授權用戶，如需帳號請聯繫伊凡
                            </p>
                        </div>
                    </form>
                </div>
             </div>
        </div>
    )
}

const App: React.FC = () => {
  const [lang, setLang] = useState<Language>('zh');
  const [appState, setAppState] = useState<'landing' | 'app'>('landing');
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [firebaseInitialized, setFirebaseInitialized] = useState(false);
  const [showWatermarkModal, setShowWatermarkModal] = useState(false);
  const [showVideoPromptModal, setShowVideoPromptModal] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);
  const [showPromptEngineerModal, setShowPromptEngineerModal] = useState(false);

  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [brushSize, setBrushSize] = useState<number>(50); 
  const [brushColor, setBrushColor] = useState<string>('#ef4444');
  const [prompt, setPrompt] = useState<string>('');
  const [aspectRatio, setAspectRatio] = useState<string>('3:2');
  
  const [modelConfig, setModelConfig] = useState<string>('gemini-3-pro-image-preview,1K,3'); 
  
  const [allQuickPrompts, setAllQuickPrompts] = useState<Record<string, string[]>>({});
  const [apiResult, setApiResult] = useState<ApiResult>({ text: null, imageUrl: null });
  const [loading, setLoading] = useState<boolean>(false);
  const [isRefining, setIsRefining] = useState<boolean>(false);
  const [isUpscaling, setIsUpscaling] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  
  const [zoom, setZoom] = useState(1);
  const [minZoom, setMinZoom] = useState(0.1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [isPanMode, setIsPanMode] = useState(false);
  const [isSpaceDown, setIsSpaceDown] = useState(false);
  const [isComparing, setIsComparing] = useState(false);
  const [isLayoutEditorOpen, setIsLayoutEditorOpen] = useState(false);
  const [editingImage, setEditingImage] = useState<UploadedImage | null>(null);
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  
  const [isMasterCommandsOpen, setIsMasterCommandsOpen] = useState(false);

  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallButton, setShowInstallButton] = useState(false);
  const [isInAppBrowser, setIsInAppBrowser] = useState(false);

  const canvasRef = useRef<CanvasEditorRef>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const panStartRef = useRef({ startX: 0, startY: 0, startPan: { x: 0, y: 0 } });
  const pinchStartRef = useRef<{ dist: number; mid: { x: number; y: number; }; zoom: number; pan: { x: number; y: number; }; } | null>(null);

  // 曝露給全局使用的 Ref
  useEffect(() => {
      (window as any).fileInputRef = fileInputRef;
  }, []);

  const t: TFunction = useCallback((key) => {
    return translations[lang][key] || translations.en[key] || key;
  }, [lang]);

  const fitImageToScreen = useCallback(() => {
    if (!imageContainerRef.current) return;
    const targetUrl = apiResult.imageUrl || uploadedImages.find(img => img.id === selectedImageId)?.dataUrl;
    if (!targetUrl) return;

    const img = new Image();
    img.onload = () => {
        if (!imageContainerRef.current) return;
        const container = imageContainerRef.current;
        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;
        const scale = Math.min(containerWidth / img.naturalWidth, containerHeight / img.naturalHeight);
        setMinZoom(scale);
        setZoom(scale);
        setPan({ x: 0, y: 0 });
    }
    img.src = targetUrl;
  }, [selectedImageId, uploadedImages, apiResult.imageUrl]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
        if (e.ctrlKey && (e.key === '0' || e.code === 'Digit0')) {
            e.preventDefault();
            fitImageToScreen();
            return;
        }
        if (e.code === 'Space') {
            const target = e.target as HTMLElement;
            if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
                e.preventDefault();
                setIsSpaceDown(true);
                if (apiResult.imageUrl) setIsComparing(true);
            }
        }
    };
    const onKeyUp = (e: KeyboardEvent) => {
        if (e.code === 'Space') {
            setIsSpaceDown(false);
            setIsComparing(false);
        }
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
        window.removeEventListener('keydown', onKeyDown);
        window.removeEventListener('keyup', onKeyUp);
    }
  }, [apiResult.imageUrl, fitImageToScreen]);

  useEffect(() => {
    const handler = (e: any) => { e.preventDefault(); setDeferredPrompt(e); setShowInstallButton(true); };
    window.addEventListener('beforeinstallprompt', handler);
    const ua = navigator.userAgent || navigator.vendor || (window as any).opera;
    const isLine = /Line/i.test(ua);
    if (isLine) setIsInAppBrowser(true);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') setShowInstallButton(false);
      setDeferredPrompt(null);
  };

  useEffect(() => {
    const storageKey = `ivan-quick-prompts-${lang}`;
    const stored = localStorage.getItem(storageKey);
    if (stored) {
        try { setAllQuickPrompts(JSON.parse(stored)); } catch (e) { setAllQuickPrompts(translations[lang].defaultQuickPrompts); }
    } else { setAllQuickPrompts(translations[lang].defaultQuickPrompts); }
  }, [lang]);

  const handlePromptsChange = (newPrompts: Record<string, string[]>) => {
      setAllQuickPrompts(newPrompts);
      localStorage.setItem(`ivan-quick-prompts-${lang}`, JSON.stringify(newPrompts));
  };

  const selectedImage = uploadedImages.find(img => img.id === selectedImageId) || null;
  useEffect(() => { fitImageToScreen(); }, [selectedImageId, apiResult.imageUrl, fitImageToScreen]);

  useEffect(() => {
    try { if (initializeFirebase()) setFirebaseInitialized(true); } catch (e) { setError("Firebase initialization failed."); }
  }, []);

  useEffect(() => {
    if (!firebaseInitialized) return;
    const auth = getAuthInstance();
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
        if (user) {
            try { setUserProfile(await getUserProfile(user.uid)); setAppState('app'); } catch (e) {}
        } else { setUserProfile(null); setAppState('landing'); }
    });
    return () => unsubscribe();
  }, [firebaseInitialized]);

  const refreshUserProfile = async () => { if (userProfile) { try { setUserProfile(await getUserProfile(userProfile.uid)); } catch(e) {} } };

  const handleApiError = (e: any) => {
      console.error("Caught API Error:", e);
      let msg = e.message || 'Unknown Error';
      if (msg.includes('Secret')) msg = "系統錯誤：伺服器無法讀取 API 金鑰。";
      else if (msg.includes('backend')) msg = "伺服器內部錯誤，請稍後再試。";
      setError(msg);
  };

  const handleRefinePrompt = async () => {
    const cost = 3;
    if (!prompt || !userProfile || userProfile.credits < cost) { alert(t('notEnoughCredits')); return; }
    setIsRefining(true);
    let imagePart: GeminiImagePart | null = null;
    if (selectedImage) {
        const dataUrl = canvasRef.current ? canvasRef.current.toDataURL() : selectedImage.dataUrl;
        const [header, base64Data] = dataUrl.split(',');
        imagePart = { base64Data, mimeType: header.match(/:(.*?);/)?.[1] || 'image/png' };
    }
    try {
        const enhancedPrompt = await refinePrompt(prompt, imagePart, lang);
        if (enhancedPrompt) {
            setUserProfile(prev => prev ? { ...prev, credits: Math.max(0, prev.credits - cost) } : null);
            setPrompt(enhancedPrompt);
        }
    } catch (e: any) { handleApiError(e); } finally { setIsRefining(false); }
  };

  const handleDeductCredits = async (amount: number) => {
      if (userProfile) setUserProfile(prev => prev ? { ...prev, credits: Math.max(0, prev.credits - amount) } : null);
  }
  
  const handleAddWatermarkImage = (dataUrl: string) => {
      const newImage: UploadedImage = { id: `wm-${Date.now()}`, file: new File([], "watermark.png"), dataUrl };
      setUploadedImages(prev => [...prev, newImage]); setSelectedImageId(newImage.id); setShowWatermarkModal(false);
  };

  const handleGenerate = useCallback(async () => {
    const [selectedModel, selectedResolution, selectedCostStr] = modelConfig.split(',');
    const cost = parseInt(selectedCostStr, 10);
    if (!prompt) { setError('請輸入指令內容。'); return; }
    if (!userProfile || userProfile.credits < cost) { setError(t('notEnoughCredits')); return; }

    let capturedCanvasData: string | null = null;
    try {
        if (selectedImage && !apiResult.imageUrl) {
            capturedCanvasData = canvasRef.current ? canvasRef.current.toDataURL('image/png') : selectedImage.dataUrl;
        }
    } catch (err) {
        console.error("Canvas capture failed", err);
        capturedCanvasData = selectedImage?.dataUrl || null;
    }

    const previousResultUrl = apiResult.imageUrl;

    setLoading(true);
    setError(null);
    setWarning(null);

    try {
      let effAR: any = null;
      if (!selectedImage) {
          if (aspectRatio === '3:2') effAR = '4:3';
          else if (aspectRatio === '2:3') effAR = '3:4';
          else effAR = aspectRatio;
      }

      let resUrl = '';
      if (!selectedImage) {
        const res = await generateImageWithGemini(prompt, effAR, selectedModel, selectedResolution, cost);
        resUrl = res.imageUrl;
      } else {
        const imagesToSend: GeminiImagePart[] = [];
        let activeData = '', activeMime = 'image/png';
        if (previousResultUrl) {
             const parts = previousResultUrl.split(',');
             activeData = parts[1]; activeMime = parts[0].match(/:(.*?);/)?.[1] || 'image/png';
        } else if (capturedCanvasData) {
             const parts = capturedCanvasData.split(',');
             activeData = parts[1]; activeMime = parts[0].match(/:(.*?);/)?.[1] || 'image/png';
        } else throw new Error('影像數據遺失。');

        const refM = /Image \d+|圖 \d+|圖\d+/.test(prompt);
        if (refM) {
            uploadedImages.forEach(img => {
                const parts = img.dataUrl.split(',');
                imagesToSend.push({ base64Data: img.id === selectedImageId ? activeData : parts[1], mimeType: parts[0].match(/:(.*?);/)?.[1] || 'image/png' });
            });
        } else imagesToSend.push({ base64Data: activeData, mimeType: activeMime });

        const result = await editImageWithGemini(imagesToSend, `Edit instruction: ${prompt}\n\n${t('instructionalPrompt')}`, selectedModel, selectedResolution, cost);
        if (result?.imageUrl) resUrl = result.imageUrl;
        else if (result?.candidates?.[0]?.content?.parts) {
            const p = result.candidates[0].content.parts.find((x: any) => x.inlineData);
            if (p?.inlineData) resUrl = `data:${p.inlineData.mimeType};base64,${p.inlineData.data}`;
        }
      }

      if (resUrl) {
            setApiResult({ text: null, imageUrl: resUrl });
            setUserProfile(prev => prev ? { ...prev, credits: Math.max(0, prev.credits - cost) } : null);
      } else throw new Error('AI 未生成圖片。');

    } catch (e: any) {
      handleApiError(e);
      // 若失敗，保留上一次的圖片，避免畫面全黑
      setApiResult({ text: null, imageUrl: previousResultUrl });
    } finally {
      setLoading(false);
    }
  }, [selectedImage, prompt, uploadedImages, selectedImageId, t, apiResult.imageUrl, aspectRatio, userProfile, modelConfig]);

  const handleUpscale = async () => {
      const targetUrl = apiResult.imageUrl || selectedImage?.dataUrl;
      if (!targetUrl) return;
      setIsUpscaling(true); setError(null);
      try {
          const img = new Image(); img.crossOrigin = "anonymous"; img.src = targetUrl;
          await new Promise((res, rej) => { img.onload = res; img.onerror = rej; });
          const canvas = document.createElement('canvas'); const ctx = canvas.getContext('2d');
          if (!ctx) throw new Error("畫布初始化失敗");
          const nW = img.naturalWidth * 2, nH = img.naturalHeight * 2;
          if (nW > 8192) throw new Error("解析度過高");
          canvas.width = nW; canvas.height = nH; ctx.imageSmoothingQuality = 'high'; ctx.drawImage(img, 0, 0, nW, nH);
          setApiResult(prev => ({ ...prev, imageUrl: canvas.toDataURL('image/png') }));
      } catch (e: any) { alert("放大失敗"); } finally { setIsUpscaling(false); }
  };

  const handleFiles = useCallback((files: FileList) => {
      Array.from(files).forEach(file => {
          if (file.type.startsWith('image/')) {
              const reader = new FileReader();
              reader.onload = (e) => {
                  if (e.target?.result) {
                      const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
                      setUploadedImages(prev => [...prev, { id, file, dataUrl: e.target!.result as string }]);
                      if (!selectedImageId) setSelectedImageId(id);
                  }
              };
              reader.readAsDataURL(file);
          }
      });
  }, [selectedImageId]);
  
  const onMouseDown = (e: React.MouseEvent) => { if (e.button === 0 && (isPanMode || isSpaceDown)) { e.preventDefault(); handlePanStart(e.clientX, e.clientY); } };
  const onMouseMove = (e: React.MouseEvent) => { if (isPanning) { e.preventDefault(); handlePanMove(e.clientX, e.clientY); } };
  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) { setIsPanning(false); const t1 = e.touches[0], t2 = e.touches[1]; pinchStartRef.current = { dist: Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY), mid: { x: (t1.clientX + t2.clientX) / 2, y: (t1.clientY + t2.clientY) / 2 }, zoom, pan }; }
    else if (e.touches.length === 1 && (isPanMode || isSpaceDown)) handlePanStart(e.touches[0].clientX, e.touches[0].clientY);
  };
  const onTouchMove = (e: React.TouchEvent) => {
      if (e.touches.length === 2 && pinchStartRef.current) { e.preventDefault(); const t1 = e.touches[0], t2 = e.touches[1]; setZoom(Math.max(0.1, Math.min(3, pinchStartRef.current.zoom * (Math.hypot(t1.clientX-t2.clientX, t1.clientY-t2.clientY)/pinchStartRef.current.dist)))); }
      else if (e.touches.length === 1 && isPanning) { e.preventDefault(); handlePanMove(e.touches[0].clientX, e.touches[0].clientY); }
  };

  const handlePanStart = (cX: number, cY: number) => { panStartRef.current = { startX: cX, startY: cY, startPan: { ...pan } }; setIsPanning(true); };
  const handlePanMove = (cX: number, cY: number) => { if (isPanning) setPan({ x: panStartRef.current.startPan.x + (cX - panStartRef.current.startX), y: panStartRef.current.startPan.y + (cY - panStartRef.current.startY) }); };
  const handlePanEnd = () => { setIsPanning(false); pinchStartRef.current = null; };

  if (appState === 'landing') return <LandingScreen onAuthSuccess={() => {}} t={t} />;

  return (
    <div className="min-h-screen bg-gray-900 text-gray-200 font-sans relative">
      {isInAppBrowser && <InAppBrowserOverlay onClose={() => setIsInAppBrowser(false)} />}
      {showWatermarkModal && <WatermarkModal onClose={() => setShowWatermarkModal(false)} onUseImage={handleAddWatermarkImage} t={t} userCredits={userProfile?.credits || 0} onDeductCredits={handleDeductCredits} />}
      {showVideoPromptModal && selectedImage && <VideoPromptModal imageSrc={selectedImage.dataUrl} onClose={() => setShowVideoPromptModal(false)} t={t} lang={lang} userCredits={userProfile?.credits || 0} onDeductCredits={handleDeductCredits} />}
      {showManualModal && <UserManualModal onClose={() => setShowManualModal(false)} t={t} />}
      {showPromptEngineerModal && <PromptEngineerModal onClose={() => setShowPromptEngineerModal(false)} initialAspectRatio={aspectRatio} onApply={(p, ar) => { setPrompt(p); if (ar) setAspectRatio(ar); setShowPromptEngineerModal(false); }} t={t} lang={lang} userCredits={userProfile?.credits || 0} onDeductCredits={handleDeductCredits} />}
      {isLayoutEditorOpen && <LayoutEditor onComplete={(url) => { setUploadedImages(p => [...p, { id: `lay-${Date.now()}`, file: new File([], "layout.png"), dataUrl: url }]); setSelectedImageId(`lay-${Date.now()}`); setIsLayoutEditorOpen(false); }} onClose={() => setIsLayoutEditorOpen(false)} t={t} />}
      {editingImage && <PhotoEditor image={editingImage} onSave={(id, url) => { setUploadedImages(p => p.map(x => x.id === id ? { ...x, dataUrl: url } : x)); setEditingImage(null); }} onClose={() => setEditingImage(null)} t={t} userCredits={userProfile?.credits || 0} onDeductCredits={handleDeductCredits} />}

      <div className="container mx-auto p-4 lg:p-8">
        <header className="mb-8 flex flex-col md:flex-row justify-between items-center gap-4">
             <div className="text-center md:text-left">
                <h1 className="text-4xl lg:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-500 to-red-500">{t('title')} <span className="text-xs bg-green-600 text-white px-2 py-1 rounded border border-green-400 align-middle ml-2 font-bold shadow-sm animate-pulse font-mono">v1.0.286</span></h1>
                <p className="text-gray-400 mt-2">{t('subtitle')}</p>
            </div>
            <div className="flex items-center gap-4 bg-gray-800 p-3 rounded-xl border border-gray-700">
                {showInstallButton && <button onClick={handleInstallClick} className="text-xs bg-blue-600/80 hover:bg-blue-700 text-white px-3 py-1.5 rounded flex items-center gap-1 font-semibold animate-bounce"><DevicePhoneMobileIcon className="w-4 h-4" /> 安裝 App</button>}
                <div className="flex flex-col items-end"><span className="text-xs text-gray-400 truncate max-w-[150px]">{userProfile?.email}</span><span className="text-sm font-bold text-yellow-400 flex items-center gap-1"><SparklesIcon className="w-4 h-4" /> {userProfile?.credits || 0} {t('creditsLabel')}</span></div>
                <button onClick={() => setShowManualModal(true)} className="text-xs bg-indigo-900/50 hover:bg-indigo-800 text-indigo-200 px-2 py-1.5 rounded flex items-center gap-1" title={t('manualButton')}><BookOpenIcon className="w-4 h-4" /><span className="hidden sm:inline">{t('manualButton')}</span></button>
                <button onClick={() => logout()} className="text-xs bg-red-900/50 hover:bg-red-900 text-red-200 px-2 py-1 rounded">{t('logoutButton')}</button>
                <div className="flex gap-2 border-l border-gray-600 pl-4 items-center"><button onClick={() => setLang('en')} className={`px-2 py-1 text-xs rounded-md ${lang === 'en' ? 'bg-purple-600 text-white' : 'bg-gray-700'}`}>EN</button><button onClick={() => setLang('zh')} className={`px-2 py-1 text-xs rounded-md ${lang === 'zh' ? 'bg-purple-600 text-white' : 'bg-gray-700'}`}>中文</button></div>
            </div>
        </header>

        {userProfile?.isAdmin && (
            <div className="mb-6 bg-blue-900/20 border border-blue-500/30 p-4 rounded-lg">
                <div className="flex justify-between items-center cursor-pointer" onClick={() => setIsAdminPanelOpen(!isAdminPanelOpen)}>
                    <h3 className="font-bold text-blue-300 flex items-center gap-2"><UserCircleIcon className="w-5 h-5"/> {t('adminPanelTitle')}</h3>
                    <span className="text-xl">{isAdminPanelOpen ? '−' : '+'}</span>
                </div>
                {isAdminPanelOpen && <div className="mt-4 animate-fade-in"><AdminUserList t={t} onCreditsUpdated={refreshUserProfile} /></div>}
            </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="flex flex-col gap-4 bg-gray-800 p-6 rounded-2xl shadow-lg border border-gray-700">
             <div className="flex flex-wrap justify-between items-center gap-2">
              <div className="flex items-center gap-4">
                  <h2 className="text-2xl font-bold text-gray-300">{apiResult.imageUrl && !loading ? t('resultTitle') : t('canvasTitle')}</h2>
                  {!loading && (selectedImage || apiResult.imageUrl) && <ZoomControls zoom={zoom} minZoom={minZoom} onZoomChange={setZoom} onFit={fitImageToScreen} t={t} isPanMode={isPanMode || isSpaceDown} onTogglePan={() => setIsPanMode(!isPanMode)} />}
              </div>
              <div className="flex items-center gap-2">
                  {!loading && (selectedImage || apiResult.imageUrl) && <button onClick={handleUpscale} disabled={isUpscaling} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all border border-yellow-500/30 ${isUpscaling ? 'bg-yellow-900/50 text-yellow-200 cursor-wait' : 'bg-yellow-600/20 hover:bg-yellow-600/40 text-yellow-400 hover:text-yellow-300'}`}>{isUpscaling ? <RefreshIcon className="w-4 h-4 animate-spin"/> : <HdIcon className="w-4 h-4" />}<span className="hidden sm:inline">{t('upscale2xButton')}</span></button>}
                  {apiResult.imageUrl && !loading && <button onClick={() => setApiResult({ text: null, imageUrl: null })} className="flex items-center gap-2 bg-gray-600 hover:bg-gray-500 text-white font-semibold py-2 px-4 rounded-lg"><RedrawIcon className="w-4 h-4"/> {t('backToEditorButton')}</button>}
              </div>
            </div>

            {apiResult.imageUrl || loading ? (
                 <ResultDisplay loading={loading} error={error} apiResult={apiResult} t={t} onEditResult={() => { if(apiResult.imageUrl){ setUploadedImages(p => [...p, { id: `ed-${Date.now()}`, file: new File([], "ed.png"), dataUrl: apiResult.imageUrl! }]); setSelectedImageId(`ed-${Date.now()}`); setApiResult({ text: null, imageUrl: null }); } }} originalImageSrc={selectedImage?.dataUrl || null} isUpscaling={isUpscaling} zoom={zoom} pan={pan} isPanMode={isPanMode || isSpaceDown} isComparing={isComparing} containerRef={imageContainerRef} interactionHandlers={{ onMouseDown, onMouseMove, onMouseUp: handlePanEnd, onMouseLeave: handlePanEnd, onTouchStart, onTouchMove, onTouchEnd: () => { pinchStartRef.current=null; handlePanEnd(); } }} />
            ) : (
                 <div className={`relative w-full aspect-[4/3] bg-gray-900 rounded-lg overflow-hidden border-2 border-dashed border-gray-700 group ${isPanning ? 'cursor-grabbing' : (isPanMode || isSpaceDown ? 'cursor-grab' : 'cursor-crosshair')}`}>
                    <div ref={imageContainerRef} className="w-full h-full flex items-center justify-center overflow-hidden touch-none" onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={handlePanEnd} onMouseLeave={handlePanEnd} onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={() => { pinchStartRef.current=null; handlePanEnd(); }}>
                    {!selectedImage ? (
                        <div className="flex flex-col items-center text-gray-500 cursor-pointer hover:text-gray-400 transition-colors" onClick={() => fileInputRef.current?.click()}>
                            <UploadIcon className="w-16 h-16 mb-4" /><p className="text-lg font-medium">{t('uploadTitle')}</p><p className="text-sm">{t('uploadSubtitle')}</p>
                        </div>
                    ) : (
                        <div style={{ transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)`, transition: isPanning || pinchStartRef.current ? 'none' : 'transform 0.1s ease-out' }} className="relative">
                            <CanvasEditor ref={canvasRef} imageSrc={selectedImage.dataUrl} brushSize={brushSize} brushColor={brushColor} enableDrawing={!isPanMode && !isSpaceDown} />
                        </div>
                    )}
                    </div>
                </div>
            )}
            <input type="file" ref={fileInputRef} onChange={(e) => { if (e.target.files) { handleFiles(e.target.files); e.target.value = ''; } }} accept="image/*" multiple className="hidden" />

            {!apiResult.imageUrl && <Toolbar brushSize={brushSize} onBrushSizeChange={setBrushSize} brushColor={brushColor} onBrushColorChange={setBrushColor} onClear={() => canvasRef.current?.reset()} t={t} />}
            <ThumbnailManager images={uploadedImages} selectedImageId={selectedImageId} onSelect={(id) => { if(id!==selectedImageId){ setSelectedImageId(id); setApiResult({text:null, imageUrl:null}); } }} onDelete={(id) => { setUploadedImages(p => p.filter(x => x.id!==id)); if(selectedImageId===id){ setSelectedImageId(null); setApiResult({text:null, imageUrl:null}); } }} onAddImage={() => fileInputRef.current?.click()} onReorder={setUploadedImages} onEdit={(id) => { const img = uploadedImages.find(x => x.id===id); if(img) setEditingImage(img); }} onOpenWatermarkGenerator={() => setShowWatermarkModal(true)} t={t} />
            <div className="mt-2"><button onClick={() => setIsLayoutEditorOpen(true)} className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold">{t('layoutEditorButton')}</button></div>
          </div>

          <div className="flex flex-col gap-6">
            <div className="bg-gray-800 p-6 rounded-2xl shadow-lg border border-gray-700 flex flex-col gap-4">
                 <div className="flex flex-col gap-3">
                    <button onClick={() => setShowPromptEngineerModal(true)} className="w-full py-4 bg-gradient-to-r from-cyan-600 via-blue-600 to-purple-600 hover:from-cyan-500 hover:via-blue-500 hover:to-purple-500 text-white font-bold rounded-xl shadow-[0_0_20px_rgba(34,211,238,0.2)] transition-all transform active:scale-95 flex items-center justify-center gap-3 group border border-cyan-400/30">
                        <MagicWandIcon className="w-6 h-6 animate-pulse group-hover:rotate-12 transition-transform" />
                        <span className="text-lg tracking-widest animate-tech-flicker">✨ Ai提示詞工坊</span>
                    </button>
                    <div className="flex justify-between items-center px-1">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1"><CommandLineIcon className="w-3 h-3"/> {t('promptLabel')}</label>
                        <div className="flex gap-2">
                            {selectedImage && <button onClick={() => setShowVideoPromptModal(true)} className="text-[10px] bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 border border-blue-500/30 px-2.5 py-1 rounded-full transition-all flex items-center gap-1" title={t('videoPromptButton')}><VideoCameraIcon className="w-3 h-3"/> {t('videoPromptButton')}</button>}
                            <button onClick={handleRefinePrompt} disabled={!prompt || isRefining} className="text-[10px] bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 border border-indigo-500/30 px-2.5 py-1 rounded-full transition-all flex items-center gap-1 disabled:opacity-50">{isRefining ? t('refiningButton') : t('enhancePromptButton')}</button>
                        </div>
                    </div>
                </div>
              <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder={selectedImage ? t('promptPlaceholder') : t('textToImagePromptPlaceholder')} className="w-full h-32 p-4 bg-gray-900 border border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 resize-none text-gray-200 text-sm leading-relaxed" />
              <div className="grid grid-cols-1 gap-4">
                  <div><label className="block text-xs font-medium text-gray-400 mb-1">AI Model / 模型選擇</label><select value={modelConfig} onChange={(e) => setModelConfig(e.target.value)} className="w-full bg-gray-700 border border-gray-600 text-white text-sm rounded-lg p-2.5"><option value="gemini-2.5-flash-image,1K,2">gemini 2.5 1k (消耗 2 點數, 無法生成中文)</option><option value="gemini-3-pro-image-preview,1K,3">gemini 3 1k (消耗 3 點數) - 預設</option><option value="gemini-3-pro-image-preview,2K,5">gemini 3 2k (消耗 5 點數)</option><option value="gemini-3-pro-image-preview,4K,7">gemini 3 4k (消耗 7 點數)</option></select></div>
                  <div><label className="block text-xs font-medium text-gray-400 mb-1">{t('aspectRatioLabel')}</label><select value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value)} className="w-full bg-gray-700 border border-gray-600 text-white text-sm rounded-lg p-2.5"><option value="1:1">{t('ratio11')}</option><option value="3:2">{t('ratio32')}</option><option value="4:3">{t('ratio43')}</option><option value="16:9">{t('ratio169')}</option><option value="2:3">{t('ratio23')}</option><option value="3:4">{t('ratio34')}</option><option value="9:16">{t('ratio916')}</option></select></div>
              </div>
              <button onClick={handleGenerate} disabled={loading || (!selectedImage && !prompt)} className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg transition-all transform hover:scale-[1.02] flex items-center justify-center gap-2 ${loading ? 'bg-gray-600 cursor-not-allowed text-gray-400' : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white'}`}>{loading ? <span className="flex items-center"><RefreshIcon className="animate-spin h-5 w-5 mr-3"/>{t('generatingButton')}</span> : <><SparklesIcon className="w-6 h-6" />{t('generateButton')}</>}</button>
              {userProfile?.isAdmin && (
                  <div className="mt-2 bg-gray-800 border border-purple-500/20 rounded-xl overflow-hidden shadow-lg transition-all"><button onClick={() => setIsMasterCommandsOpen(!isMasterCommandsOpen)} className="w-full flex items-center justify-between px-4 py-3 bg-purple-900/10 hover:bg-purple-900/20 text-purple-300 transition-colors"><div className="flex items-center gap-2"><CommandLineIcon className="w-4 h-4" /><span className="text-sm font-black tracking-widest">👑 大師風格指令庫</span></div>{isMasterCommandsOpen ? <ArrowUpIcon className="w-4 h-4"/> : <ArrowDownIcon className="w-4 h-4"/>}</button>
                      <div className={`overflow-hidden transition-all duration-300 ${isMasterCommandsOpen ? 'max-h-[500px] border-t border-purple-500/10' : 'max-h-0'}`}><div className="p-4 grid grid-cols-2 gap-2 max-h-[350px] overflow-y-auto custom-scrollbar">{MASTER_COMMANDS.map((cmd, idx) => (<button key={idx} onClick={() => { setPrompt(cmd.prompt); setIsMasterCommandsOpen(false); }} className="text-left p-2.5 bg-gray-900/50 hover:bg-purple-600/20 border border-gray-700 rounded-lg text-[11px] font-bold text-gray-300 truncate transition-all" title={cmd.prompt}>{idx + 1}. {cmd.label}</button>))}</div></div>
                  </div>
              )}
              {error && <div className="p-4 bg-red-900/30 border border-red-500/50 rounded-xl text-red-200 text-sm flex justify-between items-start"><div><p className="font-bold flex items-center gap-2"><span className="text-xl">⚠️</span> {t('errorTitle')}</p><p className="mt-1 whitespace-pre-wrap">{error}</p></div><button onClick={() => setError(null)} className="text-red-400 hover:text-white"><CloseIcon className="w-5 h-5"/></button></div>}
            </div>
            <div className="bg-gray-800 p-6 rounded-2xl shadow-lg border border-gray-700 flex-grow overflow-y-auto max-h-[500px]"><QuickPrompts prompts={allQuickPrompts} onPromptClick={setPrompt} onPromptsChange={handlePromptsChange} t={t} /></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
