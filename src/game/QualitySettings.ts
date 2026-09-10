export type QualityLevel = 'low' | 'medium' | 'high';

export interface QualityProfile {
  level: QualityLevel;
  hardwareScaling: number;
  shadowMapSize: number;
  blurShadows: boolean;
  particleCapacity: number;
  particleRate: number;
  atmosphereDetail: number;
}

const PROFILES: Record<QualityLevel, QualityProfile> = {
  low: { level: 'low', hardwareScaling: 1.45, shadowMapSize: 1024, blurShadows: false, particleCapacity: 80, particleRate: 8, atmosphereDetail: 0 },
  medium: { level: 'medium', hardwareScaling: 1, shadowMapSize: 1536, blurShadows: true, particleCapacity: 180, particleRate: 16, atmosphereDetail: 1 },
  high: { level: 'high', hardwareScaling: 0.8, shadowMapSize: 2048, blurShadows: true, particleCapacity: 280, particleRate: 24, atmosphereDetail: 2 }
};

export const resolveQuality = (): QualityProfile => {
  const requested = new URLSearchParams(window.location.search).get('quality') as QualityLevel | null;
  const saved = window.localStorage.getItem('invictus-quality') as QualityLevel | null;
  const value = requested ?? saved ?? 'medium';
  return PROFILES[value] ?? PROFILES.medium;
};

export const setQuality = (level: QualityLevel) => {
  window.localStorage.setItem('invictus-quality', level);
};
