import assert from "node:assert";
import fs from "node:fs";
import { test } from "node:test";
import puppeteer from "puppeteer";
import { IMSC_BUNDLE_PATH } from "../script/render-harness.mjs";

/*
 * The roll-up animation of renderHTML(): with enableRollUp, a region that is aligned after (a roll-up caption) is moved up
 * by one line and slides back into place when the last line of the previous ISD is the second to last line of the current one.
 */

const WIDTH = 640;
const HEIGHT = 360;

/* A roll-up caption whose lines are added one by one, and then an unrelated caption. The font is monospace and one row high
   unless sizes says otherwise (the default grid has 15 rows), the line height is a parameter. */
function rollUpDocument(lineHeight, sizes) {
  const line = (text, i) => `<span tts:fontSize="${sizes[i]}">${text}</span>`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<tt xml:lang="en" xmlns="http://www.w3.org/ns/ttml" xmlns:tts="http://www.w3.org/ns/ttml#styling">
  <head>
    <layout>
      <region xml:id="r1" tts:origin="10% 10%" tts:extent="80% 80%" tts:displayAlign="after"
              tts:fontFamily="monospace" tts:fontSize="1c" tts:lineHeight="${lineHeight}"/>
    </layout>
  </head>
  <body region="r1">
    <div>
      <p begin="0s" end="1s">${line("A", 0)}</p>
      <p begin="1s" end="2s">${line("A", 0)}<br/>${line("B", 1)}</p>
      <p begin="2s" end="3s">${line("A", 0)}<br/>${line("B", 1)}<br/>${line("C", 2)}</p>
      <p begin="3s" end="4s">X<br/>Y<br/>Z</p>
    </div>
  </body>
</tt>`;
}

/* Renders the ISDs at the given offsets in sequence, as a player does, and returns what the last one looks like: the offset of
   the lines at the start of the animation (null if there is none) and the distance that the lines of the previous ISD moved
   to get to their place in the last one (null if there is none), which is what the animation has to start from. */
function render(page, lineHeight, enableRollUp, offsets, sizes = ["1c", "1c", "1c"]) {
  return page.evaluate((ttml, enable, isdOffsets, width, height) => {
    // eslint-disable-next-line no-undef -- the IMSC.js bundle is loaded in the page
    const doc = imsc.fromXML(ttml);
    const container = document.getElementById("render-div");

    const lineTops = () => Object.fromEntries([...container.querySelectorAll("span")]
      .filter((s) => s.childElementCount === 0 && s.textContent.trim() !== "")
      .map((s) => [s.textContent, s.getBoundingClientRect().top]));

    let previous = null;
    let previousTops = {};

    for (const offset of isdOffsets) {
      // the lines of the previous ISD are at their place when its animation, if any, is over
      document.getAnimations().forEach((a) => a.finish());
      previousTops = lineTops();

      container.replaceChildren();

      // eslint-disable-next-line no-undef -- the IMSC.js bundle is loaded in the page
      previous = imsc.renderHTML(imsc.generateISD(doc, offset), container, null, height, width, false, null, previous, enable);
    }

    const animated = [...container.querySelectorAll("div")].find((d) => d.style.transition !== "");
    const start = animated ? -parseFloat(animated.style.bottom) : null;

    document.getAnimations().forEach((a) => a.finish());
    const tops = lineTops();

    // how far the lines that were in the previous ISD moved up: the animation has to start from there
    const moved = Object.keys(previousTops).filter((t) => t in tops).map((t) => previousTops[t] - tops[t]);

    return { start, distance: moved.length > 0 ? moved[moved.length - 1] : null };
  }, rollUpDocument(lineHeight, sizes), enableRollUp, offsets, WIDTH, HEIGHT);
}

async function rollUpTests(t) {
  assert.ok(fs.existsSync(IMSC_BUNDLE_PATH), `${IMSC_BUNDLE_PATH} does not exist.`);

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();

    await page.setViewport({ width: WIDTH, height: HEIGHT });
    await page.setContent("<!doctype html><title></title><div id=\"render-div\"></div>");
    await page.addScriptTag({ path: IMSC_BUNDLE_PATH });

    const rollsUpFromWhereTheyWere = (r) => {
      assert.notStrictEqual(r.start, null, "the lines do not roll up");
      assert.ok(r.distance > 0, `the lines moved by ${r.distance}px`);
      assert.ok(Math.abs(r.start - r.distance) < 1, `rolls up by ${r.start}px, the lines moved by ${r.distance}px`);
    };

    for (const lineHeight of ["normal", "50%", "150%", "1c", "2c"]) {
      await t.test(`the lines roll up by the height of the last line (line height ${lineHeight})`, async () => {
        rollsUpFromWhereTheyWere(await render(page, lineHeight, true, [0.5, 1.5, 2.5]));
      });
    }

    for (const sizes of [["1c", "1c", "2c"], ["1c", "2c", "1c"], ["2c", "1c", "1c"], ["1c", "2c", "3c"]]) {
      await t.test(`the lines roll up by the height of the last line (lines of sizes ${sizes.join("/")})`, async () => {
        rollsUpFromWhereTheyWere(await render(page, "normal", true, [0.5, 1.5, 2.5], sizes));
      });
    }

    await t.test("the lines do not roll up if enableRollUp is not set", async () => {
      const r = await render(page, "50%", false, [0.5, 1.5, 2.5]);

      assert.strictEqual(r.start, null);
    });

    await t.test("the lines do not roll up if they are not the previous lines", async () => {
      const r = await render(page, "50%", true, [2.5, 3.5]);

      assert.strictEqual(r.start, null);
    });

    await t.test("the lines do not roll up in the first ISD", async () => {
      const r = await render(page, "50%", true, [0.5]);

      assert.strictEqual(r.start, null);
    });
  } finally {
    await browser.close();
  }
}

test("Roll-up animation", { timeout: 120000 }, async (t) => {
  await rollUpTests(t);
});
