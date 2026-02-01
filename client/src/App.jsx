import React, { useState, useEffect } from 'react';
import { fetchGameData, parseGameSummary } from './espn.js';
import { generateAnalysis } from './gemini.js';

const App = () => {
    const [gameData, setGameData] = useState(null);
    const [summary, setSummary] = useState(null);
    const [mascots, setMascots] = useState({});
    const [analysis, setAnalysis] = useState(null);
    const [rawResponse, setRawResponse] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        const loadInitialData = async () => {
            try {
                const rawData = await fetchGameData();
                setGameData(rawData);
                setSummary(parseGameSummary(rawData));
            } catch (err) {
                console.error('Error loading game data:', err);
                setError('Failed to load game statistics. Please try again later.');
            }
        };
        loadInitialData();
    }, []);

    const handleMascotUpload = (teamKey, file) => {
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setMascots(prev => ({ ...prev, [teamKey]: reader.result }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleGenerate = async () => {
        console.log('Generate button clicked');
        console.log('gameData:', gameData);
        console.log('summary:', summary);
        
        if (!gameData) {
            console.error('No gameData available');
            setError('Game data not loaded. Please wait for game data to load.');
            return;
        }
        
        // Get API key from environment variable or prompt user
        const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
        if (!apiKey) {
            setError('Gemini API key not found. Please set VITE_GEMINI_API_KEY in your .env file.');
            return;
        }
        
        setLoading(true);
        setError(null);
        
        try {
            console.log('Calling generateAnalysis directly');
            const result = await generateAnalysis(gameData, apiKey);
            console.log('Analysis result:', result);
            
            setAnalysis(result);
            setRawResponse(result);
            // Smooth scroll to results
            setTimeout(() => {
                document.getElementById('results-section')?.scrollIntoView({ behavior: 'smooth' });
            }, 100);
        } catch (err) {
            console.error('Error in handleGenerate:', err);
            setError(`Analysis failed: ${err.message}. Please ensure your API key is configured correctly.`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#1e144a] via-[#4c2a86] to-[#6a42a1] text-white p-4 md:p-8">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <header className="text-center mb-10">
                    <h1 className="text-4xl md:text-6xl font-black mb-2 flex items-center justify-center gap-4">
                        <span className="text-5xl">🏈</span> HIKE
                    </h1>
                    <p className="text-xl md:text-2xl font-semibold opacity-90">
                        Halftime Insights and Key Evaluations
                    </p>
                    <p className="text-lg opacity-70 mt-2">
                        Super Bowl LVIII - {summary ? `${summary.team1.name} vs ${summary.team2.name}` : 'Loading matchup...'}
                    </p>
                </header>

                {/* Upload Card */}
                <div className="bg-white rounded-3xl p-8 text-gray-800 shadow-2xl mb-12">
                    <h2 className="text-2xl font-bold mb-6 text-indigo-900">Upload Mascot Images</h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                        {/* Team 1 Mascot */}
                        <div className="flex flex-col space-y-3">
                            <label className="text-sm font-bold text-gray-500 uppercase tracking-wider">
                                {summary?.team1.name || 'Home Team'} Mascot
                            </label>
                            <div className="relative group">
                                <div className="border-2 border-dashed border-gray-300 rounded-2xl p-4 flex items-center justify-center bg-gray-50 hover:border-indigo-400 transition-colors cursor-pointer min-h-[140px]">
                                    {mascots.team1 ? (
                                        <img src={mascots.team1} alt="Mascot 1" className="max-h-24 rounded-lg" />
                                    ) : (
                                        <div className="text-center">
                                            <i className="fa-solid fa-cloud-arrow-up text-3xl text-gray-400 mb-2"></i>
                                            <p className="text-xs text-gray-400">Choose File</p>
                                        </div>
                                    )}
                                    <input
                                        type="file"
                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                        accept="image/*"
                                        onChange={(e) => handleMascotUpload('team1', e.target.files?.[0] || null)}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Team 2 Mascot */}
                        <div className="flex flex-col space-y-3">
                            <label className="text-sm font-bold text-gray-500 uppercase tracking-wider">
                                {summary?.team2.name || 'Away Team'} Mascot
                            </label>
                            <div className="relative group">
                                <div className="border-2 border-dashed border-gray-300 rounded-2xl p-4 flex items-center justify-center bg-gray-50 hover:border-red-400 transition-colors cursor-pointer min-h-[140px]">
                                    {mascots.team2 ? (
                                        <img src={mascots.team2} alt="Mascot 2" className="max-h-24 rounded-lg" />
                                    ) : (
                                        <div className="text-center">
                                            <i className="fa-solid fa-cloud-arrow-up text-3xl text-gray-400 mb-2"></i>
                                            <p className="text-xs text-gray-400">Choose File</p>
                                        </div>
                                    )}
                                    <input
                                        type="file"
                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                        accept="image/*"
                                        onChange={(e) => handleMascotUpload('team2', e.target.files?.[0] || null)}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={handleGenerate}
                        disabled={loading || !summary || !gameData}
                        className={`w-full py-5 rounded-2xl text-xl font-bold transition-all transform active:scale-95 shadow-lg ${loading || !summary || !gameData
                                ? 'bg-gray-400 cursor-not-allowed'
                                : 'bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white'
                            }`}
                    >
                        {loading ? (
                            <span className="flex items-center justify-center gap-3">
                                <i className="fa-solid fa-spinner fa-spin"></i> Analyzing Game Tape...
                            </span>
                        ) : !summary || !gameData ? (
                            <span>Waiting for game data...</span>
                        ) : (
                            'Generate Halftime Commercial'
                        )}
                    </button>
                    
                    {(!summary || !gameData) && !loading && (
                        <p className="mt-2 text-sm text-gray-500 text-center">
                            {!summary ? 'Loading game summary...' : 'Loading game data...'}
                        </p>
                    )}

                    {error && (
                        <div className="mt-4 p-4 bg-red-50 text-red-600 rounded-xl border border-red-200 flex items-center gap-3">
                            <i className="fa-solid fa-circle-exclamation"></i>
                            {error}
                        </div>
                    )}
                </div>

                {/* Game Stats Preview */}
                {summary && (
                    <div className="grid grid-cols-2 gap-4 mb-12">
                        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <img src={summary.team1.logo} alt="T1" className="w-10 h-10 object-contain" />
                                <span className="font-bold text-lg">{summary.team1.abbreviation}</span>
                            </div>
                            <span className="text-3xl font-black">{summary.team1.score}</span>
                        </div>
                        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 flex items-center justify-between">
                            <span className="text-3xl font-black">{summary.team2.score}</span>
                            <div className="flex items-center gap-3">
                                <span className="font-bold text-lg">{summary.team2.abbreviation}</span>
                                <img src={summary.team2.logo} alt="T2" className="w-10 h-10 object-contain" />
                            </div>
                        </div>
                    </div>
                )}

                {/* Results Section */}
                {analysis && (
                    <div id="results-section" className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
                        {/* Recap */}
                        <div className="bg-black/40 backdrop-blur-lg rounded-3xl p-8 border border-white/10">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-2 h-8 bg-red-500 rounded-full"></div>
                                <h3 className="text-2xl font-black uppercase tracking-tighter">Halftime Recap</h3>
                            </div>
                            <p className="text-lg leading-relaxed text-indigo-100 font-medium">
                                {analysis.halftimeRecap}
                            </p>
                        </div>

                        {/* Keys to Win */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="bg-black/40 backdrop-blur-lg rounded-3xl p-8 border border-white/10">
                                <div className="flex items-center gap-3 mb-6">
                                    <img src={summary?.team1.logo} className="w-8 h-8 object-contain" alt="" />
                                    <h4 className="text-xl font-bold uppercase">{analysis.keysToWin.team1.name} Keys</h4>
                                </div>
                                <ul className="space-y-4">
                                    {analysis.keysToWin.team1.keys.map((key, i) => (
                                        <li key={i} className="flex gap-3 text-indigo-50">
                                            <span className="text-indigo-400 font-bold">{i + 1}.</span>
                                            <span>{key}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <div className="bg-black/40 backdrop-blur-lg rounded-3xl p-8 border border-white/10">
                                <div className="flex items-center gap-3 mb-6">
                                    <img src={summary?.team2.logo} className="w-8 h-8 object-contain" alt="" />
                                    <h4 className="text-xl font-bold uppercase">{analysis.keysToWin.team2.name} Keys</h4>
                                </div>
                                <ul className="space-y-4">
                                    {analysis.keysToWin.team2.keys.map((key, i) => (
                                        <li key={i} className="flex gap-3 text-indigo-50">
                                            <span className="text-indigo-400 font-bold">{i + 1}.</span>
                                            <span>{key}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>

                        <div className="text-center pb-20">
                            <button
                                onClick={() => window.print()}
                                className="bg-white/10 hover:bg-white/20 px-6 py-3 rounded-xl transition-colors text-sm font-semibold inline-flex items-center gap-2"
                            >
                                <i className="fa-solid fa-print"></i> Save Script for Avatar Narration
                            </button>
                        </div>
                    </div>
                )}

                {/* Validation/Debug Section */}
                {rawResponse && (
                    <div className="mt-8 bg-gray-900/60 backdrop-blur-lg rounded-3xl p-6 border border-gray-700">
                        <h3 className="text-lg font-bold mb-4 text-yellow-400 flex items-center gap-2">
                            <i className="fa-solid fa-check-circle"></i> Gemini Response Validation
                        </h3>
                        <ul className="space-y-2 text-sm text-gray-300">
                            <li className="flex items-start gap-2">
                                <span className="text-green-400 mt-1">✓</span>
                                <span><strong>Halftime Recap:</strong> {rawResponse.halftimeRecap ? `Present (${rawResponse.halftimeRecap.length} characters)` : 'Missing'}</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-green-400 mt-1">✓</span>
                                <span><strong>Team 1 Name:</strong> {rawResponse.keysToWin?.team1?.name || 'Missing'}</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-green-400 mt-1">✓</span>
                                <span><strong>Team 1 Keys:</strong> {rawResponse.keysToWin?.team1?.keys?.length || 0} keys provided</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-green-400 mt-1">✓</span>
                                <span><strong>Team 2 Name:</strong> {rawResponse.keysToWin?.team2?.name || 'Missing'}</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-green-400 mt-1">✓</span>
                                <span><strong>Team 2 Keys:</strong> {rawResponse.keysToWin?.team2?.keys?.length || 0} keys provided</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-green-400 mt-1">✓</span>
                                <span><strong>Response Structure:</strong> Valid JSON structure</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-green-400 mt-1">✓</span>
                                <span><strong>Total Keys:</strong> {(rawResponse.keysToWin?.team1?.keys?.length || 0) + (rawResponse.keysToWin?.team2?.keys?.length || 0)} total keys</span>
                            </li>
                            {rawResponse.keysToWin?.team1?.keys && (
                                <li className="flex items-start gap-2 mt-3 pt-3 border-t border-gray-700">
                                    <span className="text-blue-400 mt-1">•</span>
                                    <div className="flex-1">
                                        <strong className="text-blue-300">Team 1 Keys Preview:</strong>
                                        <ul className="mt-1 ml-4 space-y-1 text-gray-400">
                                            {rawResponse.keysToWin.team1.keys.slice(0, 2).map((key, i) => (
                                                <li key={i} className="text-xs">- {key.substring(0, 60)}{key.length > 60 ? '...' : ''}</li>
                                            ))}
                                        </ul>
                                    </div>
                                </li>
                            )}
                            {rawResponse.keysToWin?.team2?.keys && (
                                <li className="flex items-start gap-2 mt-3 pt-3 border-t border-gray-700">
                                    <span className="text-purple-400 mt-1">•</span>
                                    <div className="flex-1">
                                        <strong className="text-purple-300">Team 2 Keys Preview:</strong>
                                        <ul className="mt-1 ml-4 space-y-1 text-gray-400">
                                            {rawResponse.keysToWin.team2.keys.slice(0, 2).map((key, i) => (
                                                <li key={i} className="text-xs">- {key.substring(0, 60)}{key.length > 60 ? '...' : ''}</li>
                                            ))}
                                        </ul>
                                    </div>
                                </li>
                            )}
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
};

export default App;
