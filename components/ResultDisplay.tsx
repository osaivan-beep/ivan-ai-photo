import React, { useState, useEffect, useRef } from 'react';
import type { ApiResult, TFunction } from '../types';
import { ImageIcon, DownloadIcon, EditIcon, CompareIcon } from './Icons';

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
  isComparing?: boolean; // Controlled from App via keyboard
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

  // Fix: Use logical OR so either the key (prop) or button (local) triggers comparison
  const isComparing = !!isComparingProp || isComparingLocal;

  useEffect(() => {
    if (apiResult.imageUrl) {
        const img = new Image();
        img.onload = () => {
            setResolution({ width: img.naturalWidth, height: img.naturalHeight });
        };
        img.src = apiResult.imageUrl;
    } else {
        setResolution(null);
    }
  }, [apiResult.imageUrl]);

  const handleDownload = async () => {
    if (!apiResult.imageUrl) return;
    
    let finalUrl = apiResult.imageUrl;
    let filename = `ivan-ai-photo-${Date.now()}.${downloadFormat}`;

    if (downloadFormat === 'jpg') {
        try {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.src = apiResult.imageUrl;
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

  return (
    <div className="flex flex-col gap-2 relative">
      {/* Resolution & Status Bar (Moved above the image) */}
      {apiResult.imageUrl && !loading && resolution && (
          <div className="flex justify-end items-center px-1">
              <div className="bg-gray-800/80 backdrop-blur-sm text-white text-[10px] font-mono px-3 py-1 rounded-full border border-gray-600 flex items-center gap-2 shadow-sm animate-fade-in">
                  <div className={`w-1.5 h-1.5 rounded-full ${isUpscaling ? 'bg-yellow-400 animate-pulse' : 'bg-green-400'}`}></div>
                  <span className="text-gray-300">
                    {isUpscaling ? t('upscalingState') : `${resolution.width} x ${resolution.height}`}
                  </span>
              </div>
          </div>
      )}

      <div 
        ref={containerRef}
        className={`w-full bg-gray-900 rounded-lg overflow-hidden flex items-center justify-center relative border-2 border-gray-700 border-dashed ${!apiResult.imageUrl ? 'min-h-[300px]' : ''} touch-none ${isPanMode ? 'cursor-grab active:cursor-grabbing' : ''}`}
        style={{ aspectRatio: resolution ? `${resolution.width}/${resolution.height}` : 'auto' }}
        {...(interactionHandlers || {})}
      >
        {loading ? (
          <div className="text-center absolute inset-0 flex flex-col items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
            <p className="text-gray-400 animate-pulse">{t('generatingButton')}</p>
          </div>
        ) : error ? (
          <div className="text-red-400 p-4 text-center max-w-md absolute inset-0 flex flex-col items-center justify-center">
            <p className="font-bold mb-2">⚠️ {t('errorTitle')}</p>
            <p className="text-sm">{error}</p>
          </div>
        ) : apiResult.imageUrl ? (
          <div 
            style={{ 
                transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)`, 
                transition: interactionHandlers ? 'none' : 'transform 0.1s ease-out',
                transformOrigin: 'center',
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }} 
            className="relative"
          >
            <div className="relative group">
                <img
                src={isComparing && originalImageSrc ? originalImageSrc : apiResult.imageUrl}
                alt="Result"
                draggable={false}
                className="max-w-none max-h-none shadow-2xl pointer-events-none" 
                style={{ 
                    display: 'block',
                    width: resolution ? `${resolution.width}px` : 'auto',
                    height: resolution ? `${resolution.height}px` : 'auto'
                }}
                />
                {isComparing && (
                    <div className="absolute top-4 left-4 bg-black/70 text-white text-xs px-2 py-1 rounded pointer-events-none">
                        Original
                    </div>
                )}
            </div>
          </div>
        ) : (
          <div className="text-center text-gray-500 absolute inset-0 flex flex-col items-center justify-center">
            <ImageIcon className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium text-gray-300">{t('initialResultTitle')}</h3>
            <p className="text-sm">{t('initialResultSubtitle')}</p>
          </div>
        )}
      </div>

      {/* Action Bar */}
      <div className="flex flex-wrap gap-3 mt-2">
        {apiResult.imageUrl && !loading && (
            <>
                <div className="flex bg-gray-700 rounded-lg p-1 border border-gray-600">
                    <button 
                        onClick={() => setDownloadFormat('png')} 
                        className={`px-3 py-2 text-xs font-bold rounded-md transition-colors ${downloadFormat === 'png' ? 'bg-gray-600 text-white shadow-sm' : 'text-gray-400 hover:text-gray-200'}`}
                    >
                        PNG
                    </button>
                    <button 
                        onClick={() => setDownloadFormat('jpg')} 
                        className={`px-3 py-2 text-xs font-bold rounded-md transition-colors ${downloadFormat === 'jpg' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-400 hover:text-gray-200'}`}
                    >
                        JPG
                    </button>
                </div>

                <button
                    onClick={handleDownload}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transform active:scale-95"
                >
                    <DownloadIcon className="w-5 h-5" />
                    {t('downloadButton')}
                </button>

                <button
                    onClick={onEditResult}
                    className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transform active:scale-95"
                >
                    <EditIcon className="w-5 h-5" />
                    {t('editResultButton')}
                </button>

                {originalImageSrc && (
                    <button
                        onMouseDown={() => setIsComparingLocal(true)}
                        onMouseUp={() => setIsComparingLocal(false)}
                        onMouseLeave={() => setIsComparingLocal(false)}
                        onTouchStart={() => setIsComparingLocal(true)}
                        onTouchEnd={() => setIsComparingLocal(false)}
                        className="bg-gray-700 hover:bg-gray-600 text-gray-300 font-bold p-3 rounded-xl transition-colors shadow-lg active:bg-gray-500"
                        title={t('compareButton')}
                    >
                        <CompareIcon className="w-5 h-5" />
                    </button>
                )}
            </>
        )}
      </div>
    </div>
  );
};