import { useEffect } from "react";

// Web Audio API soft UI click sound generator
let audioCtx = null;

function playSubtleClickSound() {
  try {
    if (!audioCtx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      audioCtx = new AudioCtx();
    }
    if (audioCtx.state === "suspended") {
      audioCtx.resume();
    }

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(800, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(300, audioCtx.currentTime + 0.03);

    gain.gain.setValueAtTime(0.06, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.03);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + 0.035);
  } catch (e) {
    /* ignore audio policy blocks */
  }
}

export default function ClickFeedback() {
  useEffect(() => {
    const handleGlobalPointerDown = (e) => {
      // Find closest clickable target
      const target = e.target.closest("button, a, [role='button'], .clickable, input[type='submit'], input[type='button']");
      if (!target) return;

      // 1. Micro-Haptic Vibration (12ms tick)
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        try {
          navigator.vibrate(12);
        } catch {
          /* ignore */
        }
      }

      // 2. Play soft auditory feedback
      playSubtleClickSound();

      // 3. Visual Ripple Wave Effect
      const rect = target.getBoundingClientRect();
      const circle = document.createElement("span");
      const diameter = Math.max(rect.width, rect.height);
      const radius = diameter / 2;

      circle.style.width = circle.style.height = `${diameter}px`;
      circle.style.left = `${e.clientX - rect.left - radius}px`;
      circle.style.top = `${e.clientY - rect.top - radius}px`;
      circle.classList.add("btn-ripple-span");

      // Ensure container has relative positioning
      const computedPos = window.getComputedStyle(target).position;
      if (computedPos === "static") {
        target.style.position = "relative";
      }
      target.style.overflow = "hidden";

      const existingRipple = target.querySelector(".btn-ripple-span");
      if (existingRipple) {
        existingRipple.remove();
      }

      target.appendChild(circle);

      setTimeout(() => {
        circle.remove();
      }, 550);
    };

    document.addEventListener("pointerdown", handleGlobalPointerDown, { passive: true });
    return () => {
      document.removeEventListener("pointerdown", handleGlobalPointerDown);
    };
  }, []);

  return null;
}
