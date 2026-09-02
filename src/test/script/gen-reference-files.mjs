#!/usr/bin/env node
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
 * Generates reference files for the IMSC 1 and IMSC 1.1 test suites, writing
 * them to src/test/resources/reference-files/<imsc1|imsc1_1>/.
 *
 * Usage: node src/test/script/gen-reference-files.mjs
 *   [--browser=chrome|firefox]
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { renderTTMLInBrowser } from "./gen-renders-page.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_ROOT = path.resolve(__dirname, "..", "resources", "reference-files");

const REFFILES_ROOTS = ["imsc-tests/imsc1", "imsc-tests/imsc1_1"];

async function main() {
    const browserArg = process.argv.find((a) => a.startsWith("--browser="));
    const browserProduct = browserArg ? browserArg.split("=")[1] : "firefox";

    await renderTTMLInBrowser(browserProduct, async (page) => {
        for (const reffilesRoot of REFFILES_ROOTS) {
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
    });
}

main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
});
