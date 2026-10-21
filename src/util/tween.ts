export type Easing = (t: number) => number;

export const easeOutCubic: Easing = (t) => 1 - (1 - t) ** 3;
export const easeInOutQuad: Easing = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
export const easeOutBack: Easing = (t) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2;
};

interface TweenItem {
  duration: number;
  elapsed: number;
  update: (t: number) => void;
  complete?: () => void;
  ease: Easing;
  dead: boolean;
}

export class TweenManager {
  private items: TweenItem[] = [];

  to(
    duration: number,
    update: (t: number) => void,
    opts?: { ease?: Easing; complete?: () => void },
  ): Promise<void> {
    return new Promise((resolve) => {
      this.items.push({
        duration,
        elapsed: 0,
        update,
        ease: opts?.ease ?? easeOutCubic,
        complete: () => {
          opts?.complete?.();
          resolve();
        },
        dead: false,
      });
    });
  }

  wait(duration: number): Promise<void> {
    return this.to(duration, () => undefined);
  }

  update(dt: number): void {
    for (const item of this.items) {
      if (item.dead) continue;
      item.elapsed += dt;
      const raw = Math.min(1, item.elapsed / item.duration);
      item.update(item.ease(raw));
      if (raw >= 1) {
        item.dead = true;
        item.complete?.();
      }
    }
    this.items = this.items.filter((i) => !i.dead);
  }
}
