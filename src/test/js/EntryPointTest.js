import { equal, ok } from "node:assert";
import { test } from "node:test";

test("Entry point imports in node", async () => {

  /* the library is browser-only, but the unit tests run in node, so importing
     the entry point must not evaluate browser globals at module scope */

  const imsc = await import("../../main/js/main.js");

  equal(typeof imsc.fromXML, "function");
  equal(typeof imsc.createDOMParser, "function");
  equal(typeof imsc.renderHTML, "function");
  equal(typeof imsc.generateISD, "function");

  /* sax is a test-only dependency and must not be part of the public API */

  ok(!("createSAXParser" in imsc));

});
