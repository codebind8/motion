import React, { useState, useCallback, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { 
  Upload, 
  Video, 
  Zap, 
  Code2, 
  Info, 
  Loader2, 
  Play, 
  Layers,
  Sparkles,
  ChevronRight,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { extractFrames } from './utils/video';
import { analyzeAnimationFrames, type AnimationAnalysis } from './services/gemini';
import { CodeBlock } from './components/CodeBlock';

declare global {
  interface Window {
    aistudio: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [frames, setFrames] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [analysis, setAnalysis] = useState<AnimationAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'framer' | 'css' | 'gsap'>('framer');
  const [activePromptTab, setActivePromptTab] = useState<'chatgpt' | 'gemini' | 'framer' | 'generic'>('chatgpt');
  const [promptLength, setPromptLength] = useState<'concise' | 'detailed'>('detailed');

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      setVideoFile(file);
      setVideoUrl(URL.createObjectURL(file));
      setFrames([]);
      setAnalysis(null);
      setError(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'video/*': [] },
    multiple: false
  });

  const handleAnalyze = async () => {
    if (!videoFile) return;

    setIsProcessing(true);
    setError(null);
    try {
      // 1. Check if API key is selected (for paid models or if 404 occurred)
      if (window.aistudio && !(await window.aistudio.hasSelectedApiKey())) {
        await window.aistudio.openSelectKey();
        // Proceeding after openSelectKey as per instructions (assume success)
      }

      // 2. Extract 10 frames
      const extractedFrames = await extractFrames(videoFile, 10);
      setFrames(extractedFrames);

      // 3. Analyze with Gemini
      const result = await analyzeAnimationFrames(extractedFrames);
      setAnalysis(result);
    } catch (err: any) {
      console.error(err);
      const errorMessage = err.message || '';
      if (errorMessage.includes("Requested entity was not found") || (err.status === 404)) {
        setError('API Key required or model not found. Please select a valid API key.');
        if (window.aistudio) {
          await window.aistudio.openSelectKey();
        }
      } else {
        setError('Failed to analyze animation. Please try again.');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const reset = () => {
    setVideoFile(null);
    setVideoUrl(null);
    setFrames([]);
    setAnalysis(null);
    setError(null);
  };

  const getFrameLabel = (index: number) => {
    if (index === 0) return "Frame 1 (Start)";
    if (index === 9) return "Frame 10 (End)";
    return `Frame ${index + 1}`;
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-zinc-100 font-sans selection:bg-emerald-500/30">
      {/* Header */}
      <header className="border-b border-zinc-800/50 bg-zinc-900/30 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.3)]">
              <Zap size={18} className="text-black fill-black" />
            </div>
            <h1 className="text-lg font-bold tracking-tight">
              Motion<span className="text-emerald-500">Reverse</span> AI
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <a 
              href="https://github.com" 
              target="_blank" 
              className="text-sm text-zinc-400 hover:text-zinc-100 transition-colors"
            >
              Documentation
            </a>
            <button className="px-4 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-full text-sm font-medium transition-all border border-zinc-700">
              Feedback
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Upload & Video & Timeline */}
          <div className="lg:col-span-6 space-y-8">
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                  <Video size={14} /> Video Upload
                </h2>
                {videoFile && (
                  <button 
                    onClick={reset}
                    className="text-xs text-zinc-500 hover:text-zinc-300 flex items-center gap-1 transition-colors"
                  >
                    <RefreshCw size={12} /> Change Video
                  </button>
                )}
              </div>

              {!videoFile ? (
                <div 
                  {...getRootProps()} 
                  className={cn(
                    "border-2 border-dashed rounded-2xl p-12 flex flex-col items-center justify-center gap-4 transition-all cursor-pointer group",
                    isDragActive ? "border-emerald-500 bg-emerald-500/5" : "border-zinc-800 hover:border-zinc-700 bg-zinc-900/20"
                  )}
                >
                  <input {...getInputProps()} />
                  <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Upload size={24} className="text-zinc-400 group-hover:text-emerald-500" />
                  </div>
                  <div className="text-center">
                    <p className="font-medium text-zinc-200">Drop animation recording here</p>
                    <p className="text-sm text-zinc-500 mt-1">MP4, MOV, or GIF (max 10MB)</p>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl overflow-hidden border border-zinc-800 bg-black relative group shadow-2xl">
                  <video 
                    src={videoUrl!} 
                    controls 
                    className="w-full aspect-video object-contain"
                  />
                  {!analysis && !isProcessing && (
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                      <div className="px-4 py-2 bg-emerald-500 text-black rounded-full font-bold text-sm flex items-center gap-2">
                        <Play size={14} fill="black" /> Ready to Analyze
                      </div>
                    </div>
                  )}
                </div>
              )}

              {videoFile && !analysis && (
                <button
                  onClick={handleAnalyze}
                  disabled={isProcessing}
                  className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 disabled:bg-zinc-800 disabled:text-zinc-500 text-black font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.2)]"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 size={20} className="animate-spin" />
                      Deconstructing Motion...
                    </>
                  ) : (
                    <>
                      <Sparkles size={20} />
                      Analyze Animation
                    </>
                  )}
                </button>
              )}
            </section>

            {/* Horizontal Frame Timeline */}
            <AnimatePresence>
              {frames.length > 0 && (
                <motion.section 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                    <Layers size={14} /> Frame Timeline
                  </h2>
                  <div className="relative">
                    <div className="flex overflow-x-auto gap-4 pb-6 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
                      {frames.map((frame, i) => (
                        <motion.div 
                          key={i}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: i * 0.05 }}
                          className="flex-shrink-0 w-48 space-y-2"
                        >
                          <div className="aspect-video rounded-lg border border-zinc-800 overflow-hidden bg-zinc-900 shadow-lg">
                            <img src={frame} alt={`Frame ${i + 1}`} className="w-full h-full object-cover" />
                          </div>
                          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-tighter text-center">
                            {getFrameLabel(i)}
                          </p>
                        </motion.div>
                      ))}
                    </div>
                    <div className="absolute bottom-3 left-0 right-0 h-0.5 bg-zinc-800 rounded-full">
                      <div className="h-full bg-emerald-500/50 w-full rounded-full" />
                    </div>
                  </div>
                </motion.section>
              )}
            </AnimatePresence>
          </div>

          {/* Right Column: Analysis & Code */}
          <div className="lg:col-span-6 space-y-8">
            {!analysis && !isProcessing && !error && (
              <div className="h-full flex flex-col items-center justify-center text-center p-12 border border-zinc-800/50 rounded-3xl bg-zinc-900/10 border-dashed">
                <div className="w-20 h-20 rounded-full bg-zinc-900 flex items-center justify-center mb-6">
                  <Code2 size={32} className="text-zinc-700" />
                </div>
                <h3 className="text-xl font-bold text-zinc-300">No Analysis Yet</h3>
                <p className="text-zinc-500 max-w-xs mt-2">
                  Upload a video and click analyze to generate production-ready animation code.
                </p>
              </div>
            )}

            {isProcessing && (
              <div className="space-y-6">
                <div className="p-8 border border-emerald-500/20 rounded-3xl bg-emerald-500/5 animate-pulse">
                  <div className="flex items-center gap-3 mb-4">
                    <Loader2 size={20} className="animate-spin text-emerald-500" />
                    <span className="text-emerald-500 font-medium">AI is deconstructing the motion path...</span>
                  </div>
                  <div className="h-4 bg-emerald-500/10 rounded-full w-3/4 mb-3" />
                  <div className="h-4 bg-emerald-500/10 rounded-full w-1/2" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="h-32 bg-zinc-900 rounded-2xl animate-pulse" />
                  <div className="h-32 bg-zinc-900 rounded-2xl animate-pulse" />
                </div>
              </div>
            )}

            {error && (
              <div className="p-6 border border-red-500/20 rounded-2xl bg-red-500/5 text-red-400 flex items-center gap-3">
                <Info size={20} />
                <p>{error}</p>
              </div>
            )}

            <AnimatePresence>
              {analysis && (
                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-8"
                >
                  {/* Animation Analysis Panel */}
                  <section className="p-8 border border-zinc-800 rounded-3xl bg-zinc-900/30 backdrop-blur-sm space-y-8">
                    <div>
                      <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-widest flex items-center gap-2 mb-4">
                        <Info size={14} /> Animation Summary
                      </h2>
                      <p className="text-lg text-zinc-200 leading-relaxed">
                        {analysis.summary}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-2">
                        <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Initial State</h3>
                        <p className="text-sm text-zinc-300 bg-zinc-950/50 p-3 rounded-xl border border-zinc-800/50">{analysis.initialState}</p>
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Mid Motion</h3>
                        <p className="text-sm text-zinc-300 bg-zinc-950/50 p-3 rounded-xl border border-zinc-800/50">{analysis.midMotion}</p>
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Final State</h3>
                        <p className="text-sm text-zinc-300 bg-zinc-950/50 p-3 rounded-xl border border-zinc-800/50">{analysis.finalState}</p>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3">Animation Properties</h3>
                      <div className="flex flex-wrap gap-2">
                        {analysis.properties.map((prop, i) => (
                          <span 
                            key={i}
                            className="px-3 py-1 bg-emerald-500/10 text-emerald-500 rounded-full text-xs font-medium border border-emerald-500/20"
                          >
                            {prop}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3">Tracked UI Elements</h3>
                      <div className="grid grid-cols-1 gap-4">
                        {analysis.trackedElements.map((element, i) => (
                          <div key={i} className="p-4 bg-zinc-950/50 rounded-2xl border border-zinc-800/50 space-y-2">
                            <div className="flex items-center justify-between">
                              <h4 className="text-sm font-bold text-emerald-500">{element.name}</h4>
                              <div className="flex gap-1">
                                {element.properties.map((prop, j) => (
                                  <span key={j} className="text-[9px] px-1.5 py-0.5 bg-zinc-800 text-zinc-400 rounded border border-zinc-700">
                                    {prop}
                                  </span>
                                ))}
                              </div>
                            </div>
                            <p className="text-xs text-zinc-400 leading-relaxed italic">
                              "{element.motionPath}"
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3">Step-by-Step Explanation</h3>
                      <div className="space-y-3">
                        {analysis.stepByStep.map((step, i) => (
                          <div key={i} className="flex gap-3 text-sm text-zinc-400">
                            <span className="text-emerald-500 font-bold">{i + 1}.</span>
                            <p>{step}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </section>

                  {/* Code Generation Tabs */}
                  <section className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                        <Code2 size={14} /> Code Generation
                      </h2>
                      <div className="flex p-1 bg-zinc-900 rounded-lg border border-zinc-800">
                        {(['framer', 'css', 'gsap'] as const).map((tab) => (
                          <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={cn(
                              "px-4 py-1.5 rounded-md text-xs font-bold transition-all uppercase tracking-wider",
                              activeTab === tab 
                                ? "bg-emerald-500 text-black shadow-lg" 
                                : "text-zinc-500 hover:text-zinc-300"
                            )}
                          >
                            {tab}
                          </button>
                        ))}
                      </div>
                    </div>

                    <motion.div
                      key={activeTab}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      {activeTab === 'framer' && (
                        <CodeBlock 
                          code={analysis.framerMotionCode} 
                          language="Framer Motion" 
                        />
                      )}
                      {activeTab === 'css' && (
                        <CodeBlock 
                          code={analysis.cssCode} 
                          language="CSS Keyframes" 
                        />
                      )}
                      {activeTab === 'gsap' && (
                        <CodeBlock 
                          code={analysis.gsapCode} 
                          language="GSAP" 
                        />
                      )}
                    </motion.div>
                  </section>

                  {/* AI Prompt Generator */}
                  <section className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                          <Sparkles size={14} /> AI Prompt Generator
                        </h2>
                        <p className="text-[10px] text-zinc-500 mt-1">Generate a ready-to-use prompt to recreate this animation using other AI tools.</p>
                      </div>
                      <div className="flex p-1 bg-zinc-900 rounded-lg border border-zinc-800">
                        {(['concise', 'detailed'] as const).map((len) => (
                          <button
                            key={len}
                            onClick={() => setPromptLength(len)}
                            className={cn(
                              "px-3 py-1 rounded-md text-[10px] font-bold transition-all uppercase tracking-wider",
                              promptLength === len 
                                ? "bg-zinc-700 text-zinc-100" 
                                : "text-zinc-500 hover:text-zinc-300"
                            )}
                          >
                            {len}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="p-6 border border-zinc-800 rounded-3xl bg-zinc-900/30 backdrop-blur-sm space-y-6">
                      <div className="flex p-1 bg-zinc-950 rounded-xl border border-zinc-800 w-full">
                        {(['chatgpt', 'gemini', 'framer', 'generic'] as const).map((tab) => (
                          <button
                            key={tab}
                            onClick={() => setActivePromptTab(tab)}
                            className={cn(
                              "flex-1 px-4 py-2 rounded-lg text-xs font-bold transition-all capitalize tracking-wide",
                              activePromptTab === tab 
                                ? "bg-emerald-500 text-black shadow-lg" 
                                : "text-zinc-500 hover:text-zinc-300"
                            )}
                          >
                            {tab === 'chatgpt' ? 'ChatGPT' : tab === 'gemini' ? 'Gemini' : tab === 'framer' ? 'Framer AI' : 'Generic'}
                          </button>
                        ))}
                      </div>

                      <motion.div
                        key={`${activePromptTab}-${promptLength}`}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2 }}
                        className="space-y-4"
                      >
                        <div className="flex items-center justify-between px-2">
                          <span className="text-[10px] text-zinc-500 font-medium italic">
                            {activePromptTab === 'chatgpt' && "Optimized for React and Framer Motion logic."}
                            {activePromptTab === 'gemini' && "Focuses on technical properties and spatial reasoning."}
                            {activePromptTab === 'framer' && "Tailored for Framer components and layout engine."}
                            {activePromptTab === 'generic' && "A tool-agnostic description of the motion and logic."}
                          </span>
                        </div>
                        <CodeBlock 
                          code={analysis.aiPrompts[activePromptTab][promptLength]} 
                          language="AI Prompt" 
                        />
                      </motion.div>
                    </div>
                  </section>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-6 py-12 border-t border-zinc-900 mt-20">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2 opacity-50">
            <Zap size={16} />
            <span className="text-sm font-bold">MotionReverse AI</span>
          </div>
          <p className="text-sm text-zinc-600">
            Built for designers and developers who value motion precision.
          </p>
          <div className="flex gap-8">
            <a href="#" className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">Privacy</a>
            <a href="#" className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">Terms</a>
            <a href="#" className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">API</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
