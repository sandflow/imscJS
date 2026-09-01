import { equal, throws } from "node:assert";
import { test } from "node:test";
import { fromXML } from "../../main/js/doc.js";

test("fromXML requires a parser", () => {

  let fatal_msg = null;

  const errorHandler = {
    info: function () { },
    warn: function () { },
    error: function () { },
    fatal: function (msg) { fatal_msg = msg; },
  };

  throws(() => fromXML("<tt/>", errorHandler));

  equal(fatal_msg, "No parser provided");

});
