"use client";
import { useEffect, useRef, useState } from "react";

// Wire up "grab the handle → drag down → release to close" for a bottom sheet.
// Attach `bind` to the drag-handle strip (or the whole header) of the sheet.
// The returned `dragY` (px) should be added as a translateY on the sheet.
// When the user releases past `closeThreshold` px, we call `onClose()` and let
// the caller's own exit animation take over.
export function useSwipeToClose(onClose: () => void, closeThreshold = 90) {
  const startYRef = useRef<number | null>(null);
  const [dragY, setDragY] = useState(0);

  const bind = {
    onTouchStart: (e: React.TouchEvent) => {
      startYRef.current = e.touches[0].clientY;
    },
    onTouchMove: (e: React.TouchEvent) => {
      if (startYRef.current == null) return;
      const delta = e.touches[0].clientY - startYRef.current;
      // Only track downward drags; upward pulls snap the sheet fully open.
      setDragY(Math.max(0, delta));
    },
    onTouchEnd: () => {
      if (startYRef.current == null) return;
      const y = dragY;
      startYRef.current = null;
      if (y > closeThreshold) {
        // Above threshold — commit close. Snap sheet fully off-screen first
        // so the visual pull-down is continuous, then trigger the store close.
        setDragY(window.innerHeight);
        setTimeout(() => {
          setDragY(0);
          onClose();
        }, 180);
      } else {
        setDragY(0);
      }
    },
    // Pointer fallback for mouse-drag on desktop (rare but handy)
    onPointerDown: (e: React.PointerEvent) => {
      if (e.pointerType === "touch") return; // touch events already handle this
      startYRef.current = e.clientY;
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    onPointerMove: (e: React.PointerEvent) => {
      if (e.pointerType === "touch") return;
      if (startYRef.current == null) return;
      setDragY(Math.max(0, e.clientY - startYRef.current));
    },
    onPointerUp: (e: React.PointerEvent) => {
      if (e.pointerType === "touch") return;
      if (startYRef.current == null) return;
      const y = dragY;
      startYRef.current = null;
      if (y > closeThreshold) {
        setDragY(window.innerHeight);
        setTimeout(() => { setDragY(0); onClose(); }, 180);
      } else {
        setDragY(0);
      }
    },
  };

  // Reset drag state whenever the sheet's identity changes
  useEffect(() => () => { setDragY(0); startYRef.current = null; }, []);

  return { dragY, bind };
}
