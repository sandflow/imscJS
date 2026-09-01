
import { test } from "node:test";
import { close } from "./utils/close.js";
import { getIMSC1Document } from "./utils/getIMSC1Document.js";

test("Parse Time Expressions", async () => {
  const doc = await getIMSC1Document("./src/test/resources/unit-tests/timeExpressions.ttml");
  close(doc.body.contents[0].contents[0].begin, 1.2, 1e-10);
  close(doc.body.contents[0].contents[1].begin, 72, 1e-10);
  close(doc.body.contents[0].contents[2].begin, 4320, 1e-10);
  close(doc.body.contents[0].contents[3].begin, 24 / 24000 * 1001, 1e-10);
  close(doc.body.contents[0].contents[4].begin, 2, 1e-10);
  close(doc.body.contents[0].contents[5].begin, 3723, 1e-10);
  close(doc.body.contents[0].contents[6].begin, 3723.235, 1e-10);
  close(doc.body.contents[0].contents[7].begin, 3723.235, 1e-10);
  close(doc.body.contents[0].contents[8].begin, 3600 + 2 * 60 + 3 + 20 / 24000 * 1001, 1e-10);
  close(doc.body.contents[0].contents[9].begin, 360000.1, 1e-10);
  close(doc.body.contents[0].contents[10].begin, 360000 + 100 / 24000 * 1001, 1e-10);
});
