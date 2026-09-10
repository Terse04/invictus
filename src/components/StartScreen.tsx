import React, { useEffect, useState } from 'react';
import { ArrowRight, BookOpen, Gamepad2, Settings, Sparkles } from 'lucide-react';
import { ChapterSelectModal } from './ChapterSelectModal';
import { SettingsModal } from './SettingsModal';
import { ControlsModal } from './ControlsModal';
import { LoreModal } from './LoreModal';
import { loadProgress } from '../utils/storage';

interface StartScreenProps { onStartChapter: (chapter: 1 | 2) => void; }

export const StartScreen: React.FC<StartScreenProps> = ({ onStartChapter }) => {
  const [panel, setPanel] = useState<'chapters' | 'settings' | 'controls' | 'lore' | null>(null);
  const progress = loadProgress();
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') setPanel(null); };
    window.addEventListener('keydown', onKeyDown); return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
  const launch = (chapter: 1 | 2) => onStartChapter(chapter);
  return <main className="start-screen">
    <div className="start-screen__ruins" aria-hidden="true"><span className="start-screen__moon" /><span className="start-screen__dragon"><i /><i /><i /></span><span className="start-screen__gate start-screen__gate--left" /><span className="start-screen__gate start-screen__gate--right" /><span className="start-screen__hero"><i /><i /><i /></span></div>
    <section className="start-screen__content">
      <div className="start-screen__eyebrow"><Sparkles size={14} /> AN ACTION RPG</div><h1>INVICTUS</h1><p className="start-screen__subtitle">CELESTIAL TRANSMUTATION</p>
      <p className="start-screen__copy">Lin Yun&apos;s chronicle now descends beyond the celestial reactor—into the molten sovereign foundry.</p>
      <div className="flex flex-col items-center gap-2"><button className="start-screen__button" onClick={() => launch(progress.selectedChapter)}><span>BEGIN / CONTINUE JOURNEY</span><ArrowRight size={18} /></button><button className="text-xs tracking-widest text-cyan-100 hover:text-cyan-300" onClick={() => setPanel('chapters')}>CHAPTER SELECT</button><div className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-[11px] tracking-wider text-slate-300"><button onClick={() => setPanel('settings')}><Settings size={13} className="inline mr-1" />SETTINGS</button><button onClick={() => setPanel('controls')}><Gamepad2 size={13} className="inline mr-1" />CONTROLS</button><button onClick={() => setPanel('lore')}><BookOpen size={13} className="inline mr-1" />ARCHIVES</button></div></div>
      <p className="start-screen__prompt">Press Enter to begin</p>
    </section>
    <footer className="start-screen__footer"><span>LIN YUN&apos;S CHRONICLE</span><span>CHAPTER I & II AVAILABLE</span></footer>
    <ChapterSelectModal open={panel === 'chapters'} unlockedChapter2={progress.unlockedChapter2} onClose={() => setPanel(null)} onStartChapter={launch} />
    <SettingsModal open={panel === 'settings'} onClose={() => setPanel(null)} /><ControlsModal open={panel === 'controls'} onClose={() => setPanel(null)} /><LoreModal open={panel === 'lore'} onClose={() => setPanel(null)} />
  </main>;
};
