import React, { useState } from 'react';
import { QualityLevel, setQuality } from '../game/QualitySettings';
import { SoundManager } from '../game/audio/SoundManager';
import { GameSettings, loadSettings, saveSettings } from '../utils/storage';

export const SettingsModal: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const [settings, setSettings] = useState<GameSettings>(loadSettings);
  if (!open) return null;
  const apply = (next: GameSettings) => { setSettings(next); saveSettings(next); SoundManager.getInstance().setVolumes(next.masterVolume, next.sfxVolume, next.bgmVolume); };
  const slider = (label: string, key: 'masterVolume' | 'sfxVolume' | 'bgmVolume') => <label className="block text-sm text-slate-200">{label}<input aria-label={label} className="w-full accent-cyan-400" type="range" min="0" max="1" step="0.01" value={settings[key]} onChange={e => apply({ ...settings, [key]: Number(e.target.value) })} /></label>;
  return <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm grid place-items-center p-5" onMouseDown={onClose}><section className="glass-panel w-full max-w-lg p-6 space-y-4" onMouseDown={e => e.stopPropagation()}><div className="flex justify-between"><h2 className="font-cinzel text-xl tracking-widest text-cyan-200">SETTINGS & GRAPHICS</h2><button onClick={onClose}>CLOSE</button></div>{slider('Master Volume', 'masterVolume')}{slider('SFX Volume', 'sfxVolume')}{slider('BGM Volume', 'bgmVolume')}<label className="block text-sm">QUALITY PROFILE<select className="ml-3 bg-slate-950 border border-slate-600 p-1" value={settings.particleQuality} onChange={e => { const quality = e.target.value as QualityLevel; setQuality(quality); apply({ ...settings, particleQuality: quality }); }}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></label>{(['screenShake', 'showDamageNumbers'] as const).map(key => <label key={key} className="flex justify-between text-sm"><span>{key === 'screenShake' ? 'Screen Shake' : 'Damage Numbers'}</span><input type="checkbox" checked={settings[key]} onChange={e => apply({ ...settings, [key]: e.target.checked })} /></label>)}<p className="text-xs text-slate-400">Quality changes apply on the next chapter load.</p></section></div>;
};
