"use client";

import { useEffect, useState } from "react";

interface KeyboardState {
  keyboardHeight: number;
  isKeyboardOpen: boolean;
}

/**
 * Tracks the soft keyboard height using the Visual Viewport API.
 * This is the only cross-browser-reliable signal for keyboard presence.
 *
 * Returns 0 on SSR, in non-browser environments, and on desktop
 * where the visual viewport never shrinks due to a keyboard.
 */
export function useKeyboardHeight(): KeyboardState {
  const [state, setState] = useState<KeyboardState>({
    keyboardHeight: 0,
    isKeyboardOpen: false,
  });

  useEffect(() => {
    if (typeof window === "undefined" || !window.visualViewport) {
      return;
    }

    function update() {
      const vv = window.visualViewport!;
      // keyboardHeight = layout height minus visual viewport height (minus offset)
      const height = Math.max(
        0,
        window.innerHeight - vv.height - vv.offsetTop
      );
      setState({
        keyboardHeight: height,
        isKeyboardOpen: height > 50, // 50px threshold to avoid false positives
      });
    }

    const vv = window.visualViewport;
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    update(); // sync on mount

    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, []);

  return state;
}
