import { TransformNode, Vector3, Mesh } from '@babylonjs/core';

export type PlayerAnimState =
  | 'idle'
  | 'run'
  | 'jump_start'
  | 'airborne'
  | 'land'
  | 'attack1'
  | 'attack2'
  | 'attack3'
  | 'heavy_charge'
  | 'heavy_release'
  | 'dodge'
  | 'hurt'
  | 'death'
  | 'summon_crouch'
  | 'summon_rise'
  | 'victory_flick'
  | 'victory_sheath';

export interface CharacterAttachmentPoints {
  rootNode: TransformNode;
  rightHandNode: TransformNode;
  leftHandNode: TransformNode;
  sheathMountNode: TransformNode;
  headNode?: TransformNode;
  chestNode?: TransformNode;
  hipsNode?: TransformNode;
}

export interface ICharacterVisual {
  readonly rootNode: TransformNode;
  readonly attachments: CharacterAttachmentPoints;
  readonly isGlbLoaded: boolean;
  readonly visibleMeshes: Mesh[];
  
  /** Update procedural or skeletal animations each frame */
  update(delta: number, currentVelocity: Vector3, isGrounded: boolean, animState: PlayerAnimState, stateTimer: number): void;
  
  /** Set continuous animation state */
  setAnimationState(state: PlayerAnimState): void;
  
  /** Play discrete one-shot animation flourish */
  playOneShot(state: PlayerAnimState, durationMs: number, onComplete?: () => void): void;
  
  /** Trigger a physical stagger hit reaction */
  applyHitReaction(impactDirection?: Vector3): void;
  
  /** Toggle visibility of character meshes */
  setVisible(visible: boolean): void;
  
  /** Cleanup all meshes, materials, and nodes */
  dispose(): void;
}
