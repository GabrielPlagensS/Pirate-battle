import type { InputAction, InputState } from '../types/game';

const KEY_MAP: Record<string, InputAction> = {
  KeyW: 'forward',
  ArrowUp: 'forward',
  KeyA: 'left',
  ArrowLeft: 'left',
  KeyD: 'right',
  ArrowRight: 'right',
  Space: 'front',
  KeyQ: 'sideLeft',
  KeyE: 'sideRight'
};

const empty = (): InputState => ({
  forward: false,
  left: false,
  right: false,
  front: false,
  sideLeft: false,
  sideRight: false
});

/**
 * Unifica teclado e controles touch num único InputState.
 * Teclado e touch ficam em mapas separados para que soltar um não cancele o outro.
 */
export class InputController {
  private keyboard = empty();
  private virtual = empty();
  private target: Window | null = null;

  attach(target: Window = window) {
    this.target = target;
    target.addEventListener('keydown', this.onKeyDown);
    target.addEventListener('keyup', this.onKeyUp);
  }

  detach() {
    this.target?.removeEventListener('keydown', this.onKeyDown);
    this.target?.removeEventListener('keyup', this.onKeyUp);
    this.target = null;
    this.reset();
  }

  reset() {
    this.keyboard = empty();
    this.virtual = empty();
  }

  /** Controles de tela (touch). */
  setVirtual(action: InputAction, value: boolean) {
    this.virtual[action] = value;
  }

  state(): InputState {
    const k = this.keyboard;
    const v = this.virtual;
    return {
      forward: k.forward || v.forward,
      left: k.left || v.left,
      right: k.right || v.right,
      front: k.front || v.front,
      sideLeft: k.sideLeft || v.sideLeft,
      sideRight: k.sideRight || v.sideRight
    };
  }

  private onKeyDown = (e: KeyboardEvent) => {
    const action = KEY_MAP[e.code];
    if (!action) return;
    e.preventDefault(); // evita scroll da página com Space/setas
    this.keyboard[action] = true;
  };

  private onKeyUp = (e: KeyboardEvent) => {
    const action = KEY_MAP[e.code];
    if (action) this.keyboard[action] = false;
  };
}
