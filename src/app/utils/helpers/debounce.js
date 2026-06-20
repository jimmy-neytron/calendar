/**
 * Creates a debounced function.
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
