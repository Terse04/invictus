import React, { useEffect, useState } from 'react';
import { Smartphone, RotateCw } from 'lucide-react';

export const OrientationNotice: React.FC = () => {
  const [isPortrait, setIsPortrait] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    const checkOrientation = () => {
      const isMobile = window.innerWidth < 768;
      const portrait = window.innerHeight > window.innerWidth && isMobile;
      setIsPortrait(portrait);
    };

    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);
    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  if (!isPortrait || isDismissed) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center select-none animate-fade-in">
      <div className="glass-panel max-w-sm p-6 border-cyan-400 text-center space-y-4 shadow-2xl">
        <div className="relative w-16 h-16 mx-auto flex items-center justify-center text-cyan-400">
          <Smartphone className="w-12 h-12 rotate-90 animate-pulse" />
          <RotateCw className="w-6 h-6 absolute text-yellow-400 animate-spin" />
        </div>

        <h3 className="text-lg font-cinzel font-bold text-cyan-300">
          ROTATE TO LANDSCAPE
        </h3>

        <p className="text-xs font-tech text-slate-300 leading-relaxed">
          For the optimal combat visibility and precision touch controls, please rotate your device to landscape orientation.
        </p>

        <button
          onClick={() => setIsDismissed(true)}
          className="w-full py-2.5 rounded bg-cyan-950 border border-cyan-500/60 text-cyan-300 text-xs font-tech font-bold hover:bg-cyan-900 transition-all"
        >
          CONTINUE IN PORTRAIT
        </button>
      </div>
    </div>
  );
};
