
import React, { useState, useEffect } from 'react';
import type { TFunction } from '../types';
import { CloseIcon, VideoCameraIcon, SparklesIcon, SaveIcon } from './Icons';
import { generateVideoPrompt } from '../services/geminiService';

interface VideoPromptModalProps {
    imageSrc: string;
    onClose: () => void;
    t: TFunction;
    lang: 'en' | 'zh';
}

export const VideoPromptModal: React.FC<VideoPromptModalProps> = ({ imageSrc, onClose, t, lang }) => {
    const [prompt, setPrompt] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const analyze = async () => {
            setLoading(true);
            try {
                // Convert imageSrc to base64
                const [header, base64Data] = imageSrc.split(',');
                const mimeType = header.match(/:(.*?);/)?.[1] || 'image/png';
                
                const result = await generateVideoPrompt({ base64Data, mimeType }, lang);
                setPrompt(result);
            } catch (e) {
                setPrompt("Error generating prompt.");
            } finally {
                setLoading(false);
            }
        };
        if (imageSrc) analyze();
    }, [imageSrc, lang]);

    const copyToClipboard = () => {
        navigator.clipboard.writeText(prompt);
        alert(t('shareLinkCopied')); // Reusing "Copied" message
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/90 backdrop-blur-sm">
            <div className="bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl border border-gray-700 flex flex-col max-h-[80vh]">
                <div className="flex justify-between items-center p-4 border-b border-gray-700">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <VideoCameraIcon className="w-6 h-6 text-blue-400"/>
                        {t('videoPromptTitle')}
                    </h3>
                    <button onClick={onClose}><CloseIcon className="w-6 h-6 text-gray-400 hover:text-white"/></button>
                </div>
                
                <div className="p-6 flex flex-col md:flex-row gap-6 overflow-hidden">
                    <div className="w-full md:w-1/3 flex-shrink-0">
                        <img src={imageSrc} alt="Source" className="w-full h-auto rounded-lg border border-gray-600 object-cover" />
                    </div>
                    <div className="flex-grow flex flex-col gap-4 h-full">
                        <label className="text-sm font-medium text-gray-300">{t('videoPromptResult')}</label>
                        {loading ? (
                            <div className="flex-grow flex items-center justify-center text-purple-400">
                                <SparklesIcon className="w-8 h-8 animate-spin mr-2"/>
                                {t('videoPromptAnalyze')}...
                            </div>
                        ) : (
                            <textarea 
                                className="flex-grow w-full p-4 bg-gray-900 border border-gray-600 rounded-lg text-gray-200 text-sm leading-relaxed resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                value={prompt}
                                readOnly
                            />
                        )}
                        <button 
                            onClick={copyToClipboard}
                            disabled={loading}
                            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            <SaveIcon className="w-5 h-5"/> {t('copyButton')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
