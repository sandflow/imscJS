import { equal } from "node:assert";
import { test } from "node:test";
import { generateISD } from "../../main/js/isd.js";
import { getIMSC1Document } from "./utils/getIMSC1Document.js";

const FONT_VARIANT_QNAME = "http://www.w3.org/ns/ttml#styling fontVariant";

test("tts:fontVariant", async () => {
  const doc = await getIMSC1Document("./src/test/resources/unit-tests/fontVariant.ttml");

  const isd = generateISD(doc, 1);
  const p = isd.contents[0].contents[0].contents[0].contents[0];

  /* not applicable to p */

  equal(FONT_VARIANT_QNAME in p.styleAttrs, false);

  /* initial value */

  equal(p.contents[0].styleAttrs[FONT_VARIANT_QNAME], "normal");
  equal(p.contents[2].styleAttrs[FONT_VARIANT_QNAME], "normal");

  /* explicit super, inherited by nested span */

  const sup = p.contents[1];

  equal(sup.styleAttrs[FONT_VARIANT_QNAME], "super");
  equal(sup.contents[0].styleAttrs[FONT_VARIANT_QNAME], "super");
  equal(sup.contents[1].styleAttrs[FONT_VARIANT_QNAME], "super");

  /* explicit sub */

  equal(p.contents[3].styleAttrs[FONT_VARIANT_QNAME], "sub");

  /* inherited through p, even though not applicable to p */

  const p2 = isd.contents[0].contents[0].contents[0].contents[1];

  equal(FONT_VARIANT_QNAME in p2.styleAttrs, false);
  equal(p2.contents[0].styleAttrs[FONT_VARIANT_QNAME], "sub");
  equal(p2.contents[1].styleAttrs[FONT_VARIANT_QNAME], "normal");
});

test("tts:fontVariant (imsc-tests fontVariant001)", async () => {
  const doc = await getIMSC1Document("./src/test/resources/imsc-tests/imsc1_3/ttml/fontVariant/fontVariant001.ttml");

  const isd = generateISD(doc, 0);
  const div = isd.contents[0].contents[0].contents[0];

  const expected = [
    ["normal", "super", "normal", "super", "normal"],
    ["normal", "sub", "normal", "sub", "normal"],
  ];

  for (let i = 0; i < expected.length; i++) {
    const spans = div.contents[i].contents;

    equal(spans.length, expected[i].length);

    for (let j = 0; j < expected[i].length; j++) {
      equal(spans[j].styleAttrs[FONT_VARIANT_QNAME], expected[i][j]);
    }
  }
});
