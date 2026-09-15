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
 * Browser-side rendering helpers for the IMSC test suite.
 *
 * This is a classic (non-module) script injected into a blank Puppeteer page
 * by render-harness.mjs, alongside the imsc UMD bundle. Its functions
 * become globals that the Node side calls through page.evaluate() -- they
 * are not meant to be loaded directly by a browser.
 *
 * PNG capture is not done here: renderEvent() only renders into #render-div
 * and reports its ISD/HTML; the Node side screenshots that element itself
 * (see renderTestSuite() in render-harness.mjs), since only Puppeteer -- not
 * the page -- can take a real screenshot.
 */

/* global imsc -- provided by the imsc UMD bundle, injected alongside this script */

const errorHandler = {
    info: function (msg) {
        console.log("info: " + msg);
        return false;
    },
    warn: function (msg) {
        console.log("warn: " + msg);
        return false;
    },
    error: function (msg) {
        console.log("error: " + msg);
        return false;
    },
    fatal: function (msg) {
        console.log("fatal: " + msg);
        return false;
    },
};

async function asyncLoadFile(url) {

    const response = await fetch(url);

    if (!response.ok) {
        throw {
            status: response.status,
            statusText: response.statusText,
        };
    }

    return response.text();
}

function getTestListPath(reffiles_root) {
    return reffiles_root + "/tests.json";
}

function getReferenceFilePath(reffiles_root, reffile_path) {
    return reffiles_root + "/ttml/" + reffile_path;
}

function getReferenceFileDirectory(reffiles_root, reffile_path) {
    return reffiles_root + "/ttml/" + reffile_path.substring(0, Math.max(reffile_path.lastIndexOf("/"), reffile_path.lastIndexOf("\\")) + 1);
}

function getTestName(reffile_path) {
    return reffile_path.split("\\").pop().split("/").pop().split(".")[0];
}

function customReplace(k, v) {
    if (k === "end" && v === Number.POSITIVE_INFINITY) return "Infinity";
    return v;
}

function getRenderDiv() {

    let vdiv = document.getElementById("render-div");

    if (!vdiv) {
        vdiv = document.createElement("div");
        vdiv.id = "render-div";
        vdiv.style.position = "relative";
        vdiv.style.background = "#A9A9A9";
        document.body.appendChild(vdiv);
    }

    return vdiv;
}

// Set by openTTMLFile(), read by renderEvent(): the page keeps at most one
// parsed document "open" at a time, rendered sequentially event by event.
let currentDoc = null;
let currentReffileDir = "";

/**
 * Fetches and parses tests.json at reffiles_root, returning the list of test
 * file descriptors it contains.
 */
// eslint-disable-next-line no-unused-vars -- called from Node via page.evaluate
async function loadTestList(reffiles_root) {
    const contents = await asyncLoadFile(getTestListPath(reffiles_root));
    return JSON.parse(contents);
}

/**
 * Loads and parses a single reference file, making it the current document
 * that renderEvent() renders events from. Returns its name, its media time
 * events, and its JSON document (already stringified, so that "Infinity"
 * survives the trip back to Node -- see customReplace()).
 */
// eslint-disable-next-line no-unused-vars -- called from Node via page.evaluate
async function openTTMLFile(reffiles_root, finfo) {

    const contents = await asyncLoadFile(getReferenceFilePath(reffiles_root, finfo.path));

    currentDoc = imsc.fromXML(contents.replace(/\r\n/g, "\n"), errorHandler);
    currentReffileDir = getReferenceFileDirectory(reffiles_root, finfo.path);

    return {
        "name": finfo.name || getTestName(finfo.path),
        "events": currentDoc.getMediaTimeEvents(),
        "docJson": JSON.stringify(currentDoc, customReplace, 2),
    };
}

/**
 * Renders the current document (see openTTMLFile()) at offset into
 * #render-div, sized width x height, resolving any images it references
 * first. Returns the ISD (already stringified, as with openTTMLFile()) and
 * the rendered HTML; the caller is expected to screenshot #render-div itself
 * to obtain a PNG.
 */
// eslint-disable-next-line no-unused-vars -- called from Node via page.evaluate
async function renderEvent(offset, params, width, height) {

    const isd = imsc.generateISD(currentDoc, offset);

    const vdiv = getRenderDiv();

    vdiv.style.height = height + "px";
    vdiv.style.width = width + "px";

    while (vdiv.firstChild) {
        vdiv.removeChild(vdiv.firstChild);
    }

    /* resolve images referenced by the ISD so they are embedded in the HTML */

    const imgs = [];

    const imgr = function (uri, img) {
        const p = (async function () {

            const url = await new Promise(function (resolve) {

                const png = new Image();

                png.onload = function () {
                    const canvas = document.createElement("canvas");
                    canvas.width = this.naturalWidth;
                    canvas.height = this.naturalHeight;

                    const ctx = canvas.getContext("2d");

                    ctx.drawImage(this, 0, 0);

                    resolve(canvas.toDataURL("image/png"));
                };

                png.src = currentReffileDir + uri;

            });

            img.src = url;

        })();

        imgs.push(p);

        return null;
    };

    imsc.renderHTML(
        isd,
        vdiv,
        imgr,
        height,
        width,
        params.displayForcedOnlyMode === true,
        errorHandler,
        );

    await Promise.all(imgs);

    const html = vdiv.innerHTML.replace(/></g, ">\n<");

    return {
        "isdJson": JSON.stringify(isd, customReplace, 2),
        "html": html,
    };
}
