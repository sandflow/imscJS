/*
 * Copyright (c) Sandflow Consulting LLC
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 * * Redistributions of source code must retain the above copyright notice, this
 *   list of conditions and the following disclaimer.
 * * Redistributions in binary form must reproduce the above copyright notice,
 *   this list of conditions and the following disclaimer in the documentation
 *   and/or other materials provided with the distribution.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
 * ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE
 * LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
 * CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
 * SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
 * INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
 * CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 * ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 * POSSIBILITY OF SUCH DAMAGE.
 */

/*
 * Render TTML files in browser
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const RESOURCES_DIR = path.resolve(__dirname, "..", "resources");
export const IMSC_BUNDLE_PATH = path.resolve(__dirname, "..", "..", "..", "dist", "imsc.debug.js");
const HARNESS_PATH = path.resolve(__dirname, "render-harness.browser.js");

/* We are not loading from an HTTP server, but instead intecerpting all load calls */
const FAKE_ORIGIN = "http://gen-renders.local";

/* Dimensions of the rendered visuals */
const RENDER_WIDTH = 640;
const RENDER_HEIGHT = 360;

const MIME_TYPES = {
    ".json": "application/json",
    ".ttml": "application/xml",
    ".xml": "application/xml",
    ".png": "image/png",
};

/**
 * Renders an IMSC test suite, returning a list containing file names and
 * corresponding file contents. JSON/HTML paths are nested under "generated/"
 * and, when includeRenders is true, PNGs under "png/" -- matching the layout
 * expected in a render package.
 *
 * @param {string} browserProduct Puppeteer browser product to launch, e.g.
 * "chrome" or "firefox"
 * @param {string} reffilesRoot e.g. "imsc-tests/imsc1"
 * @param {boolean} includeRenders Whether to also render/screenshot each event
 * @returns {Promise<Object<string, string|Buffer>>}
 */
export async function renderTestSuite(browserProduct, reffilesRoot, includeRenders = false) {
    if (!fs.existsSync(IMSC_BUNDLE_PATH)) {
        throw new Error(`${IMSC_BUNDLE_PATH} does not exist.`);
    }

    const browser = await puppeteer.launch({
        browser: browserProduct,
        headless: true,
        args: browserProduct === "chrome" ? ["--no-sandbox", "--disable-setuid-sandbox"] : [],
    });

    try {
        const page = await browser.newPage();

        page.on("console", (msg) => console.log(`[page] ${msg.text()}`));
        page.on("pageerror", (err) => console.error(`[page error] ${err}`));

        await page.setRequestInterception(true);

        page.on("request", (request) => {
            if (!request.url().startsWith(FAKE_ORIGIN)) {
                request.continue();
                return;
            }

            const urlPath = decodeURIComponent(new URL(request.url()).pathname);

            if (urlPath === "/") {
                request.respond({ status: 200, contentType: "text/html", body: "<!doctype html><title></title>" });
                return;
            }

            if (urlPath === "/favicon.ico") {
                request.respond({ status: 204 });
                return;
            }

            const filePath = path.join(RESOURCES_DIR, urlPath);

            if (!filePath.startsWith(RESOURCES_DIR)) {
                console.error(`[serve] 403 ${request.url()} (outside ${RESOURCES_DIR})`);
                request.respond({ status: 403 });
                return;
            }

            fs.readFile(filePath, (err, data) => {
                if (err) {
                    console.error(`[serve] 404 ${request.url()} -> ${filePath}`);
                    request.respond({ status: 404 });
                    return;
                }

                const ext = path.extname(filePath).toLowerCase();
                request.respond({
                    status: 200,
                    contentType: MIME_TYPES[ext] || "application/octet-stream",
                    body: data,
                });
            });
        });

        await page.goto(`${FAKE_ORIGIN}/`, { waitUntil: "load" });

        // Matches the fixed render dimensions, so element screenshots need
        // no scaling or clipping surprises.
        await page.setViewport({ width: RENDER_WIDTH, height: RENDER_HEIGHT });

        await page.addScriptTag({ path: IMSC_BUNDLE_PATH });
        await page.addScriptTag({ path: HARNESS_PATH });

        // eslint-disable-next-line no-undef -- injected by render-harness.browser.js in the page context
        const finfos = await page.evaluate((root) => loadTestList(root), reffilesRoot);

        const docPrefix = "generated/";

        const files = {};
        const manifest = {};

        for (const finfo of finfos) {
            const { name, events, docJson } = await page.evaluate(
                // eslint-disable-next-line no-undef -- injected by render-harness.browser.js in the page context
                (root, fi) => openTTMLFile(root, fi),
                reffilesRoot,
                finfo,
            );

            files[docPrefix + name + "/doc.json"] = docJson;

            const eventNames = [];

            for (const offset of events) {
                const eventName = offset.toFixed(6).toString();

                const { isdJson, html } = await page.evaluate(
                    // eslint-disable-next-line no-undef -- injected by render-harness.browser.js in the page context
                    (o, p, w, h) => renderEvent(o, p, w, h),
                    offset,
                    finfo.params || {},
                    RENDER_WIDTH,
                    RENDER_HEIGHT,
                );

                files[docPrefix + name + "/isd/" + eventName + ".json"] = isdJson;

                if (includeRenders) {
                    files[docPrefix + name + "/html/" + eventName + ".html"] = html;

                    const renderDiv = await page.$("#render-div");
                    files["png/" + name + "/" + eventName + ".png"] = await renderDiv.screenshot({ type: "png" });
                    await renderDiv.dispose();
                }

                eventNames.push(eventName);
            }

            manifest[name] = eventNames;
        }

        files[docPrefix + "file-list.json"] = JSON.stringify(manifest, null, 2);

        return files;
    } finally {
        await browser.close();
    }
}
