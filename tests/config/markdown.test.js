import { expect, jest } from "@jest/globals";
import { TypeMorph } from "../../src/typemorph.js";

describe("TypeMorph - Markdown", () => {
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

  test("should parse markdown text into HTML when parseMarkdown is true", async () => {
    typer = new TypeMorph({
      parent,
      parseMarkdown: true,
      showCursor: false,
      speed: 5,
    });

    typer.type("**Bold** and *italic*");
    await jest.runAllTimersAsync();

    expect(parent.innerHTML).toMatch(/<strong>Bold<\/strong>/);
    expect(parent.innerHTML).toMatch(/<em>italic<\/em>/);
  });

  test("should NOT parse markdown when parseMarkdown is false", async () => {
    typer = new TypeMorph({
      parent,
      parseMarkdown: false,
      showCursor: false,
      speed: 5,
    });

    const text = "**Bold** and *italic*";
    typer.type(text);

    await jest.runAllTimersAsync();

    expect(parent.textContent).toBe(text);
  });

  test("should render markdown inline when markdownInline is true", async () => {
    typer = new TypeMorph({
      parent,
      parseMarkdown: true,
      markdownInline: true,
      showCursor: false,
      speed: 5,
    });

    const text = "Line 1\n\nLine 2"; // two newlines = paragraph break in normal mode
    typer.type(text);

    await jest.runAllTimersAsync();

    // Inline mode should not create <p> or <br> tags
    expect(parent.innerHTML).not.toMatch(/<p>|<br>/i);
    expect(parent.textContent.replace(/\s+/g, " ").trim()).toBe(
      "Line 1 Line 2"
    );
  });

  test("should render block markdown when markdownInline is false", async () => {
    typer = new TypeMorph({
      parent,
      parseMarkdown: true,
      markdownInline: false,
      showCursor: false,
      speed: 5,
    });

    const text = "Line 1\n\nLine 2";
    const promise = typer.type(text);

    await jest.runAllTimersAsync();
    await promise;

    expect(parent.innerHTML).toMatch(/<p>|<br>/i);
  });

  test("should use custom markdownParse function if provided", async () => {
    const customParser = jest.fn((input) => {
      return `<span class="custom">${input.toUpperCase()}</span>`;
    });

    const markdownInline = false;
    typer = new TypeMorph({
      parent,
      parseMarkdown: true,
      markdownInline,
      markdownParse: customParser,
      showCursor: false,
      speed: 5,
    });

    const text = "custom test";
    typer.type(text);

    await jest.runAllTimersAsync();

    expect(customParser).toHaveBeenCalledWith(text, markdownInline);
    expect(parent.innerHTML).toMatch(
      /<span class="custom">CUSTOM TEST<\/span>/
    );
  });

  test("should use custom markdownParse properly if parse() method returns a Promise", async () => {
    const customParser = jest.fn((input) => {
      return Promise.resolve(
        `<span class="custom">${input.toUpperCase()}</span>`
      );
    });

    const markdownInline = false;
    typer = new TypeMorph({
      parent,
      parseMarkdown: true,
      markdownInline,
      markdownParse: customParser,
      showCursor: false,
      speed: 5,
    });

    const text = "custom test";
    typer.type(text);

    await jest.runAllTimersAsync();

    expect(customParser).toHaveBeenCalledWith(text, markdownInline);
    expect(parent.innerHTML).toMatch(
      /<span class="custom">CUSTOM TEST<\/span>/
    );
  });

  test("should sanitize markdown output to prevent unsafe HTML", async () => {
    typer = new TypeMorph({
      parent,
      parseMarkdown: true,
      showCursor: false,
      speed: 5,
      markdownInline: true,
    });

    const text = "Click [link](javascript:alert('XSS'))";
    typer.type(text);

    await jest.runAllTimersAsync();

    expect(parent.innerHTML).not.toMatch(/javascript:/i);
    expect(parent.innerHTML).toMatch(/<a>link<\/a>/i);
  });
});
