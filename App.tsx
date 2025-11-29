import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { GenerateContentResponse } from '@google/genai';
import { CanvasEditor, type CanvasEditorRef } from './components/CanvasEditor';
import { QuickPrompts } from './components/QuickPrompts';
import { Toolbar } from './components/Toolbar';
import { ThumbnailManager } from './components/ThumbnailManager';
import { ResultDisplay } from './components/ResultDisplay';
import { UploadIcon, SparklesIcon, RedrawIcon, ZoomInIcon, ZoomOutIcon, ArrowsPointingOutIcon, ArrowUpIcon, ArrowDownIcon, ArrowLeftIcon, ArrowRightIcon, UserCircleIcon, ShareIcon, CloseIcon } from './components/Icons';
import { editImageWithGemini, generateImageWithGemini3, refinePrompt } from './services/geminiService';
import type { ApiResult, Language, UploadedImage, GeminiImagePart, TFunction, ImageResolution, UserProfile, FirebaseConfig } from './types';
import { translations } from './lib/translations';
import { LayoutEditor } from './components/LayoutEditor';
import { PhotoEditor } from './components/PhotoEditor';
import { initializeFirebase, isFirebaseConfigured, login, register, logout, getUserProfile, deductCredits, addCreditsByEmail, getAuthInstance } from './services/firebaseService';
import { onAuthStateChanged } from 'firebase/auth';

// This interface is not part of the standard DOM library yet.
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

interface PanControlProps {
  onPan: (dx: number, dy: number) => void;
  panSpeed?: number;
}

const PanControl: React.FC<PanControlProps> = ({ onPan, panSpeed = 5 }) => {
  const panDirectionRef = useRef({ x: 0, y: 0 });
  const animationFrameRef = useRef<number | null>(null);

  const panLoop = useCallback(() => {
    if (panDirectionRef.current.x !== 0 || panDirectionRef.current.y !== 0) {
      onPan(panDirectionRef.current.x * panSpeed, panDirectionRef.current.y * panSpeed);
    }
    animationFrameRef.current = requestAnimationFrame(panLoop);
  }, [onPan, panSpeed]);

  useEffect(() => {
    animationFrameRef.current = requestAnimationFrame(panLoop);
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [panLoop]);

  const handleInteractionStart = (x: number, y: number) => (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    panDirectionRef.current = { x, y };
  };

  const handleInteractionEnd = () => (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    panDirectionRef.current = { x: 0, y: 0 };
  };

  return (
    <div 
        className="absolute bottom-4 right-4 z-10 w-40 h-40 grid grid-cols-3 grid-rows-3 gap-2"
        onMouseDown={e => e.stopPropagation()}
        onMouseUp={e => e.stopPropagation()}
        onTouchStart={e => e.stopPropagation()}
        onTouchEnd={e => e.stopPropagation()}
    >
      <div />
      <button
        onMouseDown={handleInteractionStart(0, -1)}
        onMouseUp={handleInteractionEnd()}
        onMouseLeave={handleInteractionEnd()}
        onTouchStart={handleInteractionStart(0, -1)}
        onTouchEnd={handleInteractionEnd()}
        className="bg-gray-800/80 rounded-full flex items-center justify-center text-white hover:bg-gray-700 active:bg-gray-600 transition-colors"
        aria-label="Pan Up"
      >
        <ArrowUpIcon className="w-8 h-8" />
      </button>
      <div />
      <button
        onMouseDown={handleInteractionStart(-1, 0)}
        onMouseUp={handleInteractionEnd()}
        onMouseLeave={handleInteractionEnd()}
        onTouchStart={handleInteractionStart(-1, 0)}
        onTouchEnd={handleInteractionEnd()}
        className="bg-gray-800/80 rounded-full flex items-center justify-center text-white hover:bg-gray-700 active:bg-gray-600 transition-colors"
        aria-label="Pan Left"
      >
        <ArrowLeftIcon className="w-8 h-8" />
      </button>
      <div />
      <button
        onMouseDown={handleInteractionStart(1, 0)}
        onMouseUp={handleInteractionEnd()}
        onMouseLeave={handleInteractionEnd()}
        onTouchStart={handleInteractionStart(1, 0)}
        onTouchEnd={handleInteractionEnd()}
        className="bg-gray-800/80 rounded-full flex items-center justify-center text-white hover:bg-gray-700 active:bg-gray-600 transition-colors"
        aria-label="Pan Right"
      >
        <ArrowRightIcon className="w-8 h-8" />
      </button>
      <div />
      <button
        onMouseDown={handleInteractionStart(0, 1)}
        onMouseUp={handleInteractionEnd()}
        onMouseLeave={handleInteractionEnd()}
        onTouchStart={handleInteractionStart(0, 1)}
        onTouchEnd={handleInteractionEnd()}
        className="bg-gray-800/80 rounded-full flex items-center justify-center text-white hover:bg-gray-700 active:bg-gray-600 transition-colors"
        aria-label="Pan Down"
      >
        <ArrowDownIcon className="w-8 h-8" />
      </button>
      <div />
    </div>
  );
};

const LaunchScreen: React.FC<{ onConnect: () => void; t: TFunction }> = ({ onConnect, t }) => (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4 text-center">
        <div className="max-w-md w-full bg-gray-800 p-8 rounded-2xl shadow-2xl border border-purple-500/30">
            <div className="mb-6 inline-block p-4 rounded-full bg-purple-900/30 border border-purple-500/50">
                <SparklesIcon className="w-12 h-12 text-purple-400" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-4">{t('title')}</h1>
            <p className="text-gray-300 mb-8">
                To use the advanced <strong>Gemini 3 Pro</strong> features (High Resolution, Magic Enhance), you need to connect a Google Cloud project.
            </p>
            <button
                onClick={onConnect}
                className="w-full py-3 px-6 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold rounded-xl transition-all transform hover:scale-105 shadow-lg flex items-center justify-center gap-2"
            >
                <span>Connect Google Project</span>
                <ArrowRightIcon className="w-5 h-5" />
            </button>
             <p className="text-xs text-gray-500 mt-4">
                Select a project with a linked billing account for 2K/4K generation.
            </p>
        </div>
    </div>
);

const SetupScreen: React.FC<{ onSave: (config: FirebaseConfig) => void; t: TFunction }> = ({ onSave, t }) => {
    const [configStr, setConfigStr] = useState('');
    const [adminEmail, setAdminEmail] = useState('');

    const handleSubmit = () => {
        try {
            // 1. Basic cleaning: remove comments
            let clean = configStr.replace(/\/\*[\s\S]*?\*\/|([^\\:]|^)\/\/.*$/gm, '$1').trim();

            // 2. AUTO-FIX: Normalize full-width characters and Chinese keys
            clean = clean
                .replace(/：/g, ':')   // Full-width colon -> standard colon
                .replace(/，/g, ',')   // Full-width comma -> standard comma
                .replace(/“/g, '"')    // Smart quotes -> standard quotes
                .replace(/”/g, '"')
                .replace(/‘/g, "'")
                .replace(/’/g, "'")
                .replace(/\s+=\s+/g, '=') // Normalize equals spacing
                // Map common Chinese Firebase console labels to keys
                .replace(/項目ID|專案ID|Project ID/g, 'projectId')
                .replace(/應用程式ID|App ID/g, 'appId')
                .replace(/儲存空間值區|Storage Bucket/g, 'storageBucket')
                .replace(/訊息傳送者ID|Messaging Sender ID/g, 'messagingSenderId')
                .replace(/評估ID|Measurement ID/g, 'measurementId')
                .replace(/API 金鑰|API Key/g, 'apiKey')
                .replace(/驗證網域|Auth Domain/g, 'authDomain');

            // Attempt to extract the object content
            let objectString: string | null = null;
            
            // Strategy 1: Find "firebaseConfig = { ... }" or "const config = { ... }"
            // Adjusted regex to be more permissive with variable names
            let match = clean.match(/\w+\s*=\s*({[\s\S]*?})(;|)/);
            if (match) {
                objectString = match[1];
            } else {
                 // Strategy 2: Find just the object "{ ... }" containing likely keys
                 match = clean.match(/({[\s\S]*?apiKey[\s\S]*?})/);
                 if (match) {
                     objectString = match[1];
                 }
            }

            if (objectString) {
                // Safe evaluation of the object string using Function constructor
                // This handles valid JS object syntax that JSON.parse might fail on (like unquoted keys or trailing commas)
                // eslint-disable-next-line no-new-func
                const configObj = new Function(`return ${objectString}`)();
                
                if (!configObj.apiKey) {
                     alert(t('setupErrorMissingConfig'));
                     return;
                }
                
                onSave({ ...configObj, adminEmail });
            } else {
                // Fallback: Try parsing as pure JSON
                try {
                     const json = JSON.parse(clean);
                     if (json.apiKey) {
                         onSave({ ...json, adminEmail });
                         return;
                     }
                } catch (e) {
                    // Ignore JSON parse error
                }
                
                throw new Error("Could not find a valid configuration object.");
            }
        } catch (e) {
            console.error(e);
            alert(`${t('setupErrorInvalidFormat')}\n\nTechnical details: ${e instanceof Error ? e.message : 'Unknown error'}`);
        }
    };

    const handleShare = () => {
        try {
            // Create a basic config object from string if possible, or use raw text if it seems like a valid config string
            // Simplest is to just encode what the user has typed, but validation is better.
            // For now, let's just encode the input string if it contains basic markers
            if (configStr.includes('apiKey') && configStr.includes('authDomain')) {
                 const encoded = btoa(configStr);
                 const url = `${window.location.origin}${window.location.pathname}?setup=${encoded}`;
                 navigator.clipboard.writeText(url);
                 alert('Share link copied to clipboard! Send this to your friend to auto-configure the database.');
            } else {
                alert('Please paste a valid configuration first.');
            }
        } catch (e) {
            alert('Failed to generate link.');
        }
    };

    return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
            <div className="bg-gray-800 p-8 rounded-2xl shadow-xl w-full max-w-lg border border-gray-700">
                <h2 className="text-2xl font-bold text-white mb-4">{t('setupTitle')}</h2>
                <p className="text-gray-400 mb-4 text-sm">{t('setupDescription')}</p>
                <textarea
                    className="w-full h-48 bg-gray-900 text-gray-200 p-3 rounded-lg border border-gray-600 mb-4 font-mono text-xs"
                    placeholder={t('firebaseConfigPlaceholder')}
                    value={configStr}
                    onChange={(e) => setConfigStr(e.target.value)}
                />
                <input 
                    type="email"
                    className="w-full bg-gray-900 text-gray-200 p-3 rounded-lg border border-gray-600 mb-6"
                    placeholder={t('adminEmailPlaceholder')}
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                />
                <div className="flex gap-2">
                    <button
                        onClick={handleSubmit}
                        className="flex-grow py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg transition-colors"
                    >
                        {t('saveConfigButton')}
                    </button>
                    <button
                         onClick={handleShare}
                         className="px-4 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                         title="Share Config Link"
                    >
                        <ShareIcon className="w-6 h-6" />
                    </button>
                </div>
            </div>
        </div>
    );
};

const PermissionErrorModal: React.FC<{ onClose: () => void }> = ({ onClose }) => (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
        <div className="bg-gray-800 rounded-xl shadow-2xl max-w-lg w-full border border-red-500/50 p-6">
            <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-bold text-red-400">⚠️ Database Permission Error</h3>
                <button onClick={onClose}><CloseIcon className="w-6 h-6 text-gray-400"/></button>
            </div>
            <p className="text-gray-300 mb-4 text-sm">
                The app cannot read/write to the database. This usually means the Firestore Rules are not set correctly.
            </p>
            <ol className="list-decimal list-inside text-gray-400 text-sm mb-4 space-y-2">
                <li>Go to <a href="https://console.firebase.google.com/" target="_blank" className="text-blue-400 hover:underline">Firebase Console</a> > Firestore Database.</li>
                <li>Click the <strong>Rules</strong> tab.</li>
                <li>Replace the code with this:</li>
            </ol>
            <div className="bg-black p-3 rounded-md font-mono text-xs text-green-400 overflow-x-auto mb-4 border border-gray-700">
                rules_version = '2';<br/>
                service cloud.firestore {'{'}<br/>
                &nbsp;&nbsp;match /databases/{'{'}database{'}'}/documents {'{'}<br/>
                &nbsp;&nbsp;&nbsp;&nbsp;match /users/{'{'}userId{'}'} {'{'}<br/>
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;allow read, write: if request.auth != null;<br/>
                &nbsp;&nbsp;&nbsp;&nbsp;{'}'}<br/>
                &nbsp;&nbsp;{'}'}<br/>
                {'}'}
            </div>
            <button onClick={onClose} className="w-full bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 rounded-lg">
                I Fixed It, Try Again
            </button>
        </div>
    </div>
);

const AuthScreen: React.FC<{ t: TFunction; onAuthSuccess: () => void }> = ({ t, onAuthSuccess }) => {
    const [isRegistering, setIsRegistering] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [showPermissionHelp, setShowPermissionHelp] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            if (isRegistering) {
                await register(email, password);
            } else {
                await login(email, password);
            }
            onAuthSuccess();
        } catch (err: any) {
            console.error(err);
            if (err.code === 'auth/operation-not-allowed') {
                setError('⚠️ 操作失敗：請至 Firebase Console > Authentication > Sign-in method 開啟「Email/Password」登入功能。');
            } else if (err.code === 'auth/email-already-in-use') {
                setError('此 Email 已被註冊。');
            } else if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
                setError('帳號或密碼錯誤。');
            } else if (err.code === 'auth/weak-password') {
                setError('密碼強度不足 (需 6 位以上)。');
            } else if (err.code === 'permission-denied' || err.message?.includes('Missing or insufficient permissions')) {
                 setShowPermissionHelp(true);
            } else {
                setError(err.message);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
             {showPermissionHelp && <PermissionErrorModal onClose={() => setShowPermissionHelp(false)} />}
             <div className="bg-gray-800 p-8 rounded-2xl shadow-xl w-full max-w-md border border-gray-700">
                <h2 className="text-2xl font-bold text-white mb-6 text-center">{isRegistering ? t('registerTitle') : t('loginTitle')}</h2>
                {error && <div className="bg-red-900/50 text-red-200 p-3 rounded mb-4 text-sm whitespace-pre-line border border-red-700">{error}</div>}
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-gray-400 text-sm mb-1">{t('emailLabel')}</label>
                        <input 
                            type="email" required
                            className="w-full bg-gray-900 text-white p-3 rounded border border-gray-600 focus:border-purple-500 focus:outline-none"
                            value={email} onChange={e => setEmail(e.target.value)}
                        />
                    </div>
                    <div>
                         <label className="block text-gray-400 text-sm mb-1">{t('passwordLabel')}</label>
                        <input 
                            type="password" required
                            className="w-full bg-gray-900 text-white p-3 rounded border border-gray-600 focus:border-purple-500 focus:outline-none"
                            value={password} onChange={e => setPassword(e.target.value)}
                        />
                    </div>
                    <button 
                        type="submit" 
                        disabled={loading}
                        className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg transition-colors disabled:opacity-50"
                    >
                        {loading ? '...' : (isRegistering ? t('registerButton') : t('loginButton'))}
                    </button>
                </form>
                <div className="mt-4 text-center">
                    <button 
                        onClick={() => setIsRegistering(!isRegistering)}
                        className="text-purple-400 text-sm hover:underline"
                    >
                        {isRegistering ? t('authSwitchToLogin') : t('authSwitchToRegister')}
                    </button>
                </div>
             </div>
        </div>
    )
}

const getClosestAspectRatio = (width: number, height: number): '1:1' | '16:9' | '9:16' | '4:3' | '3:4' => {
    const ratio = width / height;
    const targets = [
        { r: 1, val: '1:1' as const },
        { r: 16/9, val: '16:9' as const },
        { r: 9/16, val: '9:16' as const },
        { r: 4/3, val: '4:3' as const },
        { r: 3/4, val: '3:4' as const }
    ];
    // Find closest
    return targets.reduce((prev, curr) => 
        Math.abs(curr.r - ratio) < Math.abs(prev.r - ratio) ? curr : prev
    ).val;
}

const App: React.FC = () => {
  const [lang, setLang] = useState<Language>('zh');
  const [hasKey, setHasKey] = useState<boolean>(false);
  const [appState, setAppState] = useState<'setup' | 'auth' | 'app'>('setup');
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  
  // App State
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [brushSize, setBrushSize] = useState<number>(10);
  const [brushColor, setBrushColor] = useState<string>('#ef4444');
  const [prompt, setPrompt] = useState<string>('');
  const [aspectRatio, setAspectRatio] = useState<string>('3:2');
  const [resolution, setResolution] = useState<ImageResolution>('2K');
  const [allQuickPrompts, setAllQuickPrompts] = useState<Record<string, string[]>>({});
  const [apiResult, setApiResult] = useState<ApiResult>({ text: null, imageUrl: null });
  const [loading, setLoading] = useState<boolean>(false);
  const [isRefining, setIsRefining] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [isComparing, setIsComparing] = useState<boolean>(false);
  const [isLayoutEditorOpen, setIsLayoutEditorOpen] = useState(false);
  const [editingImage, setEditingImage] = useState<UploadedImage | null>(null);
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  const [creditTargetEmail, setCreditTargetEmail] = useState('');
  const [creditAmount, setCreditAmount] = useState(50);
  const [adminMsg, setAdminMsg] = useState('');
  const [showPermissionHelp, setShowPermissionHelp] = useState(false);

  const canvasRef = useRef<CanvasEditorRef>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const panStartRef = useRef({ startX: 0, startY: 0, startPan: { x: 0, y: 0 } });
  const pinchStartRef = useRef<{ dist: number; mid: { x: number; y: number; }; zoom: number; pan: { x: number; y: number; }; } | null>(null);

  const t: TFunction = useCallback((key) => {
    return translations[lang][key] || translations.en[key];
  }, [lang]);

  // Restore Quick Prompts initialization
  useEffect(() => {
    setAllQuickPrompts(translations[lang].defaultQuickPrompts);
  }, [lang]);

  const selectedImage = uploadedImages.find(img => img.id === selectedImageId) || null;

  // Init Firebase check
  useEffect(() => {
    // Check for shared config
    const params = new URLSearchParams(window.location.search);
    const setupStr = params.get('setup');
    if (setupStr) {
        try {
            const configStr = atob(setupStr);
            // Validate minimally
            if (configStr.includes('apiKey')) {
                localStorage.setItem('firebaseConfig', configStr);
                // Remove param from URL without refresh to keep state clean, then reload to apply
                window.history.replaceState({}, '', window.location.pathname);
                window.location.reload();
                return;
            }
        } catch (e) {
            console.error('Invalid setup string');
        }
    }

    if (isFirebaseConfigured()) {
        try {
            initializeFirebase();
            setAppState('auth');
        } catch (e) {
            console.error("Failed to initialize firebase with stored config", e);
            setAppState('setup');
        }
    } else {
        setAppState('setup');
    }
  }, []);

  // Auth Listener
  useEffect(() => {
    if (appState === 'setup') return;
    
    const auth = getAuthInstance();
    if (!auth) return;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
        if (user) {
            try {
                const profile = await getUserProfile(user.uid);
                setUserProfile(profile);
                setAppState('app');
            } catch (e: any) {
                console.error("Failed to get profile:", e);
                if (e.code === 'permission-denied' || e.message?.includes('Missing or insufficient permissions')) {
                     setShowPermissionHelp(true);
                }
            }
        } else {
            setUserProfile(null);
            setAppState('auth');
        }
    });
    return () => unsubscribe();
  }, [appState]);

  // API Key Check
  useEffect(() => {
      const checkKey = async () => {
          // If deployed with env key, skip
          if (process.env.API_KEY && process.env.API_KEY.length > 0) {
              setHasKey(true);
              return;
          }

          if (window.aistudio && window.aistudio.hasSelectedApiKey) {
              const has = await window.aistudio.hasSelectedApiKey();
              setHasKey(has);
          } else {
              setHasKey(true);
          }
      };
      checkKey();
  }, []);

  const handleConnectApiKey = async () => {
      if (window.aistudio && window.aistudio.openSelectKey) {
          await window.aistudio.openSelectKey();
          setHasKey(true); 
      }
  };
  
  const handleSetupSave = (config: FirebaseConfig) => {
      try {
          initializeFirebase(config);
          setAppState('auth');
      } catch (e: any) {
          alert(e.message);
      }
  };

  const handleAdminAddCredits = async () => {
      try {
          await addCreditsByEmail(creditTargetEmail, Number(creditAmount));
          setAdminMsg(t('creditsAddedSuccess'));
          setCreditTargetEmail('');
      } catch (e: any) {
          if (e.code === 'permission-denied' || e.message?.includes('Missing or insufficient permissions')) {
             setShowPermissionHelp(true);
          }
          setAdminMsg(t('creditsAddedError'));
      }
  };

  const handleRefinePrompt = async () => {
    if (!prompt) return;
    if (!userProfile || userProfile.credits < 5) {
        alert(t('notEnoughCredits'));
        return;
    }

    setIsRefining(true);
    
    let imagePart: GeminiImagePart | null = null;
    if (selectedImage) {
        try {
            const dataUrl = canvasRef.current ? canvasRef.current.toDataURL() : selectedImage.dataUrl;
            const [header, base64Data] = dataUrl.split(',');
            const mimeType = header.match(/:(.*?);/)?.[1] || 'image/png';
            imagePart = { base64Data, mimeType };
        } catch (e) {
            console.error("Error preparing image for refine prompt:", e);
        }
    }

    try {
        await deductCredits(userProfile.uid, 5);
        setUserProfile(prev => prev ? { ...prev, credits: prev.credits - 5 } : null);
        const enhancedPrompt = await refinePrompt(prompt, imagePart, lang);
        setPrompt(enhancedPrompt);
    } catch (e: any) {
        console.error("Refine prompt failed", e);
        if (e.code === 'permission-denied' || e.message?.includes('Missing or insufficient permissions')) {
            setShowPermissionHelp(true);
        }
    } finally {
        setIsRefining(false);
    }
  };

  const handleGenerate = useCallback(async () => {
    if (!prompt) {
      setError('Please enter a prompt.');
      return;
    }
    if (!userProfile || userProfile.credits < 5) {
        setError(t('notEnoughCredits'));
        return;
    }

    // Capture canvas data BEFORE async operations/state updates unmount the component
    let capturedCanvasData: string | null = null;
    if (selectedImage && !apiResult.imageUrl) {
        if (canvasRef.current) {
             capturedCanvasData = canvasRef.current.toDataURL(selectedImage.file.type);
        } else {
             // Fallback to original image if canvas is not ready (e.g. strict mode or rapid clicking)
             console.warn("Canvas not ready, using original image");
             capturedCanvasData = selectedImage.dataUrl;
        }
    }

    const previousResultUrl = apiResult.imageUrl;
    setLoading(true);
    setError(null);
    setApiResult({ text: null, imageUrl: null });

    try {
      // Deduct credits first
      await deductCredits(userProfile.uid, 5);
      setUserProfile(prev => prev ? { ...prev, credits: prev.credits - 5 } : null);

      let effectiveAspectRatio: '1:1' | '16:9' | '9:16' | '4:3' | '3:4';
      if (aspectRatio === '3:2') {
           effectiveAspectRatio = '4:3';
      } else if (aspectRatio === '2:3') {
           effectiveAspectRatio = '3:4';
      } else {
           effectiveAspectRatio = aspectRatio as any;
      }

      if (!selectedImage) {
        const imageUrl = await generateImageWithGemini3(prompt, effectiveAspectRatio, resolution);
        setApiResult({ text: null, imageUrl });
      } else {
        let baseImagePart: GeminiImagePart;
        if (previousResultUrl) {
            const [header, base64Data] = previousResultUrl.split(',');
            if (!base64Data) throw new Error("Invalid image data URL");
            const mimeType = header.match(/:(.*?);/)?.[1] || 'image/png';
            baseImagePart = { base64Data, mimeType };
        } else {
            // Use captured data
            if (!capturedCanvasData) {
               throw new Error('Canvas data missing.');
            }
            const base64Data = capturedCanvasData.split(',')[1];
            baseImagePart = { base64Data, mimeType: selectedImage.file.type };
        }
        
        const imagesToSend: GeminiImagePart[] = [baseImagePart];
        const imageReferenceKeyword = t('imageReference');
        const regex = new RegExp(`${imageReferenceKeyword}(\\d+)`, 'g');
        const referencedIndices = new Set<number>();
        let match;
        while ((match = regex.exec(prompt)) !== null) {
          const imageNumber = parseInt(match[1], 10);
          if (imageNumber > 0 && imageNumber <= uploadedImages.length) {
            referencedIndices.add(imageNumber - 1);
          }
        }
        const selectedIndex = uploadedImages.findIndex(img => img.id === selectedImageId);
        referencedIndices.forEach(index => {
          if (index !== selectedIndex) {
            const referencedImage = uploadedImages[index];
            if (referencedImage) {
              const referencedBase64 = referencedImage.dataUrl.split(',')[1];
              imagesToSend.push({ base64Data: referencedBase64, mimeType: referencedImage.file.type });
            }
          }
        });
        
        const finalPrompt = `${prompt}\n\n${t('instructionalPrompt')}`;
        const response: GenerateContentResponse = await editImageWithGemini(
          imagesToSend,
          finalPrompt,
          resolution,
          effectiveAspectRatio
        );
        
        let resultText = '';
        let resultImageUrl = '';
        if (response.candidates && response.candidates[0] && response.candidates[0].content && response.candidates[0].content.parts) {
          for (const part of response.candidates[0].content.parts) {
            if (part.text) {
              resultText += part.text + '\n';
            } else if (part.inlineData) {
              resultImageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
            }
          }
        } else {
          throw new Error('Invalid response structure from API.');
        }
        setApiResult({ text: resultText.trim(), imageUrl: resultImageUrl });
      }
    } catch (e: any) {
      console.error(e);
      // Catch Firestore Permission Error
      if (e.code === 'permission-denied' || e.message?.includes('Missing or insufficient permissions')) {
          setShowPermissionHelp(true);
          setLoading(false);
          setApiResult({ text: null, imageUrl: previousResultUrl });
          return;
      }

      const errorMessage = e instanceof Error ? e.message : 'An unexpected error occurred.';
      if (errorMessage === 'RATE_LIMIT_EXCEEDED') {
        setError(t('rateLimitError'));
      } else if (errorMessage === 'PERMISSION_DENIED' || errorMessage.includes('403') || errorMessage.includes('PERMISSION_DENIED')) {
        setError('PERMISSION_DENIED_UI');
        if (resolution !== '1K') setResolution('1K');
      } else {
        setError(errorMessage);
      }
      setApiResult({ text: null, imageUrl: previousResultUrl });
    } finally {
      setLoading(false);
    }
  }, [selectedImage, prompt, uploadedImages, selectedImageId, t, apiResult.imageUrl, aspectRatio, resolution, userProfile]);

  // Image & Canvas Handlers (Same as before)
  const handleFiles = useCallback((files: FileList) => {
    const filesArray = Array.from(files).filter(file => file.type.startsWith('image/'));
    if (filesArray.length === 0) return;
    const newImages: UploadedImage[] = [];
    let loadedCount = 0;
    filesArray.forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        newImages.push({ id: `${file.name}-${Date.now()}`, file, dataUrl: event.target?.result as string });
        loadedCount++;
        if (loadedCount === filesArray.length) {
          setUploadedImages(prev => [...prev, ...newImages]);
          if (!selectedImageId && newImages.length > 0) setSelectedImageId(newImages[0].id);
        }
      };
      reader.readAsDataURL(file);
    });
  }, [selectedImageId]);
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => { if (e.target.files) { handleFiles(e.target.files); e.target.value = ''; } };
  const handleUploadClick = () => fileInputRef.current?.click();
  const handleImageSelect = (id: string) => { if(id !== selectedImageId) { setSelectedImageId(id); setApiResult({ text: null, imageUrl: null }); setError(null); } }
  const handleImageDelete = (id: string) => {
    setUploadedImages(prev => prev.filter(img => img.id !== id));
    if (selectedImageId === id) {
        const remaining = uploadedImages.filter(img => img.id !== id);
        setSelectedImageId(remaining.length > 0 ? remaining[0].id : null);
        setApiResult({ text: null, imageUrl: null });
        setError(null);
    }
  }
  const handleImageReorder = (reorderedImages: UploadedImage[]) => setUploadedImages(reorderedImages);
  const handleClearResult = () => { setApiResult({ text: null, imageUrl: null }); setError(null); };
  
  // Reuse existing helpers
  const handlePanByControl = useCallback((dx: number, dy: number) => { setPan(p => ({ x: p.x + dx, y: p.y + dy })); }, []);
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (!imageContainerRef.current) return;
    e.preventDefault();
    const rect = imageContainerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const delta = -e.deltaY * 0.005;
    setZoom(prevZoom => {
        const newZoom = Math.max(1, Math.min(3, prevZoom + delta * prevZoom));
        const scaleFactor = newZoom / prevZoom;
        const cx = rect.width / 2;
        const cy = rect.height / 2;
        setPan(prevPan => ({
            x: (mouseX - cx) * (1 - scaleFactor) + prevPan.x * scaleFactor,
            y: (mouseY - cy) * (1 - scaleFactor) + prevPan.y * scaleFactor,
        }));
        return newZoom;
    });
  }, []);
  const handlePanStart = useCallback((clientX: number, clientY: number) => {
    if (!imageContainerRef.current) return;
    panStartRef.current = { startX: clientX, startY: clientY, startPan: pan };
    setIsPanning(true);
  }, [pan]);
  const handlePanMove = useCallback((clientX: number, clientY: number) => {
    if (!isPanning) return;
    setPan({ x: panStartRef.current.startPan.x + (clientX - panStartRef.current.startX), y: panStartRef.current.startPan.y + (clientY - panStartRef.current.startY) });
  }, [isPanning]);
  const handlePanEnd = useCallback(() => setIsPanning(false), []);
  const resetView = useCallback(() => { setZoom(1); setPan({ x: 0, y: 0 }); }, []);
  const onMouseDown = (e: React.MouseEvent) => { if (e.button !== 0) return; e.preventDefault(); handlePanStart(e.clientX, e.clientY); };
  const onMouseMove = (e: React.MouseEvent) => { e.preventDefault(); handlePanMove(e.clientX, e.clientY); };
  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      setIsPanning(false);
      const t1 = e.touches[0]; const t2 = e.touches[1];
      pinchStartRef.current = { dist: Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY), mid: { x: (t1.clientX + t2.clientX) / 2, y: (t1.clientY + t2.clientY) / 2 }, zoom: zoom, pan: pan };
    } else if (e.touches.length === 1) { pinchStartRef.current = null; handlePanStart(e.touches[0].clientX, e.touches[0].clientY); }
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinchStartRef.current) {
      e.preventDefault();
      const t1 = e.touches[0]; const t2 = e.touches[1];
      const newDist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      const scale = newDist / pinchStartRef.current.dist;
      const newZoom = Math.max(1, Math.min(3, pinchStartRef.current.zoom * scale));
      if (imageContainerRef.current) {
          const rect = imageContainerRef.current.getBoundingClientRect();
          const startMidOnScreen = { x: pinchStartRef.current.mid.x - rect.left, y: pinchStartRef.current.mid.y - rect.top };
          const worldPoint = { x: (startMidOnScreen.x - pinchStartRef.current.pan.x) / pinchStartRef.current.zoom, y: (startMidOnScreen.y - pinchStartRef.current.pan.y) / pinchStartRef.current.zoom };
          const newMid = { x: (t1.clientX + t2.clientX) / 2, y: (t1.clientY + t2.clientY) / 2 };
          const newMidOnScreen = { x: newMid.x - rect.left, y: newMid.y - rect.top };
          const newPan = { x: newMidOnScreen.x - worldPoint.x * newZoom, y: newMidOnScreen.y - worldPoint.y * newZoom };
          setZoom(newZoom); setPan(newPan);
      }
    } else if (e.touches.length === 1 && isPanning) { handlePanMove(e.touches[0].clientX, e.touches[0].clientY); }
  };
  const onTouchEnd = (e: React.TouchEvent) => { handlePanEnd(); if (e.touches.length < 2) pinchStartRef.current = null; if (e.touches.length === 1) handlePanStart(e.touches[0].clientX, e.touches[0].clientY); };
  
  const handleEditResult = () => {
    if (!apiResult.imageUrl) return;
    try {
      const dataUrl = apiResult.imageUrl;
      const parts = dataUrl.split(',');
      const mimeString = parts[0].split(':')[1].split(';')[0];
      const extension = mimeString.split('/')[1] || 'png';
      const byteString = atob(parts[1]);
      const arrayBuffer = new ArrayBuffer(byteString.length);
      const intArray = new Uint8Array(arrayBuffer);
      for (let i = 0; i < byteString.length; i++) intArray[i] = byteString.charCodeAt(i);
      const blob = new Blob([arrayBuffer], { type: mimeString });
      const filename = `result-${Date.now()}.${extension}`;
      const file = new File([blob], filename, { type: mimeString });
      const newImage: UploadedImage = { id: `${file.name}-${Date.now()}`, file, dataUrl: dataUrl };
      setUploadedImages(prev => [...prev, newImage]);
      setSelectedImageId(newImage.id);
      setApiResult({ text: null, imageUrl: null });
      setError(null);
    } catch (e) { console.error(e); setError("Could not load result image."); }
  };

  const handleLayoutComplete = (dataUrl: string) => {
      const mime = dataUrl.match(/:(.*?);/)?.[1] || 'image/png';
      const file = new File([new Blob([new Uint8Array(0)])], `layout-${Date.now()}`, { type: mime });
      const newImage = { id: `${Date.now()}`, file, dataUrl };
      setUploadedImages(prev => [...prev, newImage]);
      setSelectedImageId(newImage.id);
      setIsLayoutEditorOpen(false);
  }
  const handleOpenPhotoEditor = (id: string) => { const img = uploadedImages.find(i => i.id === id); if (img) setEditingImage(img); };
  const handleSavePhotoEditor = (id: string, dataUrl: string) => { setUploadedImages(prev => prev.map(img => img.id === id ? { ...img, dataUrl } : img)); setEditingImage(null); };

  if (appState === 'setup') return <SetupScreen onSave={handleSetupSave} t={t} />;
  if (appState === 'auth') return <AuthScreen t={t} onAuthSuccess={() => {}} />;
  if (!hasKey) return <LaunchScreen onConnect={handleConnectApiKey} t={t} />;

  return (
    <div className="min-h-screen bg-gray-900 text-gray-200 font-sans relative">
      {showPermissionHelp && <PermissionErrorModal onClose={() => setShowPermissionHelp(false)} />}
      {isLayoutEditorOpen && <LayoutEditor onComplete={handleLayoutComplete} onClose={() => setIsLayoutEditorOpen(false)} t={t} />}
      {editingImage && <PhotoEditor image={editingImage} onSave={handleSavePhotoEditor} onClose={() => setEditingImage(null)} t={t} />}

      <div className="container mx-auto p-4 lg:p-8">
        <header className="mb-8 flex flex-col md:flex-row justify-between items-center gap-4">
             <div className="text-center md:text-left">
                <h1 className="text-4xl lg:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-500 to-red-500">
                    {t('title')} <span className="text-xs bg-gray-800 text-gray-400 px-2 py-1 rounded border border-gray-600 align-middle ml-2">Gemini 3</span>
                </h1>
                <p className="text-gray-400 mt-2">{t('subtitle')}</p>
            </div>
            <div className="flex items-center gap-4 bg-gray-800 p-3 rounded-xl border border-gray-700">
                <div className="flex flex-col items-end">
                    <span className="text-xs text-gray-400">{userProfile?.email}</span>
                    <span className="text-sm font-bold text-yellow-400 flex items-center gap-1">
                        <SparklesIcon className="w-4 h-4" /> {userProfile?.credits || 0} {t('creditsLabel')}
                    </span>
                </div>
                <button onClick={() => logout()} className="text-xs bg-red-900/50 hover:bg-red-900 text-red-200 px-2 py-1 rounded">
                    {t('logoutButton')}
                </button>
                <div className="flex gap-2 border-l border-gray-600 pl-4">
                    <button onClick={() => setLang('en')} className={`px-2 py-1 text-xs rounded-md ${lang === 'en' ? 'bg-purple-600 text-white' : 'bg-gray-700'}`}>EN</button>
                    <button onClick={() => setLang('zh')} className={`px-2 py-1 text-xs rounded-md ${lang === 'zh' ? 'bg-purple-600 text-white' : 'bg-gray-700'}`}>中文</button>
                </div>
            </div>
        </header>

        {/* Admin Panel */}
        {userProfile?.isAdmin && (
            <div className="mb-6 bg-blue-900/20 border border-blue-500/30 p-4 rounded-lg">
                <div className="flex justify-between items-center cursor-pointer" onClick={() => setIsAdminPanelOpen(!isAdminPanelOpen)}>
                    <h3 className="font-bold text-blue-300 flex items-center gap-2"><UserCircleIcon className="w-5 h-5"/> {t('adminPanelTitle')}</h3>
                    <span className="text-xl">{isAdminPanelOpen ? '−' : '+'}</span>
                </div>
                {isAdminPanelOpen && (
                    <div className="mt-4 flex flex-col md:flex-row gap-4 items-end">
                        <div className="flex-grow">
                            <label className="block text-xs text-gray-400 mb-1">{t('targetEmailLabel')}</label>
                            <input type="email" value={creditTargetEmail} onChange={e => setCreditTargetEmail(e.target.value)} className="w-full bg-gray-800 border border-gray-600 rounded p-2 text-sm" />
                        </div>
                        <div className="w-32">
                             <label className="block text-xs text-gray-400 mb-1">{t('amountLabel')}</label>
                             <input type="number" value={creditAmount} onChange={e => setCreditAmount(Number(e.target.value))} className="w-full bg-gray-800 border border-gray-600 rounded p-2 text-sm" />
                        </div>
                        <button onClick={handleAdminAddCredits} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded font-bold text-sm">
                            {t('addCreditsButton')}
                        </button>
                        {adminMsg && <span className="text-sm text-green-400">{adminMsg}</span>}
                    </div>
                )}
            </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column */}
          <div className="flex flex-col gap-4 bg-gray-800 p-6 rounded-2xl shadow-lg border border-gray-700">
             <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-300">
                {apiResult.imageUrl && !loading ? t('resultTitle') : t('canvasTitle')}
              </h2>
              {apiResult.imageUrl && !loading && (
                <button onClick={handleClearResult} className="flex items-center gap-2 bg-gray-600 hover:bg-gray-500 text-white font-semibold py-2 px-4 rounded-lg">
                    <RedrawIcon className="w-4 h-4"/> {t('backToEditorButton')}
                </button>
              )}
            </div>

            {apiResult.imageUrl || loading ? (
                 <ResultDisplay
                    loading={loading}
                    error={error}
                    apiResult={apiResult}
                    t={t}
                    onEditResult={handleEditResult}
                 />
            ) : (
                // Canvas View
                 <div className="relative w-full aspect-[4/3] bg-gray-900 rounded-lg overflow-hidden border-2 border-dashed border-gray-700 group cursor-crosshair">
                    <div 
                        ref={imageContainerRef}
                        className="w-full h-full flex items-center justify-center overflow-hidden touch-none"
                        onMouseDown={onMouseDown}
                        onMouseMove={onMouseMove}
                        onMouseUp={() => setIsPanning(false)}
                        onMouseLeave={() => setIsPanning(false)}
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
                    {selectedImage && zoom > 1 && <PanControl onPan={handlePanByControl} />}
                    {selectedImage && (
                        <div className="absolute top-2 right-2 flex gap-2">
                             <div className="flex items-center bg-gray-800/80 rounded-lg p-1 backdrop-blur-sm">
                                <button onClick={() => setZoom(z => Math.max(1, z - 0.2))} className="p-1.5 hover:bg-gray-700 rounded text-gray-300"><ZoomOutIcon className="w-5 h-5"/></button>
                                <span className="text-xs w-8 text-center">{Math.round(zoom * 100)}%</span>
                                <button onClick={() => setZoom(z => Math.min(3, z + 0.2))} className="p-1.5 hover:bg-gray-700 rounded text-gray-300"><ZoomInIcon className="w-5 h-5"/></button>
                                <button onClick={resetView} className="p-1.5 hover:bg-gray-700 rounded text-gray-300 border-l border-gray-600 ml-1"><ArrowsPointingOutIcon className="w-5 h-5"/></button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Toolbar for Canvas */}
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
            
            {/* Thumbnails */}
            <ThumbnailManager
                images={uploadedImages}
                selectedImageId={selectedImageId}
                onSelect={handleImageSelect}
                onDelete={handleImageDelete}
                onAddImage={handleUploadClick}
                onReorder={handleImageReorder}
                onEdit={handleOpenPhotoEditor}
                onOpenLayoutEditor={() => setIsLayoutEditorOpen(true)}
                t={t}
            />
          </div>

          {/* Right Column */}
          <div className="flex flex-col gap-6">
            <div className="bg-gray-800 p-6 rounded-2xl shadow-lg border border-gray-700 flex flex-col gap-4">
                 <div className="flex justify-between items-center">
                    <label className="block text-sm font-medium text-gray-300">
                        <span className="flex items-center gap-2">
                            <SparklesIcon className="w-4 h-4 text-purple-400" />
                            {t('promptLabel')}
                        </span>
                    </label>
                    <div className="flex gap-2">
                        <button
                            onClick={handleRefinePrompt}
                            disabled={!prompt || isRefining}
                            className="text-xs bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 border border-indigo-500/30 px-3 py-1.5 rounded-full transition-all flex items-center gap-1 disabled:opacity-50"
                        >
                            {isRefining ? t('refiningButton') : t('enhancePromptButton')}
                        </button>
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

              <div className="grid grid-cols-2 gap-4">
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
                  <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1">{t('resolutionLabel')}</label>
                      <div className="flex bg-gray-700 rounded-lg p-1">
                          {(['1K', '2K', '4K'] as const).map((res) => (
                              <button
                                key={res}
                                onClick={() => setResolution(res)}
                                className={`flex-1 text-xs font-medium py-1.5 rounded-md transition-colors ${resolution === res ? 'bg-purple-600 text-white shadow-sm' : 'text-gray-300 hover:text-white'}`}
                              >
                                  {res}
                              </button>
                          ))}
                      </div>
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
                    {t('generatingButton')}
                  </>
                ) : (
                  <>
                    <SparklesIcon className="w-6 h-6" />
                    {t('generateButton')}
                  </>
                )}
              </button>

              {error && (
                <div className="p-4 bg-red-900/30 border border-red-500/50 rounded-xl text-red-200 text-sm">
                  <p className="font-bold flex items-center gap-2">
                    <span className="text-xl">⚠️</span> {t('errorTitle')}
                  </p>
                  <p className="mt-1">{error}</p>
                   {error === 'PERMISSION_DENIED_UI' && (
                        <p className="mt-2 text-xs text-red-300">
                             Tip: High resolution (2K/4K) requires a billing-enabled Google Cloud Project. Try selecting '1K' or checking your API key permissions.
                        </p>
                   )}
                </div>
              )}
            </div>

            <div className="bg-gray-800 p-6 rounded-2xl shadow-lg border border-gray-700 flex-grow overflow-y-auto max-h-[500px]">
                 <QuickPrompts
                    prompts={allQuickPrompts}
                    onPromptClick={setPrompt}
                    onPromptsChange={setAllQuickPrompts}
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