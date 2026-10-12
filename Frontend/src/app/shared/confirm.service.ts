import { Injectable, signal } from '@angular/core';
@Injectable({ providedIn: 'root' })
export class ConfirmService {
  pending = signal<{ title: string; message: string; action: () => void; label: string } | null>(
    null,
  );
  ask(title: string, message: string, action: () => void, label = 'Delete') {
    this.pending.set({ title, message, action, label });
  }
  confirm() {
    this.pending()?.action();
    this.pending.set(null);
  }
}
