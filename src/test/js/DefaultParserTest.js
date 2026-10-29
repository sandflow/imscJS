import { equal, throws } from "node:assert";
import { test } from "node:test";

const originalWindow = globalThis.window;
const originalDocument = globalThis.document;

globalThis.window = { getComputedStyle: () => ({}) };
globalThis.document = { documentElement: {} };

const { fromXML } = await import("../../main/js/main.js");

globalThis.window = originalWindow;
globalThis.document = originalDocument;

const XML = '<tt xmlns="http://www.w3.org/ns/ttml" xml:lang="en" />';
const TEST_ERROR = new Error("default parser used");

function assertUsesDefaultParser(parse) {
  const originalDOMParser = globalThis.DOMParser;
  let parseCount = 0;

  globalThis.DOMParser = class {
    parseFromString() {
      parseCount++;
      throw TEST_ERROR;
    }
  };

  try {
    throws(parse, TEST_ERROR);
    equal(parseCount, 1);
  } finally {
    globalThis.DOMParser = originalDOMParser;
  }
}

test("fromXML uses the default parser when parser is omitted", () => {
  assertUsesDefaultParser(() => fromXML(XML, {}));
});

test("fromXML uses the default parser when parser is null", () => {
  assertUsesDefaultParser(() => fromXML(XML, {}, null, null));
});
