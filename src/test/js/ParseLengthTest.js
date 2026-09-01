import { deepEqual } from "node:assert";
import { test } from "node:test";
import { getIMSC1Document } from "./utils/getIMSC1Document.js";

test("Parse Length Expressions", async () => {
  const doc = await getIMSC1Document("./src/test/resources/unit-tests/lengthExpressions.ttml");

  deepEqual(
    doc.body.contents[0].contents[0].styleAttrs["http://www.w3.org/ns/ttml#styling fontSize"],
    { "unit": "%", "value": 10.5 },
  );

  deepEqual(
    doc.body.contents[0].contents[1].styleAttrs["http://www.w3.org/ns/ttml#styling fontSize"],
    { "unit": "em", "value": 0.105 },
  );

  deepEqual(
    doc.body.contents[0].contents[2].styleAttrs["http://www.w3.org/ns/ttml#styling fontSize"],
    { "unit": "px", "value": 10.5 },
  );

  deepEqual(
    doc.body.contents[0].contents[3].styleAttrs["http://www.w3.org/ns/ttml#styling fontSize"],
    { "unit": "c", "value": 0.105 },
  );

});
