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
 *   node src/test/script/gen-renders.mjs [imsc-tests/imsc1|imsc-tests/imsc1_1] [outfile] [--browser=chrome|firefox]
 */

import fs from "node:fs";
import path from "node:path";
import { withGenRendersPage } from "./lib/gen-renders-page.mjs";

async function main() {
    const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
    const reffilesRoot = args[0] || "imsc-tests/imsc1";
    const outFile = path.resolve(args[1] || "renders.zip");

    const browserArg = process.argv.find((a) => a.startsWith("--browser="));
    const browserProduct = browserArg ? browserArg.split("=")[1] : "chrome";

    console.log(`Generating renders for "${reffilesRoot}"...`);

    const base64Zip = await withGenRendersPage(browserProduct, (page) => page.evaluate(async (root) => {
        // eslint-disable-next-line no-undef -- injected by gen-renders.js in the page context
        const blob = await generateRenders(root);

        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result.split(",")[1]);
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(blob);
        });
    }, reffilesRoot));

    fs.writeFileSync(outFile, Buffer.from(base64Zip, "base64"));

    console.log(`Wrote ${outFile}`);
}

main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
});
