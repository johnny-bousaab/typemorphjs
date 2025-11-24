# TypeMorph

<!-- [![Tests](https://github.com/johnny-bousaab/typemorphjs/actions/workflows/ci.yml/badge.svg)](https://github.com/johnny-bousaab/typemorphjs/actions) -->
<!-- [![Coverage](https://codecov.io/gh/johnny-bousaab/typemorphjs/branch/main/graph/badge.svg)](https://codecov.io/gh/johnny-bousaab/typemorphjs) -->
<!-- [![npm version](https://badge.fury.io/js/typemorph.svg)](https://www.npmjs.com/package/typemorph) -->

**TypeMorph** is a lightweight JavaScript library for creating smooth, realistic typing effects. Supports features such as looping, backspacing, HTML, markdown, autoscrolling, and animated cursor.
Perfect for hero sections, documentation intros, LLM chat animation, or anywhere you want animated text.

## 🚀 Features

- **Typing engine**: character typing with customizable speed and chunking
- **Looping modes**: clear or backspace styles
- **Backspace control**: define speed, delay, and behavior
- **Markdown support**: render markdown with [Marked](https://github.com/markedjs/marked)
- **HTML support**: HTML is sanitized with [DOMPurify](https://github.com/cure53/DOMPurify)
- **Configurable cursor**: built in and customizable blink animation
- **Async API**: control typing flow with `type()`, `loop()`, `stop()`, and `destroy()`
- **Framework agnostic**: works in plain JS, React, Vue, or anywhere with a DOM

## 📦 Installation

### Using npm

```javascript
npm install typemorphjs
```

Then import it:

```javascript
import TypeMorph from "typemorphjs";
```

### Using a CDN

```html
<script src="https://cdn.jsdelivr.net/npm/typemorphjs/dist/typemorph.umd.min.js"></script>
<script>
  const typer = new TypeMorph({ parent: document.getElementById("target") });
  typer.type("Hello, world!");
</script>
```

### Core version

The core version of the library has 0 dependencies and is smaller in size, if you either provide your own HTML/MD sanitizer/parser or simply disable these features, you can use the core only for a lighter version of the library:

```html
<script src="https://cdn.jsdelivr.net/npm/typemorphjs/dist/typemorph.core.umd.min.js"></script>
```

## ⚡ Quick Start

### Type

```html
<div id="target"></div>

<script>
  const typer = new TypeMorph({
    parent: document.getElementById("target"),
    speed: 50,
  });

  typer.type("Hello from TypeMorph!");
</script>
```

### Loop

```javascript
const typer = new TypeMorph({
  parent: document.getElementById("target"),
  speed: 50,
  loopType: "backspace",
  loopCount: 5,
});

typer.loop("This text will loop and backspace 5 times!");
```

### HTML

```javascript
const typer = new TypeMorph({
  parent: document.getElementById("target"),
  parseHtml: true,
});

typer.type('<h1>Hello <span style="color: red">there!</span></h1>');
```

### Makrdown

```javascript
const typer = new TypeMorph({
  parent: document.getElementById("target"),
  parseMarkdown: true,
});

typer.type("**This is real fun**");
```

### Execution Flow

```javascript
const typer = new TypeMorph({
  parent: document.getElementById("target"),
  loopCount: 1,
  loopType: "backspace",
  loopFinalBehavior: "remove",
  loopEndDelay: 500,
});

await typer.loop("**This is real fun**");
await typer.loop("**I want more**", { loopFinalBehavior: "keep" });
```

The blinking cursor is automatically injected as a \<style\> element.
If you want to customize the cursor style, you can use the below CSS class:

```css
.typemorph-cursor {
  color: red;
  animation-duration: 0.8s;
}
```

## ⚙️ Configuration Options

| Option                     | Type                     | Default       | Description                                                                                                                                              |
| -------------------------- | ------------------------ | ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `text`                     | `string \| null`         | `null`        | Optional initial text for this instance.                                                                                                                 |
| `parent`                   | `HTMLElement \| string`  | `null`        | The target element or its id where the text will appear.                                                                                                 |
| `speed`                    | `number`                 | `50`          | Delay in milliseconds per character (or chunk).                                                                                                          |
| `chunkSize`                | `number`                 | `1`           | Number of characters typed in one iteration.                                                                                                             |
| `loopCount`                | `number`                 | `Infinity`    | Number of loops before stopping.                                                                                                                         |
| `loopType`                 | `"clear" \| "backspace"` | `"backspace"` | Defines how text is removed between loops, cleared instantly or backspaced.                                                                              |
| `loopFinalBehavior`        | `"keep" \| "remove"`     | `"keep"`      | Defines behavior at the final loop. `"keep"` just keeps the text at the end, `"remove"` deletes it (respecting `"loopType"`).                            |
| `loopStartDelay`           | `number`                 | `300`         | Delay before restarting the typing after clearing/backspacing.                                                                                           |
| `loopEndDelay`             | `number`                 | `800`         | Delay after typing finishes, before starting backspacing/clearing.                                                                                       |
| `backspaceSpeed`           | `number`                 | `50`          | Delay in milliseconds per character when backspacing.                                                                                                    |
| `showCursor`               | `boolean`                | `true`        | Shows a blinking cursor (`\|`) at the end of the text.                                                                                                   |
| `cursorChar`               | `string`                 | `\|`          | The character used for the cursor.                                                                                                                       |
| `parseMarkdown`            | `boolean`                | `false`       | If true, parses markdown syntax into HTML (implies `parseHtml = true`).                                                                                  |
| `markdownInline`           | `boolean`                | `false`       | Parses markdown inline, avoiding unwanted block wrappers for short text.                                                                                 |
| `parseHtml`                | `boolean`                | `true`        | Whether to interpret HTML in the text. If you are using parseMarkdown with this, it's recommended you set markdownInline to true to avoid layout issues. |
| `markdownParse`            | `function \| null`       | `null`        | Custom markdown parser => `(text, inline) => html`.                                                                                                      |
| `hideCursorOnFinishTyping` | `boolean`                | `true`        | Automatically hides the cursor when typing completes (if not looping).                                                                                   |
| `autoScroll`               | `boolean`                | `true`        | Automatically scrolls the parent element to end while typing, Unless user scrolls manually                                                               |
| `scrollInterval`           | `number`                 | `1`           | Number of chunks typed before auto-scroll triggers.                                                                                                      |
| `clearBeforeTyping`        | `boolean`                | `true`        | If true, clears the parent’s text before typing new text.                                                                                                |
| `htmlSanitize`             | `function \| null`       | `null`        | Custom HTML sanitizer => `(html) => safeHtml`.                                                                                                           |
| `onStop`                   | `function(instance)`     | `() => {}`    | Called when a typing operation is stopped manually via `.stop()`.                                                                                        |
| `onFinish`                 | `function(instance)`     | `() => {}`    | Called when typing completes naturally (no loop or final loop iteration).                                                                                |
| `onDestroy`                | `function(instance)`     | `() => {}`    | Called when the instance is destroyed and all resources are cleaned up.                                                                                  |

---

## 🧩 API Methods

| Method                                                        | Returns         | Description                                                               |
| ------------------------------------------------------------- | --------------- | ------------------------------------------------------------------------- |
| **`type(text: string, parent?: HTMLElement, options = {})`**  | `Promise<void>` | Types the provided text into the target element once.                     |
| **`loop(text?: string, parent?: HTMLElement, options = {})`** | `Promise<void>` | Starts looping typing animation using the configured `loopType`.          |
| **`stop()`**                                                  | `Promise<void>` | Gracefully stops any ongoing typing or looping operation.                 |
| **`destroy()`**                                               | `void`          | Stops all operations, removes timers, event listeners, and the cursor.    |
| **`isTyping()`**                                              | `boolean`       | Returns whether the instance is currently typing, looping or backspacing. |
| **`getCurrentLoop()`**                                        | `number`        | Returns the current loop iteration index. Useful for monitoring progress. |

---

## 🔔 Event Callbacks

Each event callback receives the **`TypeMorph` instance** as its first argument

| Callback              | Trigger                                                      | Example                                                |
| --------------------- | ------------------------------------------------------------ | ------------------------------------------------------ |
| `onStop(instance)`    | When typing or looping is stopped manually via `.stop()`     | `onStop: (t) => console.log("Stopped:", t.isTyping())` |
| `onFinish(instance)`  | When typing completes naturally (no further loops)           | `onFinish: (t) => console.log("Done typing!")`         |
| `onDestroy(instance)` | When `.destroy()` is called and instance cleanup is executed | `onDestroy: () => console.log("TypeMorph destroyed")`  |

---

## 🧱 Example Configuration

```js
const typer = new TypeMorph({
  parent: document.querySelector("#target"),
  speed: 60,
  backspaceSpeed: 40,
  chunkSize: 3,
  loopCount: 3,
  loopType: "backspace",
  parseMarkdown: true,
  autoScroll: false,
  onFinish: (t) => console.log("Typing finished"),
});

typer.loop("**Bold** _italic_ text with `code`");
```

## Custom per-run Options

Functions that take options will override initial configs (that can be overriden) for this current run only. For example, you can do something like this:

```javascript
const typer = new TypeMorph({
  parent: document.querySelector("#target"),
  speed: 300,
});

await typer.type("Slow text");
await typer.type("Fast text", { speed: 30 });
```

## 🧰 Development

### Install deps

```bash
npm install
```

### Run tests

```bash
npm test
```

### Run tests + coverage data

```bash
npm run test:coverage
```

### Build dist/

```bash
npm run build
```

## ⭐ Show some love

If you find TypeMorph useful, consider starring the repo, it helps others discover it!
