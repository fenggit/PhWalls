export function createLongPress(onLongPress: () => void) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let origin: { pointerId: number; x: number; y: number } | undefined;
  const cancel = () => {
    clearTimeout(timer);
    timer = undefined;
    origin = undefined;
  };
  return {
    start(pointerId: number, x: number, y: number) {
      // A second contact cancels the hold, allowing pinch gestures.
      if (origin) { cancel(); return; }
      origin = { pointerId, x, y };
      timer = setTimeout(() => {
        timer = undefined;
        onLongPress();
      }, 550);
    },
    move(pointerId: number, x: number, y: number) {
      if (origin && origin.pointerId === pointerId && Math.hypot(x - origin.x, y - origin.y) > 10) cancel();
    },
    cancel,
  };
}
