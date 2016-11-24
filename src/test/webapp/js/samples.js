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

$(function () {
    $("#slider").slider({
        disabled: true,
        slide: function (event, ui) {
            if (typeof imsc1doc !== 'undefined')
                updateISD(imsc1doc.getMediaTimeEvents()[ui.value]);
        }
    });

    var r = new XMLHttpRequest();

    r.open("GET", "samples/samples.json");

    r.onload = function () {
        testSamples = JSON.parse(this.responseText);

        var sldiv = document.getElementById('sample-list');

        for (var i = 0; i < testSamples.length; i++) {
            var ifield = document.createElement("input");
            ifield.onclick = function () {
                selectSample(this.value);
            };
            ifield.value = i;
            ifield.type = "radio";
            ifield.name = "tests";
            ifield.id = "b" + i;

            sldiv.appendChild(ifield);

            var lfield = document.createElement("label");

            lfield.htmlFor = ifield.id;
            lfield.textContent = testSamples[i].name;

            sldiv.appendChild(lfield);

            sldiv.appendChild(document.createElement("br"));

        }

    };

    r.send();

});

function selectSample(sample_index) {
    var h = new XMLHttpRequest();
    h.onreadystatechange = function () {
        if (h.readyState === 4 && h.status === 200) {
            displaySample(sample_index, h.responseText);
        }
    };
    h.open("GET", testSamples[sample_index].doc);
    h.send(null);

}

var errorHandler = {
    info: function (msg) {
        $("#errors").append("<p>info: " + msg + "</p>");
    },
    warn: function (msg) {
        $("#errors").append("<p>warn: " + msg + "</p>");
    },
    error: function (msg) {
        $("#errors").append("<p>error: " + msg + "</p>");
    },
    fatal: function (msg) {
        $("#errors").append("<p>fatal: " + msg + "</p>");
    }
};

function displaySample(sample_index, contents) {

    var e = document.getElementById('errors');

    while (e.firstChild) {
        e.removeChild(e.firstChild);
    }

    try {
        imsc1doc = imsc.fromXML(contents, errorHandler);

        $("#slider").slider("option", "min", 0);
        $("#slider").slider("option", "max", imsc1doc.getMediaTimeEvents().length - 1);
        $("#slider").slider("value", 0);

        updateISD(imsc1doc.getMediaTimeEvents()[0]);

        $("#slider").slider("enable");

        if (testSamples[sample_index].renders.length > 0) {

            $("#ref").attr('src', testSamples[sample_index].renders[0]);
            $("#ref-images").show();

        } else {

            $("#ref-images").hide();

        }

    } catch (msg) {

        console.log(msg);
    }


}

function updateISD(offset) {

    $("#media-time").val(offset);

    try {

        var isd = imsc.generateISD(imsc1doc, offset, errorHandler);

        var rdiv = document.getElementById('render-div');

        while (rdiv.firstChild) {
            rdiv.removeChild(rdiv.firstChild);
        }

        imsc.renderHTML(isd, rdiv, null);

    } catch (msg) {
        console.log(msg);
    }
}