import React, { useEffect, useState } from 'react';
import { GameBridge, PlayerStats, ToastPayload } from '../game/GameBridge';
import { Pause } from 'lucide-react';

interface HUDProps {
  onPause: () => void;
}

export const HUD: React.FC<HUDProps> = ({ onPause }) => {
  const [stats, setStats] = useState<PlayerStats>({
    hp: 120,
    maxHp: 120,
    stamina: 100,
    maxStamina: 100,
    ultimate: 0,
    maxUltimate: 100,
    shield: 0
  });

  const [ghostHp, setGhostHp] = useState(120);
  const [abilityCd, setAbilityCd] = useState({ current: 0, max: 6000 });
  const [toast, setToast] = useState<ToastPayload | null>(null);

  useEffect(() => {
    const unsubStats = GameBridge.on('player_stats', (newStats: PlayerStats) => {
      setStats(newStats);
      // Ghosting damage effect
      setTimeout(() => {
        setGhostHp(newStats.hp);
      }, 450);
    });

    const unsubCd = GameBridge.on('ability_cooldown', (data: { current: number; max: number }) => {
      setAbilityCd(data);
    });

    const unsubToast = GameBridge.on('toast_message', (newToast: ToastPayload) => {
      setToast(newToast);
      setTimeout(() => {
        setToast(current => (current === newToast ? null : current));
      }, 4000);
    });

    return () => {
      unsubStats();
      unsubCd();
      unsubToast();
    };
  }, []);

  const hpPercent = Math.max(0, Math.min(100, (stats.hp / stats.maxHp) * 100));
  const ghostPercent = Math.max(0, Math.min(100, (ghostHp / stats.maxHp) * 100));
  const staminaPercent = Math.max(0, Math.min(100, (stats.stamina / stats.maxStamina) * 100));
  const isWaveReady = abilityCd.current <= 0;
  const isUltReady = stats.ultimate >= stats.maxUltimate;

  return (
    <div className="absolute inset-0 pointer-events-none p-6 flex flex-col justify-between select-none z-10">
      {/* Top Header Row */}
      <div className="flex justify-between items-start w-full">
        {/* Top-Left: Minimalist Cyber-Warrior Status Plate */}
        <div className="glass-panel px-5 py-3.5 border-l-2 border-l-cyan-400 max-w-xs w-full shadow-xl">
          <div className="flex justify-between items-center mb-1.5">
            <div className="flex items-center space-x-2">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              <span className="font-cinzel text-xs font-bold tracking-widest text-slate-100">
                LIN YUN
              </span>
            </div>
            <span className="font-tech text-[11px] font-semibold text-slate-400">
              {Math.round(stats.hp)} / {stats.maxHp}
            </span>
          </div>

          {/* Health Bar with Ghosting */}
          <div className="relative w-full h-2.5 bg-black/70 rounded-sm overflow-hidden border border-slate-800">
            {/* Red ghost bar */}
            <div
              className="absolute top-0 bottom-0 left-0 bg-red-500/60 transition-all duration-500"
              style={{ width: `${ghostPercent}%` }}
            />
            {/* Primary cyan health bar */}
            <div
              className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-cyan-500 via-teal-400 to-cyan-300 transition-all duration-150"
              style={{ width: `${hpPercent}%` }}
            />
          </div>

          {/* Stamina Bar */}
          <div className="w-full h-1 bg-black/60 rounded-sm overflow-hidden mt-1.5">
            <div
              className="h-full bg-emerald-400 transition-all duration-75"
              style={{ width: `${staminaPercent}%` }}
            />
          </div>

          {/* Ability Readiness Pips */}
          <div className="flex items-center space-x-3 mt-2 text-[10px] font-tech font-bold">
            <span className={`transition-colors ${isWaveReady ? 'text-cyan-300' : 'text-slate-500'}`}>
              [E] WAVE {isWaveReady ? '●' : '○'}
            </span>
            <span className={`transition-colors ${isUltReady ? 'text-yellow-400 animate-pulse' : 'text-slate-500'}`}>
              [Q] RESONANCE {isUltReady ? 'READY' : `${Math.round((stats.ultimate / stats.maxUltimate) * 100)}%`}
            </span>
          </div>
        </div>

        {/* Top-Center: Unobtrusive Objective Indicator */}
        <div className="glass-panel px-4 py-1.5 border border-cyan-500/30 flex items-center space-x-2 shadow-lg">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
          <span className="font-tech text-xs tracking-wider text-slate-200">
            OBJECTIVE: <span className="text-cyan-300 font-semibold">Traverse Celestial Ruins</span>
          </span>
        </div>

        {/* Top-Right: Minimal Pause Button */}
        <button
          onClick={onPause}
          className="pointer-events-auto w-9 h-9 glass-panel border border-slate-700 hover:border-cyan-400 flex items-center justify-center text-slate-300 hover:text-cyan-300 transition-all shadow-lg active:scale-95"
          title="Pause System (ESC)"
        >
          <Pause className="w-4 h-4 fill-current" />
        </button>
      </div>

      {/* Floating Center Toast Banner */}
      {toast && (
        <div className="self-center glass-panel px-6 py-3 border-l-4 border-l-cyan-400 shadow-2xl animate-fade-in text-center max-w-md">
          <div className="text-xs font-cinzel font-bold text-cyan-300 tracking-wider">
            {toast.title}
          </div>
          {toast.subtitle && (
            <div className="text-[11px] font-tech text-slate-400 mt-0.5">
              {toast.subtitle}
            </div>
          )}
        </div>
      )}

      {/* Bottom-Right: Contextual Key Hints */}
      <div className="self-end glass-panel px-4 py-2 border border-slate-800/80 text-[10px] font-tech text-slate-400 flex items-center space-x-3 shadow-lg">
        <span><strong className="text-slate-200">LMB / J</strong> Strike</span>
        <span><strong className="text-slate-200">RMB / K</strong> Charge</span>
        <span><strong className="text-slate-200">Space</strong> Jump</span>
        <span><strong className="text-slate-200">E</strong> Wave</span>
        <span><strong className="text-slate-200">Q</strong> Ult</span>
      </div>
    </div>
  );
};
