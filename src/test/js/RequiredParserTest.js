import { equal, throws } from "node:assert";
import { test } from "node:test";
import { fromParser } from "../../main/js/doc.js";

const XML = '<tt xmlns="http://www.w3.org/ns/ttml" xml:lang="en"><body><div><p>hello</p></div></body></tt>';

test("fromParser requires a parser", () => {

  let fatal_msg = null;

  const errorHandler = {
    info: function () { },
    warn: function () { },
    error: function () { },
    fatal: function (msg) { fatal_msg = msg; },
  };

  throws(() => fromParser(XML, errorHandler));

  equal(fatal_msg, "No parser provided");

});
