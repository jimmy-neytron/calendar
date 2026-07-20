import { useLocalStorage } from '../composables/storage/useLocalStorage.js'

/**
 * Репозиторий локальной реактивной коллекции.
 * Изолирует доменную логику от конкретного механизма хранения данных.
 */
export class LocalCollectionRepository {
  constructor(key, initialValue = []) {
    const { state, reset } = useLocalStorage(key, initialValue)
    this.items = state
    this.reset = reset
  }

  getAll() {
    return this.items.value
  }

  replaceAll(items) {
    this.items.value = Array.isArray(items) ? [...items] : []
  }

  create(item) {
    this.items.value = [...this.items.value, item]
    return item
  }

  update(id, updates) {
    let updatedItem = null
    this.items.value = this.items.value.map((item) => {
      if (item.id !== id) return item
      updatedItem = { ...item, ...updates }
      return updatedItem
    })
    return updatedItem
  }

  delete(id) {
    this.items.value = this.items.value.filter((item) => item.id !== id)
  }

  findById(id) {
    return this.items.value.find((item) => item.id === id)
  }

  mergeById(items) {
    const map = new Map(this.items.value.map((item) => [item.id, item]))
    items.forEach((item) => map.set(item.id, { ...map.get(item.id), ...item }))
    this.items.value = [...map.values()]
  }
}
