export async function loadDeps() {
  try {
    const markedLib = await import(
      "https://cdn.jsdelivr.net/npm/marked@12.0.0/lib/marked.esm.js"
    );
    const DOMPurify = (
      await import("https://cdn.jsdelivr.net/npm/dompurify@3.3.0/+esm")
    ).default;
    return { marked: markedLib.marked, DOMPurify };
  } catch (error) {
    console.warn("CDN load failed, falling back to local packages");
    return loadNodeDeps();
  }
}

async function loadNodeDeps() {
  const markedLib = await import("marked");
  const DOMPurify = (await import("dompurify")).default;
  return { marked: markedLib.marked, DOMPurify };
}

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
