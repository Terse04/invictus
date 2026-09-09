type Callback = (...args: any[]) => void;

export interface PlayerStats {
  hp: number;
  maxHp: number;
  stamina: number;
  maxStamina: number;
  ultimate: number;
  maxUltimate: number;
  shield: number;
}

export interface BossStats {
  active: boolean;
  name: string;
  subtitle: string;
  phase: number;
  maxPhases: number;
  hp: number;
  maxHp: number;
}

export interface ComboStats {
  count: number;
  rank: 'D' | 'C' | 'B' | 'A' | 'S' | 'SSS';
  multiplier: number;
}

export interface DialoguePayload {
  speaker: string;
  title: string;
  avatar: string;
  lines: string[];
  onComplete?: () => void;
}

export interface ToastPayload {
  title: string;
  subtitle?: string;
  type?: 'info' | 'alert' | 'unlock';
}

export interface VictoryPayload {
  timeElapsed: number;
  maxCombo: number;
  damageDealt: number;
  rank: string;
}

export interface VirtualInputState {
  moveX: number;
  moveY: number;
  lightAttack: boolean;
  heavyAttack: boolean;
  dodge: boolean;
  ability: boolean;
  ultimate: boolean;
  interact: boolean;
}

class EventBridge {
  private listeners: Map<string, Set<Callback>> = new Map();

  on(event: string, cb: Callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(cb);
    return () => this.off(event, cb);
  }

  off(event: string, cb: Callback) {
    this.listeners.get(event)?.delete(cb);
  }

  emit(event: string, ...args: any[]) {
    this.listeners.get(event)?.forEach(cb => {
      try {
        cb(...args);
      } catch (err) {
        console.error(`Error in event listener for ${event}:`, err);
      }
    });
  }

  // Virtual input cache for seamless frame-by-frame polling
  public virtualInput: VirtualInputState = {
    moveX: 0,
    moveY: 0,
    lightAttack: false,
    heavyAttack: false,
    dodge: false,
    ability: false,
    ultimate: false,
    interact: false
  };

  public setVirtualInput(partial: Partial<VirtualInputState>) {
    Object.assign(this.virtualInput, partial);
    this.emit('virtual_input_change', this.virtualInput);
  }
}

export const GameBridge = new EventBridge();
