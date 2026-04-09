import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { 
  Upload, 
  FileText, 
  Ruler, 
  Calculator, 
  CheckCircle2, 
  AlertCircle, 
  Loader2,
  ChevronRight,
  Maximize2,
  Layers,
  Settings,
  User,
  Building,
  ShieldCheck,
  Save,
  Bell,
  Globe,
  CreditCard,
  File as FileIcon,
  Phone,
  MapPin,
  Hash,
  Link as LinkIcon,
  Lock,
  Smartphone,
  Key,
  History,
  Play,
  X,
  Video
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI, Modality } from "@google/genai";
import { analyzeDrawings, CalculationResult, DrawingData } from './services/geminiService';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface DrawingFile {
  file: File;
  preview: string;
}

export default function App() {
  const [currentView, setCurrentView] = useState<'calculate' | 'projects' | 'settings'>('calculate');
  const [projectHistory, setProjectHistory] = useState<CalculationResult[]>([]);
  
  // Settings State
  const [companyName, setCompanyName] = useState('Calculatie-scan');
  const [userEmail, setUserEmail] = useState('info@daamsstucwerken.nl');
  const [defaultMargin, setDefaultMargin] = useState('15');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [activeSettingsTab, setActiveSettingsTab] = useState<'profile' | 'company' | 'security' | 'billing'>('profile');
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // Company State
  const [companyKvK, setCompanyKvK] = useState('12345678');
  const [companyBTW, setCompanyBTW] = useState('NL123456789B01');
  const [companyAddress, setCompanyAddress] = useState('Hoofdstraat 1, 1011 AB Amsterdam');
  const [companyPhone, setCompanyPhone] = useState('020 123 4567');
  const [companyWebsite, setCompanyWebsite] = useState('www.calculatiescan.nl');

  // Security State
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [sessionTimeout, setSessionTimeout] = useState('30');

  // Promo Video State
  const [showPromoVideo, setShowPromoVideo] = useState(false);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [promoVideoUrl, setPromoVideoUrl] = useState<string | null>(null);
  const [promoAudioUrl, setPromoAudioUrl] = useState<string | null>(null);
  const [currentSubtitle, setCurrentSubtitle] = useState<string>('');
  const [videoError, setVideoError] = useState<string | null>(null);
  const [videoGenerationStep, setVideoGenerationStep] = useState<string>('');

  // Cleanup blob URLs
  React.useEffect(() => {
    return () => {
      if (promoVideoUrl) URL.revokeObjectURL(promoVideoUrl);
      if (promoAudioUrl) URL.revokeObjectURL(promoAudioUrl);
    };
  }, [promoVideoUrl, promoAudioUrl]);

  const subtitles = [
    { time: 0, text: "Met Calculatiescan Win Je Avonden Terug." },
    { time: 3, text: "AI Doet De Meting." },
    { time: 5, text: "CalculatieScan.nl is dé AI-oplossing voor schilders en stukadoors." },
    { time: 9, text: "Scan bouwtekeningen en in enkele seconden worden je m2 wanden en plafonds..." },
    { time: 14, text: "...en de trekkende meters van de hoekbeschermers en de dagkanten berekend." }
  ];

  const handleGeneratePromoVideo = async () => {
    try {
      setVideoError(null);
      setIsGeneratingVideo(true);
      setPromoVideoUrl(null);
      setPromoAudioUrl(null);
      setVideoGenerationStep('Controleren van API-sleutel...');

      // Check for API key
      const hasKey = await (window as any).aistudio.hasSelectedApiKey();
      if (!hasKey) {
        setVideoGenerationStep('Wachten op API-sleutel selectie...');
        await (window as any).aistudio.openSelectKey();
        // Proceed anyway to mitigate race condition as per guidelines
      }

      const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY || process.env.GEMINI_API_KEY || '' });
      const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY || '';

      // 1. Generate Voiceover
      setVideoGenerationStep('Voiceover genereren...');
      const voicePrompt = "Spreek rustig en professioneel in het Nederlands: Met Calculatiescan Win Je Avonden Terug. AI Doet De Meting. CalculatieScan.nl is dé AI-oplossing voor schilders en stukadoors. Scan bouwtekeningen en in enkele seconden worden je vierkante meters van je wanden en plafonds en de trekkende meters van de hoekbeschermers en de dagkanten berekend.";
      
      const audioResponse = await getAI().models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: voicePrompt }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Kore' }, // Professional male voice
            },
          },
        },
      });

      const base64Audio = audioResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        const audioBlob = await (await fetch(`data:audio/mpeg;base64,${base64Audio}`)).blob();
        if (promoAudioUrl) URL.revokeObjectURL(promoAudioUrl);
        setPromoAudioUrl(URL.createObjectURL(audioBlob));
      }

      // 2. Generate Video
      setVideoGenerationStep('Video wordt geregisseerd (dit kan even duren)...');
      let operation = await getAI().models.generateVideos({
        model: 'veo-3.1-generate-preview',
        prompt: 'Een uitgebreide cinematografische commercial voor Calculatie-scan. Scène 1: Een vakman (schilder/stukadoor) opent de app op een tablet en scant een fysieke bouwtekening. Scène 2: Close-up van de app die de tekening analyseert met cyaan AI-overlays. Scène 3: De app toont direct een gedetailleerde rapportage met kolommen voor "M2 Wanden", "M2 Plafonds", "M1 Hoekbeschermers" en "M1 Dagkanten". Scène 4: De vakman kijkt tevreden naar het scherm, wetende dat hij zijn avond terug heeft. De video is professioneel, helder en laat de snelheid van de AI-meting zien.',
        config: {
          numberOfVideos: 1,
          resolution: '1080p',
          aspectRatio: '16:9'
        }
      });

      while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 10000));
        operation = await getAI().operations.getVideosOperation({ operation: operation });
        
        const steps = [
          'Scène 1: Vakman aan het werk...',
          'Scène 2: AI analyseert de tekening...',
          'Scène 3: Calculatie wordt berekend...',
          'Scène 4: Resultaat wordt getoond...',
          'Laatste montage...'
        ];
        setVideoGenerationStep(steps[Math.floor(Math.random() * steps.length)]);
      }

      const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
      if (downloadLink) {
        setVideoGenerationStep('Video downloaden...');
        const response = await fetch(downloadLink, {
          method: 'GET',
          headers: { 'x-goog-api-key': process.env.API_KEY || process.env.GEMINI_API_KEY || '' },
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Download failed:', response.status, errorText);
          throw new Error(`Download mislukt: ${response.statusText}`);
        }

        const blob = await response.blob();
        if (blob.size === 0) {
          throw new Error('Gedownloade video is leeg.');
        }
        
        // Ensure the blob has a video mime type if it's missing
        const videoBlob = blob.type.startsWith('video/') 
          ? blob 
          : new Blob([blob], { type: 'video/mp4' });

        if (promoVideoUrl) URL.revokeObjectURL(promoVideoUrl);
        setPromoVideoUrl(URL.createObjectURL(videoBlob));
        setVideoGenerationStep('Video gereed!');
      } else {
        throw new Error('Geen video URL ontvangen.');
      }
    } catch (error: any) {
      console.error('Video generation error:', error);
      if (error.message?.includes("Requested entity was not found")) {
        setVideoError('API-sleutel niet gevonden of ongeldig. Selecteer een geldige sleutel.');
        await (window as any).aistudio.openSelectKey();
      } else {
        setVideoError('Er is een fout opgetreden bij het genereren van de video.');
      }
    } finally {
      setIsGeneratingVideo(false);
    }
  };
  
  const [drawings, setDrawings] = useState<DrawingFile[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Project Info
  const [projectName, setProjectName] = useState('');
  const [workType, setWorkType] = useState('Stucwerk');

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newDrawings = acceptedFiles.map(file => ({
      file,
      preview: URL.createObjectURL(file)
    }));
    setDrawings(prev => [...prev, ...newDrawings]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 
      'image/*': [],
      'application/pdf': []
    },
    multiple: true
  } as any);

  const removeDrawing = (index: number) => {
    setDrawings(prev => {
      const updated = [...prev];
      URL.revokeObjectURL(updated[index].preview);
      updated.splice(index, 1);
      return updated;
    });
  };

  const handleAnalyze = async () => {
    if (drawings.length === 0) return;

    setIsAnalyzing(true);
    setError(null);
    setResult(null);

    try {
      const drawingData: DrawingData[] = await Promise.all(
        drawings.map(async (d) => {
          const base64 = await fileToBase64(d.file);
          return {
            mimeType: d.file.type,
            data: base64.split(",")[1]
          };
        })
      );
      
      const analysisResult = await analyzeDrawings(
        drawingData, 
        projectName || 'Nieuw Project', 
        workType
      );
      setResult(analysisResult);
      setProjectHistory(prev => [analysisResult, ...prev]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Er is een onbekende fout opgetreden.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] font-sans selection:bg-cyan-100 selection:text-cyan-900">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4 cursor-pointer" onClick={() => setCurrentView('calculate')}>
            <div className="w-12 h-12 bg-[#1A2B48] rounded-xl flex items-center justify-center shadow-lg shadow-cyan-500/10 border border-cyan-500/20">
              <div className="relative">
                <Ruler className="text-cyan-400 w-6 h-6" />
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-white rounded-full animate-pulse" />
              </div>
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight text-[#1A2B48] flex items-baseline gap-1">
                Calculatie-<span className="text-cyan-500">scan</span>
              </h1>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Win Je Avonden Terug</p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <nav className="flex items-center gap-8 text-sm font-bold uppercase tracking-wider">
              <button 
                onClick={() => setCurrentView('calculate')}
                className={cn("transition-all relative py-2", currentView === 'calculate' ? "text-cyan-600 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-cyan-600" : "text-slate-500 hover:text-slate-900")}
              >
                Calculeren
              </button>
              <button 
                onClick={() => setCurrentView('projects')}
                className={cn("transition-all relative py-2", currentView === 'projects' ? "text-cyan-600 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-cyan-600" : "text-slate-500 hover:text-slate-900")}
              >
                Projecten
              </button>
              <button 
                onClick={() => setCurrentView('settings')}
                className={cn("transition-all relative py-2", currentView === 'settings' ? "text-cyan-600 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-cyan-600" : "text-slate-500 hover:text-slate-900")}
              >
                Instellingen
              </button>
            </nav>
            <div className="h-8 w-px bg-slate-200"></div>
            <div className="flex items-center gap-3">
              <button className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 font-bold text-xs hover:bg-slate-200 transition-all border border-slate-200">
                ID
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10">
        {currentView === 'calculate' ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            {/* Left Column: Project Setup & Upload */}
            <div className="lg:col-span-5 space-y-8">
              {/* Project Details */}
              <section className="bg-white p-8 rounded-3xl border border-zinc-200 shadow-sm space-y-6">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <Layers className="w-5 h-5 text-cyan-600" />
                  Project Details
                </h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Projectnaam</label>
                    <input 
                      type="text" 
                      placeholder="bijv. Renovatie Amsterdam"
                      value={projectName}
                      onChange={(e) => setProjectName(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Type Werkzaamheden</label>
                    <select 
                      value={workType}
                      onChange={(e) => setWorkType(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10 outline-none transition-all bg-white"
                    >
                      <option>Schilder & Stukadoorswerk</option>
                      <option>Schilderwerk</option>
                      <option>Stukadoorswerk</option>
                      <option>Spackspuitwerk</option>
                      <option>Tegelwerk</option>
                      <option>Gipsplaten</option>
                    </select>
                  </div>
                </div>
              </section>

              {/* Upload Area */}
              <section className="bg-white p-8 rounded-3xl border border-zinc-200 shadow-sm space-y-6">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <Upload className="w-5 h-5 text-cyan-600" />
                  Tekeningen Uploaden
                </h2>
                
                <div className="space-y-4">
                  <div 
                    {...getRootProps()} 
                    className={cn(
                      "relative group cursor-pointer rounded-2xl border-2 border-dashed transition-all duration-300 min-h-[180px] flex flex-col items-center justify-center text-center px-6",
                      isDragActive ? "border-cyan-500 bg-cyan-50/50" : "border-zinc-200 hover:border-zinc-300 bg-zinc-50/50"
                    )}
                  >
                    <input {...getInputProps()} />
                    <div className="w-14 h-14 rounded-2xl bg-white shadow-sm flex items-center justify-center mb-4 group-hover:scale-110 transition-transform border border-zinc-100">
                      <Upload className="text-cyan-600 w-7 h-7" />
                    </div>
                    <p className="text-sm font-bold mb-1">Sleep bestanden hierheen</p>
                    <p className="text-xs text-zinc-500">Plattegronden & Doorsnedes (JPG/PNG/PDF)</p>
                  </div>

                  <button 
                    onClick={() => setShowPromoVideo(true)}
                    className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-zinc-900 text-white font-bold hover:bg-black transition-all shadow-lg shadow-zinc-900/10"
                  >
                    <Play className="w-5 h-5 fill-current" />
                    Bekijk Hoe Het Werkt
                  </button>

                  {drawings.length > 0 && (
                    <div className="grid grid-cols-2 gap-3">
                      {drawings.map((drawing, idx) => (
                        <div key={idx} className="relative aspect-video rounded-xl overflow-hidden border border-zinc-200 group shadow-sm bg-zinc-50">
                          {drawing.file.type === 'application/pdf' ? (
                            <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                              <FileIcon className="w-8 h-8 text-red-500" />
                              <span className="text-[10px] font-bold text-zinc-500 px-2 text-center truncate w-full">
                                {drawing.file.name}
                              </span>
                            </div>
                          ) : (
                            <img src={drawing.preview} alt={`Drawing ${idx}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          )}
                          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                          <button 
                            onClick={(e) => { e.stopPropagation(); removeDrawing(idx); }}
                            className="absolute top-2 right-2 w-7 h-7 bg-white shadow-lg text-zinc-900 rounded-lg flex items-center justify-center hover:bg-red-500 hover:text-white transition-all opacity-0 group-hover:opacity-100"
                          >
                            <span className="text-lg leading-none">&times;</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  onClick={handleAnalyze}
                  disabled={drawings.length === 0 || isAnalyzing}
                  className={cn(
                    "w-full py-4 rounded-2xl font-bold text-lg transition-all flex items-center justify-center gap-3 shadow-xl",
                    (drawings.length === 0 || isAnalyzing) 
                      ? "bg-zinc-100 text-zinc-400 cursor-not-allowed" 
                      : "bg-cyan-600 text-white hover:bg-cyan-700 active:scale-[0.98] shadow-cyan-600/20"
                  )}
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="w-6 h-6 animate-spin" />
                      Bezig met Calculeren...
                    </>
                  ) : (
                    <>
                      <Calculator className="w-6 h-6" />
                      Start Calculatie Scan
                    </>
                  )}
                </button>
              </section>
            </div>

            {/* Right Column: Results Dashboard */}
            <div className="lg:col-span-7">
              <AnimatePresence mode="wait">
                {!result && !isAnalyzing && !error && (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="h-full min-h-[600px] flex flex-col items-center justify-center text-center p-12 bg-white rounded-[40px] border border-zinc-200 shadow-sm"
                  >
                    <div className="w-24 h-24 bg-cyan-50 rounded-[32px] flex items-center justify-center mb-8 rotate-3">
                      <Ruler className="text-cyan-600 w-12 h-12 -rotate-3" />
                    </div>
                    <h3 className="text-2xl font-bold mb-3">AI Doet De Meting</h3>
                    <p className="text-zinc-500 max-w-md leading-relaxed">
                      Win Je Avonden Terug. CalculatieScan.nl is dé AI-oplossing voor schilders en stukadoors. Scan bouwtekeningen in seconden voor razendsnelle m2 en m1 rapportages.
                    </p>
                    <div className="mt-10 grid grid-cols-3 gap-8 w-full max-w-lg">
                      <div className="space-y-2">
                        <div className="text-cyan-600 font-bold text-xl">100%</div>
                        <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Nauwkeurig</div>
                      </div>
                      <div className="space-y-2">
                        <div className="text-cyan-600 font-bold text-xl">AI</div>
                        <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Gedreven</div>
                      </div>
                      <div className="space-y-2">
                        <div className="text-cyan-600 font-bold text-xl">&lt; 30s</div>
                        <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Snelheid</div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {isAnalyzing && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="h-full min-h-[600px] flex flex-col items-center justify-center text-center p-12 bg-white rounded-[40px] border border-zinc-200 shadow-sm"
                  >
                    <div className="relative w-32 h-32 mb-10">
                      <motion.div 
                        animate={{ rotate: 360 }}
                        transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                        className="absolute inset-0 border-[6px] border-cyan-100 rounded-full"
                      />
                      <motion.div 
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                        className="absolute inset-0 border-[6px] border-cyan-600 rounded-full border-t-transparent"
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Calculator className="text-cyan-600 w-10 h-10" />
                      </div>
                    </div>
                    <h3 className="text-2xl font-bold mb-3">AI Doet De Meting</h3>
                    <p className="text-zinc-500 max-w-sm leading-relaxed">
                      Calculatie-scan analyseert nu elke kamer voor razendsnelle m2 en m1 rapportages...
                    </p>
                    <div className="mt-8 flex gap-2">
                      {[0, 1, 2].map(i => (
                        <motion.div 
                          key={i}
                          animate={{ opacity: [0.3, 1, 0.3] }}
                          transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                          className="w-2 h-2 bg-cyan-600 rounded-full"
                        />
                      ))}
                    </div>
                  </motion.div>
                )}

                {error && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="h-full flex flex-col items-center justify-center text-center p-12 bg-white rounded-[40px] border border-zinc-200 shadow-sm"
                  >
                    <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mb-6">
                      <AlertCircle className="text-red-600 w-8 h-8" />
                    </div>
                    <h3 className="text-xl font-bold text-red-900 mb-2">Analyse mislukt</h3>
                    <p className="text-red-700 text-sm mb-8 max-w-xs mx-auto">{error}</p>
                    <button 
                      onClick={() => setError(null)}
                      className="px-8 py-3 bg-white border-2 border-red-100 text-red-700 rounded-xl text-sm font-bold hover:bg-red-50 transition-all"
                    >
                      Probeer opnieuw
                    </button>
                  </motion.div>
                )}

                {result && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="space-y-8"
                  >
                    {/* Dashboard Header */}
                    <div className="bg-zinc-900 p-10 rounded-[40px] text-white shadow-2xl relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 blur-[100px] rounded-full -mr-32 -mt-32"></div>
                      <div className="relative z-10">
                        <div className="flex justify-between items-start mb-8">
                          <div>
                            <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-[0.2em] mb-2 block">Calculatie Rapport</span>
                            <h2 className="text-3xl font-bold">{result.projectName}</h2>
                            <p className="text-zinc-400 text-sm mt-1">{result.workType} • Schaal {result.scaleFound}</p>
                          </div>
                          <div className="bg-cyan-500/20 text-cyan-400 px-4 py-2 rounded-xl text-xs font-bold border border-cyan-500/30">
                            DEFINITIEF
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                          <div>
                            <div className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mb-1">M2 Wanden</div>
                            <div className="text-3xl font-bold">{result.totalWallsM2}<span className="text-sm font-medium text-zinc-500 ml-1">m²</span></div>
                          </div>
                          <div>
                            <div className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mb-1">M2 Plafonds</div>
                            <div className="text-3xl font-bold">{result.totalCeilingsM2}<span className="text-sm font-medium text-zinc-500 ml-1">m²</span></div>
                          </div>
                          <div>
                            <div className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mb-1">M1 Hoekbeschermers</div>
                            <div className="text-3xl font-bold">{result.totalCornerProtectorsM1}<span className="text-sm font-medium text-zinc-500 ml-1">m¹</span></div>
                          </div>
                          <div>
                            <div className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mb-1">M1 Dagkanten</div>
                            <div className="text-3xl font-bold">{result.totalRevealsM1}<span className="text-sm font-medium text-zinc-500 ml-1">m¹</span></div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Room Breakdown */}
                    <div className="bg-white rounded-[40px] border border-zinc-200 overflow-hidden shadow-sm">
                      <div className="p-8 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
                        <h3 className="text-lg font-bold">Specificatie per Ruimte</h3>
                        <div className="flex items-center gap-2 text-cyan-600 font-bold text-xs">
                          <CheckCircle2 className="w-4 h-4" />
                          {result.rooms.length} Ruimtes Gevonden
                        </div>
                      </div>
                      <div className="divide-y divide-zinc-100">
                        {result.rooms.map((room, idx) => (
                          <div key={idx} className="p-8 hover:bg-zinc-50/50 transition-all group">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                              <h4 className="text-xl font-bold text-zinc-900 group-hover:text-cyan-600 transition-colors">{room.name}</h4>
                              <div className="flex flex-wrap gap-3">
                                <div className="bg-white border border-zinc-200 px-3 py-1.5 rounded-lg text-xs font-bold">
                                  <span className="text-zinc-400 mr-2">W:</span>{room.wallsM2} m²
                                </div>
                                <div className="bg-white border border-zinc-200 px-3 py-1.5 rounded-lg text-xs font-bold">
                                  <span className="text-zinc-400 mr-2">P:</span>{room.ceilingsM2} m²
                                </div>
                                <div className="bg-white border border-zinc-200 px-3 py-1.5 rounded-lg text-xs font-bold">
                                  <span className="text-zinc-400 mr-2">H:</span>{room.cornerProtectorsM1} m¹
                                </div>
                                <div className="bg-white border border-zinc-200 px-3 py-1.5 rounded-lg text-xs font-bold">
                                  <span className="text-zinc-400 mr-2">D:</span>{room.revealsM1} m¹
                                </div>
                              </div>
                            </div>
                            <p className="text-sm text-zinc-500 leading-relaxed bg-zinc-100/50 p-4 rounded-2xl border border-zinc-100 italic">
                              {room.notes}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* AI Summary */}
                    <div className="bg-cyan-600 p-8 rounded-[32px] text-white shadow-xl shadow-cyan-600/20">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                          <AlertCircle className="w-5 h-5" />
                        </div>
                        <h4 className="font-bold uppercase tracking-widest text-xs">AI Analyse Samenvatting</h4>
                      </div>
                      <p className="text-sm text-cyan-50 leading-relaxed">
                        {result.explanation}
                      </p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 pb-10">
                      <button 
                        onClick={() => window.print()}
                        className="flex-1 py-4 bg-white border-2 border-zinc-200 rounded-2xl text-sm font-bold hover:bg-zinc-50 transition-all flex items-center justify-center gap-2"
                      >
                        <FileText className="w-5 h-5" />
                        Download PDF Rapport
                      </button>
                      <button 
                        onClick={() => {
                          setResult(null);
                          setDrawings([]);
                        }}
                        className="flex-1 py-4 bg-zinc-900 text-white rounded-2xl text-sm font-bold hover:bg-black transition-all shadow-xl shadow-zinc-900/20 flex items-center justify-center gap-2"
                      >
                        <Calculator className="w-5 h-5" />
                        Nieuwe Calculatie
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        ) : currentView === 'projects' ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            <div className="flex justify-between items-center">
              <h2 className="text-3xl font-bold">Projecten</h2>
              <button 
                onClick={() => setCurrentView('calculate')}
                className="bg-cyan-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-cyan-700 transition-all shadow-lg shadow-cyan-600/20 flex items-center gap-2"
              >
                <Calculator className="w-5 h-5" />
                Nieuwe Calculatie
              </button>
            </div>

            {projectHistory.length === 0 ? (
              <div className="bg-white p-20 rounded-[40px] border border-zinc-200 text-center">
                <div className="w-20 h-20 bg-zinc-50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Layers className="text-zinc-300 w-10 h-10" />
                </div>
                <h3 className="text-xl font-bold mb-2">Geen projecten gevonden</h3>
                <p className="text-zinc-500">Start je eerste calculatie om deze hier terug te zien.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {projectHistory.map((project, idx) => (
                  <div 
                    key={idx} 
                    className="bg-white p-8 rounded-[32px] border border-zinc-200 shadow-sm hover:shadow-xl hover:border-cyan-100 transition-all cursor-pointer group"
                    onClick={() => {
                      setResult(project);
                      setCurrentView('calculate');
                    }}
                  >
                    <div className="flex justify-between items-start mb-6">
                      <div className="w-12 h-12 bg-cyan-50 rounded-2xl flex items-center justify-center group-hover:bg-cyan-600 transition-colors">
                        <FileText className="text-cyan-600 w-6 h-6 group-hover:text-white transition-colors" />
                      </div>
                      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{project.workType}</span>
                    </div>
                    <h3 className="text-xl font-bold mb-2">{project.projectName}</h3>
                    <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-zinc-50">
                      <div>
                        <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">M2 Wanden</div>
                        <div className="text-lg font-bold">{project.totalWallsM2} m²</div>
                      </div>
                      <div>
                        <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">M2 Plafonds</div>
                        <div className="text-lg font-bold">{project.totalCeilingsM2} m²</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-4xl mx-auto space-y-10"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-bold">Instellingen</h2>
                <p className="text-zinc-500 mt-1 text-sm">Beheer je account en calculatievoorkeuren</p>
              </div>
              <button 
                onClick={() => {
                  setIsSavingSettings(true);
                  setTimeout(() => setIsSavingSettings(false), 1500);
                }}
                disabled={isSavingSettings}
                className="bg-cyan-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-cyan-700 transition-all shadow-lg shadow-cyan-600/20 flex items-center gap-2 disabled:opacity-50"
              >
                {isSavingSettings ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                {isSavingSettings ? 'Opslaan...' : 'Opslaan'}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Sidebar Tabs */}
              <div className="space-y-2">
                <button 
                  onClick={() => setActiveSettingsTab('profile')}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold text-sm",
                    activeSettingsTab === 'profile' ? "bg-white border border-zinc-200 text-cyan-600 shadow-sm" : "text-zinc-500 hover:bg-white hover:text-zinc-900"
                  )}
                >
                  <User className="w-5 h-5" />
                  Profiel
                </button>
                <button 
                  onClick={() => setActiveSettingsTab('company')}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold text-sm",
                    activeSettingsTab === 'company' ? "bg-white border border-zinc-200 text-cyan-600 shadow-sm" : "text-zinc-500 hover:bg-white hover:text-zinc-900"
                  )}
                >
                  <Building className="w-5 h-5" />
                  Bedrijfsgegevens
                </button>
                <button 
                  onClick={() => setActiveSettingsTab('security')}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold text-sm",
                    activeSettingsTab === 'security' ? "bg-white border border-zinc-200 text-cyan-600 shadow-sm" : "text-zinc-500 hover:bg-white hover:text-zinc-900"
                  )}
                >
                  <ShieldCheck className="w-5 h-5" />
                  Beveiliging
                </button>
                <button 
                  onClick={() => setActiveSettingsTab('billing')}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold text-sm",
                    activeSettingsTab === 'billing' ? "bg-white border border-zinc-200 text-cyan-600 shadow-sm" : "text-zinc-500 hover:bg-white hover:text-zinc-900"
                  )}
                >
                  <CreditCard className="w-5 h-5" />
                  Abonnement
                </button>
              </div>

              {/* Content Area */}
              <div className="md:col-span-2 space-y-8">
                {activeSettingsTab === 'profile' ? (
                  <>
                    {/* Profile Section */}
                    <section className="bg-white p-8 rounded-[32px] border border-zinc-200 shadow-sm space-y-6">
                      <h3 className="text-lg font-bold">Persoonlijke Informatie</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Voornaam</label>
                          <input 
                            type="text" 
                            defaultValue="Info"
                            className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:border-cyan-500 outline-none transition-all"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Achternaam</label>
                          <input 
                            type="text" 
                            defaultValue="Daams"
                            className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:border-cyan-500 outline-none transition-all"
                          />
                        </div>
                        <div className="sm:col-span-2 space-y-2">
                          <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">E-mailadres</label>
                          <input 
                            type="email" 
                            value={userEmail}
                            onChange={(e) => setUserEmail(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:border-cyan-500 outline-none transition-all"
                          />
                        </div>
                      </div>
                    </section>

                    {/* Calculation Preferences */}
                    <section className="bg-white p-8 rounded-[32px] border border-zinc-200 shadow-sm space-y-6">
                      <h3 className="text-lg font-bold">Calculatie Voorkeuren</h3>
                      <div className="space-y-6">
                        <div className="flex items-center justify-between p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
                          <div>
                            <p className="font-bold text-sm">Standaard Marge (%)</p>
                            <p className="text-xs text-zinc-500">Wordt toegepast op alle nieuwe calculaties</p>
                          </div>
                          <input 
                            type="number" 
                            value={defaultMargin}
                            onChange={(e) => setDefaultMargin(e.target.value)}
                            className="w-20 px-3 py-2 rounded-lg border border-zinc-200 text-right font-bold outline-none focus:border-cyan-500"
                          />
                        </div>
                        
                        <div className="flex items-center justify-between p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
                          <div>
                            <p className="font-bold text-sm">Meldingen</p>
                            <p className="text-xs text-zinc-500">Ontvang een e-mail wanneer een scan klaar is</p>
                          </div>
                          <button 
                            onClick={() => setNotificationsEnabled(!notificationsEnabled)}
                            className={cn(
                              "w-12 h-6 rounded-full transition-all relative",
                              notificationsEnabled ? "bg-cyan-600" : "bg-zinc-300"
                            )}
                          >
                            <div className={cn(
                              "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                              notificationsEnabled ? "left-7" : "left-1"
                            )} />
                          </button>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
                          <div>
                            <p className="font-bold text-sm">Taal</p>
                            <p className="text-xs text-zinc-500">De taal van de gegenereerde rapporten</p>
                          </div>
                          <div className="flex items-center gap-2 text-sm font-bold text-zinc-900">
                            <Globe className="w-4 h-4 text-zinc-400" />
                            Nederlands
                          </div>
                        </div>
                      </div>
                    </section>

                    {/* Danger Zone */}
                    <section className="p-8 rounded-[32px] border border-red-100 bg-red-50/30 space-y-4">
                      <h3 className="text-lg font-bold text-red-900">Gevaarlijke Zone</h3>
                      <p className="text-sm text-red-700/70">Verwijder je account en alle bijbehorende projectdata permanent.</p>
                      <button className="px-6 py-3 bg-white border border-red-200 text-red-600 rounded-xl text-sm font-bold hover:bg-red-600 hover:text-white transition-all">
                        Account Verwijderen
                      </button>
                    </section>
                  </>
                ) : activeSettingsTab === 'company' ? (
                  <section className="bg-white p-8 rounded-[32px] border border-zinc-200 shadow-sm space-y-8">
                    <div className="flex items-center gap-4 border-b border-zinc-100 pb-6">
                      <div className="w-12 h-12 bg-cyan-50 rounded-2xl flex items-center justify-center">
                        <Building className="text-cyan-600 w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold">Bedrijfsgegevens</h3>
                        <p className="text-sm text-zinc-500 text-balance">Deze gegevens worden gebruikt op je facturen en rapporten.</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="sm:col-span-2 space-y-2">
                        <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Bedrijfsnaam</label>
                        <div className="relative">
                          <Building className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                          <input 
                            type="text" 
                            value={companyName}
                            onChange={(e) => setCompanyName(e.target.value)}
                            className="w-full pl-11 pr-4 py-3 rounded-xl border border-zinc-200 focus:border-cyan-500 outline-none transition-all"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">KvK Nummer</label>
                        <div className="relative">
                          <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                          <input 
                            type="text" 
                            value={companyKvK}
                            onChange={(e) => setCompanyKvK(e.target.value)}
                            className="w-full pl-11 pr-4 py-3 rounded-xl border border-zinc-200 focus:border-cyan-500 outline-none transition-all"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">BTW Nummer</label>
                        <div className="relative">
                          <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                          <input 
                            type="text" 
                            value={companyBTW}
                            onChange={(e) => setCompanyBTW(e.target.value)}
                            className="w-full pl-11 pr-4 py-3 rounded-xl border border-zinc-200 focus:border-cyan-500 outline-none transition-all"
                          />
                        </div>
                      </div>

                      <div className="sm:col-span-2 space-y-2">
                        <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Adres</label>
                        <div className="relative">
                          <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                          <input 
                            type="text" 
                            value={companyAddress}
                            onChange={(e) => setCompanyAddress(e.target.value)}
                            className="w-full pl-11 pr-4 py-3 rounded-xl border border-zinc-200 focus:border-cyan-500 outline-none transition-all"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Telefoonnummer</label>
                        <div className="relative">
                          <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                          <input 
                            type="tel" 
                            value={companyPhone}
                            onChange={(e) => setCompanyPhone(e.target.value)}
                            className="w-full pl-11 pr-4 py-3 rounded-xl border border-zinc-200 focus:border-cyan-500 outline-none transition-all"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Website</label>
                        <div className="relative">
                          <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                          <input 
                            type="url" 
                            value={companyWebsite}
                            onChange={(e) => setCompanyWebsite(e.target.value)}
                            className="w-full pl-11 pr-4 py-3 rounded-xl border border-zinc-200 focus:border-cyan-500 outline-none transition-all"
                          />
                        </div>
                      </div>
                    </div>
                  </section>
                ) : activeSettingsTab === 'security' ? (
                  <div className="space-y-8">
                    {/* Password Section */}
                    <section className="bg-white p-8 rounded-[32px] border border-zinc-200 shadow-sm space-y-6">
                      <div className="flex items-center gap-4 border-b border-zinc-100 pb-6">
                        <div className="w-12 h-12 bg-cyan-50 rounded-2xl flex items-center justify-center">
                          <Lock className="text-cyan-600 w-6 h-6" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold">Wachtwoord</h3>
                          <p className="text-sm text-zinc-500">Wijzig hier je wachtwoord om je account veilig te houden.</p>
                        </div>
                      </div>

                      <div className="space-y-4 max-w-md">
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Huidig Wachtwoord</label>
                          <input 
                            type="password" 
                            placeholder="••••••••"
                            className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:border-cyan-500 outline-none transition-all"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Nieuw Wachtwoord</label>
                          <input 
                            type="password" 
                            placeholder="••••••••"
                            className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:border-cyan-500 outline-none transition-all"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Bevestig Nieuw Wachtwoord</label>
                          <input 
                            type="password" 
                            placeholder="••••••••"
                            className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:border-cyan-500 outline-none transition-all"
                          />
                        </div>
                        <button className="px-6 py-3 bg-zinc-900 text-white rounded-xl text-sm font-bold hover:bg-black transition-all">
                          Wachtwoord Bijwerken
                        </button>
                      </div>
                    </section>

                    {/* Two-Factor Authentication */}
                    <section className="bg-white p-8 rounded-[32px] border border-zinc-200 shadow-sm space-y-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-cyan-50 rounded-2xl flex items-center justify-center">
                            <Smartphone className="text-cyan-600 w-6 h-6" />
                          </div>
                          <div>
                            <h3 className="text-lg font-bold">Twee-factor Authenticatie (2FA)</h3>
                            <p className="text-sm text-zinc-500">Voeg een extra beveiligingslaag toe aan je account.</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => setTwoFactorEnabled(!twoFactorEnabled)}
                          className={cn(
                            "w-12 h-6 rounded-full transition-all relative",
                            twoFactorEnabled ? "bg-cyan-600" : "bg-zinc-300"
                          )}
                        >
                          <div className={cn(
                            "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                            twoFactorEnabled ? "left-7" : "left-1"
                          )} />
                        </button>
                      </div>
                      
                      {twoFactorEnabled && (
                        <div className="p-4 bg-cyan-50 rounded-2xl border border-cyan-100 flex items-start gap-3">
                          <ShieldCheck className="w-5 h-5 text-cyan-600 mt-0.5" />
                          <div className="text-sm text-cyan-800">
                            <p className="font-bold">2FA is ingeschakeld</p>
                            <p className="opacity-80">Je account is nu extra beveiligd. Bij elke inlogpoging wordt een verificatiecode gevraagd.</p>
                          </div>
                        </div>
                      )}
                    </section>

                    {/* Sessions & History */}
                    <section className="bg-white p-8 rounded-[32px] border border-zinc-200 shadow-sm space-y-6">
                      <div className="flex items-center gap-4 border-b border-zinc-100 pb-6">
                        <div className="w-12 h-12 bg-cyan-50 rounded-2xl flex items-center justify-center">
                          <History className="text-cyan-600 w-6 h-6" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold">Inlogsessies</h3>
                          <p className="text-sm text-zinc-500">Bekijk en beheer je actieve sessies op verschillende apparaten.</p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center border border-zinc-200">
                              <Globe className="w-5 h-5 text-zinc-400" />
                            </div>
                            <div>
                              <p className="font-bold text-sm">Chrome op macOS</p>
                              <p className="text-xs text-zinc-500">Amsterdam, Nederland • <span className="text-cyan-600 font-medium">Huidige sessie</span></p>
                            </div>
                          </div>
                          <button className="text-xs font-bold text-zinc-400 uppercase tracking-wider hover:text-red-600 transition-colors">Uitloggen</button>
                        </div>
                        <div className="flex items-center justify-between p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center border border-zinc-200">
                              <Smartphone className="w-5 h-5 text-zinc-400" />
                            </div>
                            <div>
                              <p className="font-bold text-sm">iPhone 15 Pro</p>
                              <p className="text-xs text-zinc-500">Utrecht, Nederland • 2 uur geleden</p>
                            </div>
                          </div>
                          <button className="text-xs font-bold text-zinc-400 uppercase tracking-wider hover:text-red-600 transition-colors">Uitloggen</button>
                        </div>
                      </div>
                    </section>
                  </div>
                ) : (
                  <div className="bg-white p-20 rounded-[40px] border border-zinc-200 text-center">
                    <div className="w-20 h-20 bg-zinc-50 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Settings className="text-zinc-300 w-10 h-10" />
                    </div>
                    <h3 className="text-xl font-bold mb-2">Binnenkort beschikbaar</h3>
                    <p className="text-zinc-500">Deze sectie wordt momenteel ontwikkeld.</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </main>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-6 py-12 border-t border-zinc-200">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-zinc-900 rounded flex items-center justify-center">
              <Calculator className="text-white w-4 h-4" />
            </div>
            <span className="text-sm font-bold text-zinc-900">Calculatie-scan</span>
          </div>
          <p className="text-[10px] text-zinc-400 max-w-md text-center md:text-right uppercase tracking-[0.1em] leading-loose">
            Disclaimer: Deze calculaties zijn gegenereerd door kunstmatige intelligentie en dienen als indicatie. Controleer altijd de originele bouwtekeningen voor definitieve offertes en bestellingen.
          </p>
        </div>
      </footer>

      {/* Promo Video Modal */}
      <AnimatePresence>
        {showPromoVideo && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/90 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-5xl aspect-video bg-zinc-900 rounded-3xl overflow-hidden shadow-2xl border border-white/10"
            >
              <button 
                onClick={() => setShowPromoVideo(false)}
                className="absolute top-6 right-6 z-10 w-12 h-12 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black transition-colors"
              >
                <X className="w-6 h-6" />
              </button>

              <div className="absolute inset-0 flex flex-col items-center justify-center p-12 text-center">
                {!promoVideoUrl && !isGeneratingVideo && !videoError && (
                  <div className="space-y-8">
                    <div className="w-24 h-24 bg-cyan-600 rounded-full flex items-center justify-center mx-auto shadow-2xl shadow-cyan-600/40">
                      <Video className="text-white w-10 h-10" />
                    </div>
                    <div>
                      <h2 className="text-4xl font-bold text-white mb-4">Ontdek Calculatie-scan</h2>
                      <p className="text-zinc-400 text-lg max-w-xl mx-auto">
                        Win Je Avonden Terug. AI Doet De Meting. CalculatieScan.nl is dé AI-oplossing voor schilders en stukadoors.
                      </p>
                    </div>
                    <button 
                      onClick={handleGeneratePromoVideo}
                      className="bg-cyan-600 text-white px-10 py-5 rounded-2xl font-bold text-lg hover:bg-cyan-700 transition-all shadow-xl shadow-cyan-600/20 flex items-center gap-3 mx-auto"
                    >
                      <Play className="w-6 h-6 fill-current" />
                      Genereer Demo Video
                    </button>
                    <p className="text-zinc-500 text-sm">
                      * Vereist een geldige Gemini API-sleutel met Veo toegang.
                    </p>
                  </div>
                )}

                {isGeneratingVideo && (
                  <div className="space-y-6">
                    <div className="relative">
                      <div className="w-20 h-20 border-4 border-cyan-600/20 border-t-cyan-600 rounded-full animate-spin mx-auto"></div>
                      <Video className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-cyan-600 w-8 h-8" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-2xl font-bold text-white">Video wordt gemaakt...</h3>
                      <p className="text-cyan-500 font-medium animate-pulse">{videoGenerationStep}</p>
                    </div>
                    <p className="text-zinc-500 text-sm max-w-sm mx-auto">
                      Onze AI regisseert nu een unieke demo video voor jou. Dit duurt meestal 1-2 minuten.
                    </p>
                  </div>
                )}

                {videoError && (
                  <div className="space-y-6">
                    <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto">
                      <AlertCircle className="text-red-500 w-10 h-10" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-white">Oeps! Er ging iets mis</h3>
                      <p className="text-zinc-400 mt-2">{videoError}</p>
                    </div>
                    <button 
                      onClick={handleGeneratePromoVideo}
                      className="bg-white text-zinc-900 px-8 py-4 rounded-xl font-bold hover:bg-zinc-100 transition-all"
                    >
                      Probeer Opnieuw
                    </button>
                  </div>
                )}

                {promoVideoUrl && (
                  <div className="relative w-full h-full">
                    <video 
                      autoPlay 
                      loop
                      playsInline
                      className="w-full h-full object-cover"
                      onPlay={(e) => {
                        const video = e.currentTarget;
                        const audio = document.getElementById('promo-audio') as HTMLAudioElement;
                        if (audio) {
                          audio.currentTime = 0;
                          audio.play();
                        }
                      }}
                    >
                      <source src={promoVideoUrl} type="video/mp4" />
                      Your browser does not support the video tag.
                    </video>
                    {promoAudioUrl && (
                      <audio 
                        id="promo-audio"
                        src={promoAudioUrl}
                        onTimeUpdate={(e) => {
                          const time = e.currentTarget.currentTime;
                          const subtitle = [...subtitles].reverse().find(s => s.time <= time);
                          if (subtitle) setCurrentSubtitle(subtitle.text);
                        }}
                        onEnded={() => setCurrentSubtitle('')}
                      />
                    )}
                    
                    {/* Subtitles Overlay */}
                    <AnimatePresence>
                      {currentSubtitle && (
                        <motion.div 
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          className="absolute bottom-12 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/10 text-white text-xl font-medium text-center max-w-[80%]"
                        >
                          {currentSubtitle}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
