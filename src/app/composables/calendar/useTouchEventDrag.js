const LONG_PRESS_DELAY = 280
const MOVE_TOLERANCE = 9

let pressTimer = null
let activePointerId = null
let sourceEvent = null
let moveCallback = null
let startPoint = null
let activeTarget = null
let dragLabel = null
let dragging = false
let suppressClickUntil = 0

export function useTouchEventDrag() {
  function beginTouchDrag(event, pointerEvent, onMove) {
    if (!['touch', 'pen'].includes(pointerEvent.pointerType)) return

    cancelTouchDrag()
    activePointerId = pointerEvent.pointerId
    sourceEvent = event
    moveCallback = onMove
    startPoint = { x: pointerEvent.clientX, y: pointerEvent.clientY }

    pressTimer = window.setTimeout(() => {
      dragging = true
      suppressClickUntil = Date.now() + 600
      document.body.classList.add('calendar-touch-dragging')
      navigator.vibrate?.(25)
      createDragLabel(event, pointerEvent)
      updateDropTarget(pointerEvent.clientX, pointerEvent.clientY)
    }, LONG_PRESS_DELAY)

    document.addEventListener('pointermove', handlePointerMove, { passive: false })
    document.addEventListener('pointerup', finishTouchDrag, { passive: false })
    document.addEventListener('pointercancel', cancelTouchDrag, { passive: false })
  }

  function shouldSuppressEventClick() {
    return Date.now() < suppressClickUntil
  }

  return {
    beginTouchDrag,
    shouldSuppressEventClick,
  }
}

function handlePointerMove(pointerEvent) {
  if (pointerEvent.pointerId !== activePointerId || !startPoint) return

  const distance = Math.hypot(
    pointerEvent.clientX - startPoint.x,
    pointerEvent.clientY - startPoint.y
  )

  if (!dragging && distance > MOVE_TOLERANCE) {
    cancelTouchDrag()
    return
  }

  if (!dragging) return
  pointerEvent.preventDefault()
  moveDragLabel(pointerEvent)
  updateDropTarget(pointerEvent.clientX, pointerEvent.clientY)
}

function finishTouchDrag(pointerEvent) {
  if (pointerEvent.pointerId !== activePointerId) return
  window.clearTimeout(pressTimer)

  if (dragging && activeTarget && sourceEvent && moveCallback) {
    pointerEvent.preventDefault()
    moveCallback({
      eventId: sourceEvent.id,
      date: activeTarget.dataset.calendarDropDate,
      time: activeTarget.dataset.calendarDropTime || undefined,
      copy: false,
    })
  }

  cleanup()
}

function cancelTouchDrag(pointerEvent) {
  if (pointerEvent?.pointerId && pointerEvent.pointerId !== activePointerId) return
  window.clearTimeout(pressTimer)
  cleanup()
}

function updateDropTarget(x, y) {
  const nextTarget = document.elementFromPoint(x, y)?.closest?.('[data-calendar-drop-date]') || null
  if (nextTarget === activeTarget) return
  activeTarget?.classList.remove('calendar-touch-drop-target')
  activeTarget = nextTarget
  activeTarget?.classList.add('calendar-touch-drop-target')
}

function createDragLabel(event, pointerEvent) {
  dragLabel = document.createElement('div')
  dragLabel.className = 'calendar-touch-drag-label'
  dragLabel.textContent = event.title || 'Событие'
  document.body.appendChild(dragLabel)
  moveDragLabel(pointerEvent)
}

function moveDragLabel(pointerEvent) {
  if (!dragLabel) return
  dragLabel.style.transform = `translate3d(${pointerEvent.clientX + 14}px, ${pointerEvent.clientY + 14}px, 0)`
}

function cleanup() {
  activeTarget?.classList.remove('calendar-touch-drop-target')
  dragLabel?.remove()
  document.body.classList.remove('calendar-touch-dragging')
  document.removeEventListener('pointermove', handlePointerMove)
  document.removeEventListener('pointerup', finishTouchDrag)
  document.removeEventListener('pointercancel', cancelTouchDrag)
  pressTimer = null
  activePointerId = null
  sourceEvent = null
  moveCallback = null
  startPoint = null
  activeTarget = null
  dragLabel = null
  dragging = false
}
