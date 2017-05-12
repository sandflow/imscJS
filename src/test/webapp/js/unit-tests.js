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

function getIMSC1Document(url, metadataHandler) {
    return new asyncLoadFile(url).then(function (contents) {
        return imsc.fromXML(contents, errorHandler, metadataHandler);
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
                    [0, 0, 0, 0]
                    );

                assert.deepEqual(
                    doc.body.contents[0].contents[5].styleAttrs["http://www.w3.org/ns/ttml#styling color"],
                    [0, 0, 0, 255]
                    );
                
                assert.deepEqual(
                    doc.body.contents[0].contents[6].styleAttrs["http://www.w3.org/ns/ttml#styling color"],
                    [0xc0, 0xc0, 0xc0, 255]
                    );

                assert.deepEqual(
                    doc.body.contents[0].contents[7].styleAttrs["http://www.w3.org/ns/ttml#styling color"],
                    [0x80, 0x80, 0x80, 255]
                    );
                
                assert.deepEqual(
                    doc.body.contents[0].contents[8].styleAttrs["http://www.w3.org/ns/ttml#styling color"],
                    [255, 255, 255, 255]
                    );
                
                assert.deepEqual(
                    doc.body.contents[0].contents[9].styleAttrs["http://www.w3.org/ns/ttml#styling color"],
                    [0x80, 0, 0, 255]
                    );
                
                assert.deepEqual(
                    doc.body.contents[0].contents[10].styleAttrs["http://www.w3.org/ns/ttml#styling color"],
                    [255, 0, 0, 255]
                    );

                assert.deepEqual(
                    doc.body.contents[0].contents[11].styleAttrs["http://www.w3.org/ns/ttml#styling color"],
                    [0x80, 0, 0x80, 255]
                    );

                assert.deepEqual(
                    doc.body.contents[0].contents[12].styleAttrs["http://www.w3.org/ns/ttml#styling color"],
                    [255, 0, 255, 255]
                    );

                assert.deepEqual(
                    doc.body.contents[0].contents[13].styleAttrs["http://www.w3.org/ns/ttml#styling color"],
                    [255, 0, 255, 255]
                    );

                assert.deepEqual(
                    doc.body.contents[0].contents[14].styleAttrs["http://www.w3.org/ns/ttml#styling color"],
                    [0, 0x80, 0, 255]
                    );

                assert.deepEqual(
                    doc.body.contents[0].contents[15].styleAttrs["http://www.w3.org/ns/ttml#styling color"],
                    [0, 255, 0, 255]
                    );

                assert.deepEqual(
                    doc.body.contents[0].contents[16].styleAttrs["http://www.w3.org/ns/ttml#styling color"],
                    [0x80, 0x80, 0, 255]
                    );

                assert.deepEqual(
                    doc.body.contents[0].contents[17].styleAttrs["http://www.w3.org/ns/ttml#styling color"],
                    [255, 255, 0, 255]
                    );

                assert.deepEqual(
                    doc.body.contents[0].contents[18].styleAttrs["http://www.w3.org/ns/ttml#styling color"],
                    [0, 0, 0x80, 255]
                    );

                assert.deepEqual(
                    doc.body.contents[0].contents[19].styleAttrs["http://www.w3.org/ns/ttml#styling color"],
                    [0, 0, 255, 255]
                    );

                assert.deepEqual(
                    doc.body.contents[0].contents[20].styleAttrs["http://www.w3.org/ns/ttml#styling color"],
                    [0, 0x80, 0x80, 255]
                    );

                assert.deepEqual(
                    doc.body.contents[0].contents[21].styleAttrs["http://www.w3.org/ns/ttml#styling color"],
                    [0, 255, 255, 255]
                    );

                assert.deepEqual(
                    doc.body.contents[0].contents[22].styleAttrs["http://www.w3.org/ns/ttml#styling color"],
                    [0, 255, 255, 255]
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
                assert.close(doc.body.contents[0].contents[9].begin, 360000.1, 1e-10);
                assert.close(doc.body.contents[0].contents[10].begin, 360000 + 100 / 24000 * 1001, 1e-10);
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

QUnit.test(
    "Metadata Callbacks",
    function (assert) {

        var count = 0;
        var cur_tag = 0;
        var accumul_txt = "";

        mh = {
            onOpenTag: function (ns, name, attrs) {

                switch (count) {
                    case 0:
                        assert.equal(name, "title");
                        assert.equal(ns, "http://www.w3.org/ns/ttml#metadata");
                        cur_tag = 1;
                        break;
                    case 3:
                        assert.equal(name, "conformsToStandard");
                        assert.equal(ns, "urn:ebu:metadata");
                        cur_tag = 2;
                        break;
                    case 4:
                        assert.equal(name, "image");
                        assert.equal(ns, "http://www.smpte-ra.org/schemas/2052-1/2010/smpte-tt");
                        assert.equal(attrs["http://www.w3.org/XML/1998/namespace id"].value, "img_1");
                        assert.equal(attrs[" imagetype"].value, "PNG");
                        cur_tag = 3;
                        break;
                }

                count++;

            },

            onCloseTag: function () {
                
                switch (cur_tag) {
                    case 4:
                        var trimmed_text = accumul_txt.trim();
                        assert.ok(trimmed_text.startswith("iVBORw0KGgoAAAANS"));
                        assert.equal(trimmed_text.length, 4146);
                }
                
                cur_tag = 0;
                accumul_txt = "";
            },

            onText: function (contents) {
                switch (cur_tag) {
                    case 1:
                        assert.equal(contents, "Metadata Handler Test");
                        break;
                    case 2:
                        assert.equal(contents, "http://www.w3.org/ns/ttml/profile/imsc1/text");
                        break;
                    case 4:
                        accumul_txt = accumul_txt + contents;
                }
            }
        };

        return getIMSC1Document("unit-tests/metadataHandler.ttml", mh);

    }
);