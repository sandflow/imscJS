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

var reffiles_root = "reference-files/";

var render_height = 270;
var render_width = 480;

function getReferenceFilesPaths() {
    return "test-list.json";
}

function getReferenceFilePath(name) {
    return "ttml/" + name + ".ttml";
}

function getReferencePNGPath(name, offset) {
    return "renders/" + name + "/png/" + offset.toFixed(6).toString() + ".png";
}

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


$(function () {
    asyncDisplayTests();
});


function asyncDisplayTests() {
    
    var vsdiv = document.getElementById('tests');
    var listdiv = document.getElementById('test-list'); 

    asyncLoadFile(reffiles_root + getReferenceFilesPaths())
        .then(function (contents) {

            finfos = JSON.parse(contents);

            for (var i in finfos) {
                
                var rdiv = document.createElement("div");
                rdiv.className = "test";
                rdiv.id = finfos[i].name;
                vsdiv.appendChild(rdiv);
                
                var a = document.createElement("a");
                a.href = "#" + finfos[i].name;
                a.textContent = finfos[i].name;
                listdiv.appendChild(a);
                listdiv.appendChild(document.createElement("br"));

                asyncDisplayTest(rdiv, finfos[i]);

            }
        });

}

function asyncDisplayTest(div, finfo) {

    return asyncLoadFile(reffiles_root + getReferenceFilePath(finfo.name))
        .then(function (reffile) {
            
            var h1 = document.createElement("h1");
            h1.textContent = finfo.name;
            div.appendChild(h1);
            
            var odiv = document.createElement("table");
            odiv.className = "offsets";
            div.appendChild(odiv);
            
            var png_div = document.createElement("tr");
            png_div.className = "pngs";
            /*var png_h2 = document.createElement("h2");
            png_h2.textContent = "Reference Images";
            png_div.appendChild(png_h2);*/
            odiv.appendChild(png_div);

           
            var r_div = document.createElement("tr");
            r_div.className = "renders";
            /*var r_h2 = document.createElement("h2");
            r_h2.textContent = "Rendered Events";
            r_div.appendChild(r_h2);*/
            odiv.appendChild(r_div);
           
            var doc = imsc.fromXML(reffile, errorHandler);

            var events = doc.getMediaTimeEvents();

            for (var i in events) {

                asyncDisplayOffset(finfo.name, doc, events[i], png_div, r_div, finfo.params.displayForcedOnlyMode);

            }

        });
}

function asyncDisplayOffset(test_name, doc, offset, png_div, r_div, displayForcedOnlyMode) {

    var isd = imsc.generateISD(doc, offset);
    
    var v_div = document.createElement("td");
    v_div.className = "render";
    v_div.style.height = render_height;
    v_div.style.width = render_width;
    v_div.style.position = "relative";
    v_div.style.background = "linear-gradient(135deg, #b5bdc8 0%,#828c95 36%,#28343b 100%)";
    
    r_div.appendChild(v_div);
    
    imsc.renderHTML(
                            isd,
                            v_div,
                            function (uri) {
                                return uri;
                            },
                            render_height,
                            render_width,
                            displayForcedOnlyMode === true,
                            errorHandler
                            );
                        
    var i_div = document.createElement("td");
    i_div.className = "png";
    i_div.style.height = render_height + "px";
    i_div.style.width = render_width + "px";                    

    var img = document.createElement("img");
    
    img.src = reffiles_root + getReferencePNGPath(test_name, offset);
    img.height = render_height;
    img.width = render_width;
    
    i_div.appendChild(img);
    
    png_div.appendChild(i_div);
}