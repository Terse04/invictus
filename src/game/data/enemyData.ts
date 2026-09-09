export interface EnemyConfig {
  name: string;
  maxHp: number;
  speed: number;
  damage: number;
  attackRange: number;
  aggroRange: number;
  attackCooldown: number;
  poise: number;
  scoreValue: number;
}

export const ENEMY_CONFIGS = {
  galeProwler: {
    name: 'Gale Prowler',
    maxHp: 90,
    speed: 155,
    damage: 14,
    attackRange: 48,
    aggroRange: 280,
    attackCooldown: 1400,
    poise: 25,
    scoreValue: 150
  },
  jadeWarden: {
    name: 'Jade Warden',
    maxHp: 240,
    speed: 80,
    damage: 28,
    attackRange: 70,
    aggroRange: 320,
    attackCooldown: 2200,
    poise: 80,
    scoreValue: 350
  },
  fluxWyrmling: {
    name: 'Flux Wyrmling',
    maxHp: 75,
    speed: 120,
    damage: 12,
    attackRange: 240,
    aggroRange: 360,
    attackCooldown: 2000,
    poise: 15,
    scoreValue: 200
  },
  vanguardBoss: {
    name: 'Centurion Lei-Guan',
    maxHp: 850,
    speed: 110,
    damage: 32,
    attackRange: 85,
    aggroRange: 450,
    attackCooldown: 1800,
    poise: 200,
    scoreValue: 1500
  },
  shenlongBoss: {
    name: 'Shenlong-09',
    subtitle: 'Celestial Transmuted Dragon',
    maxHp: 2400,
    speed: 130,
    damage: 42,
    attackRange: 160,
    aggroRange: 800,
    attackCooldown: 1600,
    poise: 500,
    scoreValue: 5000
  }
};
