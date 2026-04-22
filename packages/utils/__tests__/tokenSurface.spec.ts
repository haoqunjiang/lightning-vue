import { vi } from "vitest";
import type { TokenOrValue } from "lightningcss";
import {
  decodeCssEscape,
  parseSelectorListFromTokens,
  stringifySelector,
  stringifyTokens,
} from "../src/selectors";
import { StringSelectorParser } from "../src/selectors/stringParser";
import { TokenSelectorParser } from "../src/selectors/tokenParser";

function stringifySelectorList(
  selectorList: ReturnType<typeof parseSelectorListFromTokens>,
): string {
  return selectorList.map((selector) => stringifySelector(selector)).join(", ");
}

describe("token-facing selector utilities", () => {
  test("parseSelectorListFromTokens handles namespaces, attribute modifiers, combinators, and pseudo containers", () => {
    const tokens: TokenOrValue[] = [
      { type: "token", value: { type: "ident", value: "svg" } },
      { type: "token", value: { type: "delim", value: "|" } },
      { type: "token", value: { type: "ident", value: "a" } },
      { type: "token", value: { type: "square-bracket-block" } },
      { type: "token", value: { type: "ident", value: "href" } },
      { type: "token", value: { type: "suffix-match" } },
      { type: "token", value: { type: "string", value: ".svg" } },
      { type: "token", value: { type: "white-space", value: " " } },
      { type: "token", value: { type: "ident", value: "i" } },
      { type: "token", value: { type: "close-square-bracket" } },
      { type: "token", value: { type: "white-space", value: " " } },
      { type: "token", value: { type: "delim", value: "+" } },
      { type: "token", value: { type: "white-space", value: " " } },
      { type: "token", value: { type: "colon" } },
      { type: "token", value: { type: "function", value: "where" } },
      { type: "token", value: { type: "delim", value: "." } },
      { type: "token", value: { type: "ident", value: "icon" } },
      { type: "token", value: { type: "comma" } },
      { type: "token", value: { type: "white-space", value: " " } },
      { type: "token", value: { type: "delim", value: "." } },
      { type: "token", value: { type: "ident", value: "label" } },
      { type: "token", value: { type: "close-parenthesis" } },
    ];

    expect(stringifySelectorList(parseSelectorListFromTokens(tokens))).toBe(
      'svg|a[href$=".svg" i] + :where(.icon, .label)',
    );
  });

  test("parseSelectorListFromTokens falls back to the string parser when direct token parsing rejects the input", () => {
    const tokens: TokenOrValue[] = [
      { type: "token", value: { type: "colon" } },
      {
        type: "function",
        value: {
          name: "is",
          arguments: [
            { type: "token", value: { type: "delim", value: "." } },
            { type: "token", value: { type: "ident", value: "foo" } },
          ],
        },
      },
    ];

    const tokenParserSpy = vi
      .spyOn(TokenSelectorParser.prototype, "parseSelectorList")
      .mockImplementation(() => {
        throw new Error("forced token parser failure");
      });
    const stringParserSpy = vi.spyOn(StringSelectorParser.prototype, "parseSelectorList");

    try {
      expect(stringifyTokens(tokens)).toBe(":is(.foo)");
      expect(stringifySelectorList(parseSelectorListFromTokens(tokens))).toBe(":is(.foo)");
      expect(tokenParserSpy).toHaveBeenCalledTimes(1);
      expect(stringParserSpy).toHaveBeenCalled();
    } finally {
      tokenParserSpy.mockRestore();
      stringParserSpy.mockRestore();
    }
  });

  test("stringifyTokens covers parsed value variants and raw token boundaries", () => {
    const tokens: TokenOrValue[] = [
      { type: "token", value: { type: "ident", value: "foo" } },
      { type: "token", value: { type: "white-space", value: " " } },
      {
        type: "function",
        value: {
          name: "calc",
          arguments: [{ type: "length", value: { value: 1, unit: "px" } }],
        },
      },
      { type: "token", value: { type: "white-space", value: " " } },
      {
        type: "var",
        value: {
          name: { ident: "--gap" },
          fallback: [{ type: "token", value: { type: "number", value: 2 } }],
        },
      },
      { type: "token", value: { type: "white-space", value: " " } },
      {
        type: "env",
        value: {
          name: { type: "ua", value: "safe-area-inset-top" },
        },
      },
      { type: "token", value: { type: "white-space", value: " " } },
      {
        type: "env",
        value: {
          name: { type: "custom", ident: "--safe-area" },
        },
      },
      { type: "token", value: { type: "white-space", value: " " } },
      {
        type: "url",
        value: {
          loc: { line: 1, column: 1 },
          url: "/icon.svg",
        },
      },
      { type: "token", value: { type: "white-space", value: " " } },
      { type: "dashed-ident", value: "--brand" },
      { type: "token", value: { type: "white-space", value: " " } },
      { type: "animation-name", value: { type: "string", value: "spin" } },
      { type: "token", value: { type: "white-space", value: " " } },
      { type: "animation-name", value: { type: "ident", value: "fade" } },
      { type: "token", value: { type: "white-space", value: " " } },
      { type: "animation-name", value: { type: "none" } },
      { type: "token", value: { type: "white-space", value: " " } },
      { type: "length", value: { value: 12, unit: "px" } },
      { type: "token", value: { type: "white-space", value: " " } },
      { type: "angle", value: { value: 90, type: "deg" } },
      { type: "token", value: { type: "white-space", value: " " } },
      { type: "time", value: { value: 250, type: "milliseconds" } },
      { type: "token", value: { type: "white-space", value: " " } },
      { type: "resolution", value: { value: 2, type: "dppx" } },
      { type: "token", value: { type: "white-space", value: " " } },
      { type: "token", value: { type: "cdo" } },
      { type: "token", value: { type: "white-space", value: " " } },
      { type: "token", value: { type: "cdc" } },
    ];

    expect(stringifyTokens(tokens)).toBe(
      'foo calc(1px) var(--gap,2) env(safe-area-inset-top) env(--safe-area) url(/icon.svg) --brand "spin" fade none 12px 90deg 250ms 2dppx <!-- -->',
    );
  });

  test("decodeCssEscape handles hex escapes, escaped newlines, and invalid code points", () => {
    expect(decodeCssEscape("\\31 foo", 0)).toEqual({ end: 4, value: "1" });
    expect(decodeCssEscape("\\000026 ", 0)).toEqual({ end: 8, value: "&" });
    expect(decodeCssEscape("\\\n", 0)).toEqual({ end: 2, value: "" });
    expect(decodeCssEscape("\\110000 ", 0)).toEqual({ end: 8, value: "\uFFFD" });
  });
});
