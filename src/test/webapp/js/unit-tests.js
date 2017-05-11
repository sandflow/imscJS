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
    return new asyncLoadFile(url).then(function (contents) {
        return imsc.fromXML(contents, errorHandler);
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

