#!/usr/bin/env node

/*
 * Headless equivalent of build/public_html/gen-renders.html.
 *
 * Drives it with Puppeteer against a fake origin whose requests are
 * intercepted and answered straight from build/public_html on disk
 * (no HTTP server needed), calls generateRenders(<reffiles_root>)
 * in-page to get the renders.zip Blob directly, and writes it to disk.
 *
 * Usage:
 *   node script/gen-renders.mjs [imsc-tests/imsc1|imsc-tests/imsc1_1] [outfile] [--browser=chrome|firefox]
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.resolve(__dirname, "..", "build", "public_html");

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

async function main() {
    const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
    const reffilesRoot = args[0] || "imsc-tests/imsc1";
    const outFile = path.resolve(args[1] || "renders.zip");

    const browserArg = process.argv.find((a) => a.startsWith("--browser="));
    const browserProduct = browserArg ? browserArg.split("=")[1] : "chrome";

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

        console.log(`Generating renders for "${reffilesRoot}"...`);

        const base64Zip = await page.evaluate(async (root) => {
            // eslint-disable-next-line no-undef -- injected by gen-renders.js in the page context
            const blob = await generateRenders(root);

            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result.split(",")[1]);
                reader.onerror = () => reject(reader.error);
                reader.readAsDataURL(blob);
            });
        }, reffilesRoot);

        fs.writeFileSync(outFile, Buffer.from(base64Zip, "base64"));

        console.log(`Wrote ${outFile}`);
    } finally {
        await browser.close();
    }
}

main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
});
