export const defaultConfigs = {
  text: null,
  parent: null, // HTML element or string
  speed: 50, // ms per character
  chunkSize: 1,
  loop: false,
  loopCount: Infinity,
  loopType: "clear", // "clear" or "backspace"
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
