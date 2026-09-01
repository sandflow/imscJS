import { equal, ok } from "node:assert";
import { test } from "node:test";
import { getIMSC1Document } from "./utils/getIMSC1Document.js";

test("Metadata Callbacks", async () => {

  let count = 0;
  let cur_tag = 0;
  let accumul_txt = "";

  const mh = {
    onOpenTag: function (ns, name, attrs) {

      switch (count) {
        case 0:
          equal(name, "title");
          equal(ns, "http://www.w3.org/ns/ttml#metadata");
          cur_tag = 1;
          break;
        case 3:
          equal(name, "conformsToStandard");
          equal(ns, "urn:ebu:metadata");
          cur_tag = 2;
          break;
        case 4:
          equal(name, "image");
          equal(ns, "http://www.smpte-ra.org/schemas/2052-1/2010/smpte-tt");
          equal(attrs["http://www.w3.org/XML/1998/namespace id"].value, "img_1");
          equal(attrs[" imagetype"].value, "PNG");
          cur_tag = 3;
          break;
      }

      count++;

    },

    onCloseTag: function () {

      switch (cur_tag) {
        case 4: {
          const trimmed_text = accumul_txt.trim();
          ok(trimmed_text.startswith("iVBORw0KGgoAAAANS"));
          equal(trimmed_text.length, 4146);
        }
      }

      cur_tag = 0;
      accumul_txt = "";
    },

    onText: function (contents) {
      switch (cur_tag) {
        case 1:
          equal(contents, "Metadata Handler Test");
          break;
        case 2:
          equal(contents, "http://www.w3.org/ns/ttml/profile/imsc1/text");
          break;
        case 4:
          accumul_txt = accumul_txt + contents;
      }
    },
  };

  await getIMSC1Document("./src/test/resources/unit-tests/metadataHandler.ttml", mh);
});
