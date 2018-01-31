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

/**
 * @module imscISD
 */


;
(function (imscISD, imscNames, imscStyles) { // wrapper for non-node envs

    /** 
     * Creates a canonical representation of an IMSC1 document returned by <pre>imscDoc.fromXML()</pre>
     * at a given absolute offset in seconds. This offset does not have to be one of the values returned
     * by <pre>getMediaTimeEvents()</pre>.
     * 
     * @param {Object} tt IMSC1 document
     * @param {number} offset Absolute offset (in seconds)
     * @param {?module:imscUtils.ErrorHandler} errorHandler Error callback
     * @returns {Object} Opaque in-memory representation of an ISD
     */

    imscISD.generateISD = function (tt, offset, errorHandler) {

        /* TODO check for tt and offset validity */

        /* create the ISD object from the IMSC1 doc */

        var isd = new ISD(tt);

        /* process regions */

        for (var r in tt.head.layout.regions) {

            /* post-order traversal of the body tree per [construct intermediate document] */

            var c = isdProcessContentElement(tt, offset, tt.head.layout.regions[r], tt.body, null, '', tt.head.layout.regions[r], errorHandler);

            if (c !== null) {

                /* add the region to the ISD */

                isd.contents.push(c.element);
            }


        }

        return isd;
    };

    function isdProcessContentElement(doc, offset, region, body, parent, inherited_region_id, elem, errorHandler) {

        /* prune if temporally inactive (<br> are not included in timing) */

        if (elem.kind !== 'br' && (offset < elem.begin || offset >= elem.end)) {
            return null;
        }

        /* 
         * set the associated region as specified by the regionID attribute, or the 
         * inherited associated region otherwise
         */

        var associated_region_id = 'regionID' in elem && elem.regionID !== '' ? elem.regionID : inherited_region_id;

        /* prune the element if either:
         * - the element is not terminal and the associated region is neither the default
         *   region nor the parent region (this allows children to be associated with a 
         *   region later on)
         * - the element is terminal and the associated region is not the parent region
         */
        
        /* TODO: improve detection of terminal elements since <region> has no contents */

        if (parent !== null /* are we in the region element */ &&
            associated_region_id !== region.id &&
                (
                    (! ('contents' in elem)) ||
                    ('contents' in elem && elem.contents.length === 0) ||
                    associated_region_id !== ''
                )
             )
            return null;

        /* create an ISD element, including applying specified styles */

        var isd_element = new ISDContentElement(elem);

        /* apply set (animation) styling */

        for (var i in elem.sets) {

            if (offset < elem.sets[i].begin || offset >= elem.sets[i].end)
                continue;

            isd_element.styleAttrs[elem.sets[i].qname] = elem.sets[i].value;

        }

        /* 
         * keep track of specified styling attributes so that we
         * can compute them later
         */

        var spec_attr = {};

        for (var qname in isd_element.styleAttrs) {

            spec_attr[qname] = true;

            /* special rule for tts:writingMode (section 7.29.1 of XSL)
             * direction is set consistently with writingMode only
             * if writingMode sets inline-direction to LTR or RTL  
             */

            if (qname === imscStyles.byName.writingMode.qname &&
                !(imscStyles.byName.direction.qname in isd_element.styleAttrs)) {

                var wm = isd_element.styleAttrs[qname];

                if (wm === "lrtb" || wm === "lr") {

                    isd_element.styleAttrs[imscStyles.byName.direction.qname] = "ltr";

                } else if (wm === "rltb" || wm === "rl") {

                    isd_element.styleAttrs[imscStyles.byName.direction.qname] = "rtl";

                }

            }
        }

        /* inherited styling */

        if (parent !== null) {

            for (var j in imscStyles.all) {

                var sa = imscStyles.all[j];

                /* textDecoration has special inheritance rules */

                if (sa.qname === imscStyles.byName.textDecoration.qname) {

                    /* handle both textDecoration inheritance and specification */

                    var ps = parent.styleAttrs[sa.qname];
                    var es = isd_element.styleAttrs[sa.qname];
                    var outs = [];

                    if (es === undefined) {

                        outs = ps;

                    } else if (es.indexOf("none") === -1) {

                        if ((es.indexOf("noUnderline") === -1 &&
                            ps.indexOf("underline") !== -1) ||
                            es.indexOf("underline") !== -1) {

                            outs.push("underline");

                        }

                        if ((es.indexOf("noLineThrough") === -1 &&
                            ps.indexOf("lineThrough") !== -1) ||
                            es.indexOf("lineThrough") !== -1) {

                            outs.push("lineThrough");

                        }

                        if ((es.indexOf("noOverline") === -1 &&
                            ps.indexOf("overline") !== -1) ||
                            es.indexOf("overline") !== -1) {

                            outs.push("overline");

                        }

                    } else {

                        outs.push("none");

                    }

                    isd_element.styleAttrs[sa.qname] = outs;

                } else if (sa.inherit &&
                    (sa.qname in parent.styleAttrs) &&
                    !(sa.qname in isd_element.styleAttrs)) {

                    isd_element.styleAttrs[sa.qname] = parent.styleAttrs[sa.qname];

                }

            }

        }

        /* initial value styling */

        for (var k in imscStyles.all) {

            var ivs = imscStyles.all[k];

            /* skip if value is already specified */

            if (ivs.qname in isd_element.styleAttrs) continue;

            /* apply initial value to elements other than region only if non-inherited */

            if (isd_element.kind === 'region' || (ivs.inherit === false && ivs.initial !== null)) {

                isd_element.styleAttrs[ivs.qname] = ivs.parse(ivs.initial);

                /* keep track of the style as specified */

                spec_attr[ivs.qname] = true;

            }

        }

        /* compute styles (only for non-inherited styles) */
        /* TODO: get rid of spec_attr */

        for (var z in imscStyles.all) {

            var cs = imscStyles.all[z];

            if (!(cs.qname in spec_attr)) continue;

            if (cs.compute !== null) {

                var cstyle = cs.compute(
                    /*doc, parent, element, attr*/
                    doc,
                    parent,
                    isd_element,
                    isd_element.styleAttrs[cs.qname]
                    );

                if (cstyle !== null) {
                    isd_element.styleAttrs[cs.qname] = cstyle;
                } else {
                    reportError(errorHandler, "Style '" + cs.qname + "' on element '" + isd_element.kind + "' cannot be computed");
                }
            }

        }

        /* prune if tts:display is none */

        if (isd_element.styleAttrs[imscStyles.byName.display.qname] === "none")
            return null;

        /* process contents of the element */

        var contents;

        if (parent === null) {

            /* we are processing the region */

            if (body === null) {

                /* if there is no body, still process the region but with empty content */

                contents = [];

            } else {

                /*use the body element as contents */

                contents = [body];

            }

        } else if ('contents' in elem) {

            contents = elem.contents;

        }

        for (var x in contents) {

            var c = isdProcessContentElement(doc, offset, region, body, isd_element, associated_region_id, contents[x]);

            /* 
             * keep child element only if they are non-null and their region match 
             * the region of this element
             */

            if (c !== null) {

                isd_element.contents.push(c.element);

            }

        }

        /* compute used value of lineHeight="normal" */

        /*        if (isd_element.styleAttrs[imscStyles.byName.lineHeight.qname] === "normal"  ) {
         
         isd_element.styleAttrs[imscStyles.byName.lineHeight.qname] =
         isd_element.styleAttrs[imscStyles.byName.fontSize.qname] * 1.2;
         
         }
         */

        /* remove styles that are not applicable */

        for (var qnameb in isd_element.styleAttrs) {
            var da = imscStyles.byQName[qnameb];

            if (da.applies.indexOf(isd_element.kind) === -1) {
                delete isd_element.styleAttrs[qnameb];
            }
        }

        /* collapse white space if space is "default" */

        if (isd_element.kind === 'span' && isd_element.text && isd_element.space === "default") {

            var trimmedspan = isd_element.text.replace(/\s+/g, ' ');

            isd_element.text = trimmedspan;

        }

        /* trim whitespace around explicit line breaks */

        if (isd_element.kind === 'p') {

            var elist = [];

            constructSpanList(isd_element, elist);

            var l = 0;

            var state = "after_br";
            var br_pos = 0;

            while (true) {

                if (state === "after_br") {

                    if (l >= elist.length || elist[l].kind === "br") {

                        state = "before_br";
                        br_pos = l;
                        l--;

                    } else {

                        if (elist[l].space !== "preserve") {

                            elist[l].text = elist[l].text.replace(/^\s+/g, '');

                        }

                        if (elist[l].text.length > 0) {

                            state = "looking_br";
                            l++;

                        } else {

                            elist.splice(l, 1);

                        }

                    }

                } else if (state === "before_br") {

                    if (l < 0 || elist[l].kind === "br") {

                        state = "after_br";
                        l = br_pos + 1;

                        if (l >= elist.length) break;

                    } else {

                        if (elist[l].space !== "preserve") {

                            elist[l].text = elist[l].text.replace(/\s+$/g, '');

                        }

                        if (elist[l].text.length > 0) {

                            state = "after_br";
                            l = br_pos + 1;

                            if (l >= elist.length) break;

                        } else {

                            elist.splice(l, 1);
                            l--;

                        }

                    }

                } else {

                    if (l >= elist.length || elist[l].kind === "br") {

                        state = "before_br";
                        br_pos = l;
                        l--;

                    } else {

                        l++;

                    }

                }

            }
            
            pruneEmptySpans(isd_element);

        }

        /* keep element if:
         * * contains a background image
         * * <br/>
         * * if there are children
         * * if <span> and has text
         * * if region and showBackground = always
         */

        if ((isd_element.kind === 'div' && imscStyles.byName.backgroundImage.qname in isd_element.styleAttrs) ||
            isd_element.kind === 'br' ||
            ('contents' in isd_element && isd_element.contents.length > 0) ||
            (isd_element.kind === 'span' && isd_element.text !== null) ||
            (isd_element.kind === 'region' &&
                isd_element.styleAttrs[imscStyles.byName.showBackground.qname] === 'always')) {

            return {
                region_id: associated_region_id,
                element: isd_element
            };
        }

        return null;
    }

    function constructSpanList(element, elist) {

        if ('contents' in element) {

            for (var i in element.contents) {
                constructSpanList(element.contents[i], elist);
            }

        } else {

            elist.push(element);

        }

    }

    function pruneEmptySpans(element) {

        if (element.kind === 'br') {
            
            return false;
            
        } else if ('text' in element) {
            
            return  element.text.length === 0;
            
        } else if ('contents' in element) {
            
            var i = element.contents.length;

            while (i--) {
                
                if (pruneEmptySpans(element.contents[i])) {
                    element.contents.splice(i, 1);
                }
                
            }
            
            return element.contents.length === 0;

        }
    }

    function ISD(tt) {
        this.contents = [];
        this.aspectRatio = tt.aspectRatio;
    }

    function ISDContentElement(ttelem) {

        /* assume the element is a region if it does not have a kind */

        this.kind = ttelem.kind || 'region';
        
        /* copy id */
        
        if (ttelem.id) {
            this.id = ttelem.id;
        }

        /* deep copy of style attributes */
        this.styleAttrs = {};

        for (var sname in ttelem.styleAttrs) {

            this.styleAttrs[sname] =
                ttelem.styleAttrs[sname];
        }

        /* TODO: clean this! */

        if ('text' in ttelem) {

            this.text = ttelem.text;

        } else if (ttelem.kind !== 'br') {
            
            this.contents = [];
        }

        if ('space' in ttelem) {

            this.space = ttelem.space;
        }
    }


    /*
     * ERROR HANDLING UTILITY FUNCTIONS
     * 
     */

    function reportInfo(errorHandler, msg) {

        if (errorHandler && errorHandler.info && errorHandler.info(msg))
            throw msg;

    }

    function reportWarning(errorHandler, msg) {

        if (errorHandler && errorHandler.warn && errorHandler.warn(msg))
            throw msg;

    }

    function reportError(errorHandler, msg) {

        if (errorHandler && errorHandler.error && errorHandler.error(msg))
            throw msg;

    }

    function reportFatal(errorHandler, msg) {

        if (errorHandler && errorHandler.fatal)
            errorHandler.fatal(msg);

        throw msg;

    }


})(typeof exports === 'undefined' ? this.imscISD = {} : exports,
    typeof imscNames === 'undefined' ? require("./names") : imscNames,
    typeof imscStyles === 'undefined' ? require("./styles") : imscStyles
    );
