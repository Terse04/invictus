import React from 'react';
import { Lock, Play } from 'lucide-react';

export const ChapterSelectModal: React.FC<{ open: boolean; unlockedChapter2: boolean; onClose: () => void; onStartChapter: (chapter: 1 | 2) => void }> = ({ open, unlockedChapter2, onClose, onStartChapter }) => {
  if (!open) return null;
  const chapters = [
    { id: 1 as const, title: 'CHAPTER I', subtitle: 'CONVERGENCE OF JADE & CIRCUIT', description: 'Ascend the ancient stone road and confront Shenlong-09 beneath the celestial reactor.', unlocked: true },
    { id: 2 as const, title: 'CHAPTER II', subtitle: 'THE MOLTEN CORE OF VULCAN-01', description: 'Descend into planetary heat vents where corrupted automaton smiths forge sovereign weapons.', unlocked: unlockedChapter2 }
  ];
  return <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm grid place-items-center p-5" onMouseDown={onClose}>
    <section className="glass-panel w-full max-w-3xl p-6 space-y-5" onMouseDown={event => event.stopPropagation()}>
      <div className="flex justify-between items-center"><h2 className="font-cinzel text-xl tracking-widest text-cyan-200">CHAPTER SELECT</h2><button onClick={onClose} className="text-slate-400 hover:text-white">ESC / CLOSE</button></div>
      <div className="grid md:grid-cols-2 gap-4">{chapters.map(chapter => <button key={chapter.id} disabled={!chapter.unlocked} onClick={() => onStartChapter(chapter.id)} className="text-left p-5 rounded border border-cyan-900/70 bg-slate-950/70 hover:border-cyan-300 disabled:opacity-45 transition-colors space-y-3">
        <div className="flex justify-between"><span className="font-cinzel font-bold text-amber-300">{chapter.title}</span>{chapter.unlocked ? <Play size={16} className="text-cyan-300" /> : <Lock size={16} />}</div><p className="text-xs tracking-wider text-cyan-200">{chapter.subtitle}</p><p className="text-sm text-slate-300 leading-relaxed">{chapter.description}</p>
      </button>)}</div>
    </section>
  </div>;
};
