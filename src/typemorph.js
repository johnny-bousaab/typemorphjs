import { defaultConfigs } from "./defaultConfigs.js";
import { marked } from "https://cdn.jsdelivr.net/npm/marked/lib/marked.esm.js";

export class TypeMorph {
  constructor(config = {}) {
    this.config = { ...defaultConfigs, ...config };
    this.text = this.config.text;
    this.speed = this.config.speed;
    this.cursorChar = this.config.cursorChar;
    this.loop = this.config.loop;
    this.loopCount = this.config.loopCount;
    this._currentLoop = 0;
    this._cursorEl = null;
    this._stopped = false;
    this._loopInterrupted = false;
    this._typingResolve = null;
    this._backspaceResolve = null;
    this._typingInterval = null;
    this._backspaceInterval = null;
    this._delayResolve = null;
    this._delayTimer = null;
    this._startQueue = Promise.resolve();
    this._typeQueue = Promise.resolve();
  }

  async start(text = null) {
    await this.stop(true);
    this._startQueue = this._startQueue.then(() => this._start(text));
    return this._startQueue;
  }

  async type(text, parent = null) {
    await this.stop(true);
    this._createCursor();
    this._stopped = false;
    this._typeQueue = this._typeQueue.then(() => this._type(text, parent));
    return this._typeQueue;
  }

  async stop(internalStop = false) {
    this._stopped = true;
    this._loopInterrupted = true;
    this._clearCursor();
    this._clearTypingRefs();

    await this._yieldToEventLoop();

    if (!internalStop && typeof this.config.onStop === "function") {
      this.config.onStop(this);
    }
  }

  destroy() {
    this.stop(true);
    if (this._cursorEl) this._cursorEl.remove();
    this.config.onDestroy?.(this);
  }

  async _start(text = null) {
    this._createCursor();
    this.loop = this.config.loop;
    this._currentLoop = 0;
    this._stopped = false;
    this._loopInterrupted = false;

    if (this.config.parent) this._setParent(this.config.parent);

    this._setText(text ?? this.text);

    if (!this.text) return;

    if (this.config.clearBeforeTyping) {
      this._clearContent();
    }

    do {
      if (
        this._currentlyLooping() &&
        this._currentLoop > 0 &&
        this.config.loopStartDelay
      ) {
        await this._delay(this.config.loopStartDelay);
      }

      await this._type(this.text, null, { startSource: true });

      if (this._currentlyLooping() && this.config.loopEndDelay) {
        await this._delay(this.config.loopEndDelay);
      }

      if (this._currentlyLooping() && this._currentLoop + 1 < this.loopCount) {
        if (this.config.loopType === "clear") {
          this._clearContent();
        } else {
          await this._backspaceContent();
        }
      }

      this._currentLoop++;
    } while (this._currentlyLooping() && this._currentLoop < this.loopCount);

    if (!this._stopped && !this._loopInterrupted) this._onFinish();

    console.debug("Resolving => _start");
  }

  async _type(newText, parent = null, options = {}) {
    this._setParent(parent ?? this.config.parent);
    this._setText(newText);

    if (this.config.clearBeforeTyping && !this._currentlyLooping()) {
      this._clearContent();
    }

    let contentToType = this.text;
    if (this.config.parseMarkdown) {
      const parser = this.config.markdownParser || marked;
      contentToType = this.config.markdownInline
        ? parser.parseInline(contentToType)
        : parser.parse(contentToType);
    }

    if (this.config.parseHTML) {
      await this._typeHTML(contentToType);
    } else {
      await this._typeText(contentToType);
    }

    if (!options.startSource && !this._stopped) {
      this._onFinish();
    }
  }

  _createCursor() {
    if (!this.config.showCursor || this._cursorEl) return;
    this._cursorEl = document.createElement("span");
    this._cursorEl.textContent = this.cursorChar;
    this._cursorEl.className = "typemorph-cursor";
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
          this._cursorEl &&
          this._cursorEl.parentNode === parent &&
          this._cursorEl.nextSibling === null
        ) {
          parent.removeChild(this._cursorEl);
        }

        parent.appendChild(el);
        await this._typeNode(el, child);
      }
    }
  }

  _typeText(text, parent = this.parent) {
    return new Promise((resolve) => {
      this._typingResolve = resolve;

      let i = 0;
      if (this._cursorEl) {
        if (this._cursorEl.parentNode) {
          this._cursorEl.parentNode.removeChild(this._cursorEl);
        }
        parent.appendChild(this._cursorEl);
      }
      const currTypingInterval = (this._typingInterval = setInterval(() => {
        if (this._stopped || i >= text.length) {
          this._clearTypingRefs();
          if (currTypingInterval) clearInterval(currTypingInterval);
          console.debug("Resolving => _typeText");
          return resolve();
        }

        if (this._cursorEl) {
          let previousSibling = this._cursorEl.previousSibling;
          if (previousSibling && previousSibling.nodeType === Node.TEXT_NODE) {
            previousSibling.textContent += text.charAt(i);
          } else {
            const newTextNode = document.createTextNode(text.charAt(i));
            parent.insertBefore(newTextNode, this._cursorEl);
          }
        } else {
          if (
            parent.lastChild &&
            parent.lastChild.nodeType === Node.TEXT_NODE
          ) {
            parent.lastChild.textContent += text.charAt(i);
          } else {
            const newTextNode = document.createTextNode(text.charAt(i));
            parent.append(newTextNode);
          }
        }

        i++;
        parent.scrollIntoView({ behavior: "smooth", block: "end" });
      }, this.speed));
    });
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
    if (this._cursorEl) this.parent.appendChild(this._cursorEl);
  }

  _clearCursor() {
    if (this.config.hideCursorOnFinishTyping && this._cursorEl) {
      this._cursorEl.remove();
      this._cursorEl = null;
    }
  }

  async _backspaceContent(parent = this.parent) {
    if (!parent || this._stopped) return;

    const children = Array.from(parent.childNodes);

    for (let i = children.length - 1; i >= 0; i--) {
      const child = children[i];
      if (this._stopped) return;

      if (this._cursorEl && child === this._cursorEl) {
        continue;
      }

      if (child.nodeType === Node.TEXT_NODE) {
        await this._backspaceTextNode(child);
        if (child.textContent.length === 0 && child.parentNode) {
          child.parentNode.removeChild(child);
        }
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        await this._backspaceContent(child);
        if (child.innerHTML.trim().length === 0 && child.parentNode) {
          if (this._cursorEl && this._cursorEl.parentNode === parent) {
            parent.removeChild(this._cursorEl);
          }

          child.parentNode.removeChild(child);

          if (this._cursorEl) {
            parent.appendChild(this._cursorEl);
          }
        }
      }
    }
  }

  _backspaceTextNode(node) {
    return new Promise((resolve) => {
      this._backspaceResolve = resolve;

      if (node.textContent.trim().length === 0) {
        if (node.parentNode) node.parentNode.removeChild(node);
        return doneResolve();
      }

      const currInterval = (this._backspaceInterval = setInterval(() => {
        if (this._stopped) {
          return doneResolve();
        }

        node.textContent = node.textContent.slice(0, -1);

        if (node.textContent.length === 0) {
          if (this._cursorEl && this._cursorEl.previousSibling === node) {
            // node is empty
          } else if (node.parentNode) {
            node.parentNode.removeChild(node);
          }

          return doneResolve();
        }
      }, this.config.backspaceSpeed));

      const doneResolve = () => {
        this._clearTypingRefs();
        if (currInterval) clearInterval(currInterval);
        console.debug("Resolving => _backspaceTextNode");
        return resolve();
      };
    });
  }

  _clearTypingRefs() {
    if (this._typingInterval) {
      clearInterval(this._typingInterval);
      this._typingInterval = null;
    }
    if (this._typingResolve) {
      this._typingResolve();
      this._typingResolve = null;
    }
    if (this._backspaceInterval) {
      clearInterval(this._backspaceInterval);
      this._backspaceInterval = null;
    }
    if (this._backspaceResolve) {
      this._backspaceResolve();
      this._backspaceResolve = null;
    }
    if (this._delayTimer) {
      clearTimeout(this._delayTimer);
      this._delayTimer = null;
    }
    if (this._delayResolve) {
      this._delayResolve();
      this._delayResolve = null;
    }
  }

  _setParent(parent) {
    this.parent =
      typeof parent === "string" ? document.getElementById(parent) : parent;

    if (!this.parent) {
      throw new Error("Parent element was not found");
    }
  }

  _delay(ms) {
    return new Promise((resolve) => {
      this._delayResolve = resolve;
      this._delayTimer = setTimeout(() => {
        this._delayTimer = null;
        resolve();
      }, ms);
    });
  }

  async _yieldToEventLoop() {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  _setText(text) {
    if (!this.text)
      throw new Error(
        "Please provide text either in intialization options, as parameter to start() or when calling type()"
      );

    this.text = text;
  }

  _currentlyLooping() {
    return this.loop && !this._stopped && !this._loopInterrupted;
  }
}
