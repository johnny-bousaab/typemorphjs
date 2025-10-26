export const defaultConfigs = {
  text: "Hello from TypeMorphJS!",
  parent: null, // HTMLElement or string
  speed: 50, // ms per character
  loop: false,
  loopCount: Infinity,
  loopType: "clear", // "clear" or "backspace"
  loopStartDelay: 500, // ms to wait before typing again, after backspacing/clearing, in each loop
  loopEndDelay: 800, // ms to wait after typing, before backspacing/clearing, in each loop
  backspaceSpeed: 25, // speed per character when backspacing. Used when loopType is "backspace"
  showCursor: true,
  cursorChar: "|",
  parseMarkdown: false,
  markdownInline: false, // whether to parse markdown inline, can be helpful to avoid unwanted wrappers for simple text
  parseHTML: true,
  markdownParser: null,
  hideCursorOnFinishTyping: true,
  clearBeforeTyping: true, // is type() was used on same parent, whether to clear text content before typing again
  onStop: (instance) => {},
  onFinish: (instance) => {},
  onDestroy: (instance) => {},
};
