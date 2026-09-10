import React from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';

interface StartScreenProps {
  onStart: () => void;
}

export const StartScreen: React.FC<StartScreenProps> = ({ onStart }) => (
  <main className="start-screen">
    <div className="start-screen__sky" />
    <div className="start-screen__mountains start-screen__mountains--far" />
    <div className="start-screen__mountains start-screen__mountains--near" />
    <div className="start-screen__mist" />

    <section className="start-screen__content">
      <div className="start-screen__eyebrow"><Sparkles size={14} /> AN ACTION RPG</div>
      <h1>INVICTUS</h1>
      <p className="start-screen__subtitle">CELESTIAL TRANSMUTATION</p>
      <p className="start-screen__copy">A forgotten sanctuary waits beyond the veil. Follow the old stone road, listen to the ruins, and reclaim the resonance within.</p>
      <button className="start-screen__button" onClick={onStart}>
        <span>BEGIN JOURNEY</span><ArrowRight size={18} />
      </button>
      <p className="start-screen__prompt">Press Enter to begin</p>
    </section>

    <footer className="start-screen__footer">
      <span>LIN YUN&apos;S CHRONICLE</span>
      <span>CHAPTER I · CELESTIAL SANCTUARY</span>
    </footer>
  </main>
);
