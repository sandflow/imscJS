import { deepEqual } from "node:assert";
import { test } from "node:test";
import { getIMSC1Document } from "./utils/getIMSC1Document.js";

test("Font Family Parsing", async () => {
  const doc = await getIMSC1Document("./src/test/resources/unit-tests/fontFamily.ttml");

  deepEqual(
    doc.body.contents[0].contents[0].styleAttrs["http://www.w3.org/ns/ttml#styling fontFamily"],
    ["monospaceSerif"],
    "Maps 'default' generic family name to 'monospaceSerif' correctly.",
  );

  deepEqual(
    doc.body.contents[0].contents[1].styleAttrs["http://www.w3.org/ns/ttml#styling fontFamily"],
    ["Arial", "monospaceSerif"],
    "Maps 'default' value used as a fallback to 'monospaceSerif' correctly.",
  );

  deepEqual(
    doc.body.contents[0].contents[2].styleAttrs["http://www.w3.org/ns/ttml#styling fontFamily"],
    ["Arial", "monospaceSerif"],
    "Maps 'default' value used as a fallback with spacing characters to 'monospaceSerif' correctly.",
  );

  deepEqual(
    doc.body.contents[0].contents[3].styleAttrs["http://www.w3.org/ns/ttml#styling fontFamily"],
    ["'My Test Font'", "monospaceSerif"],
    "Fonts names wrapped in '' are preserved.",
  );

  deepEqual(
    doc.body.contents[0].contents[4].styleAttrs["http://www.w3.org/ns/ttml#styling fontFamily"],
    ['"My Test Font"', "monospaceSerif"],
    'Fonts names wrapped in "" are preserved.',
  );
});
