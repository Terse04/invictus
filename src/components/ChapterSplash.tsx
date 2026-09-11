import React, { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';

interface ChapterSplashProps {
  chapter: 1 | 2;
  onDismiss?: () => void;
}

export const ChapterSplash: React.FC<ChapterSplashProps> = ({ chapter, onDismiss }) => {
  const [stage, setStage] = useState<'enter' | 'hold' | 'exit' | 'done'>('enter');

  useEffect(() => {
    // 1. Enter (0 -> 800ms)
    const holdTimer = setTimeout(() => {
      setStage('hold');
    }, 800);

    // 2. Hold until 4200ms, then exit
    const exitTimer = setTimeout(() => {
      setStage('exit');
    }, 4200);

    // 3. Complete at 5000ms
    const doneTimer = setTimeout(() => {
      setStage('done');
      onDismiss?.();
    }, 5000);

    return () => {
      clearTimeout(holdTimer);
      clearTimeout(exitTimer);
      clearTimeout(doneTimer);
    };
  }, [onDismiss]);

  if (stage === 'done') return null;

  const isChapter1 = chapter === 1;
  const roman = isChapter1 ? 'CHAPTER I' : 'CHAPTER II';
  const title = isChapter1 ? 'CELESTIAL SANCTUARY' : 'THE ABYSSAL FOUNDRY';
  const tagline = isChapter1
    ? 'THE TRANSMUTATION BEGINS'
    : 'QUENCH THE MOLTEN CRUCIBLE';

  const opacityClass =
    stage === 'enter'
      ? 'opacity-0 scale-95'
      : stage === 'hold'
      ? 'opacity-100 scale-100'
      : 'opacity-0 scale-105 pointer-events-none';

  return (
    <div
      className={`fixed inset-0 z-40 flex items-center justify-center pointer-events-none transition-all duration-1000 ease-out select-none ${opacityClass}`}
    >
      {/* Subtle cinematic letterbox bar lines */}
      <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-black/80 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-black/80 to-transparent" />

      {/* Central Majestic Banner */}
      <div className="text-center px-8 py-6 relative max-w-2xl w-full">
        {/* Glow backdrop aura */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-950/40 to-transparent blur-2xl pointer-events-none" />

        {/* Eyebrow badge */}
        <div className="flex items-center justify-center space-x-2 text-amber-300/90 text-xs font-tech tracking-[0.35em] mb-2 uppercase drop-shadow-[0_0_12px_rgba(255,215,0,0.5)]">
          <Sparkles className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '8s' }} />
          <span>{roman}</span>
          <span className="opacity-50">·</span>
          <span>RECKONING PROTOCOL</span>
        </div>

        {/* Golden Title */}
        <h1 className="text-3xl sm:text-5xl font-cinzel font-black tracking-[0.25em] text-transparent bg-clip-text bg-gradient-to-b from-amber-100 via-amber-200 to-amber-400 drop-shadow-[0_4px_24px_rgba(245,158,11,0.4)] my-1">
          {title}
        </h1>

        {/* Glowing Jade Rule */}
        <div className="flex items-center justify-center my-3 space-x-3">
          <div className="h-[1px] w-20 bg-gradient-to-r from-transparent to-emerald-400/80" />
          <div className="w-1.5 h-1.5 rotate-45 bg-emerald-400 shadow-[0_0_8px_#10b981]" />
          <div className="h-[1px] w-20 bg-gradient-to-l from-transparent to-emerald-400/80" />
        </div>

        {/* Subtitle */}
        <p className="text-xs sm:text-sm font-tech tracking-[0.4em] text-cyan-200/90 uppercase drop-shadow-[0_0_10px_rgba(0,240,255,0.4)]">
          {tagline}
        </p>
      </div>
    </div>
  );
};
