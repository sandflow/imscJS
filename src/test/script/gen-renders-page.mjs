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
export const PUBLIC_DIR = path.resolve(__dirname, "..", "..", "..", "build", "public_html");

const MIME_TYPES = {
    ".html": "text/html",
    ".js": "text/javascript",
    ".css": "text/css",
    ".json": "application/json",
    ".ttml": "application/xml",
    ".xml": "application/xml",
    ".png": "image/png",
};

/**
 * Renders a TTML file within the `gen-renders.html` page using puppeteer
 *
 * @param {string} browserProduct Puppeteer browser product to launch, e.g. "chrome" or "firefox"
 * @param {(page: import("puppeteer").Page) => Promise<*>} fn Callback invoked with the Puppeteer page, once gen-renders.html has loaded
 * @returns {Promise<*>} Whatever fn's returned promise resolves to
 */
export async function renderTTMLInBrowser(browserProduct, fn) {
    if (!fs.existsSync(PUBLIC_DIR)) {
        throw new Error(`${PUBLIC_DIR} does not exist. Run "grunt build" first.`);
    }

    const browser = await puppeteer.launch({
        browser: browserProduct,
        headless: true,
    });

    try {
        const page = await browser.newPage();

        page.on("console", (msg) => console.log(`[page] ${msg.text()}`));
        page.on("pageerror", (err) => console.error(`[page error] ${err}`));

        // Answers every request against a fake origin straight from
        // build/public_html, so no real HTTP server needs to be listening.
        await page.setRequestInterception(true);

        page.on("request", (request) => {
            const urlPath = decodeURIComponent(new URL(request.url()).pathname);
            const filePath = path.join(PUBLIC_DIR, urlPath);

            if (!filePath.startsWith(PUBLIC_DIR)) {
                request.respond({ status: 403 });
                return;
            }

            fs.readFile(filePath, (err, data) => {
                if (err) {
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

        await page.goto("http://gen-renders.local/gen-renders.html", { waitUntil: "load" });

        return await fn(page);
    } finally {
        await browser.close();
    }
}
