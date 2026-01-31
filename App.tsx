
import React, { useState, useEffect } from 'react';
import { fetchGameData, parseGameSummary } from './services/espnService';
import { generateAnalysis } from './services/geminiService';
import { GameSummary } from './types';

const App: React.FC = () => {
  const [summary, setSummary] = useState<GameSummary | null>(null);
  const [analysis, setAnalysis] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const raw = await fetchGameData();
        const parsed = parseGameSummary(raw);
        setSummary(parsed);
      } catch (err: any) {
        // We don't block the app if ESPN fails because we use Search Grounding
        console.warn("Local data fetch failed, relying on search grounding.");
        setSummary({
          team1: { name: "Chiefs", abbreviation: "KC", score: 0, logo: "https://a.espncdn.com/i/teamlogos/nfl/500/kc.png", id: "12", color: "e31837" },
          team2: { name: "Eagles", abbreviation: "PHI", score: 0, logo: "https://a.espncdn.com/i/teamlogos/nfl/500/phi.png", id: "21", color: "004c54" },
          period: 2,
          clock: "0:00",
          venue: "Caesars Superdome"
        });
      }
    };
    loadData();
  }, []);

  const handleGenerate = async () => {
    setLoading(true);
    setAnalysis(null);
    setError(null);
    try {
      // Use the existing summary as context, but Gemini will search for 2025 updates
      const result = await generateAnalysis(summary);
      setAnalysis(result);
      
      setTimeout(() => {
        document.getElementById('results-section')?.scrollIntoView({ behavior: 'smooth' });
      }, 200);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred during production.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-indigo-600 pb-32">
      <div className="max-w-4xl mx-auto px-6 py-16">
        <header className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 mb-6">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
            </span>
            <span className="text-[10px] font-black tracking-widest uppercase text-indigo-400">Live Search Active</span>
          </div>
          <h1 className="text-8xl font-black italic tracking-tighter text-white mb-2">HIKE</h1>
          <p className="text-zinc-500 uppercase tracking-[0.4em] text-[10px] font-bold">2025 Super Bowl Broadcast Engine</p>
        </header>

        {/* Dashboard Control */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-12">
          <div className="md:col-span-3 bg-zinc-900/50 border border-zinc-800 rounded-3xl p-8 flex items-center justify-between">
            <div className="flex items-center gap-6">
              <img src="https://a.espncdn.com/i/teamlogos/nfl/500/kc.png" className="w-12 h-12 grayscale brightness-200" alt="KC" />
              <div className="text-zinc-500 font-black italic text-xl">VS</div>
              <img src="https://a.espncdn.com/i/teamlogos/nfl/500/phi.png" className="w-12 h-12 grayscale brightness-200" alt="PHI" />
            </div>
            <div className="text-right">
              <div className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Matchup Identified</div>
              <div className="text-sm font-bold">SB LIX: Chiefs vs Eagles</div>
            </div>
          </div>
          
          <button 
            onClick={handleGenerate}
            disabled={loading}
            className="group relative bg-white text-black rounded-3xl overflow-hidden transition-all hover:bg-indigo-600 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <div className="flex flex-col items-center justify-center h-full gap-1 p-4">
              {loading ? (
                <i className="fa-solid fa-spinner fa-spin text-xl"></i>
              ) : (
                <span className="font-black text-xs uppercase tracking-tighter">Produce<br/>Insights</span>
              )}
            </div>
          </button>
        </div>

        {error && (
          <div className="p-8 bg-red-900/10 border border-red-500/20 rounded-3xl text-red-500 text-sm mb-12 flex items-start gap-4 animate-in fade-in zoom-in-95">
            <i className="fa-solid fa-circle-exclamation mt-1"></i>
            <div>
              <p className="font-bold uppercase tracking-widest text-xs mb-1">Production Error</p>
              <p className="opacity-80">{error}</p>
              <button onClick={handleGenerate} className="mt-4 text-[10px] font-black uppercase underline">Try Again</button>
            </div>
          </div>
        )}

        {analysis && (
          <div id="results-section" className="space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-500">
            
            {/* Quick Hits Section */}
            <section className="bg-zinc-900/50 border border-zinc-800 rounded-[3rem] p-10 md:p-16 relative overflow-hidden backdrop-blur-sm">
              <div className="flex items-center gap-4 mb-12">
                <div className="h-12 w-1.5 bg-indigo-500 rounded-full"></div>
                <div>
                  <h2 className="text-3xl font-black italic uppercase tracking-tighter">Halftime Quick Hits</h2>
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">2025 Live Update</p>
                </div>
              </div>
              
              <ul className="space-y-10">
                {analysis.mainPoints?.map((point: string, i: number) => (
                  <li key={i} className="flex gap-8 items-start group">
                    <span className="text-indigo-500 font-black italic text-lg opacity-40">0{i+1}</span>
                    <p className="text-2xl md:text-3xl font-bold leading-tight text-zinc-100 group-hover:text-white transition-colors">
                      {point}
                    </p>
                  </li>
                ))}
              </ul>
            </section>

            {/* Narration Script */}
            <section className="bg-indigo-600 rounded-[3rem] p-12 md:p-20 text-white relative shadow-2xl shadow-indigo-500/10">
              <div className="absolute top-10 right-10 text-white/10">
                <i className="fa-solid fa-quote-right text-8xl"></i>
              </div>
              <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-white/50 mb-8">AI Avatar Script</h3>
              <p className="text-3xl md:text-5xl font-black italic tracking-tighter leading-[1.05]">
                "{analysis.narrationScript}"
              </p>
            </section>

            {/* Strategic Keys */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {[analysis.keysToWin?.team1, analysis.keysToWin?.team2].map((team, idx) => team && (
                <div key={idx} className="bg-zinc-900/30 border border-zinc-800/50 rounded-3xl p-10 hover:border-indigo-500/30 transition-all">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-indigo-500 mb-6">{team.name} Adjustment</h4>
                  <ul className="space-y-4">
                    {team.keys?.map((key: string, kIdx: number) => (
                      <li key={kIdx} className="flex gap-4 text-sm font-bold text-zinc-400">
                        <span className="text-indigo-500">•</span>
                        {key}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            {/* Sources */}
            {analysis.sources && analysis.sources.length > 0 && (
              <div className="pt-12 border-t border-zinc-900">
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600 mb-6">Verified Grounding Data</p>
                <div className="flex flex-wrap gap-4">
                  {analysis.sources.slice(0, 3).map((source: any, sIdx: number) => (
                    <a 
                      key={sIdx} 
                      href={source.uri} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-[10px] font-bold text-indigo-400 hover:text-white transition-colors flex items-center gap-2"
                    >
                      <i className="fa-solid fa-link text-[8px]"></i>
                      {source.title}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      
      <footer className="fixed bottom-0 w-full p-4 bg-black/80 backdrop-blur-xl border-t border-zinc-900/50 text-center z-50">
        <div className="text-[9px] font-black tracking-[0.5em] text-zinc-700 uppercase">
          HIKE AI // BROADCAST ENGINE // SB LIX EDITION
        </div>
      </footer>
    </div>
  );
};

export default App;
