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

        /* prune if temporally inactive */

        if (offset < elem.begin || offset >= elem.end) return null;
        /* 
         * determine the associated region
         * (the region element does not reference a region) so use null
         */

        var associated_region_id = parent !== null && elem.regionID !== '' ? elem.regionID : inherited_region_id;

        /* prune the element if the associated region is not the target region */

        if (associated_region_id !== '' && associated_region_id !== region.id)
            return null;

        /* create an ISD element */

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

            /* special rule for tts:writingMode */

            if (qname === imscStyles.byName.writingMode.qname &&
                    !(imscStyles.byName.direction.qname in isd_element.styleAttrs)) {

                var wm = isd_element.styleAttrs[qname];
                var dir;

                if (wm === "lrtb" || wm === "lr" || wm === "tblr") {

                    dir = "ltr";

                } else {

                    dir = "rtl";

                }

                isd_element.styleAttrs[imscStyles.byName.direction.qname] = dir;

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
                        !(sa.qname in elem.styleAttrs)) {

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

            if (! (cs.qname in spec_attr)) continue;

            if (cs.compute !== null) {

                var cstyle = cs.compute(
                        /*doc, parent, element, attr*/
                        doc,
                        parent,
                        isd_element,
                        isd_element.styleAttrs[cs.qname]
                        );


                isd_element.styleAttrs[cs.qname] = cstyle;


                // reportError(errorHandler, "Style '" + sa.qname + "' on element '" + isd_element.kind + "' cannot be computed");

            }

        }

        /* prune if tts:display is none */

        if (isd_element.styleAttrs[imscStyles.byName.display.qname] === "none")
            return null;

        /* process children */

        /* if we are processing the region, use the body element as the child */

        var contents = parent === null ? [body] : elem.contents;

        for (var x in contents) {

            var c = isdProcessContentElement(doc, offset, region, body, isd_element, associated_region_id, contents[x]);

            /* 
             * keep child element only if they are non-null and their region match 
             * the region of this element
             */

            if (c !== null && (c.region_id === associated_region_id || associated_region_id === '')) {

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

        /* trim white space if space is "default" */

        if (isd_element.kind === 'span' && isd_element.text !== null && isd_element.space === "default") {

            var trimmedspan = isd_element.text.trim();

            if (trimmedspan.length === 0) {

                isd_element.text = null;

            }

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
                isd_element.contents.length > 0 ||
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

    function ISD(tt) {
        this.contents = [];
        this.aspectRatio = tt.aspectRatio;
    }

    function ISDContentElement(ttelem) {

        /* assume the element is a region if it does not have a kind */

        this.kind = ttelem.kind || 'region';

        /* deep copy of style attributes */
        this.styleAttrs = {};

        for (var sname in ttelem.styleAttrs) {

            this.styleAttrs[sname] =
                    ttelem.styleAttrs[sname];
        }

        this.contents = [];

        /* TODO: clean this! */

        if ('text' in ttelem) {

            this.text = ttelem.text;

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
