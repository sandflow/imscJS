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


$(function () {
    document.getElementById('start-rendering').addEventListener('click', generateRenders, false);
});

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

function loadFile(url) {

    return new Promise(function (resolve, reject) {

        var r = new XMLHttpRequest();

        r.open('GET', url);

        r.onload = function () {
            if (this.status >= 200 && this.status < 300) {

                resolve(this.response);

            } else {

                reject({
                    status: this.status,
                    statusText: this.statusText
                });
            }
        };

        r.onerror = function () {

            reject({
                status: this.status,
                statusText: this.statusText
            });

        };

        r.send();

    });
}


function generateRenders() {

    var zip = new JSZip();

    return loadFile("reference-files/file-list.json")
        .then(function (contents) {
            refFilesPaths = JSON.parse(contents);

            var p = [];

            for (var i in refFilesPaths) {

                p.push(asyncProcessRefFile("reference-files/", zip, refFilesPaths[i]));

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

function asyncProcessRefFile(root, zip, finfo) {

    var dir = zip.folder(finfo.name);

    return loadFile(root + "files/" + finfo.name + ".ttml")
        .then(function (contents) {
            var doc = imsc.fromXML(contents, errorHandler);

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

                p.push(asyncProcessEvent(events[i].toFixed(6).toString(), doc, dir, events[i], finfo.params.displayForcedOnlyMode));

            }

            return Promise.all(p);
        })
        .then(function (events) {
            return {'name': name,
                'events': events};
        });
}

function customReplace(k, v) {
    if (k === "end" && v === Number.POSITIVE_INFINITY) return "Infinity";
    return v;
}


function asyncProcessEvent(name, doc, zip, offset, displayForcedOnlyMode) {

    return new Promise(
        function (resolve) {

            var exp_width = 800;
            var exp_height = 450;

            var vdiv = document.getElementById('render-div');

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
            rdiv.style.background = "linear-gradient(135deg, #b5bdc8 0%,#828c95 36%,#28343b 100%)";

            if (!rdiv.style.background) {
                rdiv.style.background = "-moz-linear-gradient(left, #b5bdc8 0%, #828c95 36%, #28343b 100%)";
            }

            if (!rdiv.style.background) {
                rdiv.style.background = "-webkit-linear-gradient(left, #b5bdc8 0%, #828c95 36%, #28343b 100%)";
            }

            if (!rdiv.style.background) {
                rdiv.style.background = "#b5bdc8";
            }

            fo.appendChild(rdiv);

            vdiv.appendChild(svg);

            var isd = imsc.generateISD(doc, offset);

            /* write isd */

            var isd_dir = zip.folder('isd');

            isd_dir.file(name + ".json", JSON.stringify(isd, customReplace, 2));

            /* write PNG  */

            imsc.renderHTML(
                isd,
                rdiv,
                function (uri) {
                    return uri;
                },
                exp_height,
                exp_width,
                displayForcedOnlyMode,
                errorHandler
                );

            /* save the HTML */

            var html_dir = zip.folder('html');

            html_dir.file(name + ".html", rdiv.innerHTML);

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


