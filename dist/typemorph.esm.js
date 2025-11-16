const defaultConfigs = {
  text: null,
  parent: null, // HTML element or string
  speed: 50, // ms per character
  chunkSize: 1,
  loopCount: Infinity,
  loopType: "clear", // "clear" or "backspace"
  loopFinalBehavior: "keep", // "keep" or "remove" -> removing type depends on loopType
  loopStartDelay: 300, // ms to wait before typing again, after backspacing/clearing, in each loop (applies after first loop, meaning loop has to be > 1)
  loopEndDelay: 800, // ms to wait after typing, before backspacing/clearing, in each loop (applies after first loop, meaning loop has to be > 1)
  backspaceSpeed: 50, // speed per character when backspacing. Used when loopType is "backspace"
  showCursor: true,
  cursorChar: "|",
  parseMarkdown: false, // if true, will parse makrdown syntax to HTML, meaning parseHtml is implied
  markdownInline: false, // whether to parse markdown inline, can be helpful to avoid unwanted wrappers for simple text
  parseHtml: true,
  markdownParse: null, // custom markdown parse function -> markdownParse(text, inline = false)
  hideCursorOnFinishTyping: true,
  autoScroll: true,
  scrollInterval: 1, // characters typed before scroll is triggered when typing
  clearBeforeTyping: true, // if type() was used on same parent, whether to clear text content before typing again
  htmlSanitize: null, // custom html sanitize function -> htmlSanitize(html)
  onStop: (instance) => {}, // typing has been stopped callback
  onFinish: (instance) => {}, // typing naturally finished callback
  onDestroy: (instance) => {}, // on instance destroy callback
};

const CURSOR_CSS = `.typemorph-cursor {
  display: inline-block;
  animation: blink 1s step-start infinite;
}

@keyframes blink {
  50% {
    opacity: 0;
  }
}`;

function injectCursorCSS() {
  if (document.getElementById("typemorph-cursor-style")) return;
  const style = document.createElement("style");
  style.id = "typemorph-cursor-style";
  style.textContent = CURSOR_CSS;
  document.head.appendChild(style);
}

async function safeCallback(callback, ...args) {
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

// import { marked } from "marked";
// import DOMPurify from "dompurify";

injectCursorCSS();

/**
 * TypeMorph: Core typing animation
 * Handles typing, backspacing, and looping animations
 * Supports Markdown & HTML
 */
class TypeMorph {
  constructor(config = {}) {
    if (typeof document === "undefined") {
      throw new Error("TypeMorph requires a DOM environment");
    }

    this.config = { ...defaultConfigs, ...config };

    if (this.config.parent) this._setParent(this.config.parent);
    if (this.config.text) this._setText(this.config.text);

    this.speed = this.config.speed;
    this.backspaceSpeed = this.config.backspaceSpeed;
    this.cursorChar = this.config.cursorChar;
    this.chunkSize = this.config.chunkSize;
    this.scrollInterval = this.config.scrollInterval;

    this._currentLoop = 0;
    this._cursorEl = null;
    this._abortController = null;
    this._destroyed = false;
    this._isTyping = false;
    this._operationQueue = Promise.resolve();
    this._activeTimers = new Set();

    this._validateOptions(this.config);
  }

  /**
   * Type text character by character
   * @param {string} text - Text to type
   * @param {HTMLElement|string} parent - Parent element or selector
   * @param {object} options - Additional options to override instance config for current operation
   */
  async type(text, parent = null, options = {}) {
    this._checkLifetime();
    const { _parent, _options } = this._readOptions(parent, options);
    this._validateOptions(_options);
    await this._cancelCurrentOperation(_options);
    return this._startOperation(async (signal) => {
      this._createCursor(_options);
      await this._type(
        text,
        _parent,
        { ..._options, loopSource: false },
        signal
      );
    });
  }

  /**
   * Stop current operation
   */
  async stop() {
    this._checkLifetime();
    await this._cancelCurrentOperation();
    await safeCallback(this.config.onStop, this);
  }

  /**
   * Loop typing animation
   * @param {string} text - Text to type in loop
   * @param {HTMLElement|string} parent - Parent element or selector
   * @param {object} options - Additional options to override instance config for current operation
   */
  async loop(text = null, parent = null, options = {}) {
    this._checkLifetime();
    const { _parent, _options } = this._readOptions(parent, options);
    this._validateOptions(_options);
    await this._cancelCurrentOperation(_options);
    return this._startOperation(async (signal) => {
      await this._loop(text, _parent, signal, _options);
    });
  }

  /**
   * Destroy the instance and cleanup
   */
  destroy() {
    if (this._destroyed) return;

    this.stop();
    this._abortController = null;
    this._removeCursor();
    this._destroyed = true;

    safeCallback(this.config.onDestroy, this);
  }

  /**
   *
   * @returns {boolean} - Whether the instance is currently typing
   */
  isTyping() {
    return this._isTyping;
  }

  /**
   *
   * @returns {boolean} - Whether the instance is destroyed
   */
  isDestroyed() {
    return this._destroyed;
  }

  /**
   *
   * @returns {number} - Current loop iteration (0-based)
   */
  getCurrentLoop() {
    return this._currentLoop;
  }

  async _loop(text, parent, signal, options) {
    this._createCursor(options);
    this._currentLoop = 0;
    this._isTyping = true;

    const targetParent = this._resolveParent(parent);
    const targetText = this._resolveText(text);

    const clearBeforeTyping =
      options?.clearBeforeTyping ?? this.config.clearBeforeTyping;
    const loopStartDelay =
      options?.loopStartDelay ?? this.config.loopStartDelay;
    const loopEndDelay = options?.loopEndDelay ?? this.config.loopEndDelay;
    const loopType = options?.loopType ?? this.config.loopType;
    const loopCount = options?.loopCount ?? this.config.loopCount;
    const loopFinalBehavior =
      options?.loopFinalBehavior ?? this.config.loopFinalBehavior;

    if (clearBeforeTyping) {
      this._clearContent(targetParent);
    }

    try {
      do {
        if (signal.aborted) break;

        const willStillBeLooping =
          this._currentlyLooping(targetParent) &&
          this._currentLoop < loopCount - 1;
        const isFinalLoop =
          this._currentlyLooping(targetParent) &&
          this._currentLoop + 1 >= loopCount;

        if (
          this._currentlyLooping(targetParent) &&
          this._currentLoop > 0 &&
          loopStartDelay
        ) {
          await this._delay(loopStartDelay, signal);
        }

        await this._type(
          targetText,
          targetParent,
          { ...options, loopSource: true },
          signal
        );

        if (signal.aborted) break;

        const willClear =
          this._currentlyLooping(targetParent) &&
          (willStillBeLooping ||
            (isFinalLoop && loopFinalBehavior === "remove"));

        if (willClear && loopEndDelay) {
          await this._delay(loopEndDelay, signal);
        }

        if (willClear) {
          if (loopType === "clear") {
            this._clearContent(targetParent);
          } else {
            await this._backspaceContent(targetParent, targetParent, signal);
          }
        }

        this._currentLoop++;
      } while (
        this._currentlyLooping(targetParent) &&
        this._currentLoop < loopCount &&
        !signal.aborted
      );

      if (!signal.aborted) {
        await this._onFinish();
      }
    } finally {
      this._isTyping = false;
    }
  }

  async _type(text, parent, options, signal) {
    const targetParent = this._resolveParent(parent);
    const targetText = this._resolveText(text);

    this._isTyping = true;

    const parseMarkdown = options?.parseMarkdown ?? this.config.parseMarkdown;
    const parseHtml = options?.parseHtml ?? this.config.parseHtml;
    const clearBeforeTyping =
      options?.clearBeforeTyping ?? this.config.clearBeforeTyping;
    const markdownInline =
      options?.markdownInline ?? this.config.markdownInline;
    const markdownParse = options?.markdownParse ?? this.config.markdownParse;

    if (clearBeforeTyping && !options?.loopSource && !signal.aborted) {
      this._clearContent(targetParent);
    }

    try {
      let contentToType = targetText;

      if (parseMarkdown) {
        const parseMethod = markdownInline ? "parseInline" : "parse";

        const result = markdownParse
          ? markdownParse(contentToType, markdownInline)
          : (await getDeps()).marked[parseMethod](contentToType);

        contentToType = result instanceof Promise ? await result : result;
      }

      if (parseHtml || parseMarkdown) {
        await this._typeHTML(contentToType, targetParent, signal, options);
      } else {
        await this._typeText(contentToType, targetParent, signal, options);
      }

      if (!options?.loopSource && !signal.aborted) {
        await this._onFinish(options);
      }
    } finally {
      if (!options?.loopSource) {
        this._isTyping = false;
      }
    }
  }

  _createCursor(options = {}) {
    const showCursor = options?.showCursor ?? this.config.showCursor;
    const cursorChar = options?.cursorChar ?? this.cursorChar;

    if (!showCursor) {
      this._removeCursor();
      return;
    }

    if (this._cursorEl) {
      this._cursorEl.textContent = cursorChar;
      return;
    }

    this._cursorEl = document.createElement("span");
    this._cursorEl.textContent = cursorChar;
    this._cursorEl.className = "typemorph-cursor";
    this._cursorEl.setAttribute("data-typemorph-cursor", "true");
  }

  async _typeHTML(html, parent, signal, options) {
    const htmlSanitize = options?.htmlSanitize ?? this.config.htmlSanitize;
    const result = htmlSanitize
      ? htmlSanitize(html)
      : (await getDeps()).DOMPurify.sanitize(html);

    html = result instanceof Promise ? await result : result;

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    await this._typeNode(parent, doc.body, signal, options);
  }

  async _typeNode(parent, node, signal, options) {
    const children = Array.from(node.childNodes);

    for (let child of children) {
      if (signal.aborted || !this._parentStillExists(parent)) break;

      if (
        child.nodeType === Node.TEXT_NODE &&
        child.textContent.trim().length > 0
      ) {
        await this._typeText(child.textContent, parent, signal, options);
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        const el = document.createElement(child.tagName);

        for (let attr of child.attributes) {
          try {
            el.setAttribute(attr.name, attr.value);
          } catch (e) {
            console.warn("TypeMorph: Failed to set attribute", attr.name, e);
          }
        }

        parent.appendChild(el);
        await this._typeNode(el, child, signal);
      }
    }
  }

  async _typeText(text, parent, signal, options) {
    if (!text || signal.aborted || !this._parentStillExists(parent)) return;

    if (this._cursorEl) {
      if (this._cursorEl.parentNode) {
        this._cursorEl.remove();
      }
      parent.appendChild(this._cursorEl);
    }

    const chars = Array.from(text);
    let buffer = "";
    let scrollCounter = 0;

    const speed = options?.speed ?? this.speed;
    const autoScroll = options?.autoScroll ?? this.config.autoScroll;
    const scrollInterval = options?.scrollInterval ?? this.scrollInterval;
    const chunkSize = options?.chunkSize ?? this.chunkSize;

    for (let i = 0; i < chars.length; i++) {
      if (signal.aborted || !this._parentStillExists(parent)) break;

      buffer += chars[i];

      const append = buffer.length >= chunkSize || i === chars.length - 1;
      if (append) {
        this._appendTextToParent(parent, buffer);
        buffer = "";
        scrollCounter++;
        if (autoScroll && scrollCounter >= scrollInterval) {
          parent.scrollIntoView({ behavior: "smooth", block: "end" });
          scrollCounter = 0;
        }
      }

      if (this._parentStillExists(parent) && append)
        await this._delay(speed, signal);
    }

    if (autoScroll) {
      parent.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }

  _appendTextToParent(parent, text) {
    if (!this._parentStillExists(parent)) return;

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

  async _onFinish(options) {
    this._clearCursorIfNeeded(options);
    await safeCallback(options?.onFinish ?? this.config.onFinish, this);
  }

  _clearContent(parent) {
    parent.innerHTML = "";
    if (this._cursorEl) parent.appendChild(this._cursorEl);
  }

  _clearCursorIfNeeded(options = {}) {
    if (
      options?.hideCursorOnFinishTyping ??
      this.config.hideCursorOnFinishTyping
    ) {
      this._removeCursor();
    }
  }

  _removeCursor() {
    if (this._cursorEl) {
      this._cursorEl.remove();
      this._cursorEl = null;
    }
  }

  async _backspaceContent(parent, node, signal) {
    if (signal.aborted || !this._parentStillExists(parent)) return;

    const children = Array.from(node.childNodes);

    for (let i = children.length - 1; i >= 0; i--) {
      const child = children[i];
      if (signal.aborted || !this._parentStillExists(parent)) return;

      if (this._cursorEl && child === this._cursorEl) {
        continue;
      }

      if (child.nodeType === Node.TEXT_NODE) {
        await this._backspaceTextNode(child, parent, signal);
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        await this._backspaceContent(parent, child, signal);

        if (!signal.aborted) {
          child.parentNode.removeChild(child);
          if (this._cursorEl) {
            this._appendCursorToLastTextNode(parent);
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
    const childNodes = Array.from(element.childNodes);

    for (let i = childNodes.length - 1; i >= 0; i--) {
      const child = childNodes[i];
      if (child == this._cursorEl) continue;
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

  async _backspaceTextNode(node, parent, signal, options) {
    const chars = Array.from(node.textContent);
    let scrollCounter = 0;

    const chunkSize = options?.chunkSize ?? this.config.chunkSize;
    const autoScroll = options?.autoScroll ?? this.config.autoScroll;

    for (let i = chars.length - 1; i >= 0; i -= chunkSize) {
      if (signal.aborted || !this._parentStillExists(parent)) break;

      const chunkStart = Math.max(0, i - chunkSize + 1);
      const charsToKeep = chars.slice(0, chunkStart);
      const scrollInterval = options?.scrollInterval ?? this.scrollInterval;
      const backspaceSpeed = options?.backspaceSpeed ?? this.backspaceSpeed;

      node.textContent = charsToKeep.join("");

      scrollCounter++;
      if (autoScroll && scrollCounter >= scrollInterval) {
        if (node.parentNode) {
          node.parentNode.scrollIntoView({ behavior: "smooth", block: "end" });
        }
        scrollCounter = 0;
      }

      if (this._parentStillExists(parent))
        await this._delay(backspaceSpeed, signal);
    }

    if (
      this._parentStillExists(parent) &&
      node.parentNode &&
      !node.textContent
    ) {
      node.parentNode.removeChild(node);
    }

    if (autoScroll && this._parentStillExists(parent) && node.parentNode) {
      node.parentNode.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }

  _resolveParent(parent = null) {
    return this._validateParent(parent ?? this.parent);
  }

  _setParent(parent) {
    this.parent = this._validateParent(parent);
  }

  _validateParent(parent) {
    const parentEl = this._getParent(parent);
    const isHtmlElement = parentEl instanceof Element;

    if (!parentEl || !isHtmlElement) {
      if (typeof parent === "string") {
        throw new Error(
          `TypeMorph: Parent element not found for selector #${parent}`
        );
      } else {
        throw new Error(
          `TypeMorph: Parent element is not a valid HTML element or element ID`
        );
      }
    }

    return parentEl;
  }

  _getParent(parent) {
    return typeof parent === "string"
      ? document.getElementById(parent)
      : parent;
  }

  _resolveText(text = null) {
    return this._validateText(text ?? this.text);
  }

  _setText(text) {
    this.text = this._validateText(text);
  }

  _validateText(text) {
    if (text == null) {
      throw new Error("[TypeMorph] Please provide a valid text");
    }

    if (typeof text !== "string") {
      console.warn(
        `[TypeMorph] Non-string input (${typeof text}) auto-converted to string.`
      );
      text = String(text);
    }

    return text;
  }

  _currentlyLooping(parent) {
    return this._isTyping && this._parentStillExists(parent);
  }

  _checkLifetime() {
    if (this._destroyed) {
      throw new Error("TypeMorph: Cannot call method on destroyed instance");
    }
  }

  async _delay(ms, signal) {
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
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

  async _startOperation(operation) {
    if (this._abortController) {
      this._abortController.abort();
    }

    const controller = new AbortController();
    this._abortController = controller;

    this._operationQueue = (async () => {
      try {
        await operation(controller.signal);
      } catch (err) {
        if (err.name !== "AbortError") throw err;
      } finally {
        if (this._abortController === controller) {
          this._abortController = null;
        }
      }
    })();

    return this._operationQueue;
  }

  async _cancelCurrentOperation(options = {}) {
    if (this._abortController) {
      this._abortController.abort();
    }

    if (this._operationQueue) {
      try {
        await this._operationQueue;
      } catch {}
    }

    this._isTyping = false;
    this._clearCursorIfNeeded(options);
  }

  _parentStillExists(parent) {
    return parent && parent.isConnected;
  }

  _validateOptions(options) {
    if (!options) return;

    if (
      (options.chunkSize != null && typeof options.chunkSize != "number") ||
      options.chunkSize < 1
    )
      throw new Error("TypeMorph: chunkSize has to be a number > 0");

    if (
      (options.loopCount != null && typeof options.loopCount != "number") ||
      options.loopCount < 0
    )
      throw new Error("TypeMorph: loopCount has to be a number >= 0");

    if (
      (options.speed != null && typeof options.speed != "number") ||
      options.speed < 0
    )
      throw new Error("TypeMorph: speed has to be a number >= 0");

    if (
      (options.backspaceSpeed != null &&
        typeof options.backspaceSpeed != "number") ||
      options.backspaceSpeed < 0
    )
      throw new Error("TypeMorph: backspaceSpeed has to be a number >= 0");
  }

  _readOptions(_parent, _options) {
    if (_parent && typeof _parent === "object" && !("nodeType" in _parent)) {
      _options = _parent;
      _parent = null;
    }
    return { _parent, _options };
  }
}

let loadedDeps = null;
async function getDeps() {
  if (loadedDeps) return loadedDeps;

  try {
    const markedLib = await import('marked');
    const DOMPurify = (await import('dompurify')).default;

    loadedDeps = { marked: markedLib.marked, DOMPurify };
    return loadedDeps;
  } catch (error) {
    console.error(
      "Failed to load dependencies, you may be using the Core version of the library. In that case, eithter turn off markdown and html parsing or provide your own parser and sanitizer"
    );
    throw error;
  }
}

export { TypeMorph as default };
//# sourceMappingURL=typemorph.esm.js.map
