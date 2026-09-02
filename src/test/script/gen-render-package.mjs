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
 * Renders all TTML files within a directory
 *
 * Usage:
 *   node src/test/script/gen-renders.mjs [imsc-tests/imsc1|imsc-tests/imsc1_1] [outfile] [--browser=chrome|firefox]
 */

import fs from "node:fs";
import path from "node:path";
import { renderTTMLInBrowser } from "./gen-renders-page.mjs";

async function main() {
    const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
    const reffilesRoot = args[0] || "imsc-tests/imsc1";
    const outFile = path.resolve(args[1] || "renders.zip");

    const browserArg = process.argv.find((a) => a.startsWith("--browser="));
    const browserProduct = browserArg ? browserArg.split("=")[1] : "firefox";

    console.log(`Generating renders for "${reffilesRoot}"...`);

    const base64Zip = await renderTTMLInBrowser(browserProduct, (page) => page.evaluate(async (root) => {
        // eslint-disable-next-line no-undef -- injected by gen-renders.js in the page context
        const blob = await generateRenderPackageAsZip(root);

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
