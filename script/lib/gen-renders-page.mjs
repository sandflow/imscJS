/*
 * Shared Puppeteer setup for driving build/public_html/gen-renders.html
 * headlessly: launches a browser, serves build/public_html straight off
 * disk against a fake origin (no HTTP server needed), and navigates to
 * gen-renders.html so its page-global functions (generateRenders,
 * generateReferenceFiles, ...) are ready to call via page.evaluate().
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const PUBLIC_DIR = path.resolve(__dirname, "..", "..", "build", "public_html");

const MIME_TYPES = {
    ".html": "text/html",
    ".js": "text/javascript",
    ".css": "text/css",
    ".json": "application/json",
    ".ttml": "application/xml",
    ".xml": "application/xml",
    ".png": "image/png",
};

// Answers every request against a fake origin straight from build/public_html,
// so no real HTTP server needs to be listening.
async function serveFromDisk(page, rootDir) {
    await page.setRequestInterception(true);

    page.on("request", (request) => {
        const urlPath = decodeURIComponent(new URL(request.url()).pathname);
        const filePath = path.join(rootDir, urlPath);

        if (!filePath.startsWith(rootDir)) {
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
}

/*
 * Launches Puppeteer, navigates to gen-renders.html, calls fn(page) and
 * closes the browser once fn's returned promise settles.
 */
export async function withGenRendersPage(browserProduct, fn) {
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

        await serveFromDisk(page, PUBLIC_DIR);

        await page.goto("http://gen-renders.local/gen-renders.html", { waitUntil: "load" });

        return await fn(page);
    } finally {
        await browser.close();
    }
}
