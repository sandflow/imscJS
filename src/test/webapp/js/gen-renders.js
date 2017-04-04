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


var errorHandler = {
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

function generateRenders() {

    var zip = new JSZip();

    return asyncLoadFile(getTestListPath())
        .then(function (contents) {
            finfos = JSON.parse(contents);

            var p = [];

            for (var i in finfos) {

                p.push(asyncProcessRefFile(zip, finfos[i]));

            }

            return Promise.all(p);
        })
        .then(function (output) {

            var manifest = {};

            for (var j in output) {
                manifest[output[j].name] = output[j].events;
            }

            zip.file("manifest.json", JSON.stringify(manifest, customReplace, 2));

            return zip.generateAsync({type: "blob"});
        })
        .then(function (zipfile) {
            return saveAs(zipfile, "renders.zip");
        });

}

function asyncProcessRefFile(zip, finfo) {

    var test_name = getTestName(finfo.path, finfo.params);

    var dir = zip.folder(test_name);

    return asyncLoadFile(getReferenceFilePath(finfo.path))
        .then(function (contents) {
            var doc = imsc.fromXML(contents.replace(/\r\n/g, '\n'), errorHandler);

            dir.file("doc.json",
                JSON.stringify(
                    doc,
                    customReplace,
                    2
                    )
                );

            var events = doc.getMediaTimeEvents();

            var p = [];

            for (var i in events) {

                p.push(asyncProcessEvent(doc, dir, events[i], finfo.params, getReferenceFileDirectory(finfo.path)));

            }

            return Promise.all(p);
        })
        .then(function (events) {
            return {
                'name': test_name,
                'events': events
            };
        });
}

function customReplace(k, v) {
    if (k === "end" && v === Number.POSITIVE_INFINITY) return "Infinity";
    return v;
}


function asyncProcessEvent(doc, zip, offset, params, reffile_dir) {

    var name = filenameFromOffset(offset);

    var exp_width = 480;
    var exp_height = 270;

    var vdiv = document.getElementById('render-div');

    vdiv.style.height = exp_height + "px";
    vdiv.style.width = exp_width + "px";

    while (vdiv.firstChild) {
        vdiv.removeChild(vdiv.firstChild);
    }

    /* create svg container */

    var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute('width', exp_width + "px");
    svg.setAttribute('height', exp_height + "px");
    svg.setAttribute("xmlns", svg.namespaceURI);

    fo = document.createElementNS("http://www.w3.org/2000/svg", "foreignObject");
    fo.setAttribute('width', '100%');
    fo.setAttribute('height', '100%');

    svg.appendChild(fo);

    /* create container div */

    var rdiv = document.createElement("div");
    rdiv.style.height = "100%";
    rdiv.style.width = "100%";
    rdiv.style.position = "relative";
    rdiv.style.background = "#A9A9A9";

    fo.appendChild(rdiv);

    vdiv.appendChild(svg);

    var isd = imsc.generateISD(doc, offset);

    /* write isd */

    var isd_dir = zip.folder('isd');

    isd_dir.file(name + ".json", JSON.stringify(isd, customReplace, 2));

    /* write PNG  */

    var imgs = [];

    var imgr = function (uri, img) {
        var p = new Promise(function (resolve) {

            var png = new Image();

            png.onload = function () {
                var canvas = document.createElement('canvas');
                canvas.width = this.naturalWidth;
                canvas.height = this.naturalHeight;

                var ctx = canvas.getContext('2d');
               
                ctx.drawImage(this, 0, 0);

                // Get raw image data

                resolve(canvas.toDataURL('image/png'));
            };

            png.src = reffile_dir + uri;

        }).then(function (url) {

            img.src = url;

        });

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


    return Promise.all(imgs).then(
        function () {
            return new Promise(
                function (resolve) {

                    /* save the HTML */

                    var html_dir = zip.folder('html');

                    html_dir.file(name + ".html", rdiv.innerHTML.replace(/></g, ">\n<"));

                    /* create PNG render */

                    var svgser = (new XMLSerializer).serializeToString(svg);

                    var canvas = document.createElement("canvas");

                    var ctx = canvas.getContext('2d');
                    ctx.canvas.height = exp_height;
                    ctx.canvas.width = exp_width;

                    var url = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgser);

                    var img = new Image();
                    img.onload = function () {
                        ctx.drawImage(img, 0, 0);

                        var data = canvas.toDataURL("image/png");

                        var png_dir = zip.folder('png');

                        png_dir.file(name + ".png", data.substr(data.indexOf(',') + 1), {base64: true});

                        resolve(name);
                    };

                    img.src = url;

                }
            );
        }
    );




}


