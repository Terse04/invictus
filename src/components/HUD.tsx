import React, { useEffect, useState } from 'react';
import { GameBridge, PlayerStats, ToastPayload } from '../game/GameBridge';
import { Pause, Sparkles, Zap } from 'lucide-react';

interface HUDProps { onPause: () => void; }

export const HUD: React.FC<HUDProps> = ({ onPause }) => {
  const [stats, setStats] = useState<PlayerStats>({ hp: 120, maxHp: 120, stamina: 100, maxStamina: 100, ultimate: 0, maxUltimate: 100, shield: 0 });
  const [ghostHp, setGhostHp] = useState(120);
  const [abilityCd, setAbilityCd] = useState({ current: 0, max: 6000 });
  const [toast, setToast] = useState<ToastPayload | null>(null);

  useEffect(() => {
    const statsOff = GameBridge.on('player_stats', (value: PlayerStats) => { setStats(value); window.setTimeout(() => setGhostHp(value.hp), 420); });
    const cdOff = GameBridge.on('ability_cooldown', (value: { current: number; max: number }) => setAbilityCd(value));
    const toastOff = GameBridge.on('toast_message', (value: ToastPayload) => { setToast(value); window.setTimeout(() => setToast(current => current === value ? null : current), 3200); });
    return () => { statsOff(); cdOff(); toastOff(); };
  }, []);

  const hp = Math.max(0, Math.min(100, stats.hp / stats.maxHp * 100));
  const ghost = Math.max(0, Math.min(100, ghostHp / stats.maxHp * 100));
  const stamina = Math.max(0, Math.min(100, stats.stamina / stats.maxStamina * 100));
  const waveReady = abilityCd.current <= 0;
  const waveProgress = abilityCd.max ? (1 - abilityCd.current / abilityCd.max) * 100 : 100;
  const burstReady = stats.ultimate >= stats.maxUltimate;

  return <div className="absolute inset-0 pointer-events-none z-10 p-6 flex flex-col justify-between select-none">
    <div className="flex justify-between items-start">
      <div className="arpg-status">
        <div className="flex justify-between text-[11px] tracking-[0.18em] font-bold text-stone-100 mb-1"><span>LIN YUN</span><span className="text-stone-400 tracking-normal">{Math.ceil(stats.hp)} / {stats.maxHp}</span></div>
        <div className="relative h-2.5 rounded-full overflow-hidden bg-black/45"><div className="absolute inset-y-0 left-0 bg-red-500/70 transition-all duration-500" style={{ width: `${ghost}%` }} /><div className="absolute inset-y-0 left-0 bg-gradient-to-r from-rose-700 to-rose-400 transition-all duration-150" style={{ width: `${hp}%` }} /></div>
        <div className="h-1 mt-1.5 rounded-full overflow-hidden bg-black/40"><div className="h-full bg-gradient-to-r from-emerald-800 to-emerald-300" style={{ width: `${stamina}%` }} /></div>
        <div className="flex gap-2 mt-2">{[0, 1, 2].map(pip => <span key={pip} className={`w-1.5 h-1.5 rounded-full ${stats.ultimate >= (pip + 1) * 33 ? 'bg-amber-300' : 'bg-stone-700'}`} />)}</div>
      </div>
      <div className="arpg-objective">✦ Traverse the Celestial Sanctuary</div>
      <button onClick={onPause} className="pointer-events-auto arpg-pause" title="Pause (Esc)"><Pause className="w-4 h-4" /></button>
    </div>

    {toast && <div className="self-center arpg-toast"><div>{toast.title}</div>{toast.subtitle && <small>{toast.subtitle}</small>}</div>}

    <div className="self-end flex items-end gap-3">
      <div className={`arpg-skill ${waveReady ? 'ready' : ''}`}><div className="arpg-cooldown" style={{ height: `${100 - waveProgress}%` }} /><Zap className="w-5 h-5" /><b>E</b><span>WAVE</span></div>
      <div className={`arpg-skill ${burstReady ? 'ready burst' : ''}`}><div className="arpg-cooldown" style={{ height: `${100 - (stats.ultimate / stats.maxUltimate) * 100}%` }} /><Sparkles className="w-5 h-5" /><b>Q</b><span>BURST</span></div>
    </div>
    <div className="arpg-reticle">⌄</div>
  </div>;
};
