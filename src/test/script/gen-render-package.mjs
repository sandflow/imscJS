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
import JSZip from "jszip";
import { renderTTMLInBrowser, renderTestSuite } from "./render-harness.mjs";

async function main() {
    const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
    const reffilesRoot = args[0] || "imsc-tests/imsc1";
    const outFile = path.resolve(args[1] || "renders.zip");

    const browserArg = process.argv.find((a) => a.startsWith("--browser="));
    const browserProduct = browserArg ? browserArg.split("=")[1] : "firefox";

    console.log(`Generating renders for "${reffilesRoot}"...`);

    const files = await renderTTMLInBrowser(browserProduct, (page) => renderTestSuite(page, reffilesRoot, true));

    const zip = new JSZip();

    for (const [name, contents] of Object.entries(files)) {
        zip.file(name, contents);
    }

    fs.writeFileSync(outFile, await zip.generateAsync({ type: "nodebuffer" }));

    console.log(`Wrote ${outFile}`);
}

main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
});
