import React, { useState, useRef, useEffect } from 'react';
import { GameBridge } from '../game/GameBridge';
import { Sword, Shield, Zap, Sparkles, MessageSquare } from 'lucide-react';

export const VirtualControls: React.FC = () => {
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const joystickRef = useRef<HTMLDivElement>(null);
  const [stickPos, setStickPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const touchIdRef = useRef<number | null>(null);

  useEffect(() => {
    // Detect touch capability or small screen
    const checkTouch = () => {
      const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0 || window.innerWidth < 1024;
      setIsTouchDevice(hasTouch);
    };
    checkTouch();
    window.addEventListener('resize', checkTouch);
    return () => window.removeEventListener('resize', checkTouch);
  }, []);

  if (!isTouchDevice) return null;

  // Touch Joystick Handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (touchIdRef.current !== null) return;
    const touch = e.changedTouches[0];
    touchIdRef.current = touch.identifier;
    setIsDragging(true);
    updateJoystick(touch.clientX, touch.clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === touchIdRef.current) {
        updateJoystick(e.changedTouches[i].clientX, e.changedTouches[i].clientY);
        break;
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === touchIdRef.current) {
        touchIdRef.current = null;
        setIsDragging(false);
        setStickPos({ x: 0, y: 0 });
        GameBridge.setVirtualInput({ moveX: 0, moveY: 0 });
        break;
      }
    }
  };

  const updateJoystick = (clientX: number, clientY: number) => {
    if (!joystickRef.current) return;
    const rect = joystickRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const dx = clientX - centerX;
    const dy = clientY - centerY;
    const maxRadius = rect.width / 2;
    const dist = Math.hypot(dx, dy);

    const clampedDist = Math.min(dist, maxRadius);
    const angle = Math.atan2(dy, dx);

    const normX = (Math.cos(angle) * clampedDist) / maxRadius;
    const normY = (Math.sin(angle) * clampedDist) / maxRadius;

    setStickPos({ x: Math.cos(angle) * clampedDist, y: Math.sin(angle) * clampedDist });
    GameBridge.setVirtualInput({ moveX: normX, moveY: normY });
  };

  // Button Action Triggers
  const triggerButton = (key: keyof typeof GameBridge.virtualInput, value: boolean) => {
    GameBridge.setVirtualInput({ [key]: value });
  };

  return (
    <div className="absolute inset-0 pointer-events-none z-30 flex justify-between items-end p-6 select-none">
      {/* Left: Floating Virtual Joystick */}
      <div
        ref={joystickRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        className="pointer-events-auto relative w-36 h-36 rounded-full bg-slate-950/60 border-2 border-cyan-500/40 backdrop-blur-md flex items-center justify-center shadow-2xl"
      >
        {/* Inner Knob */}
        <div
          className="w-16 h-16 rounded-full bg-gradient-to-tr from-cyan-600 to-teal-400 border border-white/80 shadow-lg transition-transform duration-75 flex items-center justify-center"
          style={{
            transform: `translate(${stickPos.x}px, ${stickPos.y}px)`
          }}
        >
          <div className="w-6 h-6 rounded-full bg-white/40" />
        </div>
      </div>

      {/* Right: Action Buttons Pad */}
      <div className="pointer-events-auto grid grid-cols-3 gap-3.5 mb-2">
        {/* Interact [F] */}
        <button
          onTouchStart={() => triggerButton('interact', true)}
          onTouchEnd={() => triggerButton('interact', false)}
          className="w-13 h-13 rounded-full bg-slate-900/80 border border-slate-700 text-slate-300 active:bg-cyan-500 active:text-black flex flex-col items-center justify-center shadow-lg"
        >
          <MessageSquare className="w-5 h-5" />
          <span className="text-[9px] font-tech font-bold">TALK</span>
        </button>

        {/* Transmutation Wave [E] */}
        <button
          onTouchStart={() => triggerButton('ability', true)}
          onTouchEnd={() => triggerButton('ability', false)}
          className="w-13 h-13 rounded-full bg-cyan-950/80 border border-cyan-500/60 text-cyan-300 active:scale-95 flex flex-col items-center justify-center shadow-lg"
        >
          <Zap className="w-5 h-5" />
          <span className="text-[9px] font-tech font-bold">WAVE</span>
        </button>

        {/* Ultimate [Q] */}
        <button
          onTouchStart={() => triggerButton('ultimate', true)}
          onTouchEnd={() => triggerButton('ultimate', false)}
          className="w-13 h-13 rounded-full bg-yellow-950/80 border border-yellow-500/60 text-yellow-300 active:scale-95 flex flex-col items-center justify-center shadow-lg"
        >
          <Sparkles className="w-5 h-5" />
          <span className="text-[9px] font-tech font-bold">ULT</span>
        </button>

        {/* Dodge / Dash [Space] */}
        <button
          onTouchStart={() => triggerButton('dodge', true)}
          onTouchEnd={() => triggerButton('dodge', false)}
          className="w-15 h-15 rounded-full bg-emerald-950/80 border border-emerald-500/60 text-emerald-300 active:scale-95 flex flex-col items-center justify-center shadow-lg"
        >
          <Shield className="w-6 h-6" />
          <span className="text-[9px] font-tech font-bold">DODGE</span>
        </button>

        {/* Heavy Attack */}
        <button
          onTouchStart={() => triggerButton('heavyAttack', true)}
          onTouchEnd={() => triggerButton('heavyAttack', false)}
          className="w-15 h-15 rounded-full bg-amber-950/80 border border-amber-500/60 text-amber-300 active:scale-95 flex flex-col items-center justify-center shadow-lg"
        >
          <Sword className="w-6 h-6 rotate-45 text-amber-400" />
          <span className="text-[9px] font-tech font-bold">HEAVY</span>
        </button>

        {/* Light Attack */}
        <button
          onTouchStart={() => triggerButton('lightAttack', true)}
          onTouchEnd={() => triggerButton('lightAttack', false)}
          className="w-18 h-18 rounded-full bg-gradient-to-tr from-cyan-600 to-teal-400 border-2 border-white text-slate-950 active:scale-95 flex flex-col items-center justify-center shadow-2xl font-black"
        >
          <Sword className="w-8 h-8 text-slate-950" />
          <span className="text-[10px] font-tech font-bold">SLASH</span>
        </button>
      </div>
    </div>
  );
};
