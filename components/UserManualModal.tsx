
import React, { useState } from 'react';
import type { TFunction } from '../types';
import { 
    CloseIcon, SparklesIcon, BookOpenIcon, 
    CommandLineIcon, UserCircleIcon, MagicWandIcon, ImageIcon, StampIcon, FlipVerticalIcon,
    VideoCameraIcon, BrushIcon, ArrowsPointingOutIcon, TextIcon, KeyIcon, RefreshIcon
} from './Icons';

interface AccordionItemProps {
    title: string;
    icon: React.FC<any>;
    children: React.ReactNode;
    isOpen: boolean;
    onToggle: () => void;
    accentColor?: string;
}

const AccordionItem: React.FC<AccordionItemProps> = ({ title, icon: Icon, children, isOpen, onToggle, accentColor = "purple" }) => {
    const colorMap: Record<string, string> = {
        purple: "bg-purple-500/10 text-purple-400",
        blue: "bg-blue-500/10 text-blue-400",
        green: "bg-green-500/10 text-green-400",
        cyan: "bg-cyan-500/10 text-cyan-400",
        red: "bg-red-500/10 text-red-400",
        yellow: "bg-yellow-500/10 text-yellow-400",
    };

    return (
        <div className="border border-gray-700/50 rounded-xl overflow-hidden mb-2 bg-gray-900/20 transition-all duration-300">
            <button 
                onClick={onToggle}
                className="w-full p-3.5 flex items-center justify-between hover:bg-gray-700/30 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <div className={`p-1.5 rounded-lg ${colorMap[accentColor] || colorMap.purple}`}>
                        <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-bold text-gray-200">{title}</span>
                </div>
                <span className={`text-gray-600 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                </span>
            </button>
            <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isOpen ? 'max-h-[800px] border-t border-gray-800/50' : 'max-h-0'}`}>
                <div className="p-4 text-xs text-gray-400 leading-relaxed space-y-3">
                    {children}
                </div>
            </div>
        </div>
    );
};

interface UserManualModalProps {
    onClose: () => void;
    t: TFunction;
}

export const UserManualModal: React.FC<UserManualModalProps> = ({ onClose, t }) => {
    const [openIndex, setOpenIndex] = useState<number | null>(0);

    const toggleAccordion = (index: number) => {
        setOpenIndex(openIndex === index ? null : index);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/95 backdrop-blur-md animate-fade-in">
            <div className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden border border-gray-700 flex flex-col max-h-[92vh]">
                {/* Header */}
                <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-gray-900/50 flex-shrink-0">
                    <h2 className="text-lg font-black text-white flex items-center gap-2 tracking-tighter">
                        <BookOpenIcon className="w-5 h-5 text-red-500" />
                        Ivan Ai Photo 核心功能指南
                    </h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-white p-1 rounded-full hover:bg-gray-700 transition-colors">
                        <CloseIcon className="w-5 h-5" />
                    </button>
                </div>

                <div className="overflow-y-auto p-4 md:p-6 space-y-8 custom-scrollbar">
                    
                    {/* --- Group 1: AI 創意核心 --- */}
                    <section>
                        <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-3 ml-1">AI 創意發想與優化</h3>
                        
                        <AccordionItem 
                            title="1. AI 提示詞工坊 (10大矩陣風格)" 
                            icon={MagicWandIcon} 
                            isOpen={openIndex === 0} 
                            onToggle={() => toggleAccordion(0)}
                            accentColor="cyan"
                        >
                            <p className="text-gray-300 font-bold">這是本系統最強大的「指令工程師」。透過首頁發光的「Ai提示詞工坊」按鈕進入，包含 10 種專業風格矩陣：</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 border-l-2 border-cyan-500/30 pl-3">
                                <div><b className="text-cyan-400">寫實攝影：</b>鎖定 鏡頭語言，強調真實質感。</div>
                                <div><b className="text-cyan-400">專業人像：</b><span className="underline">嚴格錨定主角臉型</span>，僅更換環境與服裝。</div>
                                <div><b className="text-cyan-400">寵物攝影：</b>捕捉毛孩眼神與毛髮，模擬專業棚拍。</div>
                                <div><b className="text-cyan-400">3D渲染：</b>支援迪士尼、皮克斯或賽博龐克立體風格。</div>
                                <div><b className="text-cyan-400">數位繪畫：</b>包含油畫、水彩、精細素描等藝術表達。</div>
                                <div><b className="text-cyan-400">LINE貼圖：</b>自動生成帶有粗白邊的 8/16 格貼圖草稿。</div>
                                <div><b className="text-cyan-400">商業廣告：</b>產品展示台、名模手持等專業商攝構圖。</div>
                                <div><b className="text-cyan-400">海報設計：</b>預留標題空間，適合電影、活動視覺創作。</div>
                                <div><b className="text-cyan-400">漫畫風格：</b>日本漫畫、美式英雄等多種畫風切換。</div>
                                <div><b className="text-cyan-400">標誌設計：</b>簡約向量、3D 立體等多樣化 Logo 提案。</div>
                            </div>
                        </AccordionItem>

                        <AccordionItem 
                            title="2. AI 優化提示詞 (Refine Prompt)" 
                            icon={SparklesIcon} 
                            isOpen={openIndex === 1} 
                            onToggle={() => toggleAccordion(1)}
                            accentColor="purple"
                        >
                            <p>當您只有簡單想法時，點擊指令輸入框上方的「AI 優化提示詞」按鈕。系統將動用大型語言模型，將您的點子擴充為具備細節描述、光影氣氛的高品質提示詞。 (每次消耗 3 點)</p>
                        </AccordionItem>

                        <AccordionItem 
                            title="3. AI 影片提示詞 (Video Prompt)" 
                            icon={VideoCameraIcon} 
                            isOpen={openIndex === 2} 
                            onToggle={() => toggleAccordion(2)}
                            accentColor="blue"
                        >
                            <p>點擊指令輸入框上方的「AI 影片提示詞」按鈕。它會分析當前圖片並提供 3 種專業的影片製作腳本方案，包含運鏡建議、氛圍描述與聲音設計。 (每次消耗 3 點)</p>
                        </AccordionItem>
                    </section>

                    {/* --- Group 2: 影像生成模式 --- */}
                    <section>
                        <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-3 ml-1">影像生成與變幻</h3>

                        <AccordionItem 
                            title="4. 文生圖功能 (Text-to-Image)" 
                            icon={CommandLineIcon} 
                            isOpen={openIndex === 3} 
                            onToggle={() => toggleAccordion(3)}
                            accentColor="yellow"
                        >
                            <p>在不選擇任何圖片的情況下直接輸入創意描述，並搭配「畫布比例 (僅限文生圖使用)」選單選擇比例，AI 將憑空創造作品。這是從 0 到 1 的創作起點。</p>
                        </AccordionItem>

                        <AccordionItem 
                            title="5. 圖生圖功能 (Image-to-Image)" 
                            icon={ImageIcon} 
                            isOpen={openIndex === 4} 
                            onToggle={() => toggleAccordion(4)}
                            accentColor="green"
                        >
                            <p>上傳圖片後，AI 會參考原圖結構進行編輯。您可以利用畫筆在圖上塗抹紅線（遮罩），指定 AI 僅修改該區域，例如為主角換裝或更換背景。在指令中輸入「圖1」、「圖2」可引用多張圖合成。</p>
                        </AccordionItem>

                        <AccordionItem 
                            title="6. 影像合成工具 (Collage Editor)" 
                            icon={ArrowsPointingOutIcon} 
                            isOpen={openIndex === 5} 
                            onToggle={() => toggleAccordion(5)}
                            accentColor="purple"
                        >
                            <p>點擊縮圖管理區下方的「拼圖佈局」進入。您可以將多張圖片拖入，進行旋轉、鏡像排列形成草圖。完成後點擊「AI 合成」，AI 會將草圖融合為光影一致的完整影像。</p>
                        </AccordionItem>
                    </section>

                    {/* --- Group 3: 專業後製工具 --- */}
                    <section>
                        <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-3 ml-1">專業調色與後製工藝</h3>

                        <AccordionItem 
                            title="7. 專業後製編輯器 (Photo Editor)" 
                            icon={ArrowsPointingOutIcon} 
                            isOpen={openIndex === 6} 
                            onToggle={() => toggleAccordion(6)}
                            accentColor="blue"
                        >
                            <p>點擊已上傳圖片縮圖上的「編輯」圖示進入。提供基礎參數微調：曝光、對比、清晰度、去霧等。內建「一鍵提亮」與「一鍵調暗」快速解決採光問題。</p>
                        </AccordionItem>

                        <AccordionItem 
                            title="8. 光影筆刷 (Light Brush)" 
                            icon={BrushIcon} 
                            isOpen={openIndex === 7} 
                            onToggle={() => toggleAccordion(7)}
                            accentColor="yellow"
                        >
                            <p>在編輯器中切換至「光影筆刷」分頁。可以用筆刷直接在畫面局部「加強白光」、「加強暖光」或進行局部銳化。這非常適合用來強調主角臉部光影，或製作特殊的氛圍感。</p>
                        </AccordionItem>

                        <AccordionItem 
                            title="9. 局部遮罩 (Mask Layers)" 
                            icon={ImageIcon} 
                            isOpen={openIndex === 8} 
                            onToggle={() => toggleAccordion(8)}
                            accentColor="red"
                        >
                            <p>在編輯器中切換至「局部遮罩」分頁。支援筆刷、放射狀漸層與線性漸層遮罩。您可以指定畫面局部變暗或鮮豔，實現極致細膩的調色控制。</p>
                        </AccordionItem>

                        <AccordionItem 
                            title="10. 文字標籤 (Text Overlay)" 
                            icon={TextIcon} 
                            isOpen={openIndex === 9} 
                            onToggle={() => toggleAccordion(9)}
                            accentColor="purple"
                        >
                            <p>在編輯器中切換至「文字標籤」分頁。支援自由新增文字或使用內建範本。可自定義字體、對齊位置（九宮格）、透明度與間距。</p>
                        </AccordionItem>

                        <AccordionItem 
                            title="11. 藝術印章產生器 (Watermark Generator)" 
                            icon={StampIcon} 
                            isOpen={openIndex === 10} 
                            onToggle={() => toggleAccordion(10)}
                            accentColor="red"
                        >
                            <p>點擊縮圖區上方的「藝術印章」進入。模擬傳統印章工藝，提供陰刻、陽刻與手寫等 8 種預設樣式。這讓 AI 藝術作品能擁有傳統藝術的典雅落款。</p>
                        </AccordionItem>

                        <AccordionItem 
                            title="12. AI 詩詞靈感 (AI Poet)" 
                            icon={SparklesIcon} 
                            isOpen={openIndex === 11} 
                            onToggle={() => toggleAccordion(11)}
                            accentColor="yellow"
                        >
                            <p>在藝術印章產生器中，點擊「AI 詩詞靈感」按鈕。系統會根據您的圖片主題，模仿李白、徐志摩等名家風格，自動創作出一首意境優美的配圖詩。 (每次消耗 3 點)</p>
                        </AccordionItem>
                    </section>

                    {/* --- Group 4: 系統營運與支援 --- */}
                    <section>
                        <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-3 ml-1">積分與系統支援</h3>

                        <AccordionItem 
                            title="13. 積分選購方案" 
                            icon={KeyIcon} 
                            isOpen={openIndex === 12} 
                            onToggle={() => toggleAccordion(12)}
                            accentColor="green"
                        >
                            <div className="space-y-4">
                                <p className="text-gray-300">提供以下方案供創作者選擇：</p>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-gray-800 p-3 rounded-xl border border-gray-700">
                                        <div className="text-xs text-gray-500 mb-1">基礎方案</div>
                                        <div className="text-lg font-black text-green-400">500 積分</div>
                                        <div className="text-sm text-white">NT$ 500</div>
                                    </div>
                                    <div className="bg-gray-800 p-3 rounded-xl border border-purple-500/50 relative overflow-hidden">
                                        <div className="absolute top-0 right-0 bg-red-600 text-[8px] px-1.5 py-0.5 font-bold">超值推薦</div>
                                        <div className="text-xs text-gray-500 mb-1">專業方案</div>
                                        <div className="text-lg font-black text-yellow-400">1100 積分</div>
                                        <div className="text-sm text-white">NT$ 1000</div>
                                        <div className="text-[10px] text-purple-300 mt-1">加贈 100 積分！</div>
                                    </div>
                                </div>
                                <div className="bg-yellow-900/30 border border-yellow-500/40 p-3 rounded-lg mt-2">
                                    <p className="text-[11px] text-yellow-200 font-bold leading-relaxed">
                                        ⚠️ 安全提醒：為防止盜用或設定錯誤，系統限制每人最高持有點數上限為 1200 點。請於點數用罄前再進行儲值。
                                    </p>
                                </div>
                                <p className="italic text-[10px] text-gray-500">※ 需要儲值或有任何問題？請透過 LINE 聯繫伊凡。</p>
                            </div>
                        </AccordionItem>

                        <AccordionItem 
                            title="14. 常見問題與錯誤排除" 
                            icon={RefreshIcon} 
                            isOpen={openIndex === 13} 
                            onToggle={() => toggleAccordion(13)}
                            accentColor="red"
                        >
                            <div className="space-y-4">
                                <div className="flex gap-3">
                                    <div className="bg-blue-900/30 text-blue-400 font-mono px-2 py-1 h-fit rounded text-[10px] border border-blue-500/30">429</div>
                                    <div>
                                        <div className="text-sm font-bold text-gray-200">系統忙碌 (Rate Limit)</div>
                                        <p className="text-[11px]">這是因為 Google 伺服器短時間內處理過多請求。請等待約 1-2 分鐘後重新點擊「重試」即可恢復。</p>
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    <div className="bg-blue-900/30 text-blue-400 font-mono px-2 py-1 h-fit rounded text-[10px] border border-blue-500/30">Timeout</div>
                                    <div>
                                        <div className="text-sm font-bold text-gray-200">連線逾時</div>
                                        <p className="text-[11px]">AI 生成高解析度圖片有時需 30 秒以上。若網路環境不穩會導致斷線。建議更換穩定 Wi-Fi 後再試。</p>
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    <div className="bg-blue-900/30 text-blue-400 font-mono px-2 py-1 h-fit rounded text-[10px] border border-blue-500/30">Fail</div>
                                    <div>
                                        <div className="text-sm font-bold text-gray-200">生成失敗扣點</div>
                                        <p className="text-[11px]">若發生極端系統錯誤且已被扣點，請截圖錯誤訊息傳送給管理員，我們將核對後台日誌並為您手動補回積分。</p>
                                    </div>
                                </div>
                            </div>
                        </AccordionItem>
                    </section>

                    {/* Disclaimer */}
                    <section className="bg-red-900/10 border border-red-500/20 p-6 rounded-2xl">
                        <h3 className="text-sm font-bold text-red-400 mb-2 flex items-center gap-2">
                            ⚠️ 重要：AI 的不確定性
                        </h3>
                        <p className="text-xs text-gray-400 leading-relaxed">
                            AI 生成本質上是隨機的。即便輸入相同的指令，每次生成的結果也會有所不同。
                            點數消耗代表購買「雲端算力時間」，<span className="text-red-300">一旦運算開始即無法退回點數</span>，不保證每次風格表現都完全符合您的想像。
                        </p>
                    </section>
                </div>

                <div className="p-4 bg-gray-900/50 border-t border-gray-700 text-center flex-shrink-0">
                    <button 
                        onClick={onClose}
                        className="bg-purple-600 hover:bg-purple-700 text-white font-black text-sm py-2.5 px-12 rounded-full shadow-lg transition-all active:scale-95 uppercase tracking-widest"
                    >
                        我知道了 (Continue)
                    </button>
                </div>
            </div>
        </div>
    );
};
