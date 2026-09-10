import React from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';

interface StartScreenProps { onStart: () => void; }

export const StartScreen: React.FC<StartScreenProps> = ({ onStart }) => (
  <main className="start-screen">
    <div className="start-screen__ruins" aria-hidden="true">
      <span className="start-screen__moon" /><span className="start-screen__dragon"><i /><i /><i /></span>
      <span className="start-screen__gate start-screen__gate--left" /><span className="start-screen__gate start-screen__gate--right" />
      <span className="start-screen__hero"><i /><i /><i /></span>
    </div>
    <section className="start-screen__content">
      <div className="start-screen__eyebrow"><Sparkles size={14} /> AN ACTION RPG</div><h1>INVICTUS</h1>
      <p className="start-screen__subtitle">CELESTIAL TRANSMUTATION</p>
      <p className="start-screen__copy">Lin Yun enters a sacred civilization remade by impossible machinery. Beyond its ruined gates, Shenlong-09 waits beneath the celestial reactor.</p>
      <button className="start-screen__button" onClick={onStart}><span>BEGIN JOURNEY</span><ArrowRight size={18} /></button><p className="start-screen__prompt">Press Enter to begin</p>
    </section>
    <footer className="start-screen__footer"><span>LIN YUN&apos;S CHRONICLE</span><span>CHAPTER I · CELESTIAL SANCTUARY</span></footer>
  </main>
);
