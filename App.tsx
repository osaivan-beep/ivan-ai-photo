
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { translations } from './lib/translations';
import { 
  initializeFirebase, 
  getAuthInstance, 
  getUserProfile, 
  login, 
  register, 
  deductCredits, 
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
  ZoomInIcon, ZoomOutIcon, ArrowsPointingOutIcon, HandIcon, HdIcon, DevicePhoneMobileIcon, GlobeAltIcon, BookOpenIcon, CommandLineIcon, MagicWandIcon, KeyIcon
} from './components/Icons';
import type { TFunction, Language, UserProfile, UploadedImage, ApiResult, GeminiImagePart } from './types';

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
    const [isLoginMode, setIsLoginMode] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleAuthSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            if (isLoginMode) {
                await login(email, password);
            } else {
                await register(email, password);
            }
            onAuthSuccess();
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Authentication failed');
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
                        <span className="ml-2 text-[10px] align-top bg-green-600 text-white px-2 py-0.5 rounded-full border border-green-400 shadow-sm font-mono animate-pulse">v1.0.281</span>
                    </h1>
                    <p className="text-purple-200/70 text-sm font-medium tracking-widest uppercase">{t('landingSubtitle' as any) || 'Professional AI Editor'}</p>
                </div>
                
                <div className="p-8 md:w-7/12 bg-[#151825] flex flex-col justify-center">
                    <form onSubmit={handleAuthSubmit} className="space-y-4 animate-fade-in">
                        <h2 className="text-2xl font-black text-white mb-6 text-center tracking-tight">
                            {isLoginMode ? '歡迎回來 (Enterprise)' : '建立帳戶'}
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
                            {loading ? <span className="flex items-center justify-center gap-2"><RefreshIcon className="w-5 h-5 animate-spin"/>驗證中...</span> : (isLoginMode ? t('loginButton') : '註冊帳號')}
                        </button>
                        
                        <div className="text-center mt-6">
                            <button 
                                type="button"
                                onClick={() => { setIsLoginMode(!isLoginMode); setError(null); }}
                                className="text-xs font-bold text-gray-500 hover:text-purple-400 transition-colors uppercase tracking-widest underline underline-offset-4"
                            >
                                {isLoginMode ? '還沒有帳號？請聯繫伊凡' : '已有帳號？返回登入'}
                            </button>
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
  
  // PWA & Browser State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallButton, setShowInstallButton] = useState(false);
  const [isInAppBrowser, setIsInAppBrowser] = useState(false);

  const canvasRef = useRef<CanvasEditorRef>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const panStartRef = useRef({ startX: 0, startY: 0, startPan: { x: 0, y: 0 } });
  const pinchStartRef = useRef<{ dist: number; mid: { x: number; y: number; }; zoom: number; pan: { x: number; y: number; }; } | null>(null);

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

  // Global Keyboard Listeners
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
                if (apiResult.imageUrl) {
                    setIsComparing(true);
                }
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

  // PWA Install Prompt Handler
  useEffect(() => {
    const handler = (e: any) => {
        e.preventDefault();
        setDeferredPrompt(e);
        setShowInstallButton(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    
    const ua = navigator.userAgent || navigator.vendor || (window as any).opera;
    const isLine = /Line/i.test(ua);
    const isFB = /FBAN/i.test(ua) || /FBAV/i.test(ua);
    const isInsta = /Instagram/i.test(ua);
    
    if (isLine || isFB || isInsta) {
        setIsInAppBrowser(true);
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
          setShowInstallButton(false);
      }
      setDeferredPrompt(null);
  };

  // Load Prompts from LocalStorage or Default
  useEffect(() => {
    const storageKey = `ivan-quick-prompts-${lang}`;
    const stored = localStorage.getItem(storageKey);
    
    if (stored) {
        try {
            const parsedPrompts = JSON.parse(stored);
            if (parsedPrompts && typeof parsedPrompts === 'object') {
                setAllQuickPrompts(parsedPrompts);
            } else {
                setAllQuickPrompts(translations[lang].defaultQuickPrompts);
            }
        } catch (e) {
            console.error("Failed to parse stored prompts", e);
            setAllQuickPrompts(translations[lang].defaultQuickPrompts);
        }
    } else {
        setAllQuickPrompts(translations[lang].defaultQuickPrompts);
    }
  }, [lang]);

  const handlePromptsChange = (newPrompts: Record<string, string[]>) => {
      setAllQuickPrompts(newPrompts);
      localStorage.setItem(`ivan-quick-prompts-${lang}`, JSON.stringify(newPrompts));
  };

  const selectedImage = uploadedImages.find(img => img.id === selectedImageId) || null;
  
  useEffect(() => { 
    fitImageToScreen(); 
  }, [selectedImageId, apiResult.imageUrl, fitImageToScreen]);

  // Firebase Init
  useEffect(() => {
    try { 
        if (initializeFirebase()) {
            setFirebaseInitialized(true); 
        } else {
            console.warn("Firebase config missing or invalid.");
            setError("Firebase not configured properly.");
        }
    } catch (e) { 
        console.error("Firebase Init Failed:", e); 
        setError("Firebase initialization failed.");
    }
  }, []);

  // Auth Listener
  useEffect(() => {
    if (!firebaseInitialized) return;
    const auth = getAuthInstance();
    if (!auth) return;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
        if (user) {
            try {
                const profile = await getUserProfile(user.uid);
                setUserProfile(profile);
                setAppState('app');
            } catch (e) {
                console.error("Profile load error", e);
            }
        } else {
            setUserProfile(null);
            setAppState('landing');
        }
    });
    return () => unsubscribe();
  }, [firebaseInitialized]);

  const refreshUserProfile = async () => { if (userProfile) { try { const updated = await getUserProfile(userProfile.uid); setUserProfile(updated); } catch(e) {} } };

  const handleApiError = (e: any) => {
      console.error("Caught API Error:", e);
      let msg = e.message || 'Unknown Error';
      
      if (msg.includes('Secret')) {
          msg = "系統錯誤：伺服器無法讀取 API 金鑰。\n請通知管理員檢查權權。";
      } else if (msg.includes('backend') || msg.includes('internal')) {
          msg = "伺服器內部錯誤，請稍後再試。";
      } else if (msg.includes('CORS') || msg.includes('Network')) {
          msg = "連線失敗，請檢查網路。";
      } else if (msg.includes('Timeout')) {
          msg = "連線逾時，請重試一次。";
      }
      setError(msg);
  };

  const handleRefinePrompt = async () => {
    const cost = 3;
    if (!prompt) return;
    if (!userProfile || userProfile.credits < cost) { alert(t('notEnoughCredits')); return; }

    setIsRefining(true);
    let imagePart: GeminiImagePart | null = null;
    if (selectedImage) {
        try {
            const dataUrl = canvasRef.current ? canvasRef.current.toDataURL() : selectedImage.dataUrl;
            const [header, base64Data] = dataUrl.split(',');
            imagePart = { base64Data, mimeType: header.match(/:(.*?);/)?.[1] || 'image/png' };
        } catch (e) {}
    }

    try {
        const enhancedPrompt = await refinePrompt(prompt, imagePart, lang);
        if (enhancedPrompt && enhancedPrompt !== prompt) {
            // FIX: Removed frontend direct deductCredits call which was causing permission errors for non-admins.
            // The Cloud Function backend already handles credit deduction securely.
            setUserProfile(prev => prev ? { ...prev, credits: Math.max(0, prev.credits - cost) } : null);
            setPrompt(enhancedPrompt);
        }
    } catch (e: any) {
         handleApiError(e);
    } finally { setIsRefining(false); }
  };

  const handleDeductCredits = async (amount: number) => {
      if (userProfile) {
          // 只更新本地 UI 狀態，不進行 Firestore 寫入，解決一般帳號權限報錯問題
          setUserProfile(prev => prev ? { ...prev, credits: Math.max(0, prev.credits - amount) } : null);
      }
  }
  
  const handleAddWatermarkImage = (dataUrl: string) => {
      const newImage: UploadedImage = { id: `watermark-${Date.now()}`, file: new File([], "watermark.png"), dataUrl };
      setUploadedImages(prev => [...prev, newImage]);
      setSelectedImageId(newImage.id);
      setShowWatermarkModal(false);
  };

  const handleGenerate = useCallback(async () => {
    const [selectedModel, selectedResolution, selectedCostStr] = modelConfig.split(',');
    const cost = parseInt(selectedCostStr, 10);

    if (!prompt) { setError('請輸入指令內容。'); return; }

    if (!userProfile || userProfile.credits < cost) { setError(t('notEnoughCredits')); return; }

    let capturedCanvasData: string | null = null;
    if (selectedImage && !apiResult.imageUrl) {
        if (canvasRef.current) { capturedCanvasData = canvasRef.current.toDataURL('image/png'); } 
        else { capturedCanvasData = selectedImage.dataUrl; }
    }
    const previousResultUrl = apiResult.imageUrl;

    setLoading(true);
    setError(null);
    setWarning(null);
    setApiResult({ text: null, imageUrl: null });

    try {
      let effectiveAspectRatio: '1:1' | '16:9' | '9:16' | '4:3' | '3:4' | null = null;
      if (!selectedImage) {
          if (aspectRatio === '3:2') effectiveAspectRatio = '4:3';
          else if (aspectRatio === '2:3') effectiveAspectRatio = '3:4';
          else effectiveAspectRatio = aspectRatio as any;
      }

      let resultImageUrl = '';

      if (!selectedImage) {
        const result = await generateImageWithGemini(prompt, effectiveAspectRatio, selectedModel, selectedResolution, cost);
        resultImageUrl = result.imageUrl;
      } else {
        const imagesToSend: GeminiImagePart[] = [];
        let activeImageData = '';
        let activeImageMime = 'image/png';

        if (previousResultUrl) {
             const parts = previousResultUrl.split(',');
             activeImageData = parts[1];
             activeImageMime = parts[0].match(/:(.*?);/)?.[1] || 'image/png';
        } else if (capturedCanvasData) {
             const parts = capturedCanvasData.split(',');
             activeImageData = parts[1];
             activeImageMime = parts[0].match(/:(.*?);/)?.[1] || 'image/png';
        } else {
             throw new Error('影像數據遺失。');
        }

        const referencesMultiple = /Image \d+|圖 \d+|圖\d+/.test(prompt);

        if (referencesMultiple && uploadedImages.length > 0) {
            uploadedImages.forEach(img => {
                if (img.id === selectedImageId) {
                    imagesToSend.push({ base64Data: activeImageData, mimeType: activeImageMime });
                } else {
                    const parts = img.dataUrl.split(',');
                    imagesToSend.push({ 
                        base64Data: parts[1], 
                        mimeType: parts[0].match(/:(.*?);/)?.[1] || 'image/png' 
                    });
                }
            });
        } else {
             imagesToSend.push({ base64Data: activeImageData, mimeType: activeImageMime });
        }

        const finalPrompt = `Edit instruction: ${prompt}\n\n${t('instructionalPrompt')}`;
        const result = await editImageWithGemini(imagesToSend, finalPrompt, selectedModel, selectedResolution, cost);
        
        if (result && result.imageUrl) {
             resultImageUrl = result.imageUrl;
        } else if (result && result.candidates && result.candidates[0]?.content?.parts) {
             const part = result.candidates[0].content.parts.find((p: any) => p.inlineData);
             if (part?.inlineData) {
                resultImageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
             }
        }
      }

      if (resultImageUrl) {
            setUserProfile(prev => prev ? { ...prev, credits: Math.max(0, prev.credits - cost) } : null);
            setApiResult({ text: null, imageUrl: resultImageUrl });
      } else {
          throw new Error('AI 未生成圖片內容。');
      }

    } catch (e: any) {
      handleApiError(e);
      setApiResult({ text: null, imageUrl: previousResultUrl });
    } finally {
      setLoading(false);
    }
  }, [selectedImage, prompt, uploadedImages, selectedImageId, t, apiResult.imageUrl, aspectRatio, userProfile, modelConfig]);

  const applySharpenFilterAsync = async (ctx: CanvasRenderingContext2D, width: number, height: number) => {
      const imageData = ctx.getImageData(0, 0, width, height);
      const data = imageData.data;
      const weights = [0, -1, 0, -1, 5, -1, 0, -1, 0];
      const side = 3;
      const halfSide = 1;
      const outputData = ctx.createImageData(width, height);
      const dst = outputData.data;

      const chunkSize = 100;
      
      for (let y = 0; y < height; y++) {
          if (y > 0 && y % chunkSize === 0) {
              await new Promise(resolve => setTimeout(resolve, 0));
          }

          for (let x = 0; x < width; x++) {
              const dstOff = (y * width + x) * 4;
              let r = 0, g = 0, b = 0;
              dst[dstOff + 3] = data[dstOff + 3];

              for (let cy = 0; cy < side; cy++) {
                  for (let cx = 0; cx < side; cx++) {
                      const scy = y + cy - halfSide;
                      const scx = x + cx - halfSide;
                      if (scy >= 0 && scy < height && scx >= 0 && scx < width) {
                          const srcOff = (scy * width + scx) * 4;
                          const wt = weights[cy * side + cx];
                          r += data[srcOff] * wt;
                          g += data[srcOff + 1] * wt;
                          b += data[srcOff + 2] * wt;
                      }
                  }
              }
              dst[dstOff] = r < 0 ? 0 : (r > 255 ? 255 : r);
              dst[dstOff + 1] = g < 0 ? 0 : (g > 255 ? 255 : g);
              dst[dstOff + 2] = b < 0 ? 0 : (b > 255 ? 255 : b);
          }
      }
      ctx.putImageData(outputData, 0, 0);
  };

  const handleUpscale = async () => {
      const targetUrl = apiResult.imageUrl || selectedImage?.dataUrl;
      if (!targetUrl) return;
      setIsUpscaling(true);
      setError(null);
      try {
          await new Promise(r => setTimeout(r, 50));
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.src = targetUrl;
          await new Promise((resolve, reject) => { 
              img.onload = resolve; 
              img.onerror = () => reject(new Error("影像載入失敗"));
          });
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) throw new Error("畫布初始化失敗");
          const newWidth = img.naturalWidth * 2;
          const newHeight = img.naturalHeight * 2;
          if (newWidth > 8192 || newHeight > 8192) {
             throw new Error("圖片解析度過高，無法進一步放大");
          }
          canvas.width = newWidth;
          canvas.height = newHeight;
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, newWidth, newHeight);
          await applySharpenFilterAsync(ctx, newWidth, newHeight);
          const newUrl = canvas.toDataURL('image/png');
          setApiResult(prev => ({ ...prev, imageUrl: newUrl }));
      } catch (e: any) {
          console.error("Upscale error:", e);
          alert("放大失敗: " + (e.message || "未知錯誤"));
      } finally {
          setIsUpscaling(false);
      }
  };

  const handleFiles = useCallback((files: FileList) => {
      Array.from(files).forEach(file => {
          if (file.type.startsWith('image/')) {
              const reader = new FileReader();
              reader.onload = (e) => {
                  if (e.target?.result) {
                      const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
                      setUploadedImages(prev => [...prev, {
                          id,
                          file,
                          dataUrl: e.target!.result as string
                      }]);
                      if (!selectedImageId) {
                          setSelectedImageId(id);
                      }
                  }
              };
              reader.readAsDataURL(file);
          }
      });
  }, [selectedImageId]);
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => { if (e.target.files) { handleFiles(e.target.files); e.target.value = ''; } };
  const handleUploadClick = () => fileInputRef.current?.click();
  const handleImageSelect = (id: string) => { if(id !== selectedImageId) { setSelectedImageId(id); setApiResult({ text: null, imageUrl: null }); setError(null); setWarning(null); } }
  
  const handleImageDelete = (id: string) => {
      setUploadedImages(prev => prev.filter(img => img.id !== id));
      if (selectedImageId === id) {
          setSelectedImageId(null);
          setApiResult({ text: null, imageUrl: null });
      }
  };
  
  const handleImageReorder = (reorderedImages: UploadedImage[]) => setUploadedImages(reorderedImages);
  const handleClearResult = () => { setApiResult({ text: null, imageUrl: null }); setError(null); setWarning(null); };
  
  const handlePanStart = useCallback((clientX: number, clientY: number) => {
    panStartRef.current = { startX: clientX, startY: clientY, startPan: { ...pan } };
    setIsPanning(true);
  }, [pan]);
  const handlePanMove = useCallback((clientX: number, clientY: number) => {
    if (!isPanning) return;
    const dx = clientX - panStartRef.current.startX;
    const dy = clientY - panStartRef.current.startY;
    setPan({
        x: panStartRef.current.startPan.x + dx,
        y: panStartRef.current.startPan.y + dy
    });
  }, [isPanning]);
  const handlePanEnd = useCallback(() => setIsPanning(false), []);

  const onMouseDown = (e: React.MouseEvent) => { 
    if (e.button !== 0) return; 
    if (isPanMode || isSpaceDown) {
        e.preventDefault(); 
        handlePanStart(e.clientX, e.clientY);
    }
  };
  const onMouseMove = (e: React.MouseEvent) => { 
    if (isPanning) {
        e.preventDefault(); 
        handlePanMove(e.clientX, e.clientY);
    }
  };
  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
        setIsPanning(false);
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        pinchStartRef.current = {
            dist: Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY),
            mid: { x: (t1.clientX + t2.clientX) / 2, y: (t1.clientY + t2.clientY) / 2 },
            zoom: zoom,
            pan: pan,
        };
    } else if (e.touches.length === 1) {
        if (isPanMode || isSpaceDown) {
            handlePanStart(e.touches[0].clientX, e.touches[0].clientY);
        }
    }
  };
  const onTouchMove = (e: React.TouchEvent) => {
      if (e.touches.length === 2 && pinchStartRef.current) {
          e.preventDefault();
          const t1 = e.touches[0];
          const t2 = e.touches[1];
          const newDist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
          const scale = newDist / pinchStartRef.current.dist;
          const newZoom = Math.max(1, Math.min(3, pinchStartRef.current.zoom * scale));
          setZoom(newZoom);
      } else if (e.touches.length === 1 && isPanning) {
          e.preventDefault();
          handlePanMove(e.touches[0].clientX, e.touches[0].clientY);
      }
  };
  const onTouchEnd = () => {
      pinchStartRef.current = null;
      handlePanEnd();
  };
  
  const handleWheel = useCallback((e: React.WheelEvent) => {}, []);

  const handleEditResult = () => {
    if (apiResult.imageUrl) {
        const newImage: UploadedImage = {
            id: `edited-${Date.now()}`,
            file: new File([], "edited_image.png"), 
            dataUrl: apiResult.imageUrl
        };
        setUploadedImages(prev => [...prev, newImage]);
        setSelectedImageId(newImage.id);
        setApiResult({ text: null, imageUrl: null });
    }
  };
  
  const handleLayoutComplete = (dataUrl: string) => {
      const newImage: UploadedImage = {
          id: `layout-${Date.now()}`,
          file: new File([], "layout.png"),
          dataUrl: dataUrl
      };
      setUploadedImages(prev => [...prev, newImage]);
      setSelectedImageId(newImage.id);
      setIsLayoutEditorOpen(false);
  }
  
  const handleOpenPhotoEditor = (id: string) => { const img = uploadedImages.find(i => i.id === id); if (img) setEditingImage(img); };
  const handleSavePhotoEditor = (id: string, dataUrl: string) => { setUploadedImages(prev => prev.map(img => img.id === id ? { ...img, dataUrl } : img)); setEditingImage(null); };

  if (appState === 'landing') return <LandingScreen onAuthSuccess={() => {}} t={t} />;

  const getEditorCursor = () => {
    if (isPanning) return 'cursor-grabbing';
    if (isPanMode || isSpaceDown) return 'cursor-grab';
    return 'cursor-crosshair';
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-200 font-sans relative">
      
      {isInAppBrowser && <InAppBrowserOverlay onClose={() => setIsInAppBrowser(false)} />}

      {showWatermarkModal && (
        <WatermarkModal 
            onClose={() => setShowWatermarkModal(false)} 
            onUseImage={handleAddWatermarkImage} 
            t={t} 
            userCredits={userProfile?.credits || 0}
            onDeductCredits={handleDeductCredits}
        />
      )}
      {showVideoPromptModal && selectedImage && (
        <VideoPromptModal 
            imageSrc={selectedImage.dataUrl} 
            onClose={() => setShowVideoPromptModal(false)} 
            t={t} 
            lang={lang} 
            userCredits={userProfile?.credits || 0}
            onDeductCredits={handleDeductCredits}
        />
      )}
      {showManualModal && (
        <UserManualModal onClose={() => setShowManualModal(false)} t={t} />
      )}
      {showPromptEngineerModal && (
          <PromptEngineerModal 
            onClose={() => setShowPromptEngineerModal(false)}
            initialAspectRatio={aspectRatio}
            onApply={(engineeredPrompt, newAspectRatio) => {
                setPrompt(engineeredPrompt);
                if (newAspectRatio) setAspectRatio(newAspectRatio);
                setShowPromptEngineerModal(false);
            }}
            t={t}
            lang={lang}
            userCredits={userProfile?.credits || 0}
            onDeductCredits={handleDeductCredits}
          />
      )}
      
      {isLayoutEditorOpen && <LayoutEditor onComplete={handleLayoutComplete} onClose={() => setIsLayoutEditorOpen(false)} t={t} />}
      {editingImage && (
        <PhotoEditor 
            image={editingImage} 
            onSave={handleSavePhotoEditor} 
            onClose={() => setEditingImage(null)} 
            t={t} 
            userCredits={userProfile?.credits || 0}
            onDeductCredits={handleDeductCredits}
        />
      )}

      <div className="container mx-auto p-4 lg:p-8">
        <header className="mb-8 flex flex-col md:flex-row justify-between items-center gap-4">
             <div className="text-center md:text-left">
                <h1 className="text-4xl lg:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-500 to-red-500">
                    {t('title')} 
                    <span className="text-xs bg-green-600 text-white px-2 py-1 rounded border border-green-400 align-middle ml-2 font-bold shadow-sm animate-pulse font-mono">
                        v1.0.281
                    </span>
                </h1>
                <p className="text-gray-400 mt-2">{t('subtitle')}</p>
            </div>
            
            <div className="flex items-center gap-4 bg-gray-800 p-3 rounded-xl border border-gray-700">
                {showInstallButton && (
                    <button 
                        onClick={handleInstallClick}
                        className="text-xs bg-blue-600/80 hover:bg-blue-700 text-white px-3 py-1.5 rounded flex items-center gap-1 font-semibold animate-bounce"
                    >
                        <DevicePhoneMobileIcon className="w-4 h-4" /> 安裝 App
                    </button>
                )}
                
                <div className="flex flex-col items-end">
                    <span className="text-xs text-gray-400 truncate max-w-[150px]">
                        {userProfile?.isAdmin ? 'Admin' : userProfile?.email}
                    </span>
                    <span className="text-sm font-bold text-yellow-400 flex items-center gap-1">
                        <SparklesIcon className="w-4 h-4" /> {userProfile?.credits || 0} {t('creditsLabel')}
                    </span>
                </div>
                
                <button 
                    onClick={() => setShowManualModal(true)} 
                    className="text-xs bg-indigo-900/50 hover:bg-indigo-800 text-indigo-200 px-2 py-1.5 rounded flex items-center gap-1"
                    title={t('manualButton')}
                >
                    <BookOpenIcon className="w-4 h-4" />
                    <span className="hidden sm:inline">{t('manualButton')}</span>
                </button>

                <button onClick={() => logout()} className="text-xs bg-red-900/50 hover:bg-red-900 text-red-200 px-2 py-1 rounded">
                    {t('logoutButton')}
                </button>
                <div className="flex gap-2 border-l border-gray-600 pl-4 items-center">
                    <button onClick={() => setLang('en')} className={`px-2 py-1 text-xs rounded-md ${lang === 'en' ? 'bg-purple-600 text-white' : 'bg-gray-700'}`}>EN</button>
                    <button onClick={() => setLang('zh')} className={`px-2 py-1 text-xs rounded-md ${lang === 'zh' ? 'bg-purple-600 text-white' : 'bg-gray-700'}`}>中文</button>
                </div>
            </div>
        </header>

        {userProfile?.isAdmin && (
            <div className="mb-6 bg-blue-900/20 border border-blue-500/30 p-4 rounded-lg">
                <div className="flex justify-between items-center cursor-pointer" onClick={() => setIsAdminPanelOpen(!isAdminPanelOpen)}>
                    <h3 className="font-bold text-blue-300 flex items-center gap-2"><UserCircleIcon className="w-5 h-5"/> {t('adminPanelTitle')}</h3>
                    <span className="text-xl">{isAdminPanelOpen ? '−' : '+'}</span>
                </div>
                {isAdminPanelOpen && (
                    <div className="mt-4 animate-fade-in">
                        <AdminUserList t={t} onCreditsUpdated={refreshUserProfile} />
                    </div>
                )}
            </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="flex flex-col gap-4 bg-gray-800 p-6 rounded-2xl shadow-lg border border-gray-700">
             <div className="flex flex-wrap justify-between items-center gap-2">
              <div className="flex items-center gap-4">
                  <h2 className="text-2xl font-bold text-gray-300">
                    {apiResult.imageUrl && !loading ? t('resultTitle') : t('canvasTitle')}
                  </h2>
                  {!loading && (selectedImage || apiResult.imageUrl) && (
                        <ZoomControls 
                            zoom={zoom}
                            minZoom={minZoom}
                            onZoomChange={setZoom} 
                            onFit={fitImageToScreen} 
                            t={t} 
                            isPanMode={isPanMode || isSpaceDown}
                            onTogglePan={() => setIsPanMode(!isPanMode)}
                        />
                  )}
              </div>

              <div className="flex items-center gap-2">
                  {!loading && (selectedImage || apiResult.imageUrl) && (
                        <button
                            onClick={handleUpscale}
                            disabled={isUpscaling}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all border border-yellow-500/30
                                ${isUpscaling ? 'bg-yellow-900/50 text-yellow-200 cursor-wait' : 'bg-yellow-600/20 hover:bg-yellow-600/40 text-yellow-400 hover:text-yellow-300'}
                            `}
                            title={t('upscale2xButton')}
                        >
                            {isUpscaling ? <RefreshIcon className="w-4 h-4 animate-spin"/> : <HdIcon className="w-4 h-4" />}
                            <span className="hidden sm:inline">{t('upscale2xButton')}</span>
                        </button>
                  )}

                  {apiResult.imageUrl && !loading && (
                    <button onClick={handleClearResult} className="flex items-center gap-2 bg-gray-600 hover:bg-gray-500 text-white font-semibold py-2 px-4 rounded-lg">
                        <RedrawIcon className="w-4 h-4"/> {t('backToEditorButton')}
                    </button>
                  )}
              </div>
            </div>

            {apiResult.imageUrl || loading ? (
                 <ResultDisplay
                    loading={loading}
                    error={error}
                    apiResult={apiResult}
                    t={t}
                    onEditResult={handleEditResult}
                    onUpdateResult={(url) => setApiResult(prev => ({ ...prev, imageUrl: url }))}
                    originalImageSrc={selectedImage?.dataUrl || null}
                    isUpscaling={isUpscaling}
                    zoom={zoom}
                    pan={pan}
                    isPanMode={isPanMode || isSpaceDown}
                    isComparing={isComparing}
                    containerRef={imageContainerRef}
                    interactionHandlers={{
                        onMouseDown,
                        onMouseMove,
                        onMouseUp: handlePanEnd,
                        onMouseLeave: handlePanEnd,
                        onTouchStart,
                        onTouchMove,
                        onTouchEnd,
                        onWheel: handleWheel
                    }}
                 />
            ) : (
                 <div className={`relative w-full aspect-[4/3] bg-gray-900 rounded-lg overflow-hidden border-2 border-dashed border-gray-700 group ${getEditorCursor()}`}>
                    <div 
                        ref={imageContainerRef}
                        className="w-full h-full flex items-center justify-center overflow-hidden touch-none"
                        onMouseDown={onMouseDown}
                        onMouseMove={onMouseMove}
                        onMouseUp={handlePanEnd}
                        onMouseLeave={handlePanEnd}
                        onTouchStart={onTouchStart}
                        onTouchMove={onTouchMove}
                        onTouchEnd={onTouchEnd}
                        onWheel={handleWheel}
                    >
                    {!selectedImage ? (
                        <div className="flex flex-col items-center text-gray-500 cursor-pointer hover:text-gray-400 transition-colors" onClick={handleUploadClick}>
                            <UploadIcon className="w-16 h-16 mb-4" />
                            <p className="text-lg font-medium">{t('uploadTitle')}</p>
                            <p className="text-sm">{t('uploadSubtitle')}</p>
                        </div>
                    ) : (
                        <div style={{ transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)`, transition: isPanning || pinchStartRef.current ? 'none' : 'transform 0.1s ease-out' }} className="relative">
                            <CanvasEditor
                                ref={canvasRef}
                                imageSrc={selectedImage.dataUrl}
                                brushSize={brushSize}
                                brushColor={brushColor}
                                enableDrawing={!isPanMode && !isSpaceDown}
                            />
                        </div>
                    )}
                    </div>
                     <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept="image/*"
                        multiple
                        className="hidden"
                    />
                </div>
            )}

            {!apiResult.imageUrl && (
                <Toolbar
                    brushSize={brushSize}
                    onBrushSizeChange={setBrushSize}
                    brushColor={brushColor}
                    onBrushColorChange={setBrushColor}
                    onClear={() => canvasRef.current?.reset()}
                    t={t}
                />
            )}
            
            <ThumbnailManager
                images={uploadedImages}
                selectedImageId={selectedImageId}
                onSelect={handleImageSelect}
                onDelete={handleImageDelete}
                onAddImage={handleUploadClick}
                onReorder={handleImageReorder}
                onEdit={handleOpenPhotoEditor}
                onOpenWatermarkGenerator={() => setShowWatermarkModal(true)}
                t={t}
            />
            <div className="mt-2">
                <button onClick={() => setIsLayoutEditorOpen(true)} className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold">
                    {t('layoutEditorButton')}
                </button>
            </div>
          </div>

          <div className="flex flex-col gap-6">
            <div className="bg-gray-800 p-6 rounded-2xl shadow-lg border border-gray-700 flex flex-col gap-4">
                 <div className="flex flex-col gap-3">
                    <button
                        onClick={() => setShowPromptEngineerModal(true)}
                        className="w-full py-4 bg-gradient-to-r from-cyan-600 via-blue-600 to-purple-600 hover:from-cyan-500 hover:via-blue-500 hover:to-purple-500 text-white font-bold rounded-xl shadow-[0_0_20px_rgba(34,211,238,0.2)] transition-all transform active:scale-95 flex items-center justify-center gap-3 group border border-cyan-400/30"
                    >
                        <MagicWandIcon className="w-6 h-6 animate-pulse group-hover:rotate-12 transition-transform" />
                        <span className="text-lg tracking-widest animate-tech-flicker">✨ Ai提示詞工坊</span>
                    </button>

                    <div className="flex justify-between items-center px-1">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1">
                            <CommandLineIcon className="w-3 h-3"/> {t('promptLabel')}
                        </label>
                        <div className="flex gap-2">
                            {selectedImage && (
                                <button
                                    onClick={() => setShowVideoPromptModal(true)}
                                    className="text-[10px] bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 border border-blue-500/30 px-2.5 py-1 rounded-full transition-all flex items-center gap-1"
                                    title={t('videoPromptButton')}
                                >
                                    <VideoCameraIcon className="w-3 h-3"/> {t('videoPromptButton')}
                                </button>
                            )}
                            <button
                                onClick={handleRefinePrompt}
                                disabled={!prompt || isRefining}
                                className="text-[10px] bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 border border-indigo-500/30 px-2.5 py-1 rounded-full transition-all flex items-center gap-1 disabled:opacity-50"
                            >
                                {isRefining ? t('refiningButton') : t('enhancePromptButton')}
                            </button>
                        </div>
                    </div>
                </div>
                
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={selectedImage ? t('promptPlaceholder') : t('textToImagePromptPlaceholder')}
                className="w-full h-32 p-4 bg-gray-900 border border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none text-gray-200 placeholder-gray-500 transition-all text-sm leading-relaxed"
              />
              
              {!selectedImage && (
                   <p className="text-xs text-gray-500 italic">
                        {t('textToImagePromptHelperText')}
                   </p>
              )}
               {selectedImage && (
                   <p className="text-xs text-gray-500 italic">
                        {t('promptHelperText')}
                   </p>
              )}

              <div className="grid grid-cols-1 gap-4">
                  <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1">AI Model / 模型選擇</label>
                      <select
                        value={modelConfig}
                        onChange={(e) => setModelConfig(e.target.value)}
                        className="w-full bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-purple-500 focus:border-purple-500 block p-2.5"
                      >
                         <option value="gemini-2.5-flash-image,1K,2">gemini 2.5 1k (消耗 2 點數, 無法生成中文)</option>
                         <option value="gemini-3-pro-image-preview,1K,3">gemini 3 1k (消耗 3 點數) - 預設</option>
                         <option value="gemini-3-pro-image-preview,2K,5">gemini 3 2k (消耗 5 點數)</option>
                         <option value="gemini-3-pro-image-preview,4K,7">gemini 3 4k (消耗 7 點數)</option>
                      </select>
                  </div>

                  <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1">{t('aspectRatioLabel')}</label>
                      <select
                        value={aspectRatio}
                        onChange={(e) => setAspectRatio(e.target.value)}
                        className="w-full bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-purple-500 focus:border-purple-500 block p-2.5"
                      >
                         <option value="1:1">{t('ratio11')}</option>
                         <option value="3:2">{t('ratio32')}</option>
                         <option value="4:3">{t('ratio43')}</option>
                         <option value="16:9">{t('ratio169')}</option>
                         <option value="2:3">{t('ratio23')}</option>
                         <option value="3:4">{t('ratio34')}</option>
                         <option value="9:16">{t('ratio916')}</option>
                      </select>
                  </div>
              </div>

              <button
                onClick={handleGenerate}
                disabled={loading || (!selectedImage && !prompt)}
                className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg transition-all transform hover:scale-[1.02] flex items-center justify-center gap-2
                  ${loading 
                    ? 'bg-gray-600 cursor-not-allowed text-gray-400' 
                    : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white'
                  }`}
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {t('generatingButton')}</>
                ) : (
                  <>
                    <SparklesIcon className="w-6 h-6" />
                    {t('generateButton')}
                  </>
                )}
              </button>

              {warning && (
                  <div className="p-3 bg-yellow-900/30 border border-yellow-500/50 rounded-xl text-yellow-200 text-sm animate-fade-in">
                      <p className="font-bold flex items-center gap-2">
                          <span className="text-xl">⚠️</span> 備註
                      </p>
                      <p className="mt-1 mb-2">{warning}</p>
                  </div>
              )}

              {error && (
                <div className="p-4 bg-red-900/30 border border-red-500/50 rounded-xl text-red-200 text-sm">
                  <div className="flex justify-between items-start">
                      <div>
                          <p className="font-bold flex items-center gap-2">
                            <span className="text-xl">⚠️</span> {t('errorTitle')}
                          </p>
                          <p className="mt-1 whitespace-pre-wrap">{error}</p>
                      </div>
                      <button onClick={() => setError(null)} className="text-red-400 hover:text-white"><CloseIcon className="w-5 h-5"/></button>
                  </div>
                   
                   {(error.includes('Rate Limit') || error.includes('429') || error.includes('忙碌') || error.includes('系統') || error.includes('Network') || error.includes('API') || error.includes('Timeout')) && (
                       <button onClick={handleGenerate} className="mt-2 flex items-center gap-1 text-xs bg-red-700 hover:bg-red-600 px-3 py-1.5 rounded text-white font-bold transition-colors shadow-sm">
                           <RefreshIcon className="w-3 h-3" /> 重試 (Retry)
                       </button>
                   )}
                </div>
              )}
            </div>

            <div className="bg-gray-800 p-6 rounded-2xl shadow-lg border border-gray-700 flex-grow overflow-y-auto max-h-[500px]">
                 <QuickPrompts
                    prompts={allQuickPrompts}
                    onPromptClick={setPrompt}
                    onPromptsChange={handlePromptsChange}
                    t={t}
                />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
