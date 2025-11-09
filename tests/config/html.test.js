import { expect, jest } from "@jest/globals";
import { TypeMorph } from "../../src/typemorph.js";

describe("TypeMorph - HTML", () => {
  let parent;
  let typer;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(global, "setTimeout");
    document.body.innerHTML = '<div id="target"></div>';
    parent = document.getElementById("target");
  });

  afterEach(() => {
    if (typer && !typer.isDestroyed()) {
      typer.destroy();
    }
    jest.useRealTimers();
  });

  test("should render HTML when parseHtml=true", async () => {
    typer = new TypeMorph({
      parent,
      parseHtml: true,
      showCursor: false,
    });

    const text = "<b>Bold</b> and <i>Italic</i>";
    typer.type(text);

    await jest.runAllTimersAsync();

    expect(parent.innerHTML).toBe(text);
    expect(parent.textContent).toBe("Bold and Italic");
  });

  test("should escape HTML when parseHtml=false", async () => {
    typer = new TypeMorph({
      parent,
      parseMarkdown: false,
      parseHtml: false,
      showCursor: false,
    });

    const text = "<b>Bold</b>";
    typer.type(text);
    await jest.runAllTimersAsync();

    expect(parent.innerHTML).toContain("&lt;b&gt;Bold&lt;/b&gt;");
    expect(parent.textContent).toBe(text);
  });

  test("should sanitize disallowed tags when parseHtml=true", async () => {
    typer = new TypeMorph({
      parent,
      parseHtml: true,
      showCursor: false,
    });

    const text = "<script>alert('xss')</script><b>Safe</b>";
    typer.type(text);
    await jest.runAllTimersAsync();

    expect(parent.innerHTML).not.toContain("<script>");
    expect(parent.innerHTML).toContain("<b>Safe</b>");
  });

  test("should correctly render nested HTML", async () => {
    typer = new TypeMorph({
      parent,
      parseHtml: true,
      showCursor: false,
    });

    const text = "<div><p><strong>Nested</strong> tags</p></div>";
    typer.type(text);
    await jest.runAllTimersAsync();

    expect(parent.querySelector("div p strong").textContent).toBe("Nested");
  });

  test("should handle inline and block HTML together", async () => {
    typer = new TypeMorph({
      parent,
      parseHtml: true,
      showCursor: false,
    });

    const text = "<p>Hello <span>World</span></p>";
    typer.type(text);
    await jest.runAllTimersAsync();

    expect(parent.querySelector("p span").textContent).toBe("World");
    expect(parent.textContent).toBe("Hello World");
  });

  test("should handle broken HTML gracefully", async () => {
    typer = new TypeMorph({
      parent,
      parseHtml: true,
      showCursor: false,
    });

    const text = "<b>unclosed tag";
    typer.type(text);
    await jest.runAllTimersAsync();

    expect(parent.innerHTML).toContain("<b>unclosed tag</b>");
  });

  test("should use custom sanitizer if provided", async () => {
    const sanitizerMock = jest
      .fn()
      .mockImplementation((html) => html.replace(/<i>.*<\/i>/, ""));

    typer = new TypeMorph({
      parent,
      parseHtml: true,
      showCursor: false,
      htmlSanitize: sanitizerMock,
    });

    const text = "<b>Bold</b><i>RemoveMe</i>";
    typer.type(text);
    await jest.runAllTimersAsync();

    expect(sanitizerMock).toHaveBeenCalled();
    expect(parent.innerHTML).toContain("<b>Bold</b>");
    expect(parent.innerHTML).not.toContain("RemoveMe");
  });

  test("should use custom sanitizer when sanitize() returns a Promise", async () => {
    const sanitizerMock = jest
      .fn()
      .mockImplementation((html) =>
        Promise.resolve(html.replace(/<i>.*<\/i>/, ""))
      );

    typer = new TypeMorph({
      parent,
      parseHtml: true,
      showCursor: false,
      htmlSanitize: sanitizerMock,
    });

    const text = "<b>Bold</b><i>RemoveMe</i>";
    typer.type(text);
    await jest.runAllTimersAsync();

    expect(sanitizerMock).toHaveBeenCalled();
    expect(parent.innerHTML).toContain("<b>Bold</b>");
    expect(parent.innerHTML).not.toContain("RemoveMe");
  });

  test("should backspace correctly inside simple HTML", async () => {
    typer = new TypeMorph({
      parent,
      parseHtml: true,
      backspaceSpeed: 10,
      showCursor: false,
      loopCount: 2,
      loopType: "backspace",
    });

    const html = "<b>Hello</b>";
    typer.loop(html);
    await jest.runAllTimersAsync();

    expect(parent.innerHTML).toBe(html);
  });

  test("should maintain valid HTML while partially backspacing", async () => {
    const speed = 10;
    typer = new TypeMorph({
      parent,
      parseHtml: true,
      speed,
      backspaceSpeed: speed,
      showCursor: false,
      loopStartDelay: 0,
      loopEndDelay: 0,
      loopCount: 2,
      loopType: "backspace",
    });

    const html = "<b>Hello</b>";
    typer.loop(html);
    await jest.advanceTimersByTimeAsync(speed * html.length + speed);

    expect(parent.innerHTML).toBe("<b>Hell</b>");
    expect(() =>
      new DOMParser().parseFromString(parent.innerHTML, "text/html")
    ).not.toThrow();
  });
});
