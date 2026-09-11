import React, { useState } from 'react';
import { QualityLevel, setQuality } from '../game/QualitySettings';
import { SoundManager } from '../game/audio/SoundManager';
import { GameSettings, loadSettings, saveSettings } from '../utils/storage';
import {
  Monitor,
  Volume2,
  Gamepad2,
  Sliders,
  X,
  VolumeX,
  Play,
  RotateCcw,
  Sparkles,
  Zap,
  Shield
} from 'lucide-react';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

type SettingsTab = 'graphics' | 'audio' | 'controls' | 'gameplay';

export const SettingsModal: React.FC<SettingsModalProps> = ({ open, onClose }) => {
  const [settings, setSettings] = useState<GameSettings>(loadSettings);
  const [activeTab, setActiveTab] = useState<SettingsTab>('graphics');
  const soundManager = SoundManager.getInstance();

  if (!open) return null;

  const apply = (next: GameSettings) => {
    setSettings(next);
    saveSettings(next);
    soundManager.setVolumes(next.masterVolume, next.sfxVolume, next.bgmVolume);
  };

  const handleTestAudio = (type: 'slash' | 'hit' | 'katana' | 'roar') => {
    soundManager.playUIClick();
    if (type === 'slash') soundManager.playSlash(1);
    if (type === 'hit') soundManager.playHit(true);
    if (type === 'katana') {
      soundManager.playKatanaDraw();
      setTimeout(() => soundManager.playSheathClick(), 240);
    }
    if (type === 'roar') soundManager.playBossRoar();
  };

  const handlePresetSelect = (level: QualityLevel) => {
    setQuality(level);
    const updated: GameSettings = {
      ...settings,
      particleQuality: level,
      shadowQuality: level === 'low' ? 'off' : level === 'medium' ? 'low' : 'high',
      bloomEnabled: level !== 'low'
    };
    apply(updated);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 select-none animate-fade-in"
      onMouseDown={onClose}
    >
      <section
        className="glass-panel w-full max-w-3xl overflow-hidden border border-cyan-500/30 shadow-[0_0_50px_rgba(0,240,255,0.12)] flex flex-col max-h-[90vh]"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <header className="flex justify-between items-center px-6 py-4 border-b border-cyan-900/50 bg-slate-950/60">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-300">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-cinzel text-lg font-bold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-cyan-200 to-teal-300">
                SYSTEM CONFIGURATION
              </h2>
              <p className="text-[11px] font-tech text-slate-400 tracking-wider">
                INVICTUS // CELESTIAL PROTOCOL SPECIFICATION
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              soundManager.playUIClick();
              onClose();
            }}
            className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            title="Close [Esc]"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        {/* Tab Navigation */}
        <nav className="flex border-b border-slate-800/80 bg-slate-950/40 px-6">
          {(
            [
              { id: 'graphics', label: 'GRAPHICS', icon: Monitor },
              { id: 'audio', label: 'AUDIO', icon: Volume2 },
              { id: 'controls', label: 'CONTROLS', icon: Gamepad2 },
              { id: 'gameplay', label: 'GAMEPLAY', icon: Zap }
            ] as const
          ).map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  soundManager.playUIClick();
                  setActiveTab(tab.id);
                }}
                className={`flex items-center space-x-2 py-3 px-4 text-xs font-tech tracking-wider border-b-2 transition-all ${
                  isActive
                    ? 'border-cyan-400 text-cyan-300 font-bold bg-cyan-950/20'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Tab Content Container */}
        <div className="p-6 overflow-y-auto space-y-6 text-slate-200 flex-1">
          {/* 1. GRAPHICS TAB */}
          {activeTab === 'graphics' && (
            <div className="space-y-6">
              {/* Quality Presets */}
              <div>
                <label className="text-xs font-tech text-slate-400 uppercase tracking-widest block mb-2">
                  PERFORMANCE PROFILE PRESET
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {(
                    [
                      { id: 'low', label: 'LOW', desc: 'Max FPS · Reduced shadows & DPR' },
                      { id: 'medium', label: 'MEDIUM', desc: 'Intended baseline · Balanced PBR' },
                      { id: 'high', label: 'HIGH', desc: 'Full Bloom · High-res soft shadows' }
                    ] as const
                  ).map((preset) => (
                    <button
                      key={preset.id}
                      onClick={() => handlePresetSelect(preset.id)}
                      className={`p-3 rounded border text-left transition-all ${
                        settings.particleQuality === preset.id
                          ? 'border-cyan-400 bg-cyan-950/40 text-cyan-200 shadow-[0_0_12px_rgba(0,240,255,0.2)]'
                          : 'border-slate-800 bg-slate-900/40 hover:border-slate-700 text-slate-300'
                      }`}
                    >
                      <div className="font-cinzel font-bold text-sm">{preset.label}</div>
                      <div className="text-[10px] font-tech text-slate-400 mt-1">{preset.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Individual Toggles */}
              <div className="space-y-3 border-t border-slate-800/80 pt-4">
                <div className="text-xs font-tech text-slate-400 uppercase tracking-widest">
                  RENDER PIPELINE TOGGLES
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="flex items-center justify-between p-3 rounded bg-slate-900/30 border border-slate-800/70 hover:border-slate-700 cursor-pointer">
                    <span className="text-xs font-tech">NEON BLOOM PIPELINE</span>
                    <input
                      type="checkbox"
                      checked={settings.bloomEnabled}
                      onChange={(e) => apply({ ...settings, bloomEnabled: e.target.checked })}
                      className="accent-cyan-400 w-4 h-4 cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 rounded bg-slate-900/30 border border-slate-800/70 hover:border-slate-700 cursor-pointer">
                    <span className="text-xs font-tech">ATMOSPHERIC EXPONENTIAL FOG</span>
                    <input
                      type="checkbox"
                      checked={settings.fogEnabled}
                      onChange={(e) => apply({ ...settings, fogEnabled: e.target.checked })}
                      className="accent-cyan-400 w-4 h-4 cursor-pointer"
                    />
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* 2. AUDIO TAB */}
          {activeTab === 'audio' && (
            <div className="space-y-6">
              {/* Sliders */}
              <div className="space-y-4">
                {(
                  [
                    { key: 'masterVolume', label: 'MASTER SYNTHESIZER' },
                    { key: 'bgmVolume', label: 'CELESTIAL BGM HARMONICS' },
                    { key: 'sfxVolume', label: 'COMBAT & KATANA SFX' }
                  ] as const
                ).map(({ key, label }) => (
                  <div key={key} className="space-y-1.5">
                    <div className="flex justify-between text-xs font-tech text-slate-300">
                      <span>{label}</span>
                      <span className="text-cyan-300 font-mono">
                        {Math.round(settings[key] * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={settings[key]}
                      onChange={(e) => apply({ ...settings, [key]: parseFloat(e.target.value) })}
                      className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                    />
                  </div>
                ))}
              </div>

              {/* Real-time SFX Test Buttons */}
              <div className="border-t border-slate-800/80 pt-4 space-y-2">
                <div className="text-xs font-tech text-slate-400 uppercase tracking-widest">
                  AUDIO SYNTHESIZER PREVIEW
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    onClick={() => handleTestAudio('slash')}
                    className="p-2 rounded bg-slate-900 border border-slate-700 hover:border-cyan-400 text-[11px] font-tech text-slate-300 flex items-center justify-center space-x-1.5"
                  >
                    <Play className="w-3 h-3 text-cyan-400" />
                    <span>SLASH SFX</span>
                  </button>
                  <button
                    onClick={() => handleTestAudio('hit')}
                    className="p-2 rounded bg-slate-900 border border-slate-700 hover:border-cyan-400 text-[11px] font-tech text-slate-300 flex items-center justify-center space-x-1.5"
                  >
                    <Play className="w-3 h-3 text-cyan-400" />
                    <span>CRIT IMPACT</span>
                  </button>
                  <button
                    onClick={() => handleTestAudio('katana')}
                    className="p-2 rounded bg-slate-900 border border-slate-700 hover:border-cyan-400 text-[11px] font-tech text-slate-300 flex items-center justify-center space-x-1.5"
                  >
                    <Play className="w-3 h-3 text-cyan-400" />
                    <span>DRAW / SHEATH</span>
                  </button>
                  <button
                    onClick={() => handleTestAudio('roar')}
                    className="p-2 rounded bg-slate-900 border border-slate-700 hover:border-cyan-400 text-[11px] font-tech text-slate-300 flex items-center justify-center space-x-1.5"
                  >
                    <Play className="w-3 h-3 text-cyan-400" />
                    <span>BOSS ROAR</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 3. CONTROLS TAB */}
          {activeTab === 'controls' && (
            <div className="space-y-6">
              {/* Keyboard Bindings Table */}
              <div className="space-y-2">
                <div className="text-xs font-tech text-slate-400 uppercase tracking-widest">
                  ACTION COMBAT BINDINGS
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-tech">
                  {[
                    { action: 'Movement', keys: ['W', 'A', 'S', 'D'] },
                    { action: 'Light Katana Combo', keys: ['L-CLICK', 'J'] },
                    { action: 'Heavy Battou Stance', keys: ['R-CLICK', 'K'] },
                    { action: 'Transmutation Wave', keys: ['E'] },
                    { action: 'Celestial Resonance (Burst)', keys: ['Q'] },
                    { action: 'Acrobatic Dodge Roll', keys: ['SHIFT', 'SPACE'] },
                    { action: 'Stele / Lore Interaction', keys: ['F'] },
                    { action: 'Pause Menu', keys: ['ESC', 'P'] }
                  ].map((item) => (
                    <div
                      key={item.action}
                      className="flex justify-between items-center p-2 rounded bg-slate-900/40 border border-slate-800/70"
                    >
                      <span className="text-slate-300">{item.action}</span>
                      <div className="flex space-x-1">
                        {item.keys.map((k) => (
                          <kbd
                            key={k}
                            className="px-1.5 py-0.5 rounded bg-black/60 border border-slate-700 text-[10px] text-cyan-300 font-mono"
                          >
                            {k}
                          </kbd>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Camera Sensitivity Slider */}
              <div className="space-y-2 border-t border-slate-800/80 pt-4">
                <div className="flex justify-between text-xs font-tech text-slate-300">
                  <span>CAMERA ROTATION SENSITIVITY</span>
                  <span className="text-cyan-300 font-mono">{settings.cameraSensitivity}x</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="2.0"
                  step="0.1"
                  value={settings.cameraSensitivity}
                  onChange={(e) =>
                    apply({ ...settings, cameraSensitivity: parseFloat(e.target.value) })
                  }
                  className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                />
              </div>
            </div>
          )}

          {/* 4. GAMEPLAY TAB */}
          {activeTab === 'gameplay' && (
            <div className="space-y-4">
              <div className="text-xs font-tech text-slate-400 uppercase tracking-widest">
                COMBAT FEEDBACK & ACCESSIBILITY
              </div>

              <label className="flex items-center justify-between p-3 rounded bg-slate-900/30 border border-slate-800/70 hover:border-slate-700 cursor-pointer">
                <div>
                  <div className="text-xs font-tech">CAMERA COMBAT SHAKE</div>
                  <div className="text-[10px] text-slate-400">
                    Subtle physical reaction on heavy attacks and explosions
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.screenShake}
                  onChange={(e) => apply({ ...settings, screenShake: e.target.checked })}
                  className="accent-cyan-400 w-4 h-4 cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded bg-slate-900/30 border border-slate-800/70 hover:border-slate-700 cursor-pointer">
                <div>
                  <div className="text-xs font-tech">SPATIAL FLOATING DAMAGE NUMBERS</div>
                  <div className="text-[10px] text-slate-400">
                    Displays damage values and critical hit multipliers
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.showDamageNumbers}
                  onChange={(e) => apply({ ...settings, showDamageNumbers: e.target.checked })}
                  className="accent-cyan-400 w-4 h-4 cursor-pointer"
                />
              </label>
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="px-6 py-3 border-t border-slate-800/80 bg-slate-950/60 flex justify-between items-center text-xs font-tech text-slate-400">
          <span>INVICTUS BUILD 1.0.2 // PASS 02</span>
          <button
            onClick={() => {
              soundManager.playUIClick();
              onClose();
            }}
            className="px-5 py-1.5 rounded bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold tracking-wider transition-all shadow-[0_0_12px_rgba(0,240,255,0.3)]"
          >
            CONFIRM SETTINGS
          </button>
        </footer>
      </section>
    </div>
  );
};
