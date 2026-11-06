import React, { useState, useEffect } from 'react';
import { Users, Play, List, Trash2, CheckCircle2, RotateCcw, Plus } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('jucatori');

  const BACKGROUND_IMAGE_URL = "https://images.unsplash.com/photo-1552667466-07770ae110d0?ixlib=rb-1.2.1&auto=format&fit=crop&w=1080&q=80";

  const [players, setPlayers] = useState(() => {
    const saved = localStorage.getItem('sinteticPlayers');
    const savedDate = localStorage.getItem('sinteticDate');
    const today = new Date().toDateString();

    if (saved) {
      let parsed = JSON.parse(saved);
      if (savedDate !== today && savedDate !== null) {
        parsed = parsed.filter(p => p.permanent);
      }
      return parsed;
    }
    return [];
  });

  const [history, setHistory] = useState(() => {
    const savedDate = localStorage.getItem('sinteticDate');
    const today = new Date().toDateString();
    if (savedDate !== today) {
      localStorage.setItem('sinteticDate', today);
      return [];
    }
    const savedHistory = localStorage.getItem('sinteticHistory');
    return savedHistory ? JSON.parse(savedHistory) : [];
  });

  const [teams, setTeams] = useState(() => {
    const savedDate = localStorage.getItem('sinteticDate');
    const today = new Date().toDateString();
    if (savedDate === today) {
      const savedTeams = localStorage.getItem('sinteticLastTeams');
      if (savedTeams) return JSON.parse(savedTeams);
    }
    return { A: [], B: [], C: [] };
  });

  const [selectedForMatch, setSelectedForMatch] = useState(() => {
     const savedTeams = localStorage.getItem('sinteticLastTeams');
     const savedDate = localStorage.getItem('sinteticDate');
     const today = new Date().toDateString();
     
     if (savedDate === today && savedTeams) {
        const parsed = JSON.parse(savedTeams);
        const allIds = [...parsed.A, ...parsed.B, ...parsed.C].map(p => p.id);
        return allIds;
     }
     return [];
  });

  const [newName, setNewName] = useState('');
  const [newRating, setNewRating] = useState('3');
  const [isPermanent, setIsPermanent] = useState(true);
  const [isGoalkeeper, setIsGoalkeeper] = useState(false);

  useEffect(() => {
    localStorage.setItem('sinteticPlayers', JSON.stringify(players));
  }, [players]);

  useEffect(() => {
    localStorage.setItem('sinteticHistory', JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    localStorage.setItem('sinteticLastTeams', JSON.stringify(teams));
  }, [teams]);

  const addPlayer = (e) => {
    e.preventDefault();
    const cleanName = newName.trim();
    if (!cleanName) return;

    const alreadyExists = players.some(p => p.name.toLowerCase() === cleanName.toLowerCase());
    if (alreadyExists) {
      alert(`Jucătorul "${cleanName}" este deja în listă!`);
      return;
    }

    const nPlayer = {
      id: Date.now().toString(),
      name: cleanName,
      rating: newRating,
      permanent: isPermanent,
      isGoalkeeper: isGoalkeeper
    };
    
    setPlayers(prev => [...prev, nPlayer].sort((a, b) => a.name.localeCompare(b.name)));
    setNewName('');
    setNewRating('3');
    setIsGoalkeeper(false);
  };

  const deletePlayer = (id) => {
    setPlayers(prev => prev.filter(p => p.id !== id));
    setSelectedForMatch(prev => prev.filter(pId => pId !== id));
    if (teams.A.find(p=>p.id===id) || teams.B.find(p=>p.id===id) || teams.C.find(p=>p.id===id)) {
        setTeams({ A: [], B: [], C: [] });
    }
  };

  const toggleSelection = (id) => {
    setSelectedForMatch(prev => 
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const getPlayerVal = (rating) => rating === '?' ? 3 : parseInt(rating);
  const calculateTeamScore = (teamArr) => teamArr.reduce((sum, p) => sum + getPlayerVal(p.rating), 0);

  const generateTeams = () => {
    const activePlayers = players.filter(p => selectedForMatch.includes(p.id));
    
    if (activePlayers.length < 12) {
      alert(`Prea puțini jucători! Trebuie să selectezi minim 12. Momentan ai bifat ${activePlayers.length}.`);
      return; 
    }
    if (activePlayers.length > 15) {
      alert(`Prea mulți jucători! Pentru 3 echipe la sintetic limita este 15. Ai bifat ${activePlayers.length}. Te rugăm să debifezi.`);
      return; 
    }

    const totalGKs = activePlayers.filter(p => p.isGoalkeeper).length;
    const maxGkPerTeam = Math.max(1, Math.ceil(totalGKs / 3));

    let bestTeams = null;
    let minDiff = 999;
    let iterations = 0;
    const maxIterations = 500;

    const total = activePlayers.length;
    const baseSize = Math.floor(total / 3);
    let remainder = total % 3;
    
    const sizes = [baseSize, baseSize, baseSize];
    for (let i = 0; i < remainder; i++) sizes[i]++;

    while (iterations < maxIterations) {
      let shuffled = [...activePlayers];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }

      const tA = shuffled.slice(0, sizes[0]);
      const tB = shuffled.slice(sizes[0], sizes[0] + sizes[1]);
      const tC = shuffled.slice(sizes[0] + sizes[1]);

      const gkA = tA.filter(p => p.isGoalkeeper).length;
      const gkB = tB.filter(p => p.isGoalkeeper).length;
      const gkC = tC.filter(p => p.isGoalkeeper).length;
      const validGkDistribution = gkA <= maxGkPerTeam && gkB <= maxGkPerTeam && gkC <= maxGkPerTeam;

      const scoreA = calculateTeamScore(tA);
      const scoreB = calculateTeamScore(tB);
      const scoreC = calculateTeamScore(tC);

      const normA = (scoreA / tA.length) * 5;
      const normB = (scoreB / tB.length) * 5;
      const normC = (scoreC / tC.length) * 5;

      const maxS = Math.max(normA, normB, normC);
      const minS = Math.min(normA, normB, normC);
      const diff = maxS - minS; 

      if (validGkDistribution && diff < minDiff) {
        minDiff = diff;
        bestTeams = { A: tA, B: tB, C: tC };
      }

      if (validGkDistribution && diff <= 3) break;
      iterations++;
    }

    if (!bestTeams) {
        alert("S-a atins limita de căutare. S-au afișat cele mai echilibrate echipe găsite.");
    }

    setTeams(bestTeams);
    const now = new Date();
    const timeString = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    setHistory(prev => [...prev, `Generarea #${prev.length + 1} - ${timeString}`]);
    setActiveTab('echipe');
  };

  const validSelectedCount = players.filter(p => selectedForMatch.includes(p.id)).length;

  return (
    <div 
      className="min-h-screen pb-24 font-sans text-gray-800 bg-cover bg-center bg-fixed transition-all duration-300"
      style={{ backgroundImage: `url('${BACKGROUND_IMAGE_URL}')` }}
    >
      <div className="fixed inset-0 bg-slate-900/60 pointer-events-none"></div>

      <header className="bg-slate-900/40 backdrop-blur-lg border-b border-white/10 text-white p-4 sticky top-0 z-20 shadow-lg">
        <h1 className="text-2xl font-black text-center tracking-tight drop-shadow-md">
          Sintetic<span className="text-blue-400">Manager</span> ⚽
        </h1>
      </header>

      <main className="relative p-4 max-w-md mx-auto z-10">
        
        {activeTab === 'jucatori' && (
          <div className="space-y-6">
            <form onSubmit={addPlayer} className="bg-white/90 backdrop-blur-md p-5 rounded-2xl shadow-xl border border-white/50">
              <h2 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Plus size={20} className="text-blue-600" /> Jucător Nou
              </h2>
              <input 
                type="text" 
                placeholder="Nume..." 
                className="w-full p-3 bg-white/70 border border-gray-200 rounded-xl mb-4 outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all shadow-inner"
                value={newName} 
                onChange={e => setNewName(e.target.value)}
              />
              <div className="flex gap-3 mb-4">
                <select 
                  className="flex-1 p-3 border border-gray-200 rounded-xl bg-white/70 focus:bg-white outline-none focus:ring-2 focus:ring-blue-500 shadow-inner"
                  value={newRating} 
                  onChange={e => setNewRating(e.target.value)}
                >
                  <option value="1">Nivel 1 (Slab)</option>
                  <option value="2">Nivel 2</option>
                  <option value="3">Nivel 3 (Mediu)</option>
                  <option value="4">Nivel 4</option>
                  <option value="5">Nivel 5 (Top)</option>
                  <option value="?">Necunoscut (?)</option>
                </select>
              </div>
              
              <div className="flex gap-5 mb-6 px-1">
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={isPermanent} 
                    onChange={(e) => setIsPermanent(e.target.checked)} 
                    className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  Salvare Permanentă
                </label>
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={isGoalkeeper} 
                    onChange={(e) => setIsGoalkeeper(e.target.checked)} 
                    className="w-5 h-5 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                  />
                  Portar 🧤
                </label>
              </div>

              <button type="submit" className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-3 rounded-xl font-bold shadow-lg shadow-blue-500/30 active:scale-[0.98] transition-transform">
                Adaugă în Lot
              </button>
            </form>

            <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-xl border border-white/50 overflow-hidden">
              <div className="p-4 bg-slate-50/50 border-b border-gray-100 font-bold text-slate-700 flex justify-between items-center">
                <span>Lot Complet</span>
                <span className="bg-slate-200 text-slate-600 px-3 py-1 rounded-full text-sm">{players.length}</span>
              </div>
              <ul className="divide-y divide-gray-100/60 max-h-[50vh] overflow-y-auto">
                {players.map(p => (
                  <li key={p.id} className="p-4 flex justify-between items-center hover:bg-slate-50/50 transition-colors">
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-800 text-lg">
                        {p.name} {p.isGoalkeeper && <span className="text-base" title="Portar">🧤</span>}
                      </span>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[11px] uppercase tracking-wider font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-md">
                          Nota {p.rating}
                        </span>
                        {!p.permanent && <span className="text-[11px] uppercase tracking-wider font-bold bg-orange-100 text-orange-600 px-2 py-0.5 rounded-md">Doar Azi</span>}
                      </div>
                    </div>
                    <button onClick={() => deletePlayer(p.id)} className="text-red-400 p-2 hover:bg-red-50 hover:text-red-500 rounded-full transition-colors">
                      <Trash2 size={20} />
                    </button>
                  </li>
                ))}
                {players.length === 0 && <p className="p-8 text-center text-slate-400 font-medium">Lotul este gol. Adaugă primul jucător!</p>}
              </ul>
            </div>
          </div>
        )}

        {activeTab === 'generare' && (
          <div className="space-y-4">
            <div className="bg-white/90 backdrop-blur-md border border-white/50 p-4 rounded-2xl sticky top-20 z-10 flex justify-between items-center shadow-xl">
              <div className="flex flex-col">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Jucători Prezenți</span>
                <span className="font-black text-2xl text-blue-700">{validSelectedCount}</span>
              </div>
              <button 
                onClick={generateTeams}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-blue-500/30 flex items-center gap-2 active:scale-[0.98] transition-transform"
              >
                <Play size={20} fill="currentColor" /> Echipe
              </button>
            </div>

            <ul className="bg-white/90 backdrop-blur-md rounded-2xl shadow-xl border border-white/50 divide-y divide-gray-100/60 overflow-hidden mb-6">
              {players.map(p => {
                const isSelected = selectedForMatch.includes(p.id);
                return (
                  <li 
                    key={p.id} 
                    onClick={() => toggleSelection(p.id)}
                    className={`p-4 flex justify-between items-center transition-all cursor-pointer ${isSelected ? 'bg-blue-50/60' : 'hover:bg-slate-50/50'}`}
                  >
                    <span className={`font-bold text-lg ${isSelected ? 'text-blue-800' : 'text-slate-700'}`}>
                      {p.name} {p.isGoalkeeper && '🧤'}
                    </span>
                    <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-colors ${isSelected ? 'border-blue-600 bg-blue-600 text-white shadow-md' : 'border-gray-300'}`}>
                      {isSelected && <CheckCircle2 size={18} />}
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        )}

        {activeTab === 'echipe' && (
          <div className="space-y-6">
            
            {/* ISTORIC MUTAT SUS */}
            <div className="bg-slate-900/60 backdrop-blur-md p-5 rounded-2xl text-sm text-slate-200 shadow-inner border border-white/10">
              <h4 className="font-bold mb-3 text-white flex items-center gap-2">
                <List size={16} /> Istoric Generări (Azi)
              </h4>
              <ul className="space-y-2 font-medium">
                {history.map((log, i) => (
                  <li key={i} className="flex gap-2 items-center text-slate-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span> {log}
                  </li>
                ))}
                {history.length === 0 && <li className="text-slate-400 italic">Nu s-au făcut echipe încă.</li>}
              </ul>
            </div>

            {/* ECHIPELE */}
            {['A', 'B', 'C'].map((teamKey, index) => {
              const colors = [
                'from-blue-600 to-blue-800', 
                'from-emerald-600 to-emerald-800', 
                'from-rose-600 to-rose-800'
              ];
              
              return (
                <div key={teamKey} className="bg-white/90 backdrop-blur-md rounded-2xl shadow-xl border border-white/50 overflow-hidden">
                  <div className={`bg-gradient-to-r ${colors[index]} text-white p-4 flex justify-between items-center`}>
                    <h3 className="font-black text-xl tracking-wide">Echipa {teamKey}</h3>
                    <span className="text-xs bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full font-bold border border-white/30">
                      Putere: {calculateTeamScore(teams[teamKey] || [])}
                    </span>
                  </div>
                  <ul className="divide-y divide-gray-100/60">
                    {(teams[teamKey] || []).map(p => (
                      <li key={p.id} className="p-3.5 flex justify-between items-center">
                        <span className="font-bold text-slate-700 text-lg">{p.name} {p.isGoalkeeper && '🧤'}</span>
                        <span className="text-xs bg-slate-100 text-slate-500 px-2.5 py-1 rounded-lg font-black border border-slate-200">
                          {p.rating === '?' ? '?' : p.rating}
                        </span>
                      </li>
                    ))}
                    {(teams[teamKey] || []).length === 0 && <li className="p-5 text-center text-slate-400 font-medium">Teren gol</li>}
                  </ul>
                </div>
              )
            })}

            <button 
              onClick={generateTeams}
              className="w-full bg-slate-900/80 backdrop-blur-md text-white border border-white/10 p-4 rounded-2xl font-bold shadow-xl flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
            >
              <RotateCcw size={20} /> Re-amestecă Echipele
            </button>
          </div>
        )}
      </main>

      <div className="fixed bottom-4 inset-x-4 z-20">
        <nav className="bg-white/80 backdrop-blur-xl border border-white/50 rounded-2xl flex justify-around p-2 shadow-2xl">
          <button onClick={() => setActiveTab('jucatori')} className={`flex flex-col items-center p-2 flex-1 rounded-xl transition-all ${activeTab === 'jucatori' ? 'bg-blue-50/80 text-blue-600 scale-105' : 'text-slate-500 hover:text-slate-800'}`}>
            <Users size={22} strokeWidth={activeTab === 'jucatori' ? 2.5 : 2} />
            <span className="text-[11px] mt-1 font-bold">Lot</span>
          </button>
          <button onClick={() => setActiveTab('generare')} className={`flex flex-col items-center p-2 flex-1 rounded-xl transition-all ${activeTab === 'generare' ? 'bg-blue-50/80 text-blue-600 scale-105' : 'text-slate-500 hover:text-slate-800'}`}>
            <CheckCircle2 size={22} strokeWidth={activeTab === 'generare' ? 2.5 : 2} />
            <span className="text-[11px] mt-1 font-bold">Check-in</span>
          </button>
          <button onClick={() => setActiveTab('echipe')} className={`flex flex-col items-center p-2 flex-1 rounded-xl transition-all ${activeTab === 'echipe' ? 'bg-blue-50/80 text-blue-600 scale-105' : 'text-slate-500 hover:text-slate-800'}`}>
            <Play size={22} strokeWidth={activeTab === 'echipe' ? 2.5 : 2} />
            <span className="text-[11px] mt-1 font-bold">Echipe</span>
          </button>
        </nav>
      </div>
    </div>
  );
}