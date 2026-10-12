import { Injectable, signal } from '@angular/core';
import { AcademicData, freshData } from './models';
import { validateData } from './validation';

@Injectable({ providedIn: 'root' })
export class PersistenceService {
  readonly warning = signal('');
  readonly key = 'folio.academic.v1';
  private blocked = false;
  load(): AcademicData {
    try {
      const raw = localStorage.getItem(this.key);
      if (raw === null) return freshData();
      const parsed = JSON.parse(raw);
      const data = validateData(parsed);
      if (parsed.version < 3) {
        // Preserve the exact pre-migration payload before touching the established primary key.
        // If either write fails, block autosave so the old payload remains recoverable.
        const backupKey = this.key + '.pre-v3';
        if (localStorage.getItem(backupKey) === null) localStorage.setItem(backupKey, raw);
        localStorage.setItem(this.key, JSON.stringify(data));
      }
      return data;
    } catch {
      this.blocked = true;
      this.warning.set(
        'Saved data could not be read. The original is preserved. Export the recovery file before importing a valid backup or resetting.',
      );
      return freshData();
    }
  }
  save(data: AcademicData): void {
    if (this.blocked) return;
    try {
      localStorage.setItem(this.key, JSON.stringify(data));
      this.warning.set('');
    } catch {
      this.warning.set(
        'Your browser could not save these changes. Export a backup now to keep your work.',
      );
    }
  }
  replace(data: AcademicData): void {
    this.blocked = false;
    this.save(data);
  }
  download(data: unknown, name = 'gpa-calculator-backup.json'): void {
    const url = URL.createObjectURL(
      new Blob([typeof data === 'string' ? data : JSON.stringify(data, null, 2)], {
        type: 'application/json',
      }),
    );
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  recover(): void {
    try {
      this.download(localStorage.getItem(this.key) ?? '', 'gpa-calculator-recovery.json');
    } catch {
      this.warning.set('Browser storage is unavailable.');
    }
  }
}
