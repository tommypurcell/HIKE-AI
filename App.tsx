
import React, { useState, useEffect, useRef } from 'react';
import { fetchGameData, parseGameSummary } from './services/espnService';
import { generateStrategy, generateScripts, generateMascotVideo } from './services/geminiService';
import { GameSummary } from './types';

declare global {
  var aistudio: {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  };
}

type Step = 'ASSETS' | 'DATA' | 'STRATEGY' | 'SCRIPTS' | 'RENDER' | 'RESULTS';

const App: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<Step>('ASSETS');
  const [summary, setSummary] = useState<GameSummary | null>(null);
  const [strategy, setStrategy] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [videoAway, setVideoAway] = useState<string | null>(null);
  const [videoHome, setVideoHome] = useState<string | null>(null);
  const [hasApiKey, setHasApiKey] = useState<boolean>(false);

  // Production Assets (Mascot Images)
  const [awayMascotImage, setAwayMascotImage] = useState<string | null>(null);
  const [homeMascotImage, setHomeMascotImage] = useState<string | null>(null);
  
  // Script Settings
  const [scriptTone, setScriptTone] = useState<'hype' | 'analytical' | 'aggressive'>('analytical');
  const [awayScript, setAwayScript] = useState<string>('');
  const [homeScript, setHomeScript] = useState<string>('');

  const awayInputRef = useRef<HTMLInputElement>(null);
  const homeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const checkApiKey = async () => {
      try {
        const selected = await window.aistudio.hasSelectedApiKey();
        setHasApiKey(selected);
      } catch (err) {
        console.error("API Key check error:", err);
      }
    };
    checkApiKey();

    const loadData = async () => {
      try {
        const raw = await fetchGameData();
        const parsed = parseGameSummary(raw);
        setSummary(parsed);
      } catch (err: any) {
        setError("ESPN feed connectivity limited.");
      }
    };
    loadData();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'away' | 'home') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (type === 'away') setAwayMascotImage(reader.result as string);
        else setHomeMascotImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const processToStrategy = async () => {
    if (!summary) return;
    setLoading(true);
    setError(null);
    try {
      const result = await generateStrategy(summary);
      setStrategy(result);
      setCurrentStep('STRATEGY');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const processToScripts = async () => {
    if (!summary || !strategy) return;
    setLoading(true);
    setError(null);
    try {
      const result = await generateScripts(summary, strategy, { tone: scriptTone });
      setAwayScript(result.awayScript);
      setHomeScript(result.homeScript);
      setCurrentStep('SCRIPTS');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFinalRender = async () => {
    if (!hasApiKey) {
      await window.aistudio.openSelectKey();
      setHasApiKey(true);
    }
    setCurrentStep('RENDER');
    setError(null);

    try {
      const awayPromise = generateMascotVideo(awayScript, `${summary?.team2.name} Mascot`, awayMascotImage || undefined);
      const homePromise = generateMascotVideo(homeScript, `${summary?.team1.name} Mascot`, homeMascotImage || undefined);

      const [awayRes, homeRes] = await Promise.allSettled([awayPromise, homePromise]);

      if (awayRes.status === 'fulfilled') setVideoAway(awayRes.value);
      if (homeRes.status === 'fulfilled') setVideoHome(homeRes.value);

      if (awayRes.status === 'rejected' && homeRes.status === 'rejected') {
        throw new Error("Render quota exceeded or failed. Try again in a moment.");
      }
      
      setCurrentStep('RESULTS');
    } catch (err: any) {
      setError(err.message);
      setCurrentStep('SCRIPTS');
    }
  };

  const renderStepIcon = (step: Step, label: string) => {
    const steps: Step[] = ['ASSETS', 'DATA', 'STRATEGY', 'SCRIPTS', 'RENDER', 'RESULTS'];
    const isActive = currentStep === step;
    const isCompleted = steps.indexOf(currentStep) > steps.indexOf(step);
    return (
      <div className={`flex flex-col items-center gap-2 ${isActive ? 'text-red-600' : isCompleted ? 'text-zinc-400' : 'text-zinc-700'}`}>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 font-black text-xs transition-colors ${isActive ? 'border-red-600 bg-red-600 text-white' : isCompleted ? 'border-zinc-400 bg-zinc-400 text-black' : 'border-zinc-700'}`}>
          {isCompleted ? <i className="fa-solid fa-check"></i> : steps.indexOf(step) + 1}
        </div>
        <span className="text-[8px] font-black uppercase tracking-tighter">{label}</span>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#020202] text-white font-sans selection:bg-red-600 pb-40">
      <div className="max-w-5xl mx-auto px-6 pt-12">
        
        {/* Production Stepper */}
        <div className="flex justify-between max-w-xl mx-auto mb-16 relative">
          <div className="absolute top-4 left-0 right-0 h-px bg-zinc-900 -z-10"></div>
          {renderStepIcon('ASSETS', 'Assets')}
          {renderStepIcon('DATA', 'Data')}
          {renderStepIcon('STRATEGY', 'Strategy')}
          {renderStepIcon('SCRIPTS', 'Scripts')}
          {renderStepIcon('RENDER', 'Render')}
          {renderStepIcon('RESULTS', 'Broadcast')}
        </div>

        {/* Step: ASSETS */}
        {currentStep === 'ASSETS' && (
          <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="text-center mb-12">
              <h1 className="text-7xl font-black italic tracking-tighter mb-4 uppercase">Studio Assets</h1>
              <p className="text-zinc-500 uppercase tracking-widest text-xs font-black">Upload mascot images for each team's AI avatar</p>
            </div>
            
            <input type="file" hidden ref={awayInputRef} onChange={(e) => handleFileChange(e, 'away')} accept="image/*" />
            <input type="file" hidden ref={homeInputRef} onChange={(e) => handleFileChange(e, 'home')} accept="image/*" />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
              <button onClick={() => awayInputRef.current?.click()} className={`p-10 rounded-[3rem] border transition-all flex flex-col items-center gap-6 group ${awayMascotImage ? 'bg-zinc-900 border-red-600/30 shadow-xl' : 'bg-zinc-950 border-white/5 hover:border-white/10'}`}>
                <div className="w-32 h-32 rounded-full bg-zinc-900 flex items-center justify-center overflow-hidden border border-white/10 group-hover:border-red-600/50">
                  {awayMascotImage ? <img src={awayMascotImage} className="w-full h-full object-cover" /> : <i className="fa-solid fa-camera text-3xl text-zinc-700"></i>}
                </div>
                <div className="text-center">
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600 group-hover:text-white">Away Team Mascot</span>
                  <h3 className="text-2xl font-black italic uppercase mt-1">{summary?.team2.name || "Away Team"}</h3>
                </div>
              </button>

              <button onClick={() => homeInputRef.current?.click()} className={`p-10 rounded-[3rem] border transition-all flex flex-col items-center gap-6 group ${homeMascotImage ? 'bg-zinc-900 border-red-600/30 shadow-xl' : 'bg-zinc-950 border-white/5 hover:border-white/10'}`}>
                <div className="w-32 h-32 rounded-full bg-zinc-900 flex items-center justify-center overflow-hidden border border-white/10 group-hover:border-red-600/50">
                  {homeMascotImage ? <img src={homeMascotImage} className="w-full h-full object-cover" /> : <i className="fa-solid fa-camera text-3xl text-zinc-700"></i>}
                </div>
                <div className="text-center">
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600 group-hover:text-white">Home Team Mascot</span>
                  <h3 className="text-2xl font-black italic uppercase mt-1">{summary?.team1.name || "Home Team"}</h3>
                </div>
              </button>
            </div>

            <button onClick={() => setCurrentStep('DATA')} className="w-full py-6 bg-white text-black font-black italic text-xl uppercase rounded-3xl hover:bg-zinc-200 transition-all">
              Continue to Data Verification
            </button>
          </div>
        )}

        {/* Step: DATA */}
        {currentStep === 'DATA' && summary && (
          <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="text-center mb-12">
              <h2 className="text-5xl font-black italic tracking-tighter mb-4 uppercase">Halftime Sync</h2>
              <p className="text-zinc-500 uppercase tracking-widest text-xs font-black">Confirm real-time statistics from the first half</p>
            </div>

            <div className="bg-zinc-900/30 border border-white/5 p-12 rounded-[3rem] backdrop-blur-xl mb-8 shadow-2xl">
              <div className="flex items-center justify-around mb-12">
                <div className="text-center">
                  <img src={summary.team2.logo} className="w-20 h-20 mx-auto mb-4" />
                  <input 
                    type="number" 
                    value={summary.team2.score} 
                    onChange={(e) => setSummary({...summary, team2: {...summary.team2, score: parseInt(e.target.value)}})}
                    className="bg-transparent text-6xl font-black italic w-24 text-center border-b border-zinc-800 focus:border-red-600 outline-none"
                  />
                  <div className="text-zinc-600 font-black mt-2 uppercase text-xs">{summary.team2.name}</div>
                </div>
                <div className="text-zinc-800 font-black text-2xl italic">VS</div>
                <div className="text-center">
                  <img src={summary.team1.logo} className="w-20 h-20 mx-auto mb-4" />
                  <input 
                    type="number" 
                    value={summary.team1.score} 
                    onChange={(e) => setSummary({...summary, team1: {...summary.team1, score: parseInt(e.target.value)}})}
                    className="bg-transparent text-6xl font-black italic w-24 text-center border-b border-zinc-800 focus:border-red-600 outline-none"
                  />
                  <div className="text-zinc-600 font-black mt-2 uppercase text-xs">{summary.team1.name}</div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-6 bg-black/40 rounded-2xl border border-white/5">
                  <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-4 block">{summary.team2.abbreviation} Stats</label>
                  <div className="space-y-4">
                    {['totalYards', 'netPassingYards', 'rushingYards', 'turnovers'].map(stat => (
                      <div key={stat} className="flex justify-between items-center">
                        <span className="text-[10px] text-zinc-400 font-bold uppercase">{stat}</span>
                        <input 
                          type="text" 
                          value={summary.team2.stats?.[stat] || '0'} 
                          onChange={(e) => setSummary({...summary, team2: {...summary.team2, stats: {...summary.team2.stats, [stat]: e.target.value}}})}
                          className="bg-zinc-800/50 px-3 py-1 rounded text-right font-black text-xs outline-none focus:bg-red-900/20 w-20"
                        />
                      </div>
                    ))}
                  </div>
                </div>
                <div className="p-6 bg-black/40 rounded-2xl border border-white/5">
                  <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-4 block">{summary.team1.abbreviation} Stats</label>
                  <div className="space-y-4">
                    {['totalYards', 'netPassingYards', 'rushingYards', 'turnovers'].map(stat => (
                      <div key={stat} className="flex justify-between items-center">
                        <span className="text-[10px] text-zinc-400 font-bold uppercase">{stat}</span>
                        <input 
                          type="text" 
                          value={summary.team1.stats?.[stat] || '0'} 
                          onChange={(e) => setSummary({...summary, team1: {...summary.team1, stats: {...summary.team1.stats, [stat]: e.target.value}}})}
                          className="bg-zinc-800/50 px-3 py-1 rounded text-right font-black text-xs outline-none focus:bg-red-900/20 w-20"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <button onClick={() => setCurrentStep('ASSETS')} className="px-8 py-6 border border-white/10 text-white font-black italic rounded-3xl hover:bg-zinc-900 transition-colors">
                Back
              </button>
              <button 
                onClick={processToStrategy} 
                disabled={loading}
                className="flex-1 py-6 bg-red-600 text-white font-black italic text-xl uppercase rounded-3xl hover:bg-red-500 transition-all shadow-xl shadow-red-600/20"
              >
                {loading ? 'Analyzing Trends...' : 'Confirm Data & Generate Strategy'}
              </button>
            </div>
          </div>
        )}

        {/* Step: STRATEGY */}
        {currentStep === 'STRATEGY' && strategy && (
          <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="text-center mb-12">
              <h2 className="text-5xl font-black italic tracking-tighter mb-4 uppercase">Strategy Room</h2>
              <p className="text-zinc-500 uppercase tracking-widest text-xs font-black">Determine specific keys to win based on 1st half performance</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
              <div className="p-8 bg-zinc-900/50 rounded-[2.5rem] border border-white/5">
                <div className="flex items-center gap-4 mb-6">
                  <img src={summary?.team2.logo} className="w-10 h-10" />
                  <h3 className="text-xl font-black uppercase italic">{summary?.team2.name} Keys</h3>
                </div>
                <div className="space-y-3">
                  {strategy.keysToWin.team2.keys.map((key: string, idx: number) => (
                    <div key={idx} className="flex gap-4 items-start">
                      <div className="w-6 h-6 rounded bg-zinc-800 flex items-center justify-center shrink-0 text-[10px] font-black">{idx + 1}</div>
                      <textarea 
                        value={key} 
                        onChange={(e) => {
                          const newKeys = [...strategy.keysToWin.team2.keys];
                          newKeys[idx] = e.target.value;
                          setStrategy({...strategy, keysToWin: {...strategy.keysToWin, team2: {...strategy.keysToWin.team2, keys: newKeys}}});
                        }}
                        className="bg-transparent w-full text-sm font-medium border-none outline-none resize-none focus:text-red-600 focus:bg-white/5 p-1 rounded transition-colors"
                        rows={2}
                      />
                    </div>
                  ))}
                </div>
              </div>
              <div className="p-8 bg-zinc-900/50 rounded-[2.5rem] border border-white/5">
                <div className="flex items-center gap-4 mb-6">
                  <img src={summary?.team1.logo} className="w-10 h-10" />
                  <h3 className="text-xl font-black uppercase italic">{summary?.team1.name} Keys</h3>
                </div>
                <div className="space-y-3">
                  {strategy.keysToWin.team1.keys.map((key: string, idx: number) => (
                    <div key={idx} className="flex gap-4 items-start">
                      <div className="w-6 h-6 rounded bg-zinc-800 flex items-center justify-center shrink-0 text-[10px] font-black">{idx + 1}</div>
                      <textarea 
                        value={key} 
                        onChange={(e) => {
                          const newKeys = [...strategy.keysToWin.team1.keys];
                          newKeys[idx] = e.target.value;
                          setStrategy({...strategy, keysToWin: {...strategy.keysToWin, team1: {...strategy.keysToWin.team1, keys: newKeys}}});
                        }}
                        className="bg-transparent w-full text-sm font-medium border-none outline-none resize-none focus:text-red-600 focus:bg-white/5 p-1 rounded transition-colors"
                        rows={2}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <button onClick={() => setCurrentStep('DATA')} className="px-8 py-6 border border-white/10 text-white font-black italic rounded-3xl hover:bg-zinc-900 transition-colors">
                Back
              </button>
              <button 
                onClick={processToScripts} 
                disabled={loading}
                className="flex-1 py-6 bg-red-600 text-white font-black italic text-xl uppercase rounded-3xl hover:bg-red-500 transition-all shadow-xl shadow-red-600/20"
              >
                {loading ? 'Baking Stats into Scripts...' : 'Finalize Strategy & Draft Scripts'}
              </button>
            </div>
          </div>
        )}

        {/* Step: SCRIPTS */}
        {currentStep === 'SCRIPTS' && (
          <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="text-center mb-12">
              <h2 className="text-5xl font-black italic tracking-tighter mb-4 uppercase">Production Desk</h2>
              <p className="text-zinc-500 uppercase tracking-widest text-xs font-black">Edit the final scripts. Verified stats and strategy are pre-integrated.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
              <div className="space-y-4">
                <div className="flex justify-between items-center px-4">
                  <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">{summary?.team2.name} Mascot Script</label>
                  <span className="text-[8px] px-2 py-1 bg-zinc-900 border border-white/5 rounded font-black text-green-500 uppercase">Stats Verified</span>
                </div>
                <textarea 
                  value={awayScript} 
                  onChange={(e) => setAwayScript(e.target.value)}
                  className="w-full h-80 bg-zinc-900/50 border border-white/5 p-8 rounded-[2.5rem] focus:border-red-600 outline-none text-sm font-medium leading-relaxed resize-none shadow-inner"
                />
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-center px-4">
                  <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">{summary?.team1.name} Mascot Script</label>
                  <span className="text-[8px] px-2 py-1 bg-zinc-900 border border-white/5 rounded font-black text-green-500 uppercase">Stats Verified</span>
                </div>
                <textarea 
                  value={homeScript} 
                  onChange={(e) => setHomeScript(e.target.value)}
                  className="w-full h-80 bg-zinc-900/50 border border-white/5 p-8 rounded-[2.5rem] focus:border-red-600 outline-none text-sm font-medium leading-relaxed resize-none shadow-inner"
                />
              </div>
            </div>

            <div className="flex gap-4">
              <button onClick={() => setCurrentStep('STRATEGY')} className="px-8 py-6 border border-white/10 text-white font-black italic rounded-3xl hover:bg-zinc-900 transition-colors">
                Back
              </button>
              <button 
                onClick={handleFinalRender}
                className="flex-1 py-6 bg-white text-black font-black italic text-xl uppercase rounded-3xl hover:bg-zinc-200 transition-all shadow-xl"
              >
                Finalize & Start AI Render
              </button>
            </div>
          </div>
        )}

        {/* Step: RENDER */}
        {currentStep === 'RENDER' && (
          <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
            <div className="relative w-32 h-32 mb-12">
               <div className="absolute inset-0 border-8 border-red-600/10 rounded-full"></div>
               <div className="absolute inset-0 border-8 border-red-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
            <h2 className="text-5xl font-black italic uppercase tracking-tighter mb-4">Rendering Broadcast</h2>
            <div className="space-y-4">
              <div className="flex items-center gap-3 justify-center">
                <div className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></div>
                <p className="text-zinc-600 text-xs font-black uppercase tracking-widest">Generating High-Fidelity Avatars</p>
              </div>
              <p className="text-zinc-700 text-[10px] font-black uppercase tracking-tighter italic max-w-sm mx-auto opacity-60">This process uses Veo 3.1 and typically takes 2-4 minutes. Please hold tight.</p>
            </div>
          </div>
        )}

        {/* Step: RESULTS */}
        {currentStep === 'RESULTS' && (
          <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 space-y-12">
             <div className="text-center mb-8">
                <h2 className="text-6xl font-black italic tracking-tighter uppercase mb-2">Final Broadcast</h2>
                <div className="h-1 w-24 bg-red-600 mx-auto rounded-full shadow-[0_0_10px_red]"></div>
             </div>
             
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="aspect-video bg-zinc-900 rounded-[3rem] overflow-hidden relative shadow-2xl border border-white/5 ring-1 ring-white/10 group">
                {videoAway ? <video src={videoAway} className="w-full h-full object-cover" controls autoPlay loop /> : <div className="w-full h-full flex items-center justify-center text-zinc-800 font-black uppercase italic">Render Incomplete</div>}
                <div className="absolute top-6 left-6 bg-black/80 px-4 py-2 rounded-xl backdrop-blur-md border border-white/5 text-[10px] font-black uppercase tracking-widest">{summary?.team2.name} Channel</div>
              </div>
              <div className="aspect-video bg-zinc-900 rounded-[3rem] overflow-hidden relative shadow-2xl border border-white/5 ring-1 ring-white/10 group">
                {videoHome ? <video src={videoHome} className="w-full h-full object-cover" controls autoPlay loop /> : <div className="w-full h-full flex items-center justify-center text-zinc-800 font-black uppercase italic">Render Incomplete</div>}
                <div className="absolute top-6 left-6 bg-black/80 px-4 py-2 rounded-xl backdrop-blur-md border border-white/5 text-[10px] font-black uppercase tracking-widest">{summary?.team1.name} Channel</div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {['passing', 'rushing', 'turnovers'].map((stat) => (
                <div key={stat} className="bg-zinc-900/30 p-8 rounded-3xl border border-white/5 text-center backdrop-blur-sm shadow-xl">
                  <div className="text-[10px] font-black text-zinc-600 uppercase mb-4 tracking-widest">{stat} Comparison</div>
                  <div className="flex justify-between items-end px-4">
                    <div className="text-left">
                       <span className="text-[8px] block font-bold text-zinc-500 uppercase">{summary?.team2.abbreviation}</span>
                       <span className="text-3xl font-black italic text-white">{summary?.team2.stats?.[stat === 'passing' ? 'netPassingYards' : stat === 'rushing' ? 'rushingYards' : 'turnovers'] || '0'}</span>
                    </div>
                    <div className="w-px h-10 bg-zinc-800 mx-4"></div>
                    <div className="text-right">
                       <span className="text-[8px] block font-bold text-zinc-500 uppercase">{summary?.team1.abbreviation}</span>
                       <span className="text-3xl font-black italic text-white">{summary?.team1.stats?.[stat === 'passing' ? 'netPassingYards' : stat === 'rushing' ? 'rushingYards' : 'turnovers'] || '0'}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button onClick={() => setCurrentStep('ASSETS')} className="w-full py-6 border border-white/10 text-zinc-500 font-black italic uppercase rounded-3xl hover:text-white hover:bg-zinc-900/50 transition-all active:scale-[0.99]">
              Start New Production Session
            </button>
          </div>
        )}

      </div>

      {error && (
        <div className="fixed bottom-12 left-1/2 -translate-x-1/2 bg-red-600 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl z-[100] flex items-center gap-4 border border-white/10 backdrop-blur-md animate-in slide-in-from-bottom-4">
          <span className="max-w-md text-center">{error}</span>
          <button onClick={() => setError(null)} className="shrink-0 opacity-50 hover:opacity-100 transition-opacity"><i className="fa-solid fa-xmark"></i></button>
        </div>
      )}
    </div>
  );
};

export default App;
