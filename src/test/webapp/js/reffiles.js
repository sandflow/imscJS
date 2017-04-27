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

var reffiles_root = "imsc-tests/imsc1";
var genfiles_root = "generated";

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

function getTestListPath() {
    return reffiles_root + "/tests.json";
}

function getReferenceFilePath(reffile_path) {
    return reffiles_root + "/ttml/" + reffile_path;
}

function getReferenceFileDirectory(reffile_path) {
    return reffiles_root + "/ttml/" + reffile_path.substring(0, Math.max(reffile_path.lastIndexOf("/"), reffile_path.lastIndexOf("\\")) + 1);
}

function getTestName(reffile_path, renderer_params) {
    return reffile_path.split('\\').pop().split('/').pop().split(".")[0];
}

function getTestOutputDirectory(test_name) {
    return genfiles_root + "/" + test_name;
}

function filenameFromOffset(offset) {
    return offset.toFixed(6).toString();
}

function getReferencePNGPath(test_name, offset) {
    return reffiles_root + "/png/" + test_name + "/" + filenameFromOffset(offset) + ".png";
}

function getReferenceDocPath(test_name) {
    return getTestOutputDirectory(test_name) + "/doc.json";
}

function getReferenceISDPath(test_name, offset) {
    return getTestOutputDirectory(test_name) + "/isd/" + filenameFromOffset(offset) + ".json";
}

function getReferenceHTMLPath(test_name, offset) {
    return getTestOutputDirectory(test_name) + "/html/" + filenameFromOffset(offset) + ".html";
}