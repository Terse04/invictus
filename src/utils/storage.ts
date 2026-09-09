export interface GameSettings {
  masterVolume: number;
  sfxVolume: number;
  bgmVolume: number;
  screenShake: boolean;
  showDamageNumbers: boolean;
  particleQuality: 'low' | 'medium' | 'high';
}

export interface GameProgress {
  unlockedWaveAbility: boolean;
  unlockedUltimate: boolean;
  vanguardDefeated: boolean;
  shenlongDefeated: boolean;
  highestCombo: number;
  bestClearTime: number | null;
}

const SETTINGS_KEY = 'invictus_settings_v1';
const PROGRESS_KEY = 'invictus_progress_v1';

export const defaultSettings: GameSettings = {
  masterVolume: 0.8,
  sfxVolume: 0.85,
  bgmVolume: 0.7,
  screenShake: true,
  showDamageNumbers: true,
  particleQuality: 'high'
};

export const defaultProgress: GameProgress = {
  unlockedWaveAbility: false,
  unlockedUltimate: false,
  vanguardDefeated: false,
  shenlongDefeated: false,
  highestCombo: 0,
  bestClearTime: null
};

export const loadSettings = (): GameSettings => {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return defaultSettings;
    return { ...defaultSettings, ...JSON.parse(raw) };
  } catch {
    return defaultSettings;
  }
};

export const saveSettings = (settings: GameSettings): void => {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (err) {
    console.error('Failed to save settings to localStorage', err);
  }
};

export const loadProgress = (): GameProgress => {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (!raw) return defaultProgress;
    return { ...defaultProgress, ...JSON.parse(raw) };
  } catch {
    return defaultProgress;
  }
};

export const saveProgress = (progress: GameProgress): void => {
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
  } catch (err) {
    console.error('Failed to save progress to localStorage', err);
  }
};
