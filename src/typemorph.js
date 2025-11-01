import { defaultConfigs } from "./defaultConfigs.js";
import { loadDeps } from "./helpers.js";

const { marked, DOMPurify } = await loadDeps();

/**
 * TypeMorph: Core typing animation
 * Handles typing, backspacing, and looping animations
 * Supports Makrdown/HTML parsing
 */
export class TypeMorph {
  constructor(config = {}) {
    if (typeof document === "undefined") {
      throw new Error("TypeMorph requires a DOM environment");
    }

    this.config = { ...defaultConfigs, ...config };

    if (this.config.parent) this._setParent(this.config.parent);

    this.text = this.config.text;
    this.speed = this.config.speed;
    this.cursorChar = this.config.cursorChar;
    this.loopCount = this.config.loopCount;
    this.chunkSize = this.config.chunkSize;
    this.scrollInterval = this.config.scrollInterval;

    this._currentLoop = 0;
    this._cursorEl = null;
    this._abortController = null;
    this._destroyed = false;
    this._isTyping = false;
    this._operationQueue = Promise.resolve();
    this._activeTimers = new Set();
    this._activeIntervals = new Set();

    this._validateOptions();
  }

  /**
   * Type text character by character
   * @param {string} text - Text to type
   * @param {HTMLElement|string} parent - Parent element or selector
   */
  async type(text, parent = null) {
    this._checkLifetime();
    await this._cancelCurrentOperation();
    return this._enqueueOperation(async (signal) => {
      this._createCursor();
      await this._type(text, parent, { loopSource: false }, signal);
    });
  }

  /**
   * Stop current operation
   */
  async stop() {
    this._checkLifetime();
    await this._cancelCurrentOperation();
    await this._safeCallback(this.config.onStop, this);
  }

  /**
   * Loop typing animation
   * @param {string} text - Text to type in loop
   * @param {HTMLElement|string} parent - Parent element or selector
   */
  async loop(text = null, parent = null) {
    this._checkLifetime();
    await this._cancelCurrentOperation();
    return this._enqueueOperation(async (signal) => {
      await this._loop(text, parent, signal);
    });
  }

  /**
   * Destroy the instance and cleanup
   */
  destroy() {
    if (this._destroyed) return;

    this.stop();

    if (this._abortController) {
      if (!this._abortController.signal.aborted) this._abortController.abort();
      this._abortController = null;
    }

    if (this._cursorEl && this._cursorEl.parentNode) {
      this._cursorEl.remove();
    }

    this._cursorEl = null;
    this._destroyed = true;

    this._safeCallback(this.config.onDestroy, this);
  }

  isTyping() {
    return this._isTyping;
  }

  isDestroyed() {
    return this._destroyed;
  }

  getCurrentLoop() {
    return this._currentLoop;
  }

  async _loop(text, parent, signal) {
    this._createCursor();
    this._currentLoop = 0;
    this._isTyping = true;

    this._setParent(parent ?? this.parent);
    this._setText(text ?? this.text);

    if (!this.text) {
      this._isTyping = false;
      return;
    }

    if (this.config.clearBeforeTyping) {
      this._clearContent();
    }

    try {
      do {
        if (signal.aborted) break;

        if (
          this._currentlyLooping() &&
          this._currentLoop > 0 &&
          this.config.loopStartDelay
        ) {
          await this._delay(this.config.loopStartDelay, signal);
        }

        await this._type(this.text, null, { loopSource: true }, signal);

        if (signal.aborted) break;

        if (
          this._currentlyLooping() &&
          this.config.loopEndDelay &&
          this._currentLoop < this.loopCount - 1
        ) {
          await this._delay(this.config.loopEndDelay, signal);
        }

        if (
          this._currentlyLooping() &&
          this._currentLoop + 1 < this.loopCount
        ) {
          if (this.config.loopType === "clear") {
            this._clearContent();
          } else {
            await this._backspaceContent(this.parent, signal);
          }
        }

        this._currentLoop++;
      } while (
        this._currentlyLooping() &&
        this._currentLoop < this.loopCount &&
        !signal.aborted
      );

      if (!signal.aborted) {
        await this._onFinish();
      }
    } finally {
      this._isTyping = false;
      if (this.config.debug) {
        console.debug("TypeMorph: _loop() ended");
      }
    }
  }

  async _type(text, parent = null, options = {}, signal) {
    this._setParent(parent ?? this.parent);
    this._setText(text);
    this._isTyping = true;

    if (
      this.config.clearBeforeTyping &&
      !options.loopSource &&
      !signal.aborted
    ) {
      this._clearContent();
    }

    try {
      let contentToType = this.text;

      if (this.config.parseMarkdown) {
        const parseMethod = this.config.markdownInline
          ? "parseInline"
          : "parse";

        const result = this.config.markdownParse
          ? this.config.markdownParse(contentToType, this.config.markdownInline)
          : marked[parseMethod](contentToType);

        contentToType = result instanceof Promise ? await result : result;
      }

      if (this.config.parseHTML) {
        await this._typeHTML(contentToType, signal);
      } else {
        await this._typeText(contentToType, this.parent, signal);
      }

      if (!options.loopSource && !signal.aborted) {
        await this._onFinish();
      }
    } finally {
      if (!options.loopSource) {
        this._isTyping = false;
      }
    }
  }

  _createCursor() {
    if (!this.config.showCursor || this._cursorEl) return;

    this._cursorEl = document.createElement("span");
    this._cursorEl.textContent = this.cursorChar;
    this._cursorEl.className = "typemorph-cursor";
    this._cursorEl.setAttribute("data-typemorph-cursor", "true");
  }

  async _typeHTML(html, signal) {
    if (!this.config.trustedHTML) {
      html = this.config.htmlSanitize
        ? this.config.htmlSanitize(html)
        : DOMPurify.sanitize(html);
    }

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    await this._typeNode(this.parent, doc.body, signal);
  }

  async _typeNode(parent, node, signal) {
    const children = Array.from(node.childNodes);

    for (let child of children) {
      if (signal.aborted) break;

      if (
        child.nodeType === Node.TEXT_NODE &&
        child.textContent.trim().length > 0
      ) {
        await this._typeText(child.textContent, parent, signal);
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        const el = document.createElement(child.tagName);

        for (let attr of child.attributes) {
          try {
            el.setAttribute(attr.name, attr.value);
          } catch (e) {
            if (this.config.debug) {
              console.warn("TypeMorph: Failed to set attribute", attr.name, e);
            }
          }
        }

        parent.appendChild(el);
        await this._typeNode(el, child, signal);
      }
    }
  }

  async _typeText(text, parent = this.parent, signal) {
    if (!text || signal.aborted) return;

    if (this._cursorEl) {
      if (this._cursorEl.parentNode) {
        this._cursorEl.remove();
      }
      parent.appendChild(this._cursorEl);
    }

    const chars = Array.from(text);
    let buffer = "";
    let scrollCounter = 0;

    for (let i = 0; i < chars.length; i++) {
      if (signal.aborted) break;

      buffer += chars[i];

      if (buffer.length >= this.chunkSize || i === chars.length - 1) {
        this._appendTextToParent(parent, buffer);
        buffer = "";
        scrollCounter++;
        if (this.config.autoScroll && scrollCounter >= this.scrollInterval) {
          parent.scrollIntoView({ behavior: "smooth", block: "end" });
          scrollCounter = 0;
        }
      }

      await this._delay(this.speed, signal);
    }

    if (this.config.autoScroll) {
      parent.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }

  _appendTextToParent(parent, text) {
    if (this._cursorEl) {
      let previousSibling = this._cursorEl.previousSibling;
      if (previousSibling && previousSibling.nodeType === Node.TEXT_NODE) {
        previousSibling.textContent += text;
      } else {
        const newTextNode = document.createTextNode(text);
        parent.insertBefore(newTextNode, this._cursorEl);
      }
    } else {
      if (parent.lastChild && parent.lastChild.nodeType === Node.TEXT_NODE) {
        parent.lastChild.textContent += text;
      } else {
        const newTextNode = document.createTextNode(text);
        parent.appendChild(newTextNode);
      }
    }
  }

  async _onFinish() {
    this._clearCursor();
    await this._safeCallback(this.config.onFinish, this);
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

  async _backspaceContent(parent = this.parent, signal) {
    if (!parent || signal.aborted) return;

    const children = Array.from(parent.childNodes);

    for (let i = children.length - 1; i >= 0; i--) {
      const child = children[i];
      if (signal.aborted) return;

      if (this._cursorEl && child === this._cursorEl) {
        continue;
      }

      if (child.nodeType === Node.TEXT_NODE) {
        await this._backspaceTextNode(child, signal);
        if (child.textContent.length === 0 && child.parentNode) {
          child.parentNode.removeChild(child);
        }
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        await this._backspaceContent(child, signal);
        if (this._isElementEmptyExcludingCursor(child) && child.parentNode) {
          if (this._cursorEl && this._cursorEl.parentNode === parent) {
            this._cursorEl.remove();
          }

          child.parentNode.removeChild(child);

          if (this._cursorEl) {
            this._appendCursorToLastTextNode(this.parent);
          }
        }
      }
    }

    this._cleanEmptyTextNodes(parent);
  }

  _appendCursorToLastTextNode(parent) {
    const lastTextNode = this._findLastTextNode(parent);

    if (lastTextNode && lastTextNode.parentNode) {
      lastTextNode.parentNode.appendChild(this._cursorEl);
    } else {
      parent.appendChild(this._cursorEl);
    }
  }

  _findLastTextNode(element) {
    if (!element) return null;

    const childNodes = Array.from(element.childNodes);

    for (let i = childNodes.length - 1; i >= 0; i--) {
      const child = childNodes[i];

      if (this._cursorEl && child === this._cursorEl) {
        continue;
      }

      if (child.nodeType === Node.TEXT_NODE) {
        if (child.textContent && child.textContent.trim().length > 0) {
          return child;
        }
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        const lastTextInChild = this._findLastTextNode(child);
        if (lastTextInChild) {
          return lastTextInChild;
        }
      }
    }

    return null;
  }

  _isElementEmptyExcludingCursor(element) {
    const children = Array.from(element.childNodes);

    for (const child of children) {
      if (this._cursorEl && child === this._cursorEl) {
        continue;
      }

      if (child.nodeType === Node.TEXT_NODE) {
        if (child.textContent && child.textContent.trim().length > 0) {
          return false;
        }
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        if (!this._isElementEmptyExcludingCursor(child)) {
          return false;
        }
      }
    }

    return true;
  }

  _cleanEmptyTextNodes(parent) {
    const children = Array.from(parent.childNodes);
    children.forEach((child) => {
      if (
        child.nodeType === Node.TEXT_NODE &&
        (!child.textContent || child.textContent.trim().length === 0)
      ) {
        child.parentNode.removeChild(child);
      }
    });
  }

  async _backspaceTextNode(node, signal) {
    if (!node.textContent || node.textContent.trim().length === 0) {
      if (node.parentNode) node.parentNode.removeChild(node);
      return;
    }

    const chars = Array.from(node.textContent);
    let deleteCount = 0;
    let scrollCounter = 0;

    for (let i = chars.length - 1; i >= 0; i -= this.chunkSize) {
      if (signal.aborted) break;

      const chunkStart = Math.max(0, i - this.chunkSize + 1);
      const charsToKeep = chars.slice(0, chunkStart);

      node.textContent = charsToKeep.join("");
      deleteCount += i - chunkStart + 1;

      scrollCounter++;
      if (this.config.autoScroll && scrollCounter >= this.scrollInterval) {
        if (node.parentNode) {
          node.parentNode.scrollIntoView({ behavior: "smooth", block: "end" });
        }
        scrollCounter = 0;
      }

      await this._delay(this.config.backspaceSpeed, signal);
    }

    if (
      node.parentNode &&
      (!node.textContent || node.textContent.length === 0)
    ) {
      node.parentNode.removeChild(node);
    }

    if (this.config.autoScroll && node.parentNode) {
      node.parentNode.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }

  _setParent(parent) {
    this.parent =
      typeof parent === "string" ? document.getElementById(parent) : parent;

    if (!this.parent || !this.parent instanceof Element) {
      if (typeof parent === "string")
        throw new Error(
          `TypeMorph: Parent element not found for selector #${parent}`
        );

      throw new Error("TypeMorph: Parent element not found");
    }
  }

  _setText(text) {
    if (!text || typeof text !== "string") {
      throw new Error("TypeMorph: Please provide a valid text string");
    }
    this.text = text;
  }

  _currentlyLooping() {
    return this._isTyping;
  }

  _checkLifetime() {
    if (this._destroyed) {
      throw new Error("TypeMorph: Cannot call method on destroyed instance");
    }
  }

  async _delay(ms, signal) {
    if (signal.aborted) return;

    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        console.log("DONEEEEE");
        this._activeTimers.delete(timer);
        resolve();
      }, ms);

      this._activeTimers.add(timer);

      signal.addEventListener(
        "abort",
        () => {
          clearTimeout(timer);
          this._activeTimers.delete(timer);
          resolve();
        },
        { once: true }
      );
    });
  }

  async _enqueueOperation(operation) {
    await this._operationQueue.catch(() => {});
    this._abortController = new AbortController();
    this._operationQueue = (async () => {
      try {
        await operation(this._abortController.signal);
      } catch (error) {
        if (error.name !== "AbortError") {
          console.error("TypeMorph: Operation error:", error);
        }
      }
    })();

    return this._operationQueue;
  }

  _clearAllTracked() {
    for (const timer of this._activeTimers) {
      clearTimeout(timer);
    }
    this._activeTimers.clear();

    for (const interval of this._activeIntervals) {
      clearInterval(interval);
    }
    this._activeIntervals.clear();
  }

  async _cancelCurrentOperation() {
    if (this._abortController) {
      this._abortController.abort();
    }

    this._clearAllTracked();

    await this._operationQueue.catch(() => {});

    this._isTyping = false;
    this._clearCursor();
  }

  async _safeCallback(callback, ...args) {
    if (typeof callback === "function") {
      try {
        const result = callback(...args);
        if (result instanceof Promise) {
          await result;
        }
      } catch (error) {
        if (this.config.debug) {
          console.error("TypeMorph: Callback error:", error);
        }
      }
    }
  }

  _validateOptions() {
    if (typeof this.chunkSize != "number" || this.chunkSize < 1)
      throw new Error("TypeMorph: chunkSize has to be a number > 0");

    if (typeof this.loopCount != "number" || this.loopCount < 0)
      throw new Error("TypeMorph: loopCount has to be a number >= 0");

    if (typeof this.speed != "number" || this.speed < 0)
      throw new Error("TypeMorph: speed has to be a number >= 0");
  }
}
