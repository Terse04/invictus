import React, { useEffect, useState } from 'react';
import { GameBridge, PlayerStats, ComboStats, ToastPayload } from '../game/GameBridge';
import { Sparkles, Shield, Zap, Pause } from 'lucide-react';

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

  const [combo, setCombo] = useState<ComboStats>({
    count: 0,
    rank: 'D',
    multiplier: 1.0
  });

  const [abilityCd, setAbilityCd] = useState({ current: 0, max: 6000 });
  const [toast, setToast] = useState<ToastPayload | null>(null);

  useEffect(() => {
    const unsubStats = GameBridge.on('player_stats', (newStats: PlayerStats) => {
      setStats(newStats);
    });

    const unsubCombo = GameBridge.on('combo_update', (newCombo: ComboStats) => {
      setCombo(newCombo);
    });

    const unsubCd = GameBridge.on('ability_cooldown', (data: { current: number; max: number }) => {
      setAbilityCd(data);
    });

    const unsubToast = GameBridge.on('toast_message', (newToast: ToastPayload) => {
      setToast(newToast);
      setTimeout(() => {
        setToast(current => (current === newToast ? null : current));
      }, 4500);
    });

    return () => {
      unsubStats();
      unsubCombo();
      unsubCd();
      unsubToast();
    };
  }, []);

  const hpPercent = Math.max(0, Math.min(100, (stats.hp / stats.maxHp) * 100));
  const staminaPercent = Math.max(0, Math.min(100, (stats.stamina / stats.maxStamina) * 100));
  const ultPercent = Math.max(0, Math.min(100, (stats.ultimate / stats.maxUltimate) * 100));
  const isUltReady = stats.ultimate >= stats.maxUltimate;

  return (
    <div className="ui-overlay pointer-events-none p-4 flex flex-col justify-between">
      {/* Top Header Row */}
      <div className="flex justify-between items-start w-full">
        {/* Protagonist Status Plate */}
        <div className="glass-panel p-3.5 flex items-center space-x-4 border-l-4 border-l-cyan-400 max-w-md w-full">
          {/* Avatar Icon */}
          <div className="relative w-14 h-14 rounded-lg bg-slate-900 border border-cyan-500/50 flex items-center justify-center overflow-hidden flex-shrink-0">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-cyan-500 to-emerald-400 opacity-80" />
            <div className="absolute inset-0 flex items-center justify-center font-cinzel text-xs font-bold text-white">
              林韵
            </div>
            {isUltReady && (
              <div className="absolute inset-0 border-2 border-yellow-400 rounded-lg animate-pulse" />
            )}
          </div>

          {/* Bars */}
          <div className="flex-1 space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <span className="font-cinzel tracking-wider text-cyan-300 font-semibold">LIN YUN // FLUX BLADE</span>
              <span className="font-tech text-slate-400 font-bold">{Math.round(stats.hp)} / {stats.maxHp}</span>
            </div>

            {/* HP Bar */}
            <div className="w-full h-3.5 bg-slate-950/80 rounded-sm overflow-hidden p-0.5 border border-slate-800">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 via-teal-400 to-emerald-400 transition-all duration-150 rounded-sm"
                style={{ width: `${hpPercent}%` }}
              />
            </div>

            {/* Stamina Bar */}
            <div className="w-full h-1.5 bg-slate-950/80 rounded-sm overflow-hidden border border-slate-800">
              <div
                className="h-full bg-emerald-500 transition-all duration-75"
                style={{ width: `${staminaPercent}%` }}
              />
            </div>

            {/* Skill / Cooldown Badges */}
            <div className="flex items-center space-x-3 pt-1">
              {/* Ability [E] */}
              <div className="flex items-center space-x-1.5 text-[11px] font-tech text-slate-300">
                <span className="px-1.5 py-0.5 rounded bg-cyan-950 border border-cyan-500/40 text-cyan-300 font-bold">
                  E
                </span>
                <span>WAVE</span>
                {abilityCd.current > 0 ? (
                  <span className="text-yellow-400">({(abilityCd.current / 1000).toFixed(1)}s)</span>
                ) : (
                  <span className="text-emerald-400 font-bold">READY</span>
                )}
              </div>

              {/* Ultimate [Q] */}
              <div className="flex items-center space-x-1.5 text-[11px] font-tech text-slate-300">
                <span className={`px-1.5 py-0.5 rounded font-bold ${isUltReady ? 'bg-yellow-500 text-slate-950 animate-pulse' : 'bg-slate-800 border border-slate-700 text-slate-400'}`}>
                  Q
                </span>
                <span>ULT</span>
                <span className={isUltReady ? 'text-yellow-300 font-bold' : 'text-slate-400'}>
                  {isUltReady ? 'RESONANCE READY!' : `${Math.round(ultPercent)}%`}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Quest & Objective Banner */}
        <div className="glass-panel px-4 py-2 border-t-2 border-t-cyan-400 hidden md:flex items-center space-x-2">
          <Sparkles className="w-4 h-4 text-cyan-400 animate-spin" />
          <div className="text-xs font-tech">
            <span className="text-slate-400">OBJECTIVE: </span>
            <span className="text-cyan-200 font-semibold">Traverse the Celestial Ruins & Conquer Shenlong-09</span>
          </div>
        </div>

        {/* Top Right Pause Button */}
        <button
          onClick={onPause}
          className="interactive glass-panel p-2.5 hover:border-cyan-400 text-slate-300 hover:text-cyan-300 transition-all rounded-lg flex items-center justify-center shadow-lg"
          title="Pause [ESC]"
        >
          <Pause className="w-5 h-5" />
        </button>
      </div>

      {/* Middle Row: Combo Counter */}
      <div className="flex justify-end pr-6">
        {combo.count > 1 && (
          <div className="glass-panel p-3 border-r-4 border-r-yellow-400 text-right animate-bounce">
            <div className="flex items-baseline justify-end space-x-2">
              <span className="text-3xl font-black font-tech text-yellow-400 tracking-tighter">
                {combo.count}
              </span>
              <span className="text-sm font-bold text-slate-300 font-cinzel">HITS</span>
            </div>
            <div className="text-xl font-extrabold font-cinzel tracking-widest text-cyan-300">
              RANK {combo.rank}
            </div>
            <div className="text-[10px] font-tech text-slate-400">
              DMG ×{combo.multiplier.toFixed(2)}
            </div>
          </div>
        )}
      </div>

      {/* Toast Notification Banner (Bottom Center) */}
      {toast && (
        <div className="self-center mb-8 glass-panel px-6 py-3 border-cyan-400/80 text-center max-w-lg shadow-2xl animate-fade-in border-b-2">
          <div className="text-sm font-cinzel font-bold text-cyan-300 tracking-wider">
            {toast.title}
          </div>
          {toast.subtitle && (
            <div className="text-xs font-tech text-slate-300 mt-1">
              {toast.subtitle}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
