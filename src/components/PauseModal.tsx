import React, { useState } from 'react';
import { GameSettings, loadSettings, saveSettings } from '../utils/storage';
import { SoundManager } from '../game/audio/SoundManager';
import { Volume2, Sliders, Shield, RotateCcw, Play, Download } from 'lucide-react';

interface PauseModalProps {
  isOpen: boolean;
  onResume: () => void;
  onRestart: () => void;
  deferredPrompt: any;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  isOpen,
  onResume,
  onRestart,
  deferredPrompt
}) => {
  const [settings, setSettings] = useState<GameSettings>(loadSettings());
  const soundManager = SoundManager.getInstance();

  if (!isOpen) return null;

  const handleSliderChange = (key: 'masterVolume' | 'sfxVolume' | 'bgmVolume', val: number) => {
    const updated = { ...settings, [key]: val };
    setSettings(updated);
    saveSettings(updated);
    soundManager.setVolumes(updated.masterVolume, updated.sfxVolume, updated.bgmVolume);
  };

  const handleToggle = (key: 'screenShake' | 'showDamageNumbers') => {
    const updated = { ...settings, [key]: !settings[key] };
    setSettings(updated);
    saveSettings(updated);
  };

  const handleInstallPWA = () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
    }
  };

  return (
    <div className="absolute inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-6 select-none">
      <div className="glass-panel w-full max-w-xl p-6 border-t-4 border-t-cyan-400 shadow-2xl space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
          <div>
            <h2 className="text-xl font-cinzel font-black text-cyan-300 tracking-wider">
              INVICTUS — PAUSED
            </h2>
            <p className="text-xs font-tech text-slate-400">
              Celestial Sanctuary
            </p>
          </div>
          <button
            onClick={onResume}
            className="px-4 py-1.5 rounded bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-tech font-bold text-xs flex items-center space-x-1.5 transition-all shadow-lg"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>RESUME</span>
          </button>
        </div>

        {/* Audio & Video Settings */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2 text-sm font-cinzel text-slate-200">
            <Volume2 className="w-4 h-4 text-emerald-400" />
            <span>AUDIO</span>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-[11px] font-tech text-slate-400 flex justify-between">
                <span>MASTER</span>
                <span>{Math.round(settings.masterVolume * 100)}%</span>
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={settings.masterVolume}
                onChange={e => handleSliderChange('masterVolume', parseFloat(e.target.value))}
                className="w-full accent-cyan-400 mt-1 cursor-pointer"
              />
            </div>

            <div>
              <label className="text-[11px] font-tech text-slate-400 flex justify-between">
                <span>SFX</span>
                <span>{Math.round(settings.sfxVolume * 100)}%</span>
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={settings.sfxVolume}
                onChange={e => handleSliderChange('sfxVolume', parseFloat(e.target.value))}
                className="w-full accent-cyan-400 mt-1 cursor-pointer"
              />
            </div>

            <div>
              <label className="text-[11px] font-tech text-slate-400 flex justify-between">
                <span>BGM</span>
                <span>{Math.round(settings.bgmVolume * 100)}%</span>
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={settings.bgmVolume}
                onChange={e => handleSliderChange('bgmVolume', parseFloat(e.target.value))}
                className="w-full accent-cyan-400 mt-1 cursor-pointer"
              />
            </div>
          </div>

          {/* Gameplay Toggles */}
          <div className="flex space-x-4 pt-2">
            <button
              onClick={() => handleToggle('screenShake')}
              className={`flex-1 py-2 px-3 rounded border text-xs font-tech flex items-center justify-between transition-all ${
                settings.screenShake
                  ? 'border-cyan-500 bg-cyan-950/40 text-cyan-300'
                  : 'border-slate-800 bg-slate-900 text-slate-500'
              }`}
            >
              <span>Screen Shake</span>
              <span>{settings.screenShake ? 'ON' : 'OFF'}</span>
            </button>

            <button
              onClick={() => handleToggle('showDamageNumbers')}
              className={`flex-1 py-2 px-3 rounded border text-xs font-tech flex items-center justify-between transition-all ${
                settings.showDamageNumbers
                  ? 'border-cyan-500 bg-cyan-950/40 text-cyan-300'
                  : 'border-slate-800 bg-slate-900 text-slate-500'
              }`}
            >
              <span>Damage Text</span>
              <span>{settings.showDamageNumbers ? 'ON' : 'OFF'}</span>
            </button>
          </div>
        </div>

        {/* Controls Guide */}
        <div className="border border-slate-800 rounded p-3 bg-slate-950/60 space-y-2">
          <div className="text-xs font-cinzel text-slate-300 font-bold">CONTROLS REFERENCE</div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] font-tech text-slate-400">
            <div><span className="text-emerald-400 font-bold">WASD / Stick:</span> Move camera-relative</div>
            <div><span className="text-emerald-400 font-bold">LMB:</span> 3-Hit Light Combo</div>
            <div><span className="text-emerald-400 font-bold">Shift:</span> Hold to sprint, tap to evade</div>
            <div><span className="text-emerald-400 font-bold">RMB:</span> Charged Heavy Strike</div>
            <div><span className="text-emerald-400 font-bold">Space:</span> Jump</div>
            <div><span className="text-emerald-400 font-bold">E / Q:</span> Wave / Celestial Burst</div>
            <div><span className="text-emerald-400 font-bold">F:</span> Interact</div>
            <div><span className="text-emerald-400 font-bold">ESC:</span> Release cursor / Pause</div>
          </div>
        </div>

        {/* Actions Footer */}
        <div className="flex justify-between items-center pt-2">
          {deferredPrompt && (
            <button
              onClick={handleInstallPWA}
              className="px-3 py-2 rounded border border-yellow-500/60 text-yellow-300 bg-yellow-950/30 hover:bg-yellow-900/50 text-xs font-tech flex items-center space-x-1.5 transition-all"
            >
              <Download className="w-4 h-4" />
              <span>INSTALL PWA APP</span>
            </button>
          )}

          <div className="flex space-x-3 ml-auto">
            <button
              onClick={onRestart}
              className="px-4 py-2 rounded border border-red-500/40 text-red-300 bg-red-950/20 hover:bg-red-900/40 text-xs font-tech flex items-center space-x-1.5 transition-all"
            >
              <RotateCcw className="w-4 h-4" />
              <span>RESTART RUN</span>
            </button>

            <button
              onClick={onResume}
              className="px-5 py-2 rounded bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-tech font-bold transition-all shadow-lg"
            >
              RESUME PLAY
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
