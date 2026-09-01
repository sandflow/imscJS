import { equal } from "node:assert";
import { test } from "node:test";
import { generateISD } from "../../main/js/isd.js";
import { getIMSC1Document } from "./utils/getIMSC1Document.js";

const FONT_WEIGHT_QNAME = "http://www.w3.org/ns/ttml#styling fontWeight";
const TEXT_ALIGN_QNAME = "http://www.w3.org/ns/ttml#styling textAlign";

test("Multiple styles specified on set", async () => {
  const doc = await getIMSC1Document("./src/test/resources/unit-tests/setMultipleStyles.ttml");

  const set = doc.body.contents[0].contents[0].sets[0];

  equal(set.styles[FONT_WEIGHT_QNAME], "bold");
  equal(set.styles[TEXT_ALIGN_QNAME], "end");

  /* before the set is active */

  const before = generateISD(doc, 0.5);
  const pBefore = before.contents[0].contents[0].contents[0].contents[0];

  equal(pBefore.styleAttrs[FONT_WEIGHT_QNAME], "normal");
  equal(pBefore.styleAttrs[TEXT_ALIGN_QNAME], "start");

  /* while the set is active */

  const during = generateISD(doc, 3);
  const pDuring = during.contents[0].contents[0].contents[0].contents[0];

  equal(pDuring.styleAttrs[FONT_WEIGHT_QNAME], "bold");
  equal(pDuring.styleAttrs[TEXT_ALIGN_QNAME], "end");

  /* after the set is no longer active */

  const after = generateISD(doc, 7);
  const pAfter = after.contents[0].contents[0].contents[0].contents[0];

  equal(pAfter.styleAttrs[FONT_WEIGHT_QNAME], "normal");
  equal(pAfter.styleAttrs[TEXT_ALIGN_QNAME], "start");
});
