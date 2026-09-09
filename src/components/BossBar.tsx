import React, { useEffect, useState } from 'react';
import { GameBridge, BossStats } from '../game/GameBridge';

export const BossBar: React.FC = () => {
  const [boss, setBoss] = useState<BossStats>({
    active: false,
    name: '',
    subtitle: '',
    phase: 1,
    maxPhases: 1,
    hp: 0,
    maxHp: 1
  });

  useEffect(() => {
    const unsub = GameBridge.on('boss_encounter', (stats: BossStats) => {
      setBoss(stats);
    });
    return unsub;
  }, []);

  if (!boss.active || boss.hp <= 0) return null;

  const hpPercent = Math.max(0, Math.min(100, (boss.hp / boss.maxHp) * 100));

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 w-full max-w-2xl px-4 z-20 pointer-events-none">
      <div className="glass-panel p-3.5 border-t-2 border-t-red-500 shadow-2xl">
        {/* Title & Phase Indicator */}
        <div className="flex justify-between items-end mb-1.5">
          <div>
            <div className="text-base font-cinzel font-black tracking-widest text-red-400">
              {boss.name}
            </div>
            <div className="text-xs font-tech text-slate-400 uppercase tracking-wider">
              {boss.subtitle}
            </div>
          </div>

          {/* Phase Diamond Gems */}
          {boss.maxPhases > 1 && (
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-tech text-slate-400 uppercase">PHASE:</span>
              <div className="flex space-x-1.5">
                {Array.from({ length: boss.maxPhases }).map((_, i) => {
                  const isCurrent = i + 1 === boss.phase;
                  const isCleared = i + 1 < boss.phase;
                  return (
                    <div
                      key={i}
                      className={`w-3.5 h-3.5 rotate-45 transition-all duration-300 ${
                        isCurrent
                          ? 'bg-yellow-400 shadow-lg shadow-yellow-400/80 scale-110 border border-white'
                          : isCleared
                          ? 'bg-red-600/60 border border-red-500/40'
                          : 'bg-slate-800 border border-slate-700'
                      }`}
                    />
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Health Bar */}
        <div className="w-full h-4 bg-slate-950 rounded-sm overflow-hidden p-0.5 border border-red-950/80">
          <div
            className="h-full bg-gradient-to-r from-red-600 via-rose-500 to-amber-400 transition-all duration-150 rounded-sm"
            style={{ width: `${hpPercent}%` }}
          />
        </div>
      </div>
    </div>
  );
};
