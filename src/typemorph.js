import { defaultConfigs } from "./defaultConfigs.js";
import { marked } from "https://cdn.jsdelivr.net/npm/marked/lib/marked.esm.js";

export class TypeMorph {
  constructor(config = {}) {
    this.config = { ...defaultConfigs, ...config };
    this.parent =
      typeof this.config.parent === "string"
        ? this._elementById(this.config.parent)
        : this.config.parent;

    if (!this.parent) {
      throw new Error("Parent element not found");
    }

    this.text = this.config.text;
    this.speed = this.config.speed;
    this.cursorChar = this.config.cursorChar;
    this.loop = this.config.loop;
    this.loopCount = this.config.loopCount;
    this.currentLoop = 0;
    this.cursorEl = null;
    this.typingInterval = null;

    this._stopped = false;
    this._currentResolve = null;
  }

  async start() {
    this._createCursor();

    do {
      let content = this.text;

      if (this.config.parseMarkdown) {
        const parser = this.config.markdownParser || marked;
        content = parser.parse(content);
      }

      if (this.currentLoop > 0 && this.config.loopStartDelay) {
        await new Promise((r) => setTimeout(r, this.config.loopStartDelay));
      }

      // console.log("awaiting...");

      if (this.config.parseHTML) {
        await this._typeHTML(content);
      } else {
        await this._typeText(content);
      }

      // console.log("typed");

      if (this.loop && this.config.loopEndDelay && !this._stopped) {
        await new Promise((r) => setTimeout(r, this.config.loopEndDelay));
      }

      if (
        this.loop &&
        this.currentLoop + 1 < this.loopCount &&
        !this._stopped
      ) {
        if (this.config.loopType === "clear") {
          this._clearContent();
        } else {
          await this._backspaceContent();
        }
      }

      this.currentLoop++;
    } while (this.loop && this.currentLoop < this.loopCount && !this._stopped);

    if (!this._stopped) this._onFinish();
  }

  stop() {
    this._stopped = true;
    this._clearCursor();

    if (this.typingInterval) {
      clearInterval(this.typingInterval);
      this.typingInterval = null;
    }

    if (this._currentResolve) {
      this._currentResolve();
      this._currentResolve = null;
    }

    if (typeof this.config.onStop === "function") {
      this.config.onStop(this);
    }
  }

  destroy() {
    if (this.typingInterval) clearInterval(this.typingInterval);
    if (this.cursorEl) this.cursorEl.remove();
    this.config.onDestroy?.(this);
  }

  _createCursor() {
    if (!this.config.showCursor) return;
    this.cursorEl = document.createElement("span");
    this.cursorEl.textContent = this.cursorChar;
    this.cursorEl.className = "typemorph-cursor";
  }

  async _typeHTML(html) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    await this._typeNode(this.parent, doc.body);
  }

  async _typeNode(parent, node) {
    for (let child of node.childNodes) {
      if (this._stopped) break;
      if (
        child.nodeType === Node.TEXT_NODE &&
        child.textContent.trim().length > 0
      ) {
        await this._typeText(child.textContent, parent);
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        const el = document.createElement(child.tagName);
        for (let attr of child.attributes) {
          el.setAttribute(attr.name, attr.value);
        }

        if (
          this.cursorEl &&
          this.cursorEl.parentNode === parent &&
          this.cursorEl.nextSibling === null
        ) {
          parent.removeChild(this.cursorEl);
        }

        parent.appendChild(el);
        await this._typeNode(el, child);
      }
    }
  }

  _typeText(text, parent = this.parent) {
    return new Promise((resolve) => {
      this._currentResolve = resolve;
      this._stopped = false;

      let i = 0;
      if (this.cursorEl) {
        if (this.cursorEl.parentNode) {
          this.cursorEl.parentNode.removeChild(this.cursorEl);
        }
        parent.appendChild(this.cursorEl);
      }
      this.typingInterval = setInterval(() => {
        if (this._stopped || i >= text.length) {
          clearInterval(this.typingInterval);
          this.typingInterval = null;
          this._currentResolve = null;
          return resolve();
        }

        if (this.cursorEl) {
          let existingTextNode = null;
          if (
            this.cursorEl.previousSibling &&
            this.cursorEl.previousSibling.nodeType === Node.TEXT_NODE
          ) {
            existingTextNode = this.cursorEl.previousSibling;
          }
          if (existingTextNode) {
            existingTextNode.textContent += text.charAt(i);
          } else {
            const newTextNode = document.createTextNode(text.charAt(i));
            parent.insertBefore(newTextNode, this.cursorEl);
          }
        } else {
          if (this.config.parseHTML)
            parent.innerHTML = parent.innerHTML + text.charAt(i);
          else parent.textContent = parent.textContent + text.charAt(i);
        }

        i++;
        parent.scrollIntoView({ behavior: "smooth", block: "end" });
      }, this.speed);
    });
  }

  _elementById(id) {
    if (id.startsWith("#") && id.length > 1) id = id.split("#")[1];
    return document.getElementById(id);
  }

  _onFinish() {
    this._clearCursor();
    if (typeof this.config.onFinish === "function") {
      this.config.onFinish(this);
    }
  }

  _clearContent() {
    if (!this.parent) return;
    this.parent.innerHTML = "";
    if (this.cursorEl) this.parent.appendChild(this.cursorEl);
  }

  _clearCursor() {
    if (this.config.hideCursorOnFinishTyping && this.cursorEl) {
      this.cursorEl.remove();
      this.cursorEl = null;
    }
  }

  _backspaceContent() {
    return new Promise((resolve) => {
      if (!this.parent) return resolve();

      const textNodes = Array.from(this.parent.childNodes).filter(
        (n) => n.nodeType === Node.TEXT_NODE
      );

      const step = () => {
        if (this._stopped) return resolve();

        let done = true;
        for (let node of textNodes) {
          if (node.data.length > 0) {
            node.data = node.data.slice(0, -1);
            done = false;
          }
        }

        if (done) return resolve();
        setTimeout(step, this.config.backspaceSpeed);
      };

      step();
    });
  }
}
