import hljs from "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.11.1/es/highlight.min.js";

let copyTimeout = null;

document.querySelectorAll("[data-copy]").forEach((btn) => {
  btn.addEventListener("click", () => {
    if (copyTimeout) clearTimeout(copyTimeout);
    const code = btn.parentElement.querySelector("code").innerText.trim();
    navigator.clipboard.writeText(code);
    btn.textContent = "Copied";
    copyTimeout = setTimeout(() => (btn.textContent = "Copy"), 1000);
  });
});

hljs.highlightAll();
