import React, { useEffect, useState, useRef } from 'react';
import { GameBridge, DialoguePayload } from '../game/GameBridge';
import { SoundManager } from '../game/audio/SoundManager';
import { ChevronRight } from 'lucide-react';

export const DialogueBox: React.FC = () => {
  const [dialogue, setDialogue] = useState<DialoguePayload | null>(null);
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const soundManager = useRef(SoundManager.getInstance());
  const handleNextRef = useRef<() => void>(() => undefined);

  useEffect(() => {
    const unsub = GameBridge.on('dialogue_open', (payload: DialoguePayload) => {
      setDialogue(payload);
      setCurrentLineIndex(0);
      setDisplayedText('');
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!dialogue) return;

    const fullLine = dialogue.lines[currentLineIndex] || '';
    setDisplayedText('');
    setIsTyping(true);

    let charIndex = 0;
    const timer = setInterval(() => {
      if (charIndex < fullLine.length) {
        setDisplayedText(prev => prev + fullLine[charIndex]);
        if (charIndex % 3 === 0) {
          soundManager.current.playDialogueBeep();
        }
        charIndex++;
      } else {
        setIsTyping(false);
        clearInterval(timer);
      }
    }, 22);

    return () => clearInterval(timer);
  }, [dialogue, currentLineIndex]);

  const handleNext = () => {
    if (!dialogue) return;
    if (isTyping) {
      // Instant reveal
      setDisplayedText(dialogue.lines[currentLineIndex]);
      setIsTyping(false);
      return;
    }

    if (currentLineIndex < dialogue.lines.length - 1) {
      setCurrentLineIndex(prev => prev + 1);
    } else {
      // Complete
      dialogue.onComplete?.();
      setDialogue(null);
      GameBridge.emit('dialogue_close');
    }
  };

  handleNextRef.current = handleNext;

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Enter' || event.repeat) return;
      event.preventDefault();
      handleNextRef.current();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!dialogue) return null;

  return (
    <div className="absolute inset-0 z-40 bg-black/40 backdrop-blur-sm flex items-end justify-center p-6 select-none">
      <div
        onClick={handleNext}
        className="glass-panel w-full max-w-3xl p-6 border-b-4 border-b-cyan-400 cursor-pointer shadow-2xl flex items-start space-x-6 relative"
      >
        {/* Avatar Frame */}
        <div className="w-20 h-20 rounded-xl bg-slate-900 border-2 border-cyan-400/80 flex items-center justify-center relative flex-shrink-0 shadow-lg">
          <div className="text-2xl font-cinzel text-cyan-300 font-black">
            严
          </div>
          <div className="absolute -bottom-2 px-2 py-0.5 bg-cyan-950 border border-cyan-400/60 rounded text-[9px] font-tech text-cyan-300 uppercase">
            CHRONICLER
          </div>
        </div>

        {/* Text Container */}
        <div className="flex-1 space-y-2">
          <div>
            <span className="text-base font-cinzel font-bold text-cyan-300 tracking-wider">
              {dialogue.speaker}
            </span>
            <span className="text-xs font-tech text-slate-400 ml-2">
              — {dialogue.title}
            </span>
          </div>

          <p className="text-sm font-tech text-slate-100 leading-relaxed min-h-[50px]">
            {displayedText}
          </p>

          <div className="flex justify-end items-center text-xs font-tech text-cyan-400/80 pt-2 space-x-1">
            <span>{currentLineIndex + 1} / {dialogue.lines.length}</span>
            <span>· Enter / Tap / Click to Continue</span>
            <ChevronRight className="w-4 h-4 animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
};
