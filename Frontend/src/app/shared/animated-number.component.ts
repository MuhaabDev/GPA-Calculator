import { Component, effect, input, signal } from '@angular/core';
@Component({ selector: 'app-number', standalone: true, template: `{{ display() }}` })
export class AnimatedNumberComponent {
  value = input<number | null | undefined>(null);
  precision = input(2);
  display = signal('—');
  private previous: number | null = null;
  constructor() {
    effect((onCleanup) => {
      const value = this.value(),
        precision = this.precision();
      if (value == null) {
        this.display.set('—');
        return;
      }
      const from = this.previous ?? value;
      this.previous = value;
      let frame = 0;
      const start = performance.now();
      const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
      const step = (now: number) => {
        const t = reduced ? 1 : Math.min((now - start) / 450, 1);
        this.display.set((from + (value - from) * (1 - Math.pow(1 - t, 3))).toFixed(precision));
        if (t < 1) frame = requestAnimationFrame(step);
      };
      frame = requestAnimationFrame(step);
      onCleanup(() => cancelAnimationFrame(frame));
    });
  }
}
