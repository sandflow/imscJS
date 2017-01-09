/* 
 * Copyright (c) 2016, Pierre-Anthony Lemieux <pal@sandflow.com>
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
        throw msg;
    },
    warn: function (msg) {
        throw msg;
    },
    error: function (msg) {
        throw msg;
    },
    fatal: function (msg) {
        throw msg;
    }
};

function getIMSC1Document(url) {
    return new Promise(function (resolve, reject) {
        var r = new XMLHttpRequest();

        r.open("GET", url);

        r.onload = function () {

            if (this.status >= 200 && this.status < 300) {
                resolve(imsc.fromXML(this.responseText), errorHandler);
            } else {
                reject(r.statusText);
            }
        };

        r.onerror = function () {
            reject(r.statusText);
        };

        r.send();
    });
}

function asyncLoadFile(url) {

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



QUnit.test(
    "Parse Color Expressions",
    function (assert) {

        return getIMSC1Document("unit-tests/colorExpressions.ttml").then(
            function (doc) {

                assert.deepEqual(
                    doc.body.contents[0].contents[0].styleAttrs["http://www.w3.org/ns/ttml#styling color"],
                    [255, 255, 255, 255]
                    );

                assert.deepEqual(
                    doc.body.contents[0].contents[1].styleAttrs["http://www.w3.org/ns/ttml#styling color"],
                    [255, 255, 255, 127]
                    );

                assert.deepEqual(
                    doc.body.contents[0].contents[2].styleAttrs["http://www.w3.org/ns/ttml#styling color"],
                    [255, 128, 255, 255]
                    );

                assert.deepEqual(
                    doc.body.contents[0].contents[3].styleAttrs["http://www.w3.org/ns/ttml#styling color"],
                    [128, 255, 255, 63]
                    );

                assert.deepEqual(
                    doc.body.contents[0].contents[4].styleAttrs["http://www.w3.org/ns/ttml#styling color"],
                    [128, 128, 0, 255]
                    );

            }
        );

    }
);

QUnit.test(
    "Parse Time Expressions",
    function (assert) {

        return getIMSC1Document("unit-tests/timeExpressions.ttml").then(
            function (doc) {

                assert.close(doc.body.contents[0].contents[0].begin, 1.2, 1e-10);
                assert.close(doc.body.contents[0].contents[1].begin, 72, 1e-10);
                assert.close(doc.body.contents[0].contents[2].begin, 4320, 1e-10);
                assert.close(doc.body.contents[0].contents[3].begin, 24 / 24000 * 1001, 1e-10);
                assert.close(doc.body.contents[0].contents[4].begin, 2, 1e-10);
                assert.close(doc.body.contents[0].contents[5].begin, 3723, 1e-10);
                assert.close(doc.body.contents[0].contents[6].begin, 3723.235, 1e-10);
                assert.close(doc.body.contents[0].contents[7].begin, 3723.235, 1e-10);
                assert.close(doc.body.contents[0].contents[8].begin, 3600 + 2 * 60 + 3 + 20 / 24000 * 1001, 1e-10);

            }
        );

    }
);

QUnit.test(
    "Parse Color Expressions",
    function (assert) {

        return getIMSC1Document("unit-tests/lengthExpressions.ttml").then(
            function (doc) {

                assert.deepEqual(
                    doc.body.contents[0].contents[0].styleAttrs["http://www.w3.org/ns/ttml#styling fontSize"],
                    {"unit": "%", "value": 10.5}
                );

                assert.deepEqual(
                    doc.body.contents[0].contents[1].styleAttrs["http://www.w3.org/ns/ttml#styling fontSize"],
                    {"unit": "em", "value": 0.105}
                );

                assert.deepEqual(
                    doc.body.contents[0].contents[2].styleAttrs["http://www.w3.org/ns/ttml#styling fontSize"],
                    {"unit": "px", "value": 10.5}
                );

                assert.deepEqual(
                    doc.body.contents[0].contents[3].styleAttrs["http://www.w3.org/ns/ttml#styling fontSize"],
                    {"unit": "c", "value": 0.105}
                );

            }
        );

    }
);

/* reference files */

var reffiles_root = "reference-files/";

function getReferenceFilesPaths() {
    return "test-list.json";
}

function getReferenceFilePath(name) {
    return "ttml/" + name + ".ttml";
}

function getReferenceDocPath(name) {
    return "renders/" + name + "/doc.json";
}

function getReferenceISDPath(name, offset) {
    return "renders/" + name + "/isd/" + offset.toFixed(6).toString() + ".json";
}

function getReferenceHTMLPath(name, offset) {
    return "renders/" + name + "/html/" + offset.toFixed(6).toString() + ".html";
}

function customReviver(k, v) {
    if (k === "end" && v === "Infinity") return Number.POSITIVE_INFINITY;
    return v;
}

function asyncProcessRefFile(assert, finfo) {

    var gendoc;

    return asyncLoadFile(reffiles_root + getReferenceFilePath(finfo.name))
        .then(function (reffile) {
            gendoc = imsc.fromXML(reffile, errorHandler);

            return asyncLoadFile(reffiles_root + getReferenceDocPath(finfo.name));
        })
        .then(function (contents) {

            var refdoc = JSON.parse(contents, customReviver);

            assert.propEqual(refdoc, gendoc);

            var events = gendoc.getMediaTimeEvents();

            var p = [];

            for (var i in events) {

                p.push(asyncProcessOffset(assert, finfo.name, refdoc, events[i], finfo.params.displayForcedOnlyMode));

            }

            return Promise.all(p);
        });
}

function asyncProcessOffset(assert, name, doc, offset, displayForcedOnlyMode) {

    var refisd;
    var genisd;
    var genhtml;
    var refhtml;

    return asyncLoadFile(reffiles_root + getReferenceISDPath(name, offset))
        .then(function (isd_contents) {
            refisd = JSON.parse(isd_contents, customReviver);

            genisd = imsc.generateISD(doc, offset);

            assert.propEqual(refisd, genisd);
            
            return asyncLoadFile(reffiles_root + getReferenceHTMLPath(name, offset));
        })
            .then(function (html_content) {
                
                /* compare html */
                
        });
}

asyncLoadFile(reffiles_root + getReferenceFilesPaths())
    .then(function (contents) {

        finfos = JSON.parse(contents);

        for (var i in finfos) {

            QUnit.test(
                finfos[i].name,
                function (assert) {
                    return asyncProcessRefFile(assert, finfos[i]);
                }

            );

        }

    });