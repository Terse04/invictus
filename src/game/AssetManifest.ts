/** One source of truth for runtime asset locations. */
export const ASSETS = {
  characters: {
    linYun: '/assets/characters/lin-yun/lin-yun.glb',
    legacyHero: '/assets/characters/protagonist/hero.glb',
    legacyBeast: '/assets/characters/enemies/beast.glb'
  },
  weapons: { linYunKatana: '/assets/weapons/lin-yun-katana.glb' },
  bosses: { shenlong: '/assets/characters/bosses/shenlong-09.glb' }
} as const;

/** The shipped hero file is Cesium Man, so it is intentionally not used as Lin Yun art. */
export const ASSET_STATUS = {
  linYun: 'temporary-procedural-avatar-pending-authored-glb',
  legacyHero: 'rejected-generic-cesium-man',
  legacyBeast: 'retired-fox-like-beast'
} as const;
