#!/usr/bin/env node

/*
 * Headless equivalent of build/public_html/gen-renders.html that generates
 * reference files (doc.json, ISD documents and HTML documents -- no PNGs)
 * for the IMSC 1 and IMSC 1.1 test suites at src/test/resources/imsc-tests,
 * writing them to src/test/resources/reference-files/<imsc1|imsc1_1>/.
 *
 * Usage:
 *   node script/gen-reference-files.mjs [--browser=chrome|firefox]
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { withGenRendersPage } from "./lib/gen-renders-page.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_ROOT = path.resolve(__dirname, "..", "src", "test", "resources", "reference-files");

const REFFILES_ROOTS = ["imsc-tests/imsc1", "imsc-tests/imsc1_1"];

async function generateReferenceFilesForRoot(page, reffilesRoot) {
    console.log(`Generating reference files for "${reffilesRoot}"...`);

    const files = await page.evaluate(async (root) => {
        // eslint-disable-next-line no-undef -- injected by gen-renders.js in the page context
        return await generateReferenceFiles(root);
    }, reffilesRoot);

    const destDir = path.join(OUTPUT_ROOT, path.basename(reffilesRoot));

    fs.rmSync(destDir, { recursive: true, force: true });

    for (const [relativePath, contents] of Object.entries(files)) {
        const filePath = path.join(destDir, relativePath);
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
        fs.writeFileSync(filePath, contents);
    }

    console.log(`Wrote ${Object.keys(files).length} files to ${destDir}`);
}

async function main() {
    const browserArg = process.argv.find((a) => a.startsWith("--browser="));
    const browserProduct = browserArg ? browserArg.split("=")[1] : "chrome";

    await withGenRendersPage(browserProduct, async (page) => {
        for (const reffilesRoot of REFFILES_ROOTS) {
            await generateReferenceFilesForRoot(page, reffilesRoot);
        }
    });
}

main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
});
