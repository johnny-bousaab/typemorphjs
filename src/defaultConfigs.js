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
  parseHTML: true,
  markdownParser: null,
  hideCursorOnFinishTyping: true,
  onStop: (instance) => {}, // on stop event
  onFinish: (instance) => {}, // on finish event (if stopped, this will not trigger)
};
