import '@testing-library/jest-dom';

// Vitest 4.x with jsdom may not expose a fully functional localStorage
// (the --localstorage-file feature path omits .clear() in some configurations).
// This mock guarantees all Storage interface methods work as expected.
class LocalStorageMock {
  constructor() {
    this._store = Object.create(null);
  }
  clear() {
    this._store = Object.create(null);
  }
  getItem(key) {
    return key in this._store ? this._store[key] : null;
  }
  setItem(key, value) {
    this._store[key] = String(value);
  }
  removeItem(key) {
    delete this._store[key];
  }
  get length() {
    return Object.keys(this._store).length;
  }
  key(index) {
    return Object.keys(this._store)[index] ?? null;
  }
}

Object.defineProperty(globalThis, 'localStorage', {
  value: new LocalStorageMock(),
  writable: true,
  configurable: true,
});
