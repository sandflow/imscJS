/*
 * Copyright (c) 2016, Pierre-Anthony Lemieux <pal@palemieux.com>
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
    }
};

async function asyncLoadFile(url) {

    const response = await fetch(url);

    if (!response.ok) {
        throw {
            status: response.status,
            statusText: response.statusText
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

function getTestName(reffile_path, renderer_params) {
    return reffile_path.split('\\').pop().split('/').pop().split(".")[0];
}

function filenameFromOffset(offset) {
    return offset.toFixed(6).toString();
}

async function generateRenders(reffiles_root) {

    const zip = new JSZip();

    const renders_dir = zip.folder('generated');
    const pngs_dir = zip.folder('png');

    const contents = await asyncLoadFile(getTestListPath(reffiles_root));

    const finfos = JSON.parse(contents);

    const p = [];

    for (const finfo of finfos) {

        p.push(renderTTMLFile(reffiles_root, finfo));

    }

    const renders = await Promise.all(p);

    /* write the JSON document, ISD documents, HTML documents and PNGs */

    const manifest = {};

    for (const renderedFile of renders) {

        const test_renders_dir = renders_dir.folder(renderedFile.name);
        const test_pngs_dir = pngs_dir.folder(renderedFile.name);

        test_renders_dir.file("doc.json", JSON.stringify(renderedFile.doc, customReplace, 2));

        const isd_dir = test_renders_dir.folder('isd');
        const html_dir = test_renders_dir.folder('html');

        const event_names = [];

        for (const event of renderedFile.events) {

            isd_dir.file(event.name + ".json", JSON.stringify(event.isd, customReplace, 2));
            html_dir.file(event.name + ".html", event.html);
            test_pngs_dir.file(event.name + ".png", event.png, {base64: true});

            event_names.push(event.name);

        }

        manifest[renderedFile.name] = event_names;

    }

    renders_dir.file("file-list.json", JSON.stringify(manifest, customReplace, 2));

    return await zip.generateAsync({type: "blob"});
}

async function generateAndDownloadRenders(reffiles_root) {

    const zipfile = await generateRenders(reffiles_root);

    return saveAs(zipfile, "renders.zip");

}

/**
 * Parses the test files at reffiles_root and generates the JSON document and
 * ISD documents for each of their media time events (no HTML, no PNGs),
 * returning a flat map of relative file path to file contents rather than
 * writing any files or zipping anything.
 */
async function generateReferenceFiles(reffiles_root) {

    const contents = await asyncLoadFile(getTestListPath(reffiles_root));

    const finfos = JSON.parse(contents);

    const p = [];

    for (const finfo of finfos) {

        p.push(renderTTMLFile(reffiles_root, finfo, false, false));

    }

    const renders = await Promise.all(p);

    const files = {};
    const manifest = {};

    for (const renderedFile of renders) {

        files[renderedFile.name + "/doc.json"] = JSON.stringify(renderedFile.doc, customReplace, 2);

        const event_names = [];

        for (const event of renderedFile.events) {

            files[renderedFile.name + "/isd/" + event.name + ".json"] = JSON.stringify(event.isd, customReplace, 2);

            event_names.push(event.name);

        }

        manifest[renderedFile.name] = event_names;

    }

    files["file-list.json"] = JSON.stringify(manifest, customReplace, 2);

    return files;
}

/**
 * Parses a reference file and generates the JSON document, ISD documents,
 * and (unless generateHtml/generatePng are false) HTML documents and PNGs
 * for each of its media time events, returning them all as a plain JSON
 * structure rather than writing any files.
 */
async function renderTTMLFile(reffiles_root, finfo, generateHtml = true, generatePng = true) {

    const test_name = finfo.name || getTestName(finfo.path, finfo.params || {});

    const contents = await asyncLoadFile(getReferenceFilePath(reffiles_root, finfo.path));

    const doc = imsc.fromXML(contents.replace(/\r\n/g, '\n'), errorHandler);

    const events = doc.getMediaTimeEvents();

    const p = [];

    for (const offset of events) {

        p.push(renderISD(doc, offset, finfo.params || {}, getReferenceFileDirectory(reffiles_root, finfo.path), generateHtml, generatePng));

    }

    const processedEvents = await Promise.all(p);

    return {
        'name': test_name,
        'doc': doc,
        'events': processedEvents
    };
}

function customReplace(k, v) {
    if (k === "end" && v === Number.POSITIVE_INFINITY) return "Infinity";
    return v;
}

/**
 * Renders a single media time event and returns its ISD and (unless
 * generateHtml/generatePng are false) HTML and PNG as a plain JSON
 * structure rather than writing any files.
 */
async function renderISD(doc, offset, params, reffile_dir, generateHtml = true, generatePng = true) {

    const name = filenameFromOffset(offset);

    const isd = imsc.generateISD(doc, offset);

    let html = null;
    let png = null;

    if (generateHtml || generatePng) {

        const exp_width = 640;
        const exp_height = 360;

        const vdiv = document.getElementById('render-div');

        vdiv.style.height = exp_height + "px";
        vdiv.style.width = exp_width + "px";

        while (vdiv.firstChild) {
            vdiv.removeChild(vdiv.firstChild);
        }

        /* create svg container */

        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute('width', exp_width + "px");
        svg.setAttribute('height', exp_height + "px");
        svg.setAttribute("xmlns", svg.namespaceURI);

        const fo = document.createElementNS("http://www.w3.org/2000/svg", "foreignObject");
        fo.setAttribute('width', '100%');
        fo.setAttribute('height', '100%');

        svg.appendChild(fo);

        /* create container div */

        const rdiv = document.createElement("div");
        rdiv.style.height = "100%";
        rdiv.style.width = "100%";
        rdiv.style.position = "relative";
        rdiv.style.background = "#A9A9A9";

        fo.appendChild(rdiv);

        vdiv.appendChild(svg);

        /* resolve images referenced by the ISD so they are embedded in the HTML */

        const imgs = [];

        const imgr = function (uri, img) {
            const p = (async function () {

                const url = await new Promise(function (resolve) {

                    const png = new Image();

                    png.onload = function () {
                        const canvas = document.createElement('canvas');
                        canvas.width = this.naturalWidth;
                        canvas.height = this.naturalHeight;

                        const ctx = canvas.getContext('2d');

                        ctx.drawImage(this, 0, 0);

                        // Get raw image data

                        resolve(canvas.toDataURL('image/png'));
                    };

                    png.src = reffile_dir + uri;

                });

                img.src = url;

            })();

            imgs.push(p);

            return null;
        };

        imsc.renderHTML(
            isd,
            rdiv,
            imgr,
            exp_height,
            exp_width,
            params.displayForcedOnlyMode === true,
            errorHandler
            );


        await Promise.all(imgs);

        html = rdiv.innerHTML.replace(/></g, ">\n<");

        if (generatePng) {

            /* create PNG render */

            const svgser = (new XMLSerializer).serializeToString(svg);

            const canvas = document.createElement("canvas");

            const ctx = canvas.getContext('2d');
            ctx.canvas.height = exp_height;
            ctx.canvas.width = exp_width;

            const url = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgser);

            png = await new Promise(function (resolve) {

                const img = new Image();
                img.onload = function () {
                    ctx.drawImage(img, 0, 0);

                    const data = canvas.toDataURL("image/png");

                    resolve(data.substr(data.indexOf(',') + 1));
                };

                img.src = url;

            });

        }

    }

    return {
        'name': name,
        'isd': isd,
        'html': html,
        'png': png
    };

}
