import '@angular/compiler';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PersistenceService } from './persistence.service';
import { freshData } from './models';

describe('local persistence and recovery', () => {
  let values: Map<string, string>;
  beforeEach(() => {
    values = new Map();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    });
  });
  it('opens a clean workspace when storage is missing', () => {
    const persistence = new PersistenceService();
    expect(persistence.load()).toEqual(freshData());
    expect(persistence.warning()).toBe('');
  });
  it('saves and loads preferences and records', () => {
    const persistence = new PersistenceService();
    const data = freshData();
    data.preferences.theme = 'dark';
    persistence.save(data);
    expect(new PersistenceService().load()).toEqual(data);
  });
  it.each(['{broken', '', '{"version":99}'])('preserves corrupt or unknown data %s', (raw) => {
    const persistence = new PersistenceService();
    values.set(persistence.key, raw);
    expect(persistence.load()).toEqual(freshData());
    expect(persistence.warning()).toContain('original is preserved');
    persistence.save(freshData());
    expect(values.get(persistence.key)).toBe(raw);
  });
  it('explicit replacement unblocks saving after recovery', () => {
    const persistence = new PersistenceService();
    values.set(persistence.key, 'broken');
    persistence.load();
    persistence.replace(freshData());
    expect(JSON.parse(values.get(persistence.key)!)).toEqual(freshData());
    expect(persistence.warning()).toBe('');
  });
  it('warns when browser quota or storage access fails', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => null,
      setItem: () => {
        throw new Error('Quota exceeded');
      },
    });
    const persistence = new PersistenceService();
    persistence.save(freshData());
    expect(persistence.warning()).toContain('could not save');
  });
});

describe('safe in-place migration', () => {
  it.each([1, 2])('backs up version %s exactly before writing v3 under the same key', (version) => {
    const values = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => values.get(k) ?? null,
      setItem: (k: string, v: string) => values.set(k, v),
    });
    const p = new PersistenceService();
    const raw = JSON.stringify({ ...freshData(), version });
    values.set(p.key, raw);
    const migrated = p.load();
    expect(migrated.version).toBe(3);
    expect(values.get(p.key + '.pre-v3')).toBe(raw);
    expect(JSON.parse(values.get(p.key)!).version).toBe(3);
    expect(new PersistenceService().load()).toEqual(migrated);
  });
  it('leaves original untouched and blocks autosave if migration backup cannot be written', () => {
    const raw = JSON.stringify({ ...freshData(), version: 1 });
    const writes = vi.fn(() => {
      throw new Error('Quota');
    });
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => (k.endsWith('.pre-v3') ? null : raw),
      setItem: writes,
    });
    const p = new PersistenceService();
    p.load();
    expect(p.warning()).toContain('original is preserved');
    p.save(freshData());
    expect(writes).toHaveBeenCalledTimes(1);
  });
});
