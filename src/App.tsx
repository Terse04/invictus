import React, { useEffect, useRef, useState } from 'react';
import { Game3D } from './game/Game3D';
import { GameBridge, VictoryPayload } from './game/GameBridge';
import { HUD } from './components/HUD';
import { BossBar } from './components/BossBar';
import { VirtualControls } from './components/VirtualControls';
import { DialogueBox } from './components/DialogueBox';
import { PauseModal } from './components/PauseModal';
import { VictoryModal } from './components/VictoryModal';
import { OrientationNotice } from './components/OrientationNotice';
import { ErrorBoundary } from './components/ErrorBoundary';
import { StartScreen } from './components/StartScreen';
import { AlertCircle, RefreshCw } from 'lucide-react';

export const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gameRef = useRef<Game3D | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [victoryData, setVictoryData] = useState<VictoryPayload | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [engineError, setEngineError] = useState<string | null>(null);
  const [hasStarted, setHasStarted] = useState(false);

  // Initialize Babylon.js 3D Game
  useEffect(() => {
    if (!hasStarted) return;
    if (canvasRef.current && !gameRef.current) {
      try {
        gameRef.current = new Game3D(canvasRef.current);
      } catch (err: any) {
        console.error('[App] Failed to initialize 3D game engine:', err);
        setEngineError(err?.message || 'Failed to initialize WebGL graphics context.');
      }
    }

    // PWA Install prompt capture
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // Global Key Listener for ESC pause
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
        if (document.pointerLockElement === canvasRef.current) document.exitPointerLock();
        setIsPaused(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    const handlePointerLockChange = () => {
      if (document.pointerLockElement !== canvasRef.current && gameRef.current) setIsPaused(true);
    };
    document.addEventListener('pointerlockchange', handlePointerLockChange);

    // Victory listener
    const unsubVictory = GameBridge.on('victory', (payload: VictoryPayload) => {
      setVictoryData(payload);
    });

    // Player Death listener
    const unsubDeath = GameBridge.on('player_death', () => {
      GameBridge.emit('toast_message', {
        title: '✦ BIOMETRIC CONDUIT COLLAPSED',
        subtitle: 'Quantum lattice rebooting at Awakening Terrace...',
        type: 'alert'
      });
      setTimeout(() => {
        handleRestart();
      }, 2200);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('pointerlockchange', handlePointerLockChange);
      unsubVictory();
      unsubDeath();
      if (gameRef.current) {
        gameRef.current.dispose();
        gameRef.current = null;
      }
    };
  }, [hasStarted]);

  useEffect(() => {
    if (hasStarted) return;
    const startOnEnter = (event: KeyboardEvent) => {
      if (event.key === 'Enter' && !event.repeat) {
        event.preventDefault();
        setHasStarted(true);
      }
    };
    window.addEventListener('keydown', startOnEnter);
    return () => window.removeEventListener('keydown', startOnEnter);
  }, [hasStarted]);

  useEffect(() => {
    gameRef.current?.setPaused(isPaused);
  }, [isPaused]);

  const handlePause = () => {
    setIsPaused(true);
  };

  const handleStart = () => setHasStarted(true);

  const handleResume = () => {
    setIsPaused(false);
    canvasRef.current?.requestPointerLock();
  };

  const handleRestart = () => {
    setIsPaused(false);
    setVictoryData(null);
    if (gameRef.current) {
      gameRef.current.restart();
    }
  };

  return (
    <ErrorBoundary>
      <div className="relative w-full h-full overflow-hidden bg-[#070b12]">
        {!hasStarted ? (
          <StartScreen onStart={handleStart} />
        ) : (
          <>
        {/* Real Babylon.js 3D Canvas */}
        <canvas
          ref={canvasRef}
          id="babylonCanvas"
          className="w-full h-full block outline-none touch-none"
        />

        {/* Engine Error Overlay if WebGL failed */}
        {engineError && (
          <div className="absolute inset-0 z-50 flex items-center justify-center p-6 bg-[#070b14]/95 text-slate-200 backdrop-blur-md">
            <div className="glass-panel max-w-lg w-full p-6 border-t-4 border-t-yellow-400 shadow-2xl space-y-4 text-center">
              <div className="w-14 h-14 mx-auto rounded-full bg-yellow-400/10 border border-yellow-400/40 flex items-center justify-center text-yellow-400">
                <AlertCircle className="w-7 h-7" />
              </div>
              <h2 className="text-xl font-cinzel font-bold text-yellow-400 tracking-wider">
                GRAPHICS INITIALIZATION REQUIRED
              </h2>
              <p className="text-xs font-tech text-slate-300 leading-relaxed">
                Hardware acceleration or WebGL context was unavailable. If you are using Brave or an adblocker, please ensure Brave Shields allows WebGL on localhost.
              </p>
              <div className="p-3 bg-black/60 rounded border border-yellow-900/40 text-left">
                <code className="text-xs font-mono text-yellow-300 break-words">
                  {engineError}
                </code>
              </div>
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-2.5 rounded bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-tech font-bold text-xs flex items-center space-x-2 mx-auto transition-all shadow-lg"
              >
                <RefreshCw className="w-4 h-4" />
                <span>RETRY INITIALIZATION</span>
              </button>
            </div>
          </div>
        )}

        {/* Cyber Atmospheric Scanline Overlay */}
        <div className="scanlines" />

        {/* UI Overlays */}
        <HUD onPause={handlePause} />
        <BossBar />
        <VirtualControls />
        <DialogueBox />

        {/* Modals */}
        <PauseModal
          isOpen={isPaused}
          onResume={handleResume}
          onRestart={handleRestart}
          deferredPrompt={deferredPrompt}
        />

        <VictoryModal
          data={victoryData}
          onRestart={handleRestart}
        />

        <OrientationNotice />
          </>
        )}
      </div>
    </ErrorBoundary>
  );
};
