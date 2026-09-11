export interface GameSettings {
  masterVolume: number;
  sfxVolume: number;
  bgmVolume: number;
  uiVolume: number;
  screenShake: boolean;
  showDamageNumbers: boolean;
  particleQuality: 'low' | 'medium' | 'high';
  bloomEnabled: boolean;
  fogEnabled: boolean;
  shadowQuality: 'off' | 'low' | 'high';
  cameraSensitivity: number;
  reticleStyle: 'default' | 'minimal' | 'dot';
}

export interface GameProgress {
  unlockedWaveAbility: boolean;
  unlockedUltimate: boolean;
  vanguardDefeated: boolean;
  shenlongDefeated: boolean;
  highestCombo: number;
  bestClearTime: number | null;
  unlockedChapter2: boolean;
  selectedChapter: 1 | 2;
}

const SETTINGS_KEY = 'invictus_settings_v1';
const PROGRESS_KEY = 'invictus_progress_v1';

export const defaultSettings: GameSettings = {
  masterVolume: 0.8,
  sfxVolume: 0.85,
  bgmVolume: 0.7,
  uiVolume: 0.8,
  screenShake: true,
  showDamageNumbers: true,
  particleQuality: 'medium',
  bloomEnabled: true,
  fogEnabled: true,
  shadowQuality: 'high',
  cameraSensitivity: 1.0,
  reticleStyle: 'default'
};

export const defaultProgress: GameProgress = {
  unlockedWaveAbility: true,
  unlockedUltimate: true,
  vanguardDefeated: false,
  shenlongDefeated: false,
  highestCombo: 0,
  bestClearTime: null,
  // Chapter II is selectable so its biome can be tested directly.
  unlockedChapter2: true,
  selectedChapter: 1
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
    const parsed = JSON.parse(raw);
    return {
      ...defaultProgress,
      ...parsed,
      unlockedWaveAbility: true,
      unlockedUltimate: true,
      unlockedChapter2: parsed.unlockedChapter2 ?? true
    };
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
