
import React, { useState, useEffect, useRef } from 'react';
import { fetchGameData, parseGameSummary } from './services/espnService';
import { generateAnalysis, generateMascotVideo } from './services/geminiService';
import { GameSummary, AnalysisResponse } from './types';

// Fix: Use global var declaration to avoid "identical modifiers" conflict on Window interface.
// This ensures that the existing window.aistudio object is typed correctly without conflicting with other declarations.
declare global {
  var aistudio: {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  };
}

const App: React.FC = () => {
  const [summary, setSummary] = useState<GameSummary | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [videoLoading, setVideoLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [videoSwoop, setVideoSwoop] = useState<string | null>(null);
  const [videoKCWolf, setVideoKCWolf] = useState<string | null>(null);
  const [hasApiKey, setHasApiKey] = useState<boolean>(false);

  // Mascot Reference Images
  const [swoopRefImage, setSwoopRefImage] = useState<string | null>(null);
  const [kcWolfRefImage, setKcWolfRefImage] = useState<string | null>(null);

  const swoopInputRef = useRef<HTMLInputElement>(null);
  const kcWolfInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const checkApiKey = async () => {
      try {
        const selected = await window.aistudio.hasSelectedApiKey();
        setHasApiKey(selected);
      } catch (err) {
        console.error("Error checking API key status:", err);
      }
    };
    checkApiKey();

    const loadData = async () => {
      try {
        const raw = await fetchGameData();
        const parsed = parseGameSummary(raw);
        setSummary(parsed);
      } catch (err: any) {
        setError("ESPN feed connectivity limited. Grounding via Search.");
      }
    };
    loadData();

    // Cleanup Object URLs on unmount
    return () => {
      if (videoSwoop) URL.revokeObjectURL(videoSwoop);
      if (videoKCWolf) URL.revokeObjectURL(videoKCWolf);
    };
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, mascot: 'swoop' | 'kcwolf') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (mascot === 'swoop') setSwoopRefImage(reader.result as string);
        else setKcWolfRefImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleOpenKeySelection = async () => {
    try {
      await window.aistudio.openSelectKey();
      // Assume success as per race condition guidelines
      setHasApiKey(true);
    } catch (err) {
      console.error("Error opening key selection:", err);
    }
  };

  const handleGenerate = async () => {
    if (!summary) {
      setError("Please wait for game data to sync.");
      return;
    }

    if (!hasApiKey) {
      await handleOpenKeySelection();
    }

    setLoading(true);
    setAnalysis(null);
    setVideoSwoop(null);
    setVideoKCWolf(null);
    setError(null);

    try {
      const result = await generateAnalysis(summary, { 
        swoop: swoopRefImage || undefined, 
        kcWolf: kcWolfRefImage || undefined 
      });
      setAnalysis(result);
      
      setVideoLoading(true);
      
      const swoopPromise = generateMascotVideo(result.swoopScript, "Swoop (Philadelphia Eagles Mascot)", swoopRefImage || undefined);
      const kcWolfPromise = generateMascotVideo(result.kcWolfScript, "KC Wolf (Kansas City Chiefs Mascot)", kcWolfRefImage || undefined);

      Promise.all([swoopPromise, kcWolfPromise]).then(([swoopUrl, kcUrl]) => {
        setVideoSwoop(swoopUrl);
        setVideoKCWolf(kcUrl);
        setVideoLoading(false);
      }).catch(async (err: any) => {
        console.error("Video generation failed:", err);
        setVideoLoading(false);
        // Reset key selection if the entity was not found (paid key requirement)
        if (err.message?.includes("Requested entity was not found")) {
          setError("API key from a paid GCP project required.");
          setHasApiKey(false);
        } else {
          setError("Broadcast engine encountered a temporary glitch in video production.");
        }
      });

      setTimeout(() => {
        document.getElementById('report-start')?.scrollIntoView({ behavior: 'smooth' });
      }, 300);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020202] text-white font-sans selection:bg-red-600 pb-40">
      <div className="max-w-5xl mx-auto px-6 py-16">
        
        {/* Header Section */}
        <header className="flex flex-col md:flex-row items-center justify-between gap-8 mb-20 border-b border-white/5 pb-12">
          <div className="text-center md:text-left">
            <h1 className="text-9xl font-black italic tracking-tighter leading-none mb-4">HIKE</h1>
            <p className="text-zinc-500 uppercase tracking-[0.5em] text-[10px] font-black">AI Halftime Commercial Generator</p>
          </div>
          
          <div className="flex items-center gap-12 bg-zinc-900/40 p-8 rounded-[2rem] border border-white/5 backdrop-blur-md">
            <div className="flex flex-col items-center gap-2">
              <img src={summary?.team1.logo || "https://a.espncdn.com/i/teamlogos/nfl/500/kc.png"} className="w-16 h-16 drop-shadow-2xl" alt="T1" />
              <span className="text-2xl font-black italic">{summary?.team1.score ?? '--'}</span>
            </div>
            <div className="text-center">
              <div className="text-[10px] font-black text-red-500 mb-1">SB LIX</div>
              <div className="text-zinc-700 text-xs font-bold uppercase tracking-widest">VS</div>
            </div>
            <div className="flex flex-col items-center gap-2">
              <img src={summary?.team2.logo || "https://a.espncdn.com/i/teamlogos/nfl/500/phi.png"} className="w-16 h-16 drop-shadow-2xl" alt="T2" />
              <span className="text-2xl font-black italic">{summary?.team2.score ?? '--'}</span>
            </div>
          </div>
        </header>

        {/* Action Bar */}
        <div className="mb-20 space-y-4">
          {!hasApiKey && (
            <div className="bg-amber-900/20 border border-amber-500/30 p-4 rounded-2xl flex items-center justify-between">
              <div className="flex flex-col">
                <p className="text-xs font-bold text-amber-500 uppercase tracking-widest">Paid API Key Required</p>
                <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noreferrer" className="text-[8px] text-amber-500/70 underline mt-1 uppercase font-bold tracking-tighter">Billing Details</a>
              </div>
              <button onClick={handleOpenKeySelection} className="px-4 py-2 bg-amber-500 text-black font-black text-[10px] rounded-lg uppercase tracking-widest">Select Key</button>
            </div>
          )}
          
          <button 
            onClick={handleGenerate}
            disabled={loading}
            className="group relative w-full h-24 bg-red-600 hover:bg-red-500 text-white rounded-3xl transition-all active:scale-95 disabled:opacity-30 overflow-hidden shadow-2xl shadow-red-600/20"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
            <div className="flex items-center justify-center gap-4">
              {loading ? (
                <span className="font-black text-xl italic uppercase tracking-tight">Syncing Broadcast Pipeline...</span>
              ) : (
                <>
                  <i className="fa-solid fa-bolt-lightning text-xl"></i>
                  <span className="font-black text-2xl italic uppercase tracking-tighter">Produce AI Halftime Broadcast</span>
                </>
              )}
            </div>
          </button>
        </div>

        {/* Mascot Image Uploaders (Hidden inputs) */}
        <input type="file" hidden ref={swoopInputRef} onChange={(e) => handleFileChange(e, 'swoop')} accept="image/*" />
        <input type="file" hidden ref={kcWolfInputRef} onChange={(e) => handleFileChange(e, 'kcwolf')} accept="image/*" />

        {/* Mascot Selection / Upload UI */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-20">
          <button onClick={() => swoopInputRef.current?.click()} className={`p-8 rounded-[2.5rem] border transition-all flex flex-col items-center gap-4 group ${swoopRefImage ? 'bg-zinc-900 border-white/20' : 'bg-white/5 border-white/10 hover:border-white/20'}`}>
            <div className="w-24 h-24 rounded-full bg-zinc-800 flex items-center justify-center overflow-hidden border border-white/10 group-hover:border-red-600/50 transition-colors">
              {swoopRefImage ? (
                <img src={swoopRefImage} className="w-full h-full object-cover" alt="Swoop" />
              ) : (
                <i className="fa-solid fa-plus text-2xl text-zinc-600 group-hover:text-white transition-colors"></i>
              )}
            </div>
            <div className="text-center">
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 group-hover:text-white">Mascot Profile</span>
              <h3 className="text-xl font-black italic uppercase">Eagles (Swoop)</h3>
            </div>
          </button>

          <button onClick={() => kcWolfInputRef.current?.click()} className={`p-8 rounded-[2.5rem] border transition-all flex flex-col items-center gap-4 group ${kcWolfRefImage ? 'bg-zinc-900 border-white/20' : 'bg-white/5 border-white/10 hover:border-white/20'}`}>
            <div className="w-24 h-24 rounded-full bg-zinc-800 flex items-center justify-center overflow-hidden border border-white/10 group-hover:border-red-600/50 transition-colors">
              {kcWolfRefImage ? (
                <img src={kcWolfRefImage} className="w-full h-full object-cover" alt="KC Wolf" />
              ) : (
                <i className="fa-solid fa-plus text-2xl text-zinc-600 group-hover:text-white transition-colors"></i>
              )}
            </div>
            <div className="text-center">
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 group-hover:text-white">Mascot Profile</span>
              <h3 className="text-xl font-black italic uppercase">Chiefs (KC Wolf)</h3>
            </div>
          </button>
        </div>

        {analysis && (
          <div id="report-start" className="space-y-16 animate-in fade-in slide-in-from-bottom-12 duration-1000">
            
            {/* Mascot Video Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Swoop Video (Eagles) */}
              <div className="bg-zinc-900/80 border border-zinc-800 rounded-[2.5rem] overflow-hidden relative aspect-video group shadow-2xl">
                {videoSwoop ? (
                  <video src={videoSwoop} className="w-full h-full object-cover" controls autoPlay muted loop playsInline />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-950 p-12 text-center">
                    {videoLoading ? (
                      <>
                        <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin mb-6"></div>
                        <p className="text-xs font-black uppercase tracking-widest animate-pulse text-red-600">Syncing Broadcast Data...</p>
                        <p className="text-[9px] text-zinc-500 mt-2 max-w-[200px]">Veo 3.1 is currently rendering a custom halftime recap for Swoop. This can take up to 2 minutes.</p>
                      </>
                    ) : (
                      <p className="text-zinc-700 text-xs font-bold uppercase tracking-widest">Video Engine Offline</p>
                    )}
                  </div>
                )}
                <div className="absolute top-6 left-6 flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse shadow-[0_0_10px_#dc2626]"></div>
                  <span className="text-[10px] font-black uppercase tracking-widest bg-black/80 px-3 py-1.5 rounded-lg border border-white/5 backdrop-blur-md">SWOOP LIVE // PHI</span>
                </div>
              </div>

              {/* KC Wolf Video (Chiefs) */}
              <div className="bg-zinc-900/80 border border-zinc-800 rounded-[2.5rem] overflow-hidden relative aspect-video group shadow-2xl">
                {videoKCWolf ? (
                  <video src={videoKCWolf} className="w-full h-full object-cover" controls autoPlay muted loop playsInline />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-950 p-12 text-center">
                    {videoLoading ? (
                      <>
                        <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin mb-6"></div>
                        <p className="text-xs font-black uppercase tracking-widest animate-pulse text-red-600">Generating Motion Assets...</p>
                        <p className="text-[9px] text-zinc-500 mt-2 max-w-[200px]">Custom character motion is being synthesized using the uploaded reference mascot.</p>
                      </>
                    ) : (
                      <p className="text-zinc-700 text-xs font-bold uppercase tracking-widest">Video Engine Offline</p>
                    )}
                  </div>
                )}
                <div className="absolute top-6 left-6 flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse shadow-[0_0_10px_#dc2626]"></div>
                  <span className="text-[10px] font-black uppercase tracking-widest bg-black/80 px-3 py-1.5 rounded-lg border border-white/5 backdrop-blur-md">KC WOLF LIVE // KC</span>
                </div>
              </div>
            </div>

            {/* Combined Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {Object.entries(analysis.combinedStats || {}).map(([key, val]: [string, any]) => (
                <div key={key} className="bg-zinc-900/50 border border-zinc-800 p-8 rounded-3xl text-center">
                  <div className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-4">{key.toUpperCase()}</div>
                  <div className="flex justify-around items-end">
                    <div className="flex flex-col items-center">
                      <span className="text-2xl font-black italic">{val.team1}</span>
                      <span className="text-[8px] font-bold text-zinc-500 mt-1 uppercase">KC</span>
                    </div>
                    <div className="w-px h-8 bg-zinc-800"></div>
                    <div className="flex flex-col items-center">
                      <span className="text-2xl font-black italic">{val.team2}</span>
                      <span className="text-[8px] font-bold text-zinc-500 mt-1 uppercase">PHI</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Strategy Display */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {[analysis.keysToWin?.team1, analysis.keysToWin?.team2].map((team, idx) => team && (
                <div key={idx} className="bg-zinc-900/20 border border-zinc-800 p-10 rounded-[2.5rem] hover:bg-zinc-900/40 transition-colors">
                  <h4 className="text-xl font-black italic uppercase text-white/90 mb-6">{team.name} Strategy</h4>
                  <ul className="space-y-4">
                    {team.keys?.map((key: string, k: number) => (
                      <li key={k} className="flex gap-4 text-zinc-400 font-bold text-sm">
                        <span className="text-red-600 italic font-black">/</span> {key}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            {/* Sources grounding */}
            <footer className="pt-12 border-t border-zinc-900 flex flex-col md:flex-row justify-between items-center gap-6 text-[10px] text-zinc-600 font-black uppercase tracking-widest">
              <span>Grounding: ESPN API + Google Search Real-Time Sync</span>
              <div className="flex gap-4 flex-wrap justify-center">
                {analysis.sources?.map((s, i) => (
                  <a key={i} href={s.uri} target="_blank" rel="noreferrer" className="hover:text-white transition-colors border-b border-transparent hover:border-white pb-0.5">{s.title}</a>
                ))}
              </div>
            </footer>
          </div>
        )}
      </div>

      {error && (
        <div className="fixed bottom-12 left-1/2 -translate-x-1/2 bg-red-600 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl z-[100] flex items-center gap-4 border border-white/10 backdrop-blur-md">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="opacity-50 hover:opacity-100 transition-opacity"><i className="fa-solid fa-xmark"></i></button>
        </div>
      )}
    </div>
  );
};

export default App;
