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
 * @module imscStyles
 */

;
(function (imscStyles, imscNames, imscUtils) { // wrapper for non-node envs

    function StylingAttributeDefinition(ns, name, initialValue, appliesTo, isInherit, isAnimatable, parseFunc, computeFunc) {
        this.name = name;
        this.ns = ns;
        this.qname = ns + " " + name;
        this.inherit = isInherit;
        this.animatable = isAnimatable;
        this.initial = initialValue;
        this.applies = appliesTo;
        this.parse = parseFunc;
        this.compute = computeFunc;
    }

    imscStyles.all = [

        new StylingAttributeDefinition(
            imscNames.ns_tts,
            "backgroundColor",
            "transparent",
            ['body', 'div', 'p', 'region', 'span'],
            false,
            true,
            imscUtils.parseColor,
            null
            ),
        new StylingAttributeDefinition(
            imscNames.ns_tts,
            "color",
            "white",
            ['span'],
            true,
            true,
            imscUtils.parseColor,
            null
            ),
        new StylingAttributeDefinition(
            imscNames.ns_tts,
            "direction",
            "ltr",
            ['p', 'span'],
            true,
            true,
            function (str) {
                return str;
            },
            null
            ),
        new StylingAttributeDefinition(
            imscNames.ns_tts,
            "display",
            "auto",
            ['body', 'div', 'p', 'region', 'span'],
            false,
            true,
            function (str) {
                return str;
            },
            null
            ),
        new StylingAttributeDefinition(
            imscNames.ns_tts,
            "displayAlign",
            "before",
            ['region'],
            false,
            true,
            function (str) {
                return str;
            },
            null
            ),
        new StylingAttributeDefinition(
            imscNames.ns_tts,
            "extent",
            "auto",
            ['tt', 'region'],
            false,
            true,
            function (str) {

                if (str === "auto") {

                    return str;

                } else {

                    var s = str.split(" ");
                    if (s.length !== 2)
                        return null;
                    var w = imscUtils.parseLength(s[0]);
                    var h = imscUtils.parseLength(s[1]);
                    if (!h || !w)
                        return null;
                    return {'h': h, 'w': w};
                }

            },
            function (doc, parent, element, attr, context) {

                var h;
                var w;

                if (attr === "auto") {

                    h = 1;

                } else if (attr.h.unit === "%") {

                    h = attr.h.value / 100;

                } else if (attr.h.unit === "px") {

                    h = attr.h.value / doc.pxDimensions.h;

                } else {

                    return null;

                }

                if (attr === "auto") {

                    w = 1;

                } else if (attr.w.unit === "%") {

                    w = attr.w.value / 100;

                } else if (attr.w.unit === "px") {

                    w = attr.w.value / doc.pxDimensions.w;

                } else {

                    return null;

                }

                return {'h': h, 'w': w};
            }
        ),
        new StylingAttributeDefinition(
            imscNames.ns_tts,
            "fontFamily",
            "default",
            ['span'],
            true,
            true,
            function (str) {
                var ffs = str.split(",");
                var rslt = [];

                for (var i in ffs) {

                    if (ffs[i].charAt(0) !== "'" && ffs[i].charAt(0) !== '"') {

                        if (ffs[i] === "default") {

                            /* per IMSC1 */

                            rslt.push("monospaceSerif");

                        } else {

                            rslt.push(ffs[i]);

                        }

                    } else {

                        rslt.push(ffs[i]);

                    }

                }

                return rslt;
            },
            null
            ),
        new StylingAttributeDefinition(
            imscNames.ns_tts,
            "fontShear",
            "0%",
            ['p'],
            true,
            true,
            imscUtils.parseLength,
            function (doc, parent, element, attr) {

                var fs;

                if (attr.unit === "%") {

                    fs = Math.abs(attr.value) > 100 ? Math.sign(attr.value) * 100 : attr.value;

                } else {

                    return null;

                }

                return fs;
            }
        ),
        new StylingAttributeDefinition(
            imscNames.ns_tts,
            "fontSize",
            "1c",
            ['span'],
            true,
            true,
            imscUtils.parseLength,
            function (doc, parent, element, attr, context) {

                var fs;

                if (attr.unit === "%") {

                    if (parent !== null) {

                        fs = parent.styleAttrs[imscStyles.byName.fontSize.qname] * attr.value / 100;

                    } else {

                        /* region, so percent of 1c */

                        fs = attr.value / 100 / doc.cellResolution.h;

                    }

                } else if (attr.unit === "em") {

                    if (parent !== null) {

                        fs = parent.styleAttrs[imscStyles.byName.fontSize.qname] * attr.value;

                    } else {

                        /* region, so percent of 1c */

                        fs = attr.value / doc.cellResolution.h;

                    }

                } else if (attr.unit === "c") {

                    fs = attr.value / doc.cellResolution.h;

                } else if (attr.unit === "px") {

                    fs = attr.value / doc.pxDimensions.h;

                } else {

                    return null;

                }

                return fs;
            }
        ),
        new StylingAttributeDefinition(
            imscNames.ns_tts,
            "fontStyle",
            "normal",
            ['span'],
            true,
            true,
            function (str) {
                /* TODO: handle font style */

                return str;
            },
            null
            ),
        new StylingAttributeDefinition(
            imscNames.ns_tts,
            "fontWeight",
            "normal",
            ['span'],
            true,
            true,
            function (str) {
                /* TODO: handle font weight */

                return str;
            },
            null
            ),
        new StylingAttributeDefinition(
            imscNames.ns_tts,
            "lineHeight",
            "normal",
            ['p'],
            true,
            true,
            function (str) {
                if (str === "normal") {
                    return str;
                } else {
                    return imscUtils.parseLength(str);
                }
            },
            function (doc, parent, element, attr, context) {

                var lh;

                if (attr === "normal") {

                    /* inherit normal per https://github.com/w3c/ttml1/issues/220 */

                    lh = attr;

                } else if (attr.unit === "%") {

                    lh = element.styleAttrs[imscStyles.byName.fontSize.qname] * attr.value / 100;

                } else if (attr.unit === "em") {

                    lh = element.styleAttrs[imscStyles.byName.fontSize.qname] * attr.value;

                } else if (attr.unit === "c") {

                    lh = attr.value / doc.cellResolution.h;

                } else if (attr.unit === "px") {

                    /* TODO: handle error if no px dimensions are provided */

                    lh = attr.value / doc.pxDimensions.h;

                } else {

                    return null;

                }

                /* TODO: create a Length constructor */

                return lh;
            }
        ),
        new StylingAttributeDefinition(
            imscNames.ns_tts,
            "opacity",
            1.0,
            ['region'],
            false,
            true,
            parseFloat,
            null
            ),
        new StylingAttributeDefinition(
            imscNames.ns_tts,
            "origin",
            "auto",
            ['region'],
            false,
            true,
            function (str) {

                if (str === "auto") {

                    return str;

                } else {

                    var s = str.split(" ");
                    if (s.length !== 2)
                        return null;
                    var w = imscUtils.parseLength(s[0]);
                    var h = imscUtils.parseLength(s[1]);
                    if (!h || !w)
                        return null;
                    return {'h': h, 'w': w};
                }

            },
            function (doc, parent, element, attr, context) {

                var h;
                var w;

                if (attr === "auto") {

                    h = 0;

                } else if (attr.h.unit === "%") {

                    h = attr.h.value / 100;

                } else if (attr.h.unit === "px") {

                    h = attr.h.value / doc.pxDimensions.h;

                } else {

                    return null;

                }

                if (attr === "auto") {

                    w = 0;

                } else if (attr.w.unit === "%") {

                    w = attr.w.value / 100;

                } else if (attr.w.unit === "px") {

                    w = attr.w.value / doc.pxDimensions.w;

                } else {

                    return null;

                }

                return {'h': h, 'w': w};
            }
        ),
        new StylingAttributeDefinition(
            imscNames.ns_tts,
            "overflow",
            "hidden",
            ['region'],
            false,
            true,
            function (str) {
                return str;
            },
            null
            ),
        new StylingAttributeDefinition(
            imscNames.ns_tts,
            "padding",
            "0px",
            ['region'],
            false,
            true,
            function (str) {

                var s = str.split(" ");
                if (s.length > 4)
                    return null;
                var r = [];
                for (var i in s) {

                    var l = imscUtils.parseLength(s[i]);
                    if (!l)
                        return null;
                    r.push(l);
                }

                return r;
            },
            function (doc, parent, element, attr, context) {

                var padding;

                /* TODO: make sure we are in region */

                /*
                 * expand padding shortcuts to 
                 * [before, end, after, start]
                 * 
                 */

                if (attr.length === 1) {

                    padding = [attr[0], attr[0], attr[0], attr[0]];

                } else if (attr.length === 2) {

                    padding = [attr[0], attr[1], attr[0], attr[1]];

                } else if (attr.length === 3) {

                    padding = [attr[0], attr[1], attr[2], attr[1]];

                } else if (attr.length === 4) {

                    padding = [attr[0], attr[1], attr[2], attr[3]];

                } else {

                    return null;

                }

                /* TODO: take into account tts:direction */

                /* 
                 * transform [before, end, after, start] according to writingMode to 
                 * [top,left,bottom,right]
                 * 
                 */

                var dir = element.styleAttrs[imscStyles.byName.writingMode.qname];

                if (dir === "lrtb" || dir === "lr") {

                    padding = [padding[0], padding[3], padding[2], padding[1]];

                } else if (dir === "rltb" || dir === "rl") {

                    padding = [padding[0], padding[1], padding[2], padding[3]];

                } else if (dir === "tblr") {

                    padding = [padding[3], padding[0], padding[1], padding[2]];

                } else if (dir === "tbrl" || dir === "tb") {

                    padding = [padding[3], padding[2], padding[1], padding[0]];

                } else {

                    return null;

                }

                var out = [];

                for (var i in padding) {

                    if (padding[i].value === 0) {

                        out[i] = 0;

                    } else if (padding[i].unit === "%") {

                        if (i === "0" || i === "2") {

                            out[i] = element.styleAttrs[imscStyles.byName.extent.qname].h * padding[i].value / 100;

                        } else {

                            out[i] = element.styleAttrs[imscStyles.byName.extent.qname].w * padding[i].value / 100;
                        }

                    } else if (padding[i].unit === "em") {

                        out[i] = element.styleAttrs[imscStyles.byName.fontSize.qname] * padding[i].value;

                    } else if (padding[i].unit === "c") {

                        out[i] = padding[i].value / doc.cellResolution.h;

                    } else if (padding[i].unit === "px") {

                        out[i] = padding[i].value / doc.pxDimensions.h;

                    } else {

                        return null;

                    }
                }


                return out;
            }
        ),
        new StylingAttributeDefinition(
            imscNames.ns_tts,
            "position",
            "top left",
            ['region'],
            false,
            true,
            function (str) {

                return imscUtils.parsePosition(str);

            },
            function (doc, parent, element, attr) {
                var h;
                var w;

                if (attr.v.offset.unit === "%") {

                    if (attr.v.edge === "bottom") {

                        h = (1 - element.styleAttrs[imscStyles.byName.extent.qname].h) * (1 - attr.v.offset.value / 100);


                    } else {

                        h = (1 - element.styleAttrs[imscStyles.byName.extent.qname].h) * attr.v.offset.value / 100;

                    }

                } else if (attr.v.offset.unit === "px") {

                    if (attr.v.edge === "bottom") {

                        h = 1 - attr.v.offset.value / doc.pxDimensions.h - element.styleAttrs[imscStyles.byName.extent.qname].h;

                    } else {

                        h = attr.v.offset.value / doc.pxDimensions.h;

                    }


                } else {

                    return null;

                }


                if (attr.h.offset.unit === "%") {

                    if (attr.h.edge === "right") {

                        w = (1 - element.styleAttrs[imscStyles.byName.extent.qname].w) * (1 - attr.h.offset.value / 100);


                    } else {

                        w = (1 - element.styleAttrs[imscStyles.byName.extent.qname].w) * attr.h.offset.value / 100;

                    }

                } else if (attr.h.offset.unit === "px") {

                    if (attr.h.edge === "right") {

                        w = 1 - attr.h.offset.value / doc.pxDimensions.w - element.styleAttrs[imscStyles.byName.extent.qname].w;

                    } else {

                        w = attr.h.offset.value / doc.pxDimensions.w;

                    }

                } else {

                    return null;

                }


                return {'h': h, 'w': w};
            }
        ),
        new StylingAttributeDefinition(
            imscNames.ns_tts,
            "ruby",
            "none",
            ['span'],
            false,
            true,
            function (str) {
                return str;
            },
            null
            ),
        new StylingAttributeDefinition(
            imscNames.ns_tts,
            "rubyAlign",
            "center",
            ['span'],
            true,
            true,
            function (str) {
                return str;
            },
            null
            ),
        new StylingAttributeDefinition(
            imscNames.ns_tts,
            "rubyPosition",
            "outside",
            ['span'],
            true,
            true,
            function (str) {
                return str;
            },
            null
            ),
        new StylingAttributeDefinition(
            imscNames.ns_tts,
            "rubyReserve",
            "none",
            ['p'],
            true,
            true,
            function (str) {
                var s = str.split(" ");

                var r = [null, null];

                if (s.length === 0 || s.length > 2)
                    return null;

                if (s[0] === "none" ||
                    s[0] === "both" ||
                    s[0] === "after" ||
                    s[0] === "before" ||
                    s[0] === "outside") {

                    r[0] = s[0];

                } else {

                    return null;

                }

                if (s.length === 2 && s[0] !== "none") {

                    var l = imscUtils.parseLength(s[1]);

                    if (l) {

                        r[1] = l;

                    } else {
                        
                        return null;
                        
                    }
                    
                }


                return r;
            },
            function (doc, parent, element, attr, context) {

                if (attr[0] === "none") {
                    
                    return attr;
                    
                }
                
                var fs;
                
                if (attr[1] === null) {
                    
                    fs = element.styleAttrs[imscStyles.byName.fontSize.qname] * 0.5;
                    
                } else if (attr[1].unit === "%") {

                    fs = element.styleAttrs[imscStyles.byName.fontSize.qname] * attr[1].value / 100;

                } else if (attr[1].unit === "em") {

                    fs = element.styleAttrs[imscStyles.byName.fontSize.qname] * attr[1].value;

                } else if (attr[1].unit === "c") {

                    fs = attr[1].value / doc.cellResolution.h;

                } else if (attr[1].unit === "px") {

                    fs = attr[1].value / doc.pxDimensions.h;

                } else {

                    return null;

                }

                return [attr[0], fs];
            }
            ),
        new StylingAttributeDefinition(
            imscNames.ns_tts,
            "showBackground",
            "always",
            ['region'],
            false,
            true,
            function (str) {
                return str;
            },
            null
            ),
        new StylingAttributeDefinition(
            imscNames.ns_tts,
            "textAlign",
            "start",
            ['p'],
            true,
            true,
            function (str) {
                return str;
            },
            function (doc, parent, element, attr, context) {
                /* Section 7.16.9 of XSL */

                if (attr === "left") {

                    return "start";

                } else if (attr === "right") {

                    return "end";

                } else {

                    return attr;

                }
            }
        ),
        new StylingAttributeDefinition(
            imscNames.ns_tts,
            "textCombine",
            "none",
            ['span'],
            true,
            true,
            function (str) {
                var s = str.split(" ");

                if (s.length === 1) {

                    if (s[0] === "none" || s[0] === "all") {

                        return [s[0]];

                    } else if (s[0] === "digits") {

                        return [s[0], 2];

                    }

                } else if (s.length === 2) {

                    if (s[0] === "digits") {

                        var num = parseInt(s[1], 10);

                        if (!isNaN(num)) {

                            return [s[0], num];

                        }

                    }
                }

                return null;
            },
            null
            ),
        new StylingAttributeDefinition(
            imscNames.ns_tts,
            "textDecoration",
            "none",
            ['span'],
            true,
            true,
            function (str) {
                return str.split(" ");
            },
            null
            ),
        new StylingAttributeDefinition(
            imscNames.ns_tts,
            "textEmphasis",
            "none",
            ['span'],
            false,
            true,
            function (str) {
                var e = str.split(" ");

                var rslt = {style: "filled", symbol: "circle", color: null, position: null};

                for (var i in e) {

                    if (e[i] === "none" || e[i] === "auto") {

                        rslt.style = e[i];

                    } else if (e[i] === "filled" ||
                        e[i] === "open") {

                        rslt.style = e[i];

                    } else if (e[i] === "circle" ||
                        e[i] === "dot" ||
                        e[i] === "sesame") {

                        rslt.symbol = e[i];

                    } else if (e[i] === "current") {

                        rslt.color = e[i];

                    } else if (e[i] === "outside") {

                        rslt.position = "outside";

                    } else if (e[i] === "before" || e[i] === "after") {

                        return null;

                    } else {

                        rslt.color = imscUtils.parseColor(e[i]);

                        if (rslt.color === null) return null;

                    }
                }

                return rslt;
            },
            null
            ),
        new StylingAttributeDefinition(
            imscNames.ns_tts,
            "textOutline",
            "none",
            ['span'],
            true,
            true,
            function (str) {

                /*
                 * returns {c: <color>?, thichness: <length>} | "none"
                 * 
                 */

                if (str === "none") {

                    return str;

                } else {

                    var r = {};
                    var s = str.split(" ");
                    if (s.length === 0 || s.length > 2)
                        return null;
                    var c = imscUtils.parseColor(s[0]);

                    r.color = c;

                    if (c !== null)
                        s.shift();

                    if (s.length !== 1)
                        return null;

                    var l = imscUtils.parseLength(s[0]);

                    if (!l)
                        return null;

                    r.thickness = l;

                    return r;
                }

            },
            function (doc, parent, element, attr, context) {

                /*
                 * returns {color: <color>, thickness: <norm length>}
                 * 
                 */

                if (attr === "none")
                    return attr;

                var rslt = {};

                if (attr.color === null) {

                    rslt.color = element.styleAttrs[imscStyles.byName.color.qname];

                } else {

                    rslt.color = attr.color;

                }

                if (attr.thickness.unit === "%") {

                    rslt.thickness = element.styleAttrs[imscStyles.byName.fontSize.qname] * attr.thickness.value / 100;

                } else if (attr.thickness.unit === "em") {

                    rslt.thickness = element.styleAttrs[imscStyles.byName.fontSize.qname] * attr.thickness.value;

                } else if (attr.thickness.unit === "c") {

                    rslt.thickness = attr.thickness.value / doc.cellResolution.h;

                } else if (attr.thickness.unit === "px") {

                    rslt.thickness = attr.thickness.value / doc.pxDimensions.h;

                } else {

                    return null;

                }


                return rslt;
            }
        ),
        new StylingAttributeDefinition(
            imscNames.ns_tts,
            "textShadow",
            "none",
            ['span'],
            true,
            true,
            imscUtils.parseTextShadow,
            function (doc, parent, element, attr) {

                /*
                 * returns [{x_off: <length>, y_off: <length>, b_radius: <length>, color: <color>}*] or "none"
                 * 
                 */

                if (attr === "none") return attr;

                var r = [];

                for (var i in attr) {

                    var shadow = {};

                    if (attr[i][0].unit === "%") {

                        shadow.x_off = element.styleAttrs[imscStyles.byName.fontSize.qname] *
                            attr[i][0].value / 100;

                    } else if (attr[i][0].unit === "px") {

                        shadow.x_off = attr[i][0].value / doc.pxDimensions.w;

                    } else {

                        return null;

                    }

                    if (attr[i][1].unit === "%") {

                        shadow.y_off = element.styleAttrs[imscStyles.byName.fontSize.qname] *
                            attr[i][1].value / 100;

                    } else if (attr[i][1].unit === "px") {

                        shadow.y_off = attr[i][1].value / doc.pxDimensions.h;

                    } else {

                        return null;

                    }

                    if (attr[i][2] === null) {

                        shadow.b_radius = 0;

                    } else if (attr[i][2].unit === "%") {

                        shadow.b_radius = element.styleAttrs[imscStyles.byName.fontSize.qname] *
                            attr[i][2].value / 100;

                    } else if (attr[i][2].unit === "px") {

                        shadow.b_radius = attr[i][2].value / doc.pxDimensions.h;

                    } else {

                        return null;

                    }

                    if (attr[i][3] === null) {

                        shadow.color = element.styleAttrs[imscStyles.byName.color.qname];

                    } else {

                        shadow.color = attr[i][3];

                    }

                    r.push(shadow);

                }

                return r;
            }
        ),
        new StylingAttributeDefinition(
            imscNames.ns_tts,
            "unicodeBidi",
            "normal",
            ['span', 'p'],
            false,
            true,
            function (str) {
                return str;
            },
            null
            ),
        new StylingAttributeDefinition(
            imscNames.ns_tts,
            "visibility",
            "visible",
            ['body', 'div', 'p', 'region', 'span'],
            true,
            true,
            function (str) {
                return str;
            },
            null
            ),
        new StylingAttributeDefinition(
            imscNames.ns_tts,
            "wrapOption",
            "wrap",
            ['span'],
            true,
            true,
            function (str) {
                return str;
            },
            null
            ),
        new StylingAttributeDefinition(
            imscNames.ns_tts,
            "writingMode",
            "lrtb",
            ['region'],
            false,
            true,
            function (str) {
                return str;
            },
            null
            ),
        new StylingAttributeDefinition(
            imscNames.ns_tts,
            "zIndex",
            "auto",
            ['region'],
            false,
            true,
            function (str) {

                var rslt;

                if (str === 'auto') {

                    rslt = str;

                } else {

                    rslt = parseInt(str);

                    if (isNaN(rslt)) {
                        rslt = null;
                    }

                }

                return rslt;
            },
            null
            ),
        new StylingAttributeDefinition(
            imscNames.ns_ebutts,
            "linePadding",
            "0c",
            ['p'],
            true,
            false,
            imscUtils.parseLength,
            function (doc, parent, element, attr, context) {
                if (attr.unit === "c") {

                    return attr.value / doc.cellResolution.h;

                } else {

                    return null;

                }
            }
        ),
        new StylingAttributeDefinition(
            imscNames.ns_ebutts,
            "multiRowAlign",
            "auto",
            ['p'],
            true,
            false,
            function (str) {
                return str;
            },
            null
            ),
        new StylingAttributeDefinition(
            imscNames.ns_smpte,
            "backgroundImage",
            null,
            ['div'],
            false,
            false,
            function (str) {
                return str;
            },
            null
            ),
        new StylingAttributeDefinition(
            imscNames.ns_itts,
            "forcedDisplay",
            "false",
            ['body', 'div', 'p', 'region', 'span'],
            true,
            true,
            function (str) {
                return str === 'true' ? true : false;
            },
            null
            ),
        new StylingAttributeDefinition(
            imscNames.ns_itts,
            "fillLineGap",
            "false",
            ['p'],
            true,
            true,
            function (str) {
                return str === 'true' ? true : false;
            },
            null
            )
    ];

    /* TODO: allow null parse function */

    imscStyles.byQName = {};
    for (var i in imscStyles.all) {

        imscStyles.byQName[imscStyles.all[i].qname] = imscStyles.all[i];
    }

    imscStyles.byName = {};
    for (var j in imscStyles.all) {

        imscStyles.byName[imscStyles.all[j].name] = imscStyles.all[j];
    }

})(typeof exports === 'undefined' ? this.imscStyles = {} : exports,
    typeof imscNames === 'undefined' ? require("./names") : imscNames,
    typeof imscUtils === 'undefined' ? require("./utils") : imscUtils);
