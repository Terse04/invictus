import React from 'react';
import { VictoryPayload } from '../game/GameBridge';
import { Trophy, RotateCcw, Sparkles } from 'lucide-react';

interface VictoryModalProps {
  data: VictoryPayload | null;
  onRestart: () => void;
}

export const VictoryModal: React.FC<VictoryModalProps> = ({ data, onRestart }) => {
  if (!data) return null;

  return (
    <div className="absolute inset-0 z-50 bg-black/85 backdrop-blur-lg flex items-center justify-center p-6 select-none animate-fade-in">
      <div className="glass-panel w-full max-w-xl p-8 border-2 border-yellow-400/80 shadow-[0_0_50px_rgba(255,215,0,0.25)] text-center space-y-6 relative overflow-hidden">
        {/* Decorative background aura */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-yellow-400/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-cyan-400/10 rounded-full blur-3xl pointer-events-none" />

        {/* Title */}
        <div className="space-y-1">
          <div className="flex items-center justify-center space-x-2 text-yellow-400 mb-2">
            <Trophy className="w-8 h-8 animate-bounce" />
          </div>
          <h1 className="text-3xl font-cinzel font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-amber-200 to-cyan-300">
            VERTICAL SLICE COMPLETE
          </h1>
          <p className="text-sm font-cinzel text-slate-300 tracking-wider">
            CHAPTER I: CONVERGENCE OF JADE & CIRCUIT
          </p>
        </div>

        {/* Rank Display */}
        <div className="py-2">
          <div className="text-xs font-tech text-slate-400 uppercase tracking-widest">
            CLEAR PERFORMANCE EVALUATION
          </div>
          <div className="text-6xl font-black font-cinzel text-yellow-400 tracking-tight mt-1 drop-shadow-[0_0_20px_rgba(255,215,0,0.6)]">
            RANK {data.rank}
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-3 gap-4 border-y border-slate-800/80 py-4 bg-slate-950/40 rounded">
          <div>
            <div className="text-[11px] font-tech text-slate-400">CLEAR TIME</div>
            <div className="text-lg font-tech font-bold text-slate-100">
              {Math.floor(data.timeElapsed / 60)}m {data.timeElapsed % 60}s
            </div>
          </div>

          <div>
            <div className="text-[11px] font-tech text-slate-400">MAX COMBO</div>
            <div className="text-lg font-tech font-bold text-yellow-300">
              {data.maxCombo} HITS
            </div>
          </div>

          <div>
            <div className="text-[11px] font-tech text-slate-400">TOTAL DAMAGE</div>
            <div className="text-lg font-tech font-bold text-cyan-300">
              {data.damageDealt.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Lore reflection */}
        <p className="text-xs font-tech text-slate-300 leading-relaxed max-w-md mx-auto italic">
          "Shenlong-09's core subsides into serene harmonic resonance. The Celestial Ruins fall quiet, but far beyond the western crags, the Greek and Egyptian sectors begin to stir..."
        </p>

        {/* Button */}
        <button
          onClick={onRestart}
          className="px-8 py-3 rounded-lg bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-300 hover:to-amber-400 text-slate-950 font-cinzel font-black tracking-widest text-sm shadow-xl flex items-center space-x-2 mx-auto transition-all transform hover:scale-105"
        >
          <RotateCcw className="w-5 h-5" />
          <span>REPLAY VERTICAL SLICE</span>
        </button>
      </div>
    </div>
  );
};
