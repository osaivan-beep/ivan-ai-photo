
import React, { useState, useEffect, useRef } from 'react';
import type { ApiResult, TFunction } from '../types';
import { ImageIcon, DownloadIcon, EditIcon, CompareIcon, RefreshIcon, SparklesIcon } from './Icons';

interface ResultDisplayProps {
  loading: boolean;
  error: string | null;
  apiResult: ApiResult;
  t: TFunction;
  onEditResult: () => void;
  onUpdateResult?: (url: string) => void;
  originalImageSrc: string | null;
  isUpscaling?: boolean;
  
  // Interaction props
  zoom?: number;
  pan?: { x: number, y: number };
  isPanMode?: boolean;
  isComparing?: boolean; 
  containerRef?: React.RefObject<HTMLDivElement>;
  interactionHandlers?: {
      onMouseDown: (e: React.MouseEvent) => void;
      onMouseMove: (e: React.MouseEvent) => void;
      onMouseUp: () => void;
      onMouseLeave: () => void;
      onTouchStart: (e: React.TouchEvent) => void;
      onTouchMove: (e: React.TouchEvent) => void;
      onTouchEnd: () => void;
      onWheel?: (e: React.WheelEvent) => void;
  };
}

export const ResultDisplay: React.FC<ResultDisplayProps> = ({ 
    loading, 
    error, 
    apiResult, 
    t, 
    onEditResult, 
    originalImageSrc,
    isUpscaling = false,
    zoom = 1,
    pan = { x: 0, y: 0 },
    isPanMode = false,
    isComparing: isComparingProp,
    containerRef,
    interactionHandlers
}) => {
  const [isComparingLocal, setIsComparingLocal] = useState(false);
  const [resolution, setResolution] = useState<{ width: number; height: number } | null>(null);
  const [downloadFormat, setDownloadFormat] = useState<'png' | 'jpg'>('png');
  const [isImageFullyLoaded, setIsImageFullyLoaded] = useState(false);
  
  // 核心優化：保留上一次成功的圖片 URL，避免生圖瞬間畫面變空
  const [activeUrl, setActiveUrl] = useState<string | null>(apiResult.imageUrl);

  const isComparing = !!isComparingProp || isComparingLocal;

  useEffect(() => {
    if (apiResult.imageUrl) {
        setIsImageFullyLoaded(false);
        const img = new Image();
        img.onload = () => {
            setResolution({ width: img.naturalWidth, height: img.naturalHeight });
            setIsImageFullyLoaded(true);
            setActiveUrl(apiResult.imageUrl); // 只有真正載入成功後才替換顯示的 URL
        };
        img.onerror = () => {
            console.error("Result image load failed");
            setIsImageFullyLoaded(true);
            setActiveUrl(apiResult.imageUrl);
        };
        img.src = apiResult.imageUrl;
    } else {
        setResolution(null);
        setIsImageFullyLoaded(false);
        setActiveUrl(null);
    }
  }, [apiResult.imageUrl]);

  const handleDownload = async () => {
    if (!activeUrl) return;
    
    let finalUrl = activeUrl;
    let filename = `ivan-ai-photo-${Date.now()}.${downloadFormat}`;

    if (downloadFormat === 'jpg') {
        try {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.src = activeUrl;
            await new Promise((resolve) => { img.onload = resolve; });

            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.fillStyle = '#FFFFFF';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0);
                finalUrl = canvas.toDataURL('image/jpeg', 1.0);
            }
        } catch (e) {
            console.error("JPG conversion failed", e);
        }
    }

    const link = document.createElement('a');
    link.href = finalUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 優化點：Loading 期間不再清空內容，而是覆蓋一層半透明遮罩
  const showLoading = loading || (apiResult.imageUrl && !isImageFullyLoaded);

  return (
    <div className="flex flex-col gap-2 relative">
      {activeUrl && !loading && resolution && (
          <div className="flex justify-end items-center px-1">
              <div className="bg-gray-800/80 backdrop-blur-sm text-white text-[10px] font-mono px-3 py-1 rounded-full border border-gray-600 flex items-center gap-2 shadow-sm animate-fade-in">
                  <div className={`w-1.5 h-1.5 rounded-full ${isUpscaling ? 'bg-yellow-400 animate-pulse' : 'bg-green-400'}`}></div>
                  <span className="text-gray-300">
                    {isUpscaling ? t('refiningButton') : `${resolution.width} x ${resolution.height}`}
                  </span>
              </div>
          </div>
      )}

      <div 
        ref={containerRef}
        className={`w-full bg-gray-900 rounded-xl overflow-hidden flex items-center justify-center relative border-2 border-gray-700 border-dashed transition-all duration-500 ${!activeUrl && !loading ? 'min-h-[400px]' : 'min-h-[300px]'} touch-none ${isPanMode ? 'cursor-grab active:cursor-grabbing' : ''}`}
        style={{ 
            aspectRatio: resolution ? `${resolution.width}/${resolution.height}` : '4/3',
            background: '#0a0a0f' // 深黑色底
        }}
        {...(interactionHandlers || {})}
      >
        {/* 重要修正：Loading 現在改為 Overlay，背景圖層依然存在，防止黑屏感 */}
        {showLoading && (
          <div className="text-center absolute inset-0 flex flex-col items-center justify-center z-20 bg-black/60 transition-opacity duration-300">
            <div className="relative">
                <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-purple-500"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                    <SparklesIcon className="w-6 h-6 text-purple-400 animate-pulse" />
                </div>
            </div>
            <p className="text-gray-200 mt-6 font-black tracking-widest animate-pulse uppercase text-xs">
                {loading ? t('generatingButton') : 'FINALIZING...'}
            </p>
          </div>
        )}

        {error ? (
          <div className="text-red-400 p-8 text-center max-w-md absolute inset-0 flex flex-col items-center justify-center z-30 bg-gray-900/90">
            <div className="bg-red-900/20 p-4 rounded-full mb-4 border border-red-500/30">
                <RefreshIcon className="w-8 h-8 text-red-500" />
            </div>
            <p className="font-black mb-2 uppercase tracking-tighter text-lg">{t('errorTitle')}</p>
            <p className="text-sm opacity-80 leading-relaxed whitespace-pre-wrap">{error}</p>
          </div>
        ) : activeUrl ? (
          <div 
            style={{ 
                transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)`, 
                transition: interactionHandlers ? 'none' : 'transform 0.2s ease-out',
                transformOrigin: 'center',
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }} 
            className="relative animate-fade-in"
          >
            <div className="relative group">
                <img
                src={isComparing && originalImageSrc ? originalImageSrc : activeUrl}
                alt="Result"
                draggable={false}
                className="max-w-none shadow-2xl pointer-events-none rounded-sm" 
                style={{ 
                    display: 'block',
                    width: resolution ? `${resolution.width}px` : 'auto',
                    height: resolution ? `${resolution.height}px` : 'auto'
                }}
                />
                {isComparing && (
                    <div className="absolute top-4 left-4 bg-black/80 text-white text-[10px] font-black px-3 py-1 rounded-full border border-white/20 pointer-events-none shadow-lg tracking-widest uppercase">
                        Comparison: Original
                    </div>
                )}
            </div>
          </div>
        ) : !loading ? (
          <div className="text-center text-gray-500 absolute inset-0 flex flex-col items-center justify-center group cursor-pointer" onClick={() => (window as any).fileInputRef?.current?.click()}>
            <div className="p-6 rounded-full bg-gray-800/50 border border-gray-700 group-hover:scale-110 transition-transform mb-6">
                <ImageIcon className="w-16 h-16 opacity-30 group-hover:opacity-60 transition-opacity" />
            </div>
            <h3 className="text-xl font-black text-gray-400 tracking-tighter mb-1 uppercase">{t('initialResultTitle')}</h3>
            <p className="text-xs font-medium text-gray-600 uppercase tracking-widest">{t('initialResultSubtitle')}</p>
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-3 mt-2">
        {activeUrl && !loading && isImageFullyLoaded && (
            <>
                <div className="flex bg-gray-800/80 rounded-xl p-1 border border-gray-700 shadow-lg">
                    <button 
                        onClick={() => setDownloadFormat('png')} 
                        className={`px-4 py-2 text-xs font-black rounded-lg transition-all ${downloadFormat === 'png' ? 'bg-purple-600 text-white shadow-md' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                        PNG
                    </button>
                    <button 
                        onClick={() => setDownloadFormat('jpg')} 
                        className={`px-4 py-2 text-xs font-black rounded-lg transition-all ${downloadFormat === 'jpg' ? 'bg-purple-600 text-white shadow-md' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                        JPG
                    </button>
                </div>

                <button
                    onClick={handleDownload}
                    className="flex-1 bg-green-600 hover:bg-green-500 text-white font-black py-4 px-6 rounded-2xl transition-all flex items-center justify-center gap-3 shadow-xl hover:shadow-green-500/20 transform active:scale-95 uppercase tracking-widest text-sm"
                >
                    <DownloadIcon className="w-6 h-6" />
                    {t('downloadButton')}
                </button>

                <button
                    onClick={onEditResult}
                    className="flex-1 bg-purple-600 hover:bg-purple-500 text-white font-black py-4 px-6 rounded-2xl transition-all flex items-center justify-center gap-3 shadow-xl hover:shadow-purple-500/20 transform active:scale-95 uppercase tracking-widest text-sm"
                >
                    <EditIcon className="w-6 h-6" />
                    {t('editResultButton')}
                </button>

                {originalImageSrc && (
                    <button
                        onMouseDown={() => setIsComparingLocal(true)}
                        onMouseUp={() => setIsComparingLocal(false)}
                        onMouseLeave={() => setIsComparingLocal(false)}
                        onTouchStart={() => setIsComparingLocal(true)}
                        onTouchEnd={() => setIsComparingLocal(false)}
                        className="bg-gray-800 hover:bg-gray-700 text-purple-400 font-black p-4 rounded-2xl transition-all shadow-xl active:bg-gray-600 border border-gray-700"
                        title={t('compareButton')}
                    >
                        <CompareIcon className="w-6 h-6" />
                    </button>
                )}
            </>
        )}
      </div>
    </div>
  );
};
