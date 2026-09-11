import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, BookOpen, Gamepad2, Settings, Sparkles } from 'lucide-react';
import { ChapterSelectModal } from './ChapterSelectModal';
import { SettingsModal } from './SettingsModal';
import { ControlsModal } from './ControlsModal';
import { LoreModal } from './LoreModal';
import { loadProgress } from '../utils/storage';
import { TitleScene3D } from '../game/title/TitleScene3D';

interface StartScreenProps {
  onStartChapter: (chapter: 1 | 2) => void;
}

export const StartScreen: React.FC<StartScreenProps> = ({ onStartChapter }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const titleSceneRef = useRef<TitleScene3D | null>(null);
  const [panel, setPanel] = useState<'chapters' | 'settings' | 'controls' | 'lore' | null>(null);
  const progress = loadProgress();

  // Initialize Real-time 3D Title Scene (Lin Yun, Celestial Dais, Shenlong-09 Fog Silhouette)
  useEffect(() => {
    if (!canvasRef.current) return;
    try {
      titleSceneRef.current = new TitleScene3D(canvasRef.current);
    } catch (err) {
      console.warn('[StartScreen] 3D Title scene failed to initialize, falling back gracefully:', err);
    }

    return () => {
      if (titleSceneRef.current) {
        titleSceneRef.current.dispose();
        titleSceneRef.current = null;
      }
    };
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setPanel(null);
      } else if (event.key === 'Enter' && !panel && !event.repeat) {
        event.preventDefault();
        onStartChapter(progress.selectedChapter);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [panel, progress.selectedChapter, onStartChapter]);

  const launch = (chapter: 1 | 2) => {
    if (titleSceneRef.current) {
      titleSceneRef.current.dispose();
      titleSceneRef.current = null;
    }
    onStartChapter(chapter);
  };

  return (
    <main className="start-screen">
      {/* Real-time 3D Babylon Viewport */}
      <canvas
        ref={canvasRef}
        className="start-screen__canvas"
        aria-label="INVICTUS 3D Title Scene"
      />

      {/* Cinematic Vignette & Atmospheric Gradients */}
      <div className="start-screen__vignette" aria-hidden="true" />

      {/* Foreground UI Overlay */}
      <div className="start-screen__overlay">
        {/* Top Header Eyebrow */}
        <header className="start-screen__header">
          <div className="start-screen__protocol-badge">
            <span className="start-screen__status-dot" />
            <span className="tracking-widest">CELESTIAL SYSTEM · RECKONING PROTOCOL</span>
          </div>
        </header>

        {/* Main Brand & Interaction Hero */}
        <section className="start-screen__content">
          <div className="start-screen__eyebrow">
            <Sparkles size={13} className="text-amber-300" />
            <span>MYTHOLOGICAL CYBERPUNK ARPG</span>
          </div>

          <h1 className="start-screen__title">INVICTUS</h1>
          <p className="start-screen__subtitle">CELESTIAL TRANSMUTATION</p>
          <p className="start-screen__tagline">
            Beneath the shattered heavens, an ancient machine-god stirs. Forge your resonant blade and pierce the celestial void.
          </p>

          {/* Primary Game CTA */}
          <div className="start-screen__cta-group">
            <button
              className="start-screen__primary-btn"
              onClick={() => launch(progress.selectedChapter)}
              autoFocus
            >
              <span className="start-screen__btn-label">
                {progress.unlockedChapter2 ? 'CONTINUE JOURNEY' : 'BEGIN JOURNEY'}
              </span>
              <span className="start-screen__btn-icon-wrapper">
                <ArrowRight size={16} />
              </span>
            </button>

            {/* Secondary Navigation */}
            <nav className="start-screen__nav" aria-label="Secondary Title Navigation">
              <button
                className="start-screen__nav-btn start-screen__nav-btn--highlight"
                onClick={() => setPanel('chapters')}
              >
                CHAPTER SELECT
              </button>
              <span className="start-screen__nav-divider">/</span>
              <button
                className="start-screen__nav-btn"
                onClick={() => setPanel('settings')}
              >
                <Settings size={12} className="inline mr-1 opacity-70" />
                SETTINGS
              </button>
              <span className="start-screen__nav-divider">/</span>
              <button
                className="start-screen__nav-btn"
                onClick={() => setPanel('controls')}
              >
                <Gamepad2 size={12} className="inline mr-1 opacity-70" />
                CONTROLS
              </button>
              <span className="start-screen__nav-divider">/</span>
              <button
                className="start-screen__nav-btn"
                onClick={() => setPanel('lore')}
              >
                <BookOpen size={12} className="inline mr-1 opacity-70" />
                ARCHIVES
              </button>
            </nav>

            <p className="start-screen__prompt">PRESS [ENTER] TO COMMENCE</p>
          </div>
        </section>

        {/* Cinematic Footer Status Bar */}
        <footer className="start-screen__footer">
          <span className="start-screen__footer-item">
            <span className="start-screen__indicator start-screen__indicator--active" />
            WARRIOR: LIN YUN
          </span>
          <span className="start-screen__footer-item hidden sm:inline-block">
            <span className="start-screen__indicator start-screen__indicator--dormant" />
            THREAT: SHENLONG-09 [DORMANT]
          </span>
          <span className="start-screen__footer-item">
            CHAPTER I & II AVAILABLE
          </span>
        </footer>
      </div>

      {/* Secondary Modals */}
      <ChapterSelectModal
        open={panel === 'chapters'}
        unlockedChapter2={progress.unlockedChapter2}
        onClose={() => setPanel(null)}
        onStartChapter={launch}
      />
      <SettingsModal open={panel === 'settings'} onClose={() => setPanel(null)} />
      <ControlsModal open={panel === 'controls'} onClose={() => setPanel(null)} />
      <LoreModal open={panel === 'lore'} onClose={() => setPanel(null)} />
    </main>
  );
};

