import React from 'react';
import type { ApiResult, TFunction } from '../types';
import { ImageIcon, DownloadIcon, EditIcon } from './Icons';

interface ResultDisplayProps {
  loading: boolean;
  error: string | null;
  apiResult: ApiResult;
  t: TFunction;
  onEditResult: () => void;
}

export const ResultDisplay: React.FC<ResultDisplayProps> = ({ loading, error, apiResult, t, onEditResult }) => {

  const handleDownload = () => {
    if (!apiResult.imageUrl) return;
    
    const link = document.createElement('a');
    link.href = apiResult.imageUrl;
    link.download = `ivan-ai-photo.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col flex-grow w-full h-full min-h-[400px] justify-center items-center bg-gray-900/50 rounded-lg p-4">
      {loading && (
        <div className="flex flex-col items-center text-gray-400">
          <svg className="animate-spin h-12 w-12 text-purple-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="mt-4 text-lg font-semibold">{t('generatingButton')}</p>
        </div>
      )}
      {error && (
        <div className="text-center text-red-400">
          <h3 className="text-xl font-bold mb-2">{t('errorTitle')}</h3>
          <p className="bg-red-900/50 p-3 rounded-md">{error}</p>
        </div>
      )}
      {!loading && !error && !apiResult.imageUrl && !apiResult.text && (
        <div className="text-center text-gray-500">
          <ImageIcon className="w-20 h-20 mx-auto mb-4" />
          <h3 className="text-xl font-semibold">{t('initialResultTitle')}</h3>
          <p>{t('initialResultSubtitle')}</p>
        </div>
      )}
      {!loading && !error && (apiResult.imageUrl || apiResult.text) && (
        <div className="w-full h-full flex flex-col gap-4">
          {apiResult.imageUrl && (
            <div className="flex flex-col items-center gap-4 w-full">
              <div className="relative w-full aspect-square bg-black rounded-lg overflow-hidden">
                <img src={apiResult.imageUrl} alt="Generated result" className="w-full h-full object-contain" />
              </div>
              <div className="flex flex-wrap items-center justify-center gap-4">
                <button
                    onClick={onEditResult}
                    className="flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-6 rounded-lg transition-all duration-300 transform hover:scale-105"
                  >
                    <EditIcon className="w-5 h-5" />
                    <span>{t('editResultButton')}</span>
                </button>
                <button
                    onClick={handleDownload}
                    className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-lg transition-all duration-300 transform hover:scale-105"
                  >
                    <DownloadIcon className="w-5 h-5" />
                    <span>{t('downloadButton')}</span>
                </button>
              </div>
            </div>
          )}
          {apiResult.text && (
            <div className="bg-gray-700/50 p-4 rounded-lg mt-4">
              <p className="text-gray-300 whitespace-pre-wrap">{apiResult.text}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};