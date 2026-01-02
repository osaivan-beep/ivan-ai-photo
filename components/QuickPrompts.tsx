
import React, { useState, useEffect } from 'react';
import { EditIcon, SaveIcon } from './Icons';
import type { TFunction } from '../types';

interface QuickPromptsProps {
  prompts: Record<string, string[]>;
  onPromptClick: (prompt: string) => void;
  onPromptsChange: (prompts: Record<string, string[]>) => void;
  t: TFunction;
}

const CATEGORIES = ['birds', 'scenery', 'portrait', 'comprehensive'];

export const QuickPrompts: React.FC<QuickPromptsProps> = ({ prompts, onPromptClick, onPromptsChange, t }) => {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editText, setEditText] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>(() => {
    const lastCategory = localStorage.getItem('activePromptCategory');
    return lastCategory && CATEGORIES.includes(lastCategory) ? lastCategory : 'birds';
  });

  useEffect(() => {
    localStorage.setItem('activePromptCategory', activeCategory);
  }, [activeCategory]);

  const handleEdit = (index: number) => {
    setEditingIndex(index);
    setEditText(prompts[activeCategory][index]);
  };

  const handleSave = (index: number) => {
    const newPromptsForCategory = [...(prompts[activeCategory] || [])];
    newPromptsForCategory[index] = editText;
    const newAllPrompts = {
      ...prompts,
      [activeCategory]: newPromptsForCategory,
    };
    onPromptsChange(newAllPrompts);
    setEditingIndex(null);
    setEditText('');
  };

  const handleKeyDown = (event: React.KeyboardEvent, index: number) => {
    if (event.key === 'Enter') {
      handleSave(index);
    }
  };

  const renderPromptText = (fullText: string) => {
    if (fullText.includes('：')) {
      const parts = fullText.split('：');
      const title = parts[0];
      const content = parts.slice(1).join('：');
      return (
        <span className="leading-tight block">
          <span className="text-purple-400 font-black tracking-tight">{title}：</span>
          <span className="text-gray-300 font-medium opacity-90">{content}</span>
        </span>
      );
    }
    return <span className="text-gray-300 font-medium">{fullText}</span>;
  };

  const currentPrompts = prompts[activeCategory] || [];

  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest">{t('quickPromptsLabel')}</h3>
      </div>
      <div className="flex flex-wrap gap-2 mb-4 p-2 bg-gray-900/50 rounded-xl border border-gray-700/50">
        {CATEGORIES.map((category) => (
          <button
            key={category}
            onClick={() => setActiveCategory(category)}
            className={`flex-grow text-xs font-black py-2.5 px-3 rounded-lg transition-all uppercase tracking-tighter ${
              activeCategory === category
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200 border border-transparent'
            }`}
          >
            {t(`${category}Category` as any)}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {currentPrompts.map((prompt, index) => (
          <div key={`${activeCategory}-${index}`} className="relative group">
            {editingIndex === index ? (
              <div className="flex items-center">
                <input
                  type="text"
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, index)}
                  className="w-full text-sm p-3 pr-12 bg-gray-900 border-2 border-purple-500 rounded-xl focus:ring-0 text-gray-100 shadow-inner"
                  autoFocus
                  onBlur={() => handleSave(index)}
                />
                <button
                  onClick={() => handleSave(index)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-green-400 hover:scale-110 transition-transform"
                >
                  <SaveIcon className="w-6 h-6" />
                </button>
              </div>
            ) : (
              <div className="relative">
                <button
                  onClick={() => onPromptClick(prompt)}
                  className="w-full h-full text-left text-sm bg-gray-800/80 hover:bg-gray-700/90 border border-gray-700/50 hover:border-purple-500/50 text-gray-300 py-3.5 px-4 rounded-xl transition-all duration-300 shadow-sm hover:shadow-md active:scale-[0.98]"
                >
                  {renderPromptText(prompt)}
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleEdit(index); }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-gray-900/80 rounded-lg text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity hover:text-purple-400 border border-gray-700 shadow-xl"
                  aria-label="Edit prompt"
                >
                  <EditIcon className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
