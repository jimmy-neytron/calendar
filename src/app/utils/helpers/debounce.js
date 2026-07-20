/**
 * Создаёт функцию с отложенным выполнением после паузы в вызовах.
 * @param {Function} callback
 * @param {number} delay
 * @returns {Function}
 */
export function debounce(callback, delay = 300) {
  let timerId

  return (...args) => {
    clearTimeout(timerId)
    timerId = setTimeout(() => callback(...args), delay)
  }
}
