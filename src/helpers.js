const CURSOR_CSS = `.typemorph-cursor {
  display: inline-block;
  animation: blink 1s step-start infinite;
}

@keyframes blink {
  50% {
    opacity: 0;
  }
}`;

export function injectCursorCSS() {
  if (document.getElementById("typemorph-cursor-style")) return;
  const style = document.createElement("style");
  style.id = "typemorph-cursor-style";
  style.textContent = CURSOR_CSS;
  document.head.appendChild(style);
}

export async function safeCallback(callback, ...args) {
  if (typeof callback === "function") {
    try {
      const result = callback(...args);
      if (result instanceof Promise) {
        await result;
      }
    } catch (error) {
      console.warn("TypeMorph: User callback error:", error);
    }
  }
}
