/**
 * Storage abstraction for replacing localStorage with Supabase/IndexedDB later.
 */
export class DataStore {
  /**
   * @param {{ get(key: string): any, set(key: string, value: any): void, remove(key: string): void }} adapter
   */
  constructor(adapter) {
    this.adapter = adapter
  }

  /** @param {string} key */
  get(key) {
    return this.adapter.get(key)
  }

  /** @param {string} key @param {any} value */
  set(key, value) {
    this.adapter.set(key, value)
  }

  /** @param {string} key */
  remove(key) {
    this.adapter.remove(key)
  }
}

export class LocalStorageAdapter {
  get(key) {
    try {
      const rawValue = localStorage.getItem(key)
      return rawValue ? JSON.parse(rawValue) : null
    } catch (error) {
      console.error(`Failed to read ${key}`, error)
      return null
    }
  }

  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch (error) {
      console.error(`Failed to save ${key}`, error)
    }
  }

  remove(key) {
    localStorage.removeItem(key)
  }
}

export class IndexedDBAdapter {
  get() {
    throw new Error('IndexedDBAdapter is planned for a future version')
  }

  set() {
    throw new Error('IndexedDBAdapter is planned for a future version')
  }

  remove() {
    throw new Error('IndexedDBAdapter is planned for a future version')
  }
}

/**
 * Creates a store using the selected adapter.
 * @returns {DataStore}
 */
export function createStorage() {
  return new DataStore(new LocalStorageAdapter())
}
