
import React, { useState, useEffect, useRef } from 'react';
import { fetchGameData, parseGameSummary } from './services/espnService';
import { generateAnalysis, generateMascotVideo } from './services/geminiService';
import { GameSummary, AnalysisResponse } from './types';

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
        console.error("Data Load Error:", err);
        setError("ESPN feed connectivity limited. Check API endpoint.");
      }
    };
    loadData();

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
      
      const swoopPromise = generateMascotVideo(result.swoopScript, `${summary.team2.name} Mascot`, swoopRefImage || undefined);
      const kcWolfPromise = generateMascotVideo(result.kcWolfScript, `${summary.team1.name} Mascot`, kcWolfRefImage || undefined);

      const [swoopRes, kcRes] = await Promise.allSettled([swoopPromise, kcWolfPromise]);

      let errorMessages = [];

      if (swoopRes.status === 'fulfilled') {
        setVideoSwoop(swoopRes.value);
      } else {
        console.error("Swoop Video Error:", swoopRes.reason);
        errorMessages.push(`${summary.team2.abbreviation} Feed: ${swoopRes.reason.message || "Unknown error"}`);
      }

      if (kcRes.status === 'fulfilled') {
        setVideoKCWolf(kcRes.value);
      } else {
        console.error("KC Wolf Video Error:", kcRes.reason);
        errorMessages.push(`${summary.team1.abbreviation} Feed: ${kcRes.reason.message || "Unknown error"}`);
      }

      setVideoLoading(false);
      
      if (errorMessages.length > 0) {
        setError(`Broadcast Issues Detected: ${errorMessages.join(' | ')}`);
      }

      setTimeout(() => {
        document.getElementById('report-start')?.scrollIntoView({ behavior: 'smooth' });
      }, 300);
    } catch (err: any) {
      console.error("Generation failed:", err);
      setLoading(false);
      setVideoLoading(false);
      setError(err.message || "Broadcast engine failed to initialize analysis.");
    }
  };

  return (
    <div className="min-h-screen bg-[#020202] text-white font-sans selection:bg-red-600 pb-40">
      <div className="max-w-5xl mx-auto px-6 py-16">
        
        <header className="flex flex-col md:flex-row items-center justify-between gap-8 mb-20 border-b border-white/5 pb-12">
          <div className="text-center md:text-left">
            <h1 className="text-9xl font-black italic tracking-tighter leading-none mb-4">HIKE</h1>
            <p className="text-zinc-500 uppercase tracking-[0.4em] text-[10px] font-black">Halftime Insights and Key Evaluations</p>
          </div>
          
          <div className="flex items-center gap-12 bg-zinc-900/40 p-8 rounded-[2.5rem] border border-white/5 backdrop-blur-md shadow-2xl">
            <div className="flex flex-col items-center gap-2">
              <img src={summary?.team2.logo || "https://a.espncdn.com/i/teamlogos/nfl/500/nfl.png"} className="w-16 h-16 drop-shadow-2xl object-contain" alt={summary?.team2.name || "Away"} />
              <div className="flex flex-col items-center">
                <span className="text-2xl font-black italic">{summary?.team2.score ?? '0'}</span>
                <span className="text-[8px] font-black text-zinc-600 uppercase tracking-tighter">{summary?.team2.abbreviation}</span>
              </div>
            </div>
            <div className="text-center">
              <div className="text-[10px] font-black text-red-500 mb-1">SB LIX</div>
              <div className="text-zinc-700 text-xs font-bold uppercase tracking-widest">VS</div>
            </div>
            <div className="flex flex-col items-center gap-2">
              <img src={summary?.team1.logo || "https://a.espncdn.com/i/teamlogos/nfl/500/nfl.png"} className="w-16 h-16 drop-shadow-2xl object-contain" alt={summary?.team1.name || "Home"} />
              <div className="flex flex-col items-center">
                <span className="text-2xl font-black italic">{summary?.team1.score ?? '0'}</span>
                <span className="text-[8px] font-black text-zinc-600 uppercase tracking-tighter">{summary?.team1.abbreviation}</span>
              </div>
            </div>
          </div>
        </header>

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

        <input type="file" hidden ref={swoopInputRef} onChange={(e) => handleFileChange(e, 'swoop')} accept="image/*" />
        <input type="file" hidden ref={kcWolfInputRef} onChange={(e) => handleFileChange(e, 'kcwolf')} accept="image/*" />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-20">
          <button onClick={() => swoopInputRef.current?.click()} className={`p-8 rounded-[2.5rem] border transition-all flex flex-col items-center gap-4 group ${swoopRefImage ? 'bg-zinc-900 border-white/20' : 'bg-white/5 border-white/10 hover:border-white/20'}`}>
            <div className="w-24 h-24 rounded-full bg-zinc-800 flex items-center justify-center overflow-hidden border border-white/10 group-hover:border-red-600/50 transition-colors">
              {swoopRefImage ? (
                <img src={swoopRefImage} className="w-full h-full object-cover" alt="Mascot 1" />
              ) : (
                <i className="fa-solid fa-plus text-2xl text-zinc-600 group-hover:text-white transition-colors"></i>
              )}
            </div>
            <div className="text-center">
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 group-hover:text-white">Mascot Profile</span>
              <h3 className="text-xl font-black italic uppercase">{summary?.team2.abbreviation} Mascot</h3>
            </div>
          </button>

          <button onClick={() => kcWolfInputRef.current?.click()} className={`p-8 rounded-[2.5rem] border transition-all flex flex-col items-center gap-4 group ${kcWolfRefImage ? 'bg-zinc-900 border-white/20' : 'bg-white/5 border-white/10 hover:border-white/20'}`}>
            <div className="w-24 h-24 rounded-full bg-zinc-800 flex items-center justify-center overflow-hidden border border-white/10 group-hover:border-red-600/50 transition-colors">
              {kcWolfRefImage ? (
                <img src={kcWolfRefImage} className="w-full h-full object-cover" alt="Mascot 2" />
              ) : (
                <i className="fa-solid fa-plus text-2xl text-zinc-600 group-hover:text-white transition-colors"></i>
              )}
            </div>
            <div className="text-center">
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 group-hover:text-white">Mascot Profile</span>
              <h3 className="text-xl font-black italic uppercase">{summary?.team1.abbreviation} Mascot</h3>
            </div>
          </button>
        </div>

        {analysis && (
          <div id="report-start" className="space-y-16 animate-in fade-in slide-in-from-bottom-12 duration-1000">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-zinc-900/80 border border-zinc-800 rounded-[2.5rem] overflow-hidden relative aspect-video group shadow-2xl">
                {videoSwoop ? (
                  <video src={videoSwoop} className="w-full h-full object-cover" controls autoPlay muted loop playsInline />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-950 p-12 text-center">
                    {videoLoading ? (
                      <>
                        <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin mb-6"></div>
                        <p className="text-xs font-black uppercase tracking-widest animate-pulse text-red-600">Rendering {summary?.team2.abbreviation}...</p>
                      </>
                    ) : (
                      <p className="text-zinc-700 text-xs font-bold uppercase tracking-widest">Video Feed Unavailable</p>
                    )}
                  </div>
                )}
                <div className="absolute top-6 left-6 flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse shadow-[0_0_10px_#dc2626]"></div>
                  <span className="text-[10px] font-black uppercase tracking-widest bg-black/80 px-3 py-1.5 rounded-lg border border-white/5 backdrop-blur-md">{summary?.team2.abbreviation} BROADCAST</span>
                </div>
              </div>

              <div className="bg-zinc-900/80 border border-zinc-800 rounded-[2.5rem] overflow-hidden relative aspect-video group shadow-2xl">
                {videoKCWolf ? (
                  <video src={videoKCWolf} className="w-full h-full object-cover" controls autoPlay muted loop playsInline />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-950 p-12 text-center">
                    {videoLoading ? (
                      <>
                        <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin mb-6"></div>
                        <p className="text-xs font-black uppercase tracking-widest animate-pulse text-red-600">Rendering {summary?.team1.abbreviation}...</p>
                      </>
                    ) : (
                      <p className="text-zinc-700 text-xs font-bold uppercase tracking-widest">Video Feed Unavailable</p>
                    )}
                  </div>
                )}
                <div className="absolute top-6 left-6 flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse shadow-[0_0_10px_#dc2626]"></div>
                  <span className="text-[10px] font-black uppercase tracking-widest bg-black/80 px-3 py-1.5 rounded-lg border border-white/5 backdrop-blur-md">{summary?.team1.abbreviation} BROADCAST</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {Object.entries(analysis.combinedStats || {}).map(([key, val]: [string, any]) => (
                <div key={key} className="bg-zinc-900/50 border border-zinc-800 p-8 rounded-3xl text-center">
                  <div className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-4">{key.toUpperCase()}</div>
                  <div className="flex justify-around items-end">
                    <div className="flex flex-col items-center">
                      <span className="text-2xl font-black italic">{val.team2}</span>
                      <span className="text-[8px] font-bold text-zinc-500 mt-1 uppercase">{summary?.team2.abbreviation}</span>
                    </div>
                    <div className="w-px h-8 bg-zinc-800"></div>
                    <div className="flex flex-col items-center">
                      <span className="text-2xl font-black italic">{val.team1}</span>
                      <span className="text-[8px] font-bold text-zinc-500 mt-1 uppercase">{summary?.team1.abbreviation}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {[analysis.keysToWin?.team2, analysis.keysToWin?.team1].map((team, idx) => team && (
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
          <span className="max-w-md text-center">{error}</span>
          <button onClick={() => setError(null)} className="shrink-0 opacity-50 hover:opacity-100 transition-opacity"><i className="fa-solid fa-xmark"></i></button>
        </div>
      )}
    </div>
  );
};

export default App;
