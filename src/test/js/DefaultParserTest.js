import { ok } from "node:assert";
import { test } from "node:test";
import { fromXML } from "../../main/js/mainNode.js";

const errorHandler = {
  info: function (msg) {
    throw msg;
  },
  warn: function (msg) {
    throw msg;
  },
  error: function (msg) {
    throw msg;
  },
  fatal: function (msg) {
    throw msg;
  },
};

const XML = '<tt xmlns="http://www.w3.org/ns/ttml" xml:lang="en"><body><div><p>hello</p></div></body></tt>';

test("Node entry point parses without an explicit parser", () => {

  /* regression: fromXML() must not default to the DOM parser in node,
     where the DOMParser global does not exist */

  const doc = fromXML(XML, errorHandler);

  ok(doc !== null);
  ok(Array.isArray(doc.getMediaTimeEvents()));

});
