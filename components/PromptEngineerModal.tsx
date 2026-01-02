
import React, { useState } from 'react';
import type { TFunction, VideoPromptResultScheme } from '../types';
import { CloseIcon, SparklesIcon, CommandLineIcon, SaveIcon, RefreshIcon, MagicWandIcon, BookOpenIcon, ImageIcon, SearchIcon, UploadIcon } from './Icons';
import { callBackendGemini } from '../services/geminiService';

interface PromptEngineerModalProps {
    onClose: () => void;
    onApply: (prompt: string, aspectRatio?: string) => void;
    initialAspectRatio: string;
    t: TFunction;
    lang: 'en' | 'zh';
    userCredits: number;
    onDeductCredits: (amount: number) => void;
}

interface CategoryOption {
    id: string;
    name: string;
    icon: string;
    description: string;
    details: {
        label: string;
        options: { id: string; name: string; prompt: string; negative?: string }[];
    }[];
}

const RATIO_OPTIONS = [
    { id: '2:3', name: '直式 (2:3)', icon: '📱' },
    { id: '1:1', name: '正方形 (1:1)', icon: '🔳' },
    { id: '3:2', name: '橫式 (3:2)', icon: '💻' },
    { id: '9:16', name: '手機全屏 (9:16)', icon: '↕️' },
    { id: '16:9', name: '寬螢幕 (16:9)', icon: '📺' }
];

const MATRIX_CATEGORIES: CategoryOption[] = [
    {
        id: 'photo',
        name: '寫實攝影 / Photorealistic',
        icon: '📸',
        description: '極致寫真的攝影風格，嚴格保持主體真實性，不改變原圖姿勢。',
        details: [
            {
                label: '鏡頭選擇',
                options: [
                    { id: 'fisheye', name: '魚眼 (Fisheye)', prompt: 'Ultra-wide fisheye lens, spherical distortion, dynamic perspective.' },
                    { id: 'wide', name: '廣角 (Wide)', prompt: 'Wide angle photography, vast landscape view, deep depth of field.' },
                    { id: 'zoom', name: '變焦 (Standard)', prompt: 'Standard zoom lens, natural human-eye perspective, balanced composition.' },
                    { id: 'tele', name: '長焦 (Telephoto)', prompt: 'Telephoto lens photography, compressed background, sharp focus on distant subject.' },
                    { id: 'macro', name: '微距 (Macro)', prompt: 'Macro photography, extreme close-up, microscopic details, very shallow depth of field.' },
                    { id: 'portrait', name: '人像 (Portrait)', prompt: 'Portrait prime lens, 85mm aesthetic, soft creamy bokeh, sharp facial features.' },
                ]
            },
            {
                label: '氛圍光影',
                options: [
                    { id: 'golden', name: '晨昏 (Golden)', prompt: 'Golden hour lighting, warm orange glow, long dramatic shadows, soft backlight.' },
                    { id: 'sunny', name: '晴天 (Sunny)', prompt: 'Bright sunny daylight, clear blue sky, high contrast, vivid natural colors.' },
                    { id: 'rainy', name: '雨天 (Rainy)', prompt: 'Rainy mood, overcast sky, reflective wet surfaces, misty atmosphere, cool tones.' },
                    { id: 'studio', name: '攝影棚 (Studio)', prompt: 'Professional studio lighting, high-key setup, clean controlled shadows, elegant highlight.' },
                    { id: 'soft', name: '柔光 (Soft)', prompt: 'Soft diffused light, gentle highlights, low contrast, calming and flattering mood.' },
                    { id: 'night', name: '夜晚 (Night)', prompt: 'Night photography, low light aesthetic, artificial light sources, high ISO texture, moody cinematic darkness.' },
                ]
            },
            {
                label: '背景環境',
                options: [
                    { id: 'original', name: '原背景', prompt: 'Maintain the original background environment from the reference image.' },
                    { id: 'green-bokeh', name: '模糊綠散景', prompt: 'Lush blurred green bokeh background, creamy out-of-focus highlights, soft natural green circles.' },
                    { id: 'grassland', name: '模糊綠草原', prompt: 'Softly blurred vast green grassland in the background, clean minimalist natural horizon.' },
                    { id: 'forest', name: '森林背景', prompt: 'Dense ancient forest background, dappled sunlight filtering through leaves, rich woodland textures.' },
                    { id: 'wonderland', name: '夢幻仙境', prompt: 'Dreamy magical wonderland background, ethereal glowing particles, soft mystical atmosphere.' },
                    { id: 'landscape', name: '自然風景', prompt: 'Breath-taking natural landscape background, wide scenic view of mountains and valleys.' },
                ]
            }
        ]
    },
    {
        id: 'pro-portrait',
        name: '專業人像 / Pro Portrait',
        icon: '👤',
        description: '固定 85mm f/1.2，嚴格保留原主角臉型與五官，自動清理配件並換裝。',
        details: [
            {
                label: '服裝造型',
                options: [
                    { id: 'casual', name: '時尚休閒', prompt: 'wearing clean stylish casual wear, modern fashion aesthetic. (CRITICAL: REMOVE all existing hats, backpacks, arm sleeves, and bags from the person)' },
                    { id: 'business', name: '專業商務', prompt: 'wearing a professional high-end business suit, elite corporate look. (CRITICAL: REMOVE all existing hats, backpacks, arm sleeves, and bags from the person)' },
                    { id: 'vintage', name: '復古經典', prompt: 'wearing vintage 1950s cinematic fashion style, classic elegance. (CRITICAL: REMOVE all existing hats, backpacks, arm sleeves, and bags from the person)' },
                    { id: 'sporty', name: '運動活力', prompt: 'wearing dynamic athletic sportswear, high-performance aesthetic. (CRITICAL: REMOVE all existing hats, backpacks, arm sleeves, and bags from the person)' },
                    { id: 'hanfu', name: '傳統古風', prompt: 'wearing exquisite traditional Hanfu, flowing silk fabrics, intricate embroidery. (CRITICAL: REMOVE all existing hats, backpacks, arm sleeves, and bags from the person)' },
                    { id: 'wedding', name: '唯美婚紗', prompt: 'wearing a breathtaking luxury white wedding dress, delicate lace details. (CRITICAL: REMOVE all existing hats, backpacks, arm sleeves, and bags from the person)' },
                    { id: 'high-fashion', name: '高定禮服', prompt: 'wearing an avant-garde high fashion gown, red carpet aesthetic. (CRITICAL: REMOVE all existing hats, backpacks, arm sleeves, and bags from the person)' },
                    { id: 'cyberpunk', name: '科幻未來', prompt: 'wearing cyberpunk techwear, glowing accents, futuristic silhouette. (CRITICAL: REMOVE all existing hats, backpacks, arm sleeves, and bags from the person)' },
                ]
            },
            {
                label: '氛圍光影',
                options: [
                    { id: 'golden', name: '晨昏 (Golden)', prompt: 'Golden hour lighting, warm orange glow, long soft shadows, backlit silhouette.' },
                    { id: 'sunny', name: '晴天 (Sunny)', prompt: 'Bright vibrant sunlight, high-end outdoor photography lighting.' },
                    { id: 'rainy', name: '雨天 (Rainy)', prompt: 'Moody rainy day lighting, soft reflections, misty cool tones.' },
                    { id: 'studio', name: '攝影棚 (Studio)', prompt: 'Professional studio 3-point lighting setup, high-key elegance.' },
                    { id: 'soft', name: '柔光 (Soft)', prompt: 'Diffused window light, soft wrap-around lighting, gentle highlights.' },
                    { id: 'night', name: '夜晚 (Night)', prompt: 'Cinematic night street lighting, neon bokeh, dramatic contrast.' },
                    { id: 'dreamy', name: '夢幻 (Dreamy)', prompt: 'Ethereal glowing light, soft hazy atmosphere, pastel color palette.' },
                    { id: 'wedding-light', name: '婚攝 (Wedding)', prompt: 'Romantic soft wedding photography lighting, sparkling highlights.' },
                ]
            },
            {
                label: '背景環境',
                options: [
                    { id: 'original', name: '原背景', prompt: 'Maintain the original background context from the image.' },
                    { id: 'green-bokeh', name: '模糊綠散景', prompt: 'Background is lush blurred green foliage bokeh.' },
                    { id: 'wonderland', name: '夢幻仙境', prompt: 'Background is an ethereal magical forest wonderland with floating particles.' },
                    { id: 'landscape', name: '自然風景', prompt: 'Background is a majestic mountain landscape, epic scale.' },
                    { id: 'fairy-garden', name: '仙境花園', prompt: 'Background is a blooming vibrant flower garden, lush floral surroundings.' },
                    { id: 'lake', name: '夢幻湖邊', prompt: 'Background is a serene crystal clear lakeside with mountain reflections.' },
                    { id: 'city', name: '城市街道', prompt: 'Background is a modern chic city street, urban aesthetic.' },
                    { id: 'beach', name: '沙灘海邊', prompt: 'Background is a tropical beach at sunset, soft waves and golden sand.' },
                ]
            }
        ]
    },
    {
        id: 'pet-photo',
        name: '寵物攝影 / Pet Photo',
        icon: '🐾',
        description: '專屬毛孩的寫真模式，完美捕捉品種特徵、毛髮質感與靈動神韻。',
        details: [
            {
                label: '動物姿勢',
                options: [
                    { id: 'sitting', name: '坐姿乖巧', prompt: 'sitting obediently, elegant pet posture, looking directly at the camera with sparkling eyes.' },
                    { id: 'running', name: '飛奔跳躍', prompt: 'running forward with joy, paws off the ground, ears flapping in the wind, dynamic action shot.' },
                    { id: 'head-tilt', name: '歪頭殺', prompt: 'adorable head tilt, curious expression, large expressive eyes, extremely cute mood.' },
                    { id: 'lying', name: '側臥懶散', prompt: 'lying lazily on the side, relaxed paws, peaceful and cozy expression.' },
                    { id: 'high-five', name: '擊掌拍拍', prompt: 'raising one paw as if giving a high five, interactive playful gesture.' },
                    { id: 'look-up', name: '仰望天空', prompt: 'gazing upwards towards the sky, cinematic low angle, heroic lighting on fur.' },
                    { id: 'peeking', name: '好奇探頭', prompt: 'peeking curiously from behind an object, playful and mysterious pet mood.' },
                    { id: 'tongue', name: '舔舌賣萌', prompt: 'tongue sticking out slightly, playful and happy face, capturing a candid moment.' },
                ]
            },
            {
                label: '環境背景',
                options: [
                    { id: 'lawn', name: '陽光草皮', prompt: 'in a lush green sun-drenched lawn, soft grass texture, natural outdoor sunlight.' },
                    { id: 'autumn', name: '秋日楓林', prompt: 'surrounded by fallen orange maple leaves in an autumn forest, warm seasonal tones.' },
                    { id: 'studio', name: '專業攝影棚', prompt: 'in a professional pet photography studio, clean solid color background, soft 3-point lighting.' },
                    { id: 'beach', name: '浪漫海灘', prompt: 'on a soft sandy beach at golden hour, gentle waves in the background, warm glow.' },
                    { id: 'snow', name: '雪地冒險', prompt: 'standing in pure white snow, snowflakes falling gently, winter wonderland aesthetic.' },
                    { id: 'living-room', name: '溫馨客廳', prompt: 'in a cozy warm modern living room, soft rug, domestic ambient lighting.' },
                    { id: 'forest', name: '神祕森林', prompt: 'in a misty magical forest, sunbeams filtering through trees, mossy ground.' },
                    { id: 'city', name: '都市街道', prompt: 'on a chic city street, urban bokeh background, modern street style.' },
                ]
            },
            {
                label: '動物裝飾',
                options: [
                    { id: 'none', name: '無裝飾', prompt: 'maintaining natural fur appearance. (REMOVE all existing clothes/hats)' },
                    { id: 'bowtie', name: '時尚領結', prompt: 'wearing a classy stylish red bowtie, dapper pet fashion. (REMOVE old collars)' },
                    { id: 'flower', name: '可愛花圈', prompt: 'wearing a delicate flower crown made of fresh daisies, ethereal aesthetic.' },
                    { id: 'sunglasses', name: '帥氣墨鏡', prompt: 'wearing miniature cool aviator sunglasses, reflective lenses, boss mood.' },
                    { id: 'party-hat', name: '派對帽', prompt: 'wearing a colorful birthday party hat, festive and joyful atmosphere.' },
                    { id: 'scarf', name: '針織圍巾', prompt: 'wearing a cozy knitted winter scarf, warm and soft texture.' },
                    { id: 'cloak', name: '偵探斗篷', prompt: 'wearing a tiny detective cape, mysterious and clever look.' },
                    { id: 'backpack', name: '小小背包', prompt: 'wearing a miniature functional pet backpack, ready for adventure.' },
                ]
            }
        ]
    },
    {
        id: 'cinema3d',
        name: '3D 電影級渲染 / Cinematic 3D',
        icon: '💎',
        description: '包含極致寫實、迪士尼、皮克斯等多種渲染風格。',
        details: [
            {
                label: '3D 渲染風格',
                options: [
                    { id: 'hyper', name: '極致寫實', prompt: 'Hyper-realistic 3D render, raytracing, 8k.' },
                    { id: 'disney', name: '迪士尼風格', prompt: 'Disney movie animation 3D style, big eyes, warm lighting.' },
                    { id: 'pixar', name: '皮克斯風格', prompt: 'Pixar 3D style, expressive textures, detailed fur.' },
                    { id: 'cyber', name: '賽博龐克', prompt: 'Cyberpunk 3D environment, neon lights, foggy streets.' },
                    { id: 'wasteland', name: '廢土/末日', prompt: 'Post-apocalyptic wasteland 3D style, rusty, gritty.' },
                    { id: 'dark', name: '暗黑幻想', prompt: 'Dark fantasy 3D style, moody, high contrast.' },
                    { id: 'oil', name: '油畫/塗抹', prompt: '3D oil painting texture, painterly brush strokes.' },
                    { id: 'jp3d', name: '日式賽璐珞', prompt: 'NPR Cel-shaded 3D anime style.' },
                ]
            }
        ]
    },
    {
        id: 'digital',
        name: '數位繪畫 / Digital Art',
        icon: '🎨',
        description: '油畫、水彩 or 現代概念藝術風格。',
        details: [
            {
                label: '繪畫風格',
                options: [
                    { id: 'oil', name: '古典油畫', prompt: 'Classical oil painting style, rich textures, visible brushstrokes.' },
                    { id: 'watercolor', name: '浪漫水彩', prompt: 'Soft watercolor style, fluid translucent washes, paper texture.' },
                    { id: 'ink', name: '手寫水墨', prompt: 'Traditional ink wash painting style, minimalist, elegant brushwork.' },
                    { id: 'sketch', name: '精細素描', prompt: 'Detailed pencil sketch art, fine lines, shading and hatching.' },
                    { id: 'concept', name: '概念藝術', prompt: 'Digital concept art style, cinematic environment design, epic scale.' },
                    { id: 'abstract', name: '現代抽象', prompt: 'Modern abstract art style, bold colors, geometric shapes, expressive.' },
                ]
            }
        ]
    },
    {
        id: 'stickers',
        name: 'LINE 貼圖 / Stickers',
        icon: '😊',
        description: '貼圖專用格式，支援單張或多張表情包排版。',
        details: [
            {
                label: '貼圖張數',
                options: [
                    { id: 'single', name: '單張 (Single)', prompt: 'Single cute sticker character, thick white border, vibrant vector illustration.' },
                    { id: '8', name: '8張 (Sheet)', prompt: 'Sticker sheet with 8 varied expressions, thick white borders, consistent character design.' },
                    { id: '16', name: '16張 (Sheet)', prompt: 'Sticker sheet with 16 varied expressions, consistent style.' },
                ]
            }
        ]
    },
    {
        id: 'ads',
        name: '商業廣告 / Advertisement',
        icon: '🛍️',
        description: '專業產品展示，包含手模、模特兒與展示場景。',
        details: [
            {
                label: '展示模式',
                options: [
                    { id: 'hand', name: '手部展示 (Hand)', prompt: 'Hand holding the product, focus on detail, luxury commercial photography lighting.' },
                    { id: 'model', name: '模特兒 (Model)', prompt: 'High-end fashion model showcasing product, elite studio lighting, depth of field.' },
                    { id: 'podium', name: '展示台 (Podium)', prompt: 'Product placed on professional podium, symmetrical composition.' },
                ]
            },
            {
                label: '背景模式',
                options: [
                    { id: 'white', name: '極簡白底', prompt: 'Clean minimalist white studio background, soft shadows, high-key photography.' },
                    { id: 'wood', name: '木紋質感', prompt: 'Natural warm wood texture background, organic wooden surface, rustic aesthetic.' },
                    { id: 'silk', name: '柔滑絲綢', prompt: 'Luxurious smooth flowing silk background, elegant fabric drapes, soft sheen.' },
                    { id: 'darkwood', name: '深黑沉木', prompt: 'Dark sophisticated ebony wood background, deep moody textures, premium feel.' },
                    { id: 'steel', name: '不鏽鋼材', prompt: 'Industrial stainless steel background, brushed metal texture, modern cold tones.' },
                    { id: 'stone', name: '造型石材', prompt: 'Architectural decorative stone background, natural rock texture, solid and grounded.' },
                    { id: 'glass', name: '玻璃材質', prompt: 'Elegant translucent glass background, subtle reflections and refractions, airy aesthetic.' },
                    { id: 'runway', name: '伸展舞台', prompt: 'Professional high-fashion runway background, fashion show catwalk perspective, dramatic spotlights, cinematic stage lighting with elegant audience silhouettes in shadows.' },
                ]
            }
        ]
    },
    {
        id: 'poster',
        name: '海報設計 / Poster',
        icon: '🪧',
        description: '電影、活動或產品宣傳海報，強調構圖與排版。',
        details: [
            {
                label: '海報類型',
                options: [
                    { id: 'movie', name: '電影海報', prompt: 'Cinematic movie poster with title space.' },
                    { id: 'event', name: '活動宣傳', prompt: 'Event promotion poster, bold colors.' },
                    { id: 'comm', name: '商業產品', prompt: 'Clean commercial product poster.' },
                ]
            }
        ]
    },
    {
        id: 'manga',
        name: '漫畫風格 / Manga Style',
        icon: '✒️',
        description: '強調線條、分鏡與構圖張力，支援多種畫風與格式切換。',
        details: [
            {
                label: '畫風流派',
                options: [
                    { id: 'jp', name: '日本漫畫', prompt: 'Classic Japanese anime manga style, ink line art, professional screentones.' },
                    { id: 'girl', name: '少女漫畫', prompt: 'Shoujo manga style, sparkling eyes, delicate line work, romantic motifs.' },
                    { id: 'wuxia', name: '武俠漫畫', prompt: 'Traditional Wuxia manhwa style, dynamic brushwork, cinematic martial arts action.' },
                    { id: 'us', name: '美式漫畫', prompt: 'American comic book style, bold ink outlines, vibrant pop colors, halftone patterns.' },
                    { id: 'kr', name: '韓國漫畫', prompt: 'Korean manhwa webtoon style, clean digital coloring, modern webtoon aesthetic.' },
                    { id: 'kids', name: '兒童漫畫', prompt: 'Cute children\'s comic book style, simple clean lines, bright flat colors, friendly character designs.' },
                    { id: 'pixel', name: '像素風格', prompt: '16-bit retro pixel art style, classic gaming aesthetic.' },
                    { id: 'original', name: '原生圖片', prompt: 'Maintain original image style while adapting to comic panel structures.' },
                ]
            },
            {
                label: '漫畫格式',
                options: [
                    { id: 'single', name: '單幅插畫', prompt: 'Full-page single illustration comic style.' },
                    { id: '4koma', name: '四格漫畫', prompt: '4-panel vertical comic strip layout (4-koma style).' },
                    { id: '6grid', name: '六格漫畫', prompt: '6-panel structured comic grid layout.' },
                    { id: 'page8', name: '頁漫(8格)', prompt: 'Standard comic page with 8 varied dynamic panels.' },
                    { id: 'page10', name: '頁漫(10格)', prompt: 'Complex manga page with 10 detailed panels.' },
                    { id: 'cover', name: '漫畫封面', prompt: 'Manga volume cover design, artistic composition with space for titles.' },
                ]
            },
            {
                label: '色彩模式',
                options: [
                    { id: 'bw', name: '黑白', prompt: 'Classic B&W manga style, grayscale with professional screentones.' },
                    { id: 'color', name: '全彩', prompt: 'Full color digital illustration comic style.' },
                ]
            }
        ]
    },
    {
        id: 'logo',
        name: '標誌設計 / Logo Design',
        icon: '💠',
        description: '簡約、向量風格，適合品牌與圖標設計。',
        details: [
            {
                label: 'Logo 風格',
                options: [
                    { id: 'line', name: '線條', prompt: 'Minimalist line art logo design, clean vector lines.' },
                    { id: 'sketch', name: '素描', prompt: 'Detailed pencil sketch logo design, artistic hand-drawn aesthetic, graphite textures.' },
                    { id: 'illustration', name: '插畫', prompt: 'Stylized illustration logo, artistic graphics, creative character or object drawing.' },
                    { id: 'cartoon', name: '卡通', prompt: 'Fun cartoon mascot logo, bold outlines, vibrant colors, expressive design.' },
                    { id: '3d', name: '3D立體', prompt: '3D isometric logo design, realistic lighting and depth, modern tactile feel.' },
                    { id: 'artistic', name: '藝術', prompt: 'Creative abstract artistic logo, unique shapes, painterly style or conceptual art.' },
                    { id: 'cute', name: '可愛', prompt: 'Cute kawaii style logo, soft edges, charming minimalist design, playful mood.' },
                ]
            }
        ]
    }
];

export const PromptEngineerModal: React.FC<PromptEngineerModalProps> = ({ onClose, onApply, initialAspectRatio, t, lang, userCredits, onDeductCredits }) => {
    const [selectedCategory, setSelectedCategory] = useState(MATRIX_CATEGORIES[0]);
    const [selections, setSelections] = useState<Record<string, string>>({});
    const [currentRatio, setCurrentRatio] = useState(initialAspectRatio);
    const [userInput, setUserInput] = useState('');
    const [includeText, setIncludeText] = useState(true);
    const [generatedPrompt, setGeneratedPrompt] = useState('');
    const [loading, setLoading] = useState(false);
    const [refImage, setRefImage] = useState<string | null>(null);
    const [refFileContent, setRefFileContent] = useState<string | null>(null);
    const [refFileName, setRefFileName] = useState<string | null>(null);

    const handleSelectOption = (groupLabel: string, optionId: string) => {
        setSelections(prev => ({ ...prev, [groupLabel]: optionId }));
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => setRefImage(event.target?.result as string);
            reader.readAsDataURL(file);
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setRefFileName(file.name);
            const reader = new FileReader();
            reader.onload = (event) => setRefFileContent(event.target?.result as string);
            reader.readAsText(file);
        }
    };

    const handleGenerate = async () => {
        const cost = 3;
        if (userCredits < cost) {
            alert(t('notEnoughCredits') + ` (Need ${cost})`);
            return;
        }

        setLoading(true);
        try {
            const activeOptions = selectedCategory.details.map(group => {
                const selectedId = selections[group.label];
                return group.options.find(o => o.id === selectedId) || group.options[0];
            });

            const selectionContext = activeOptions.map(o => o.prompt).join(' ');
            
            // Optimized logic for different categories
            const isPhoto = selectedCategory.id === 'photo';
            const isProPortrait = selectedCategory.id === 'pro-portrait';
            const isPetPhoto = selectedCategory.id === 'pet-photo';
            
            let extraInstructions = "";
            if (isPhoto) {
                extraInstructions = "CRITICAL: Maintain absolute consistency for the subject. DO NOT CHANGE the subject's posture, skeletal position, or physical shape from the reference image.";
            } else if (isProPortrait) {
                extraInstructions = `
                CRITICAL IDENTITY ANCHOR: The person from the reference image is the ABSOLUTE anchor. 
                1. DO NOT describe the face, eyes, nose, or mouth of the person in detail. 
                2. Explicitly instruct the AI to anchor all facial features, face shape, and identity directly from the provided reference image.
                3. USE 85mm f/1.2 prime lens for extreme shallow depth of field and professional portrait bokeh. 
                4. REMOVE ALL original accessories (hat, backpacks, sleeves, etc.) before applying the new styling.
                5. The person's identity and facial structure must remain 100% unchanged.
                `;
            } else if (isPetPhoto) {
                extraInstructions = `
                CRITICAL BREED PRESERVATION: The animal's breed, fur color pattern, and physical identity from the reference image MUST remain 100% unchanged.
                1. Focus on high-end animal photography aesthetics: sharp fur detail, clear catchlights in eyes, and professional background integration.
                2. If a decoration is chosen, REMOVE all original clothing or collars from the animal before applying the new decoration.
                3. Use appropriate pet-focused lenses: 85mm f/1.2 or macro for close-ups.
                4. DO NOT change the species or basic body shape of the pet.
                `;
            }

            const systemInstruction = `
            You are a professional AI Prompt Engineer for Image Generation.
            Category: ${selectedCategory.name}
            Technical Selection Context: ${selectionContext}
            Target Aspect Ratio: ${currentRatio}
            User Idea: ${userInput}
            Include Auto-Text: ${includeText ? 'YES' : 'NO'}
            ${extraInstructions}
            
            Requirements:
            1. Output ONLY the refined prompt text.
            2. Incorporation specific terminology for the category.
            3. Make the language evocative and professional.
            4. **IDENTITY PRESERVATION**: Prioritize the visual reference for the subject's identity (person or pet). Do not generate a new face or a different breed.
            
            5. **AUTO-TEXT DESIGN LOGIC**: 
               If "Include Auto-Text" is YES, create a high-impact headline in Traditional Chinese (繁體中文).
               If "Include Auto-Text" is NO, explicitly instruct NO TEXT.

            6. **CRITICAL LANGUAGE**: Specify all visible text in **Traditional Chinese (繁體中文)**.
            ${lang === 'zh' ? 'IMPORTANT: You MUST output the entire final prompt description in Traditional Chinese (繁體中文).' : 'Output completely in English.'}
            `;

            const parts: any[] = [{ text: "Please engineer a high-quality prompt based on my input and choices." }];
            
            if (refImage) {
                const [header, data] = refImage.split(',');
                const mimeType = header.match(/:(.*?);/)?.[1] || 'image/png';
                parts.push({ inlineData: { data, mimeType } });
            }
            if (refFileContent) {
                parts.push({ text: `[Context Document Content]:\n${refFileContent}` });
            }
            if (userInput) {
                parts.push({ text: `[User Creative Idea]: ${userInput}` });
            }

            const response = await callBackendGemini('generateText', {
                contents: { role: 'user', parts: parts },
                config: { systemInstruction: systemInstruction, temperature: 0.8 }
            }, cost);

            const resultText = response?.text?.trim() || "";
            setGeneratedPrompt(resultText);
            
            // FIX: Removed manual onDeductCredits(cost) which triggers forbidden Firestore update.
            // Sync local UI credits after successful backend deduction.
            onDeductCredits(cost);
        } catch (e) {
            console.error(e);
            alert("生成失敗，請重試。");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-0 md:p-4 bg-gray-900/98 backdrop-blur-xl animate-fade-in">
            <div className="bg-[#0f111a] w-full h-full md:max-w-7xl md:h-[95vh] md:rounded-3xl shadow-2xl flex flex-col border border-cyan-500/20 overflow-hidden relative">
                
                {/* Header */}
                <div className="p-6 border-b border-gray-800 bg-[#151825] flex justify-between items-center flex-shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-cyan-500/10 rounded-2xl shadow-[0_0_15px_rgba(34,211,238,0.2)]">
                            <CommandLineIcon className="w-8 h-8 text-cyan-400" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-white tracking-widest animate-tech-flicker">Ai提示詞工坊</h2>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-gray-500 hover:text-white transition-colors"><CloseIcon className="w-8 h-8"/></button>
                </div>

                <div className="flex-grow flex flex-col md:flex-row overflow-hidden">
                    
                    {/* Left: Category Sidebar */}
                    <div className="w-full md:w-80 bg-[#0a0c14] border-b md:border-b-0 md:border-r border-gray-800 flex md:flex-col overflow-x-auto md:overflow-y-auto scrollbar-none flex-shrink-0 p-4 gap-3">
                        {MATRIX_CATEGORIES.map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => { setSelectedCategory(cat); setSelections({}); setGeneratedPrompt(''); }}
                                className={`flex-shrink-0 flex items-center gap-4 px-4 py-4 rounded-2xl transition-all border ${selectedCategory.id === cat.id ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/50 shadow-[0_0_15px_rgba(34,211,238,0.15)]' : 'bg-transparent border-transparent text-gray-500 hover:bg-white/5 hover:text-gray-300'}`}
                            >
                                <div className="text-2xl w-10 h-10 flex items-center justify-center bg-gray-800 rounded-xl">{cat.icon}</div>
                                <div className="text-left overflow-hidden">
                                    <span className="text-sm font-black whitespace-nowrap block">{cat.name.split(' / ')[0]}</span>
                                    <span className="text-[9px] text-gray-600 font-medium block truncate opacity-70">{cat.description}</span>
                                </div>
                            </button>
                        ))}
                    </div>

                    {/* Middle: Logic Matrix & Ratio */}
                    <div className="flex-grow p-6 overflow-y-auto space-y-8 bg-[#0f111a] custom-scrollbar">
                        
                        {/* 1. Matrix Header */}
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-800 pb-4">
                            <div className="flex items-center gap-3">
                                <span className="text-3xl">{selectedCategory.icon}</span>
                                <div>
                                    <h3 className="text-xl font-black text-white">{selectedCategory.name}</h3>
                                    <p className="text-xs text-gray-500">{selectedCategory.description}</p>
                                </div>
                            </div>
                        </div>

                        {/* 2. Selection Matrix */}
                        <div className="space-y-8">
                            {selectedCategory.details.map((group, gIdx) => (
                                <div key={gIdx} className="space-y-4">
                                    <div className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-purple-500"></div>
                                        <label className="text-sm font-black text-gray-400 uppercase tracking-widest">{group.label}</label>
                                    </div>
                                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                                        {group.options.map(opt => {
                                            const isSelected = selections[group.label] === opt.id || (!selections[group.label] && opt.id === group.options[0].id);
                                            return (
                                                <button
                                                    key={opt.id}
                                                    onClick={() => handleSelectOption(group.label, opt.id)}
                                                    className={`p-4 rounded-2xl border text-center transition-all flex flex-col items-center justify-center min-h-[70px] relative group ${isSelected ? 'bg-purple-600/20 border-purple-500 text-white shadow-[0_0_20px_rgba(168,85,247,0.2)]' : 'bg-[#151825] border-gray-800 text-gray-500 hover:border-gray-600 hover:text-gray-300'}`}
                                                >
                                                    <span className="text-sm font-black tracking-tight">{opt.name}</span>
                                                    {isSelected && <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-purple-500 shadow-[0_0_10px_#a855f7]"></div>}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* 3. Canvas Ratio Selector */}
                        <div className="space-y-4 pt-4 border-t border-gray-800">
                            <div className="flex items-center gap-2">
                                <MagicWandIcon className="w-4 h-4 text-cyan-500" />
                                <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest">畫布比例 (Canvas Ratio)</h3>
                            </div>
                            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                                {RATIO_OPTIONS.map(ratio => (
                                    <button
                                        key={ratio.id}
                                        onClick={() => setCurrentRatio(ratio.id)}
                                        className={`p-4 rounded-2xl border text-center transition-all flex flex-col items-center gap-1 ${currentRatio === ratio.id ? 'bg-cyan-600/20 border-cyan-500 text-white shadow-[0_0_20px_rgba(34,211,238,0.2)]' : 'bg-[#151825] border-gray-800 text-gray-500 hover:border-gray-600 hover:text-gray-300'}`}
                                    >
                                        <span className="text-xl">{ratio.icon}</span>
                                        <span className="text-xs font-bold">{ratio.name}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* 4. Creative Description & Multimodal Upload */}
                        <div className="space-y-4 pt-4 border-t border-gray-800">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                <div className="flex items-center gap-2">
                                    <MagicWandIcon className="w-4 h-4 text-purple-500" />
                                    <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest">核心創意描述與參考資料</h3>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <label className="flex items-center gap-2 bg-indigo-900/30 border border-indigo-500/30 px-3 py-1.5 rounded-full cursor-pointer hover:bg-indigo-900/50 transition-colors">
                                        <input type="checkbox" checked={includeText} onChange={e => setIncludeText(e.target.checked)} className="w-4 h-4 rounded border-gray-600 text-purple-600 focus:ring-purple-500" />
                                        <span className="text-[10px] font-black text-indigo-200">依圖判斷自動加入文字</span>
                                    </label>
                                    <button onClick={() => document.getElementById('matrix-img-up')?.click()} className="text-[10px] bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-1.5 rounded-full flex items-center gap-1.5 transition-colors border border-gray-700">
                                        <UploadIcon className="w-3 h-3"/> 上傳參考圖
                                    </button>
                                    <button onClick={() => document.getElementById('matrix-file-up')?.click()} className="text-[10px] bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-1.5 rounded-full flex items-center gap-1.5 transition-colors border border-gray-700">
                                        <BookOpenIcon className="w-3 h-3"/> 上傳參考文件
                                    </button>
                                    <input id="matrix-img-up" type="file" className="hidden" onChange={handleImageUpload} accept="image/*" />
                                    <input id="matrix-file-up" type="file" className="hidden" onChange={handleFileUpload} accept=".txt,.csv,.pdf,.md" />
                                </div>
                            </div>
                            
                            <div className="flex flex-col lg:flex-row gap-4">
                                <textarea 
                                    value={userInput}
                                    onChange={(e) => setUserInput(e.target.value)}
                                    placeholder="例如：一位優雅的女士站在湖邊... (專業人像模式下，AI 會錨定人物臉型並自動換裝)"
                                    className="flex-grow h-40 bg-[#0a0c14] border border-gray-800 rounded-3xl p-6 text-white text-base focus:border-cyan-500/50 outline-none resize-none transition-all shadow-inner placeholder:text-gray-700 leading-relaxed font-medium"
                                />
                                <div className="flex lg:flex-col gap-3 flex-shrink-0">
                                    {refImage && (
                                        <div className="w-32 lg:w-40 h-32 lg:h-40 relative group">
                                            <img src={refImage} className="w-full h-full object-cover rounded-3xl border border-gray-700 shadow-xl" />
                                            <div className="absolute top-1 left-2 bg-black/60 text-[8px] text-white px-1.5 py-0.5 rounded-md font-bold">參考圖</div>
                                            <button onClick={() => setRefImage(null)} className="absolute -top-2 -right-2 bg-red-600 p-1.5 rounded-full shadow-lg hover:bg-red-500"><CloseIcon className="w-3 h-3 text-white"/></button>
                                        </div>
                                    )}
                                    {refFileName && (
                                        <div className="w-32 lg:w-40 h-32 lg:h-20 bg-[#1a1d2d] rounded-2xl border border-gray-700 p-3 flex flex-col justify-center items-center relative group">
                                            <BookOpenIcon className="w-6 h-6 text-blue-400 mb-1" />
                                            <span className="text-[9px] text-gray-400 text-center truncate w-full">{refFileName}</span>
                                            <button onClick={() => { setRefFileContent(null); setRefFileName(null); }} className="absolute -top-2 -right-2 bg-red-600 p-1.5 rounded-full shadow-lg hover:bg-red-500"><CloseIcon className="w-3 h-3 text-white"/></button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <button 
                            onClick={handleGenerate}
                            disabled={loading || (!userInput && !refImage && !refFileContent)}
                            className="w-full py-6 bg-gradient-to-r from-cyan-600 via-blue-600 to-purple-600 hover:brightness-110 text-white font-black text-xl rounded-3xl shadow-2xl transition-all transform active:scale-[0.98] flex items-center justify-center gap-4 disabled:opacity-50 border border-white/10"
                        >
                            {loading ? (
                                <>
                                    <RefreshIcon className="w-8 h-8 animate-spin" />
                                    <span>AI 工程運算中... (嚴格鎖定主角面部特徵)</span>
                                </>
                            ) : (
                                <><SparklesIcon className="w-8 h-8"/> 生成圖片專業提示詞 (3 積分)</>
                            )}
                        </button>
                    </div>

                    {/* Right: Output Specification */}
                    <div className="w-full md:w-96 p-6 bg-[#07090f] flex flex-col border-t md:border-t-0 md:border-l border-gray-800 flex-shrink md:flex-shrink-0 min-h-[250px] md:min-h-0 overflow-hidden">
                        <div className="flex items-center justify-between mb-4 flex-shrink-0">
                            <label className="text-xs font-black text-cyan-500 uppercase tracking-widest flex items-center gap-2">
                                <SearchIcon className="w-4 h-4"/>
                                工程產出結果
                            </label>
                            {generatedPrompt && <span className="text-[10px] text-green-500 animate-pulse font-mono font-bold border border-green-500/50 px-2 py-0.5 rounded">READY</span>}
                        </div>
                        
                        <div className="flex-grow bg-[#0a0c14] border border-gray-800 rounded-3xl p-6 overflow-y-auto font-mono text-xs leading-relaxed text-cyan-100/70 relative group custom-scrollbar shadow-inner max-h-[30vh] md:max-h-none">
                            {generatedPrompt ? (
                                generatedPrompt
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-gray-700 space-y-6 opacity-30">
                                    <CommandLineIcon className="w-24 h-24 stroke-1" />
                                    <p className="text-center text-xs font-bold tracking-tighter">WAITING FOR SPECIFICATION GENERATION...</p>
                                </div>
                            )}
                        </div>

                        {generatedPrompt && (
                            <div className="mt-6 flex flex-col gap-3 flex-shrink-0">
                                <button 
                                    onClick={() => onApply(generatedPrompt, currentRatio)}
                                    className="w-full py-5 bg-purple-600 hover:bg-purple-500 text-white font-black rounded-2xl shadow-[0_0_25px_rgba(168,85,247,0.4)] transition-all transform active:scale-95 flex items-center justify-center gap-3 border border-white/20"
                                >
                                    <SaveIcon className="w-6 h-6" /> 確認並填入編輯器
                                </button>
                                <button 
                                    onClick={() => setGeneratedPrompt('')}
                                    className="w-full py-2 text-gray-600 hover:text-gray-400 text-[10px] font-bold uppercase tracking-widest transition-colors"
                                >
                                    CLEAR RESULT
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
