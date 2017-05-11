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
 * @module imscDoc
 */

;
(function (imscDoc, sax, imscNames, imscStyles, imscUtils) {


    /**
     * Allows a client to provide callbacks to handle children of the <metadata> element
     * @typedef {Object} MetadataHandler
     * @property {?OpenTagCallBack} onOpenTag
     * @property {?CloseTagCallBack} onCloseTag
     * @property {?TextCallBack} onText
     */

    /**
     * Called when the opening tag of an element node is encountered.
     * @callback OpenTagCallBack
     * @param {string} ns Namespace URI of the element
     * @param {string} name Local name of the element
     * @param {Object[]} attributes List of attributes, each consisting of a
     *                              `uri`, `name` and `value`
     */

    /**
     * Called when the closing tag of an element node is encountered.
     * @callback CloseTagCallBack
     */

    /**
     * Called when a text node is encountered.
     * @callback TextCallBack
     * @param {string} contents Contents of the text node
     */

    /**
     * Parses an IMSC1 document into an opaque in-memory representation that exposes
     * a single method <pre>getMediaTimeEvents()</pre> that returns a list of time
     * offsets (in seconds) of the ISD, i.e. the points in time where the visual
     * representation of the document change. `metadataHandler` allows the caller to
     * be called back when nodes are present in <metadata> elements. 
     * 
     * @param {string} xmlstring XML document
     * @param {?module:imscUtils.ErrorHandler} errorHandler Error callback
     * @param {?MetadataHandler} metadataHandler Callback for <Metadata> elements
     * @returns {Object} Opaque in-memory representation of an IMSC1 document
     */

    imscDoc.fromXML = function (xmlstring, errorHandler, metadataHandler) {
        var p = sax.parser(true, {xmlns: true});
        var estack = [];
        var xmllangstack = [];
        var xmlspacestack = [];
        var metadata_depth = 0;
        var doc = null;

        p.onclosetag = function (node) {

            if (estack[0] instanceof Styling) {

                /* flatten chained referential styling */

                for (var sid in estack[0].styles) {

                    mergeChainedStyles(estack[0], estack[0].styles[sid], errorHandler);

                }

            } else if (estack[0] instanceof P || estack[0] instanceof Span) {

                /* merge anonymous spans */

                if (estack[0].contents.length > 1) {

                    var cs = [estack[0].contents[0]];

                    var c;

                    for (c = 1; c < estack[0].contents.length; c++) {

                        if (estack[0].contents[c] instanceof Span && estack[0].contents[c].anon &&
                            cs[cs.length - 1] instanceof Span && cs[cs.length - 1].anon) {

                            cs[cs.length - 1].text += estack[0].contents[c].text;

                        } else {

                            cs.push(estack[0].contents[c]);

                        }

                    }

                    estack[0].contents = cs;

                }

                // remove redundant nested anonymous spans (9.3.3(1)(c))

                if (estack[0] instanceof Span &&
                    estack[0].contents.length === 1 &&
                    estack[0].contents[0] instanceof Span &&
                    estack[0].contents[0].anon &&
                    estack[0].text === null) {

                    estack[0].text = estack[0].contents[0].text;
                    estack[0].contents = [];

                }

            } else if (estack[0] instanceof ForeignElement) {

                if (estack[0].node.uri === imscNames.ns_tt &&
                    estack[0].node.local === 'metadata') {

                    /* leave the metadata element */

                    metadata_depth--;

                } else if (metadata_depth > 0 &&
                    metadataHandler &&
                    'onCloseTag' in metadataHandler) {

                    /* end of child of metadata element */

                    metadataHandler.onCloseTag();

                }

            }

            // TODO: delete stylerefs?

            // maintain the xml:space stack

            xmlspacestack.shift();

            // maintain the xml:lang stack

            xmllangstack.shift();

            // prepare for the next element

            estack.shift();
        };

        p.ontext = function (str) {

            if (estack[0] === undefined) {

                /* ignoring text outside of elements */

            } else if (estack[0] instanceof Span || estack[0] instanceof P) {

                /* create an anonymous span */

                var s = Span.createAnonymousSpan(doc, estack[0], xmlspacestack[0], str, errorHandler);

                estack[0].contents.push(s);

            } else if (estack[0] instanceof ForeignElement &&
                metadata_depth > 0 &&
                metadataHandler &&
                'onText' in metadataHandler) {

                /* text node within a child of metadata element */

                metadataHandler.onText(str);

            }

        };


        p.onopentag = function (node) {

            // maintain the xml:space stack

            var xmlspace = node.attributes["xml:space"];

            if (xmlspace) {

                xmlspacestack.unshift(xmlspace.value);

            } else {

                if (xmlspacestack.length === 0) {

                    xmlspacestack.unshift("default");

                } else {

                    xmlspacestack.unshift(xmlspacestack[0]);

                }

            }

            /* maintain the xml:lang stack */


            var xmllang = node.attributes["xml:lang"];

            if (xmllang) {

                xmllangstack.unshift(xmllang.value);

            } else {

                if (xmllangstack.length === 0) {

                    xmllangstack.unshift("");

                } else {

                    xmllangstack.unshift(xmllangstack[0]);

                }

            }


            /* process the element */

            if (node.uri === imscNames.ns_tt) {

                if (node.local === 'tt') {

                    if (doc !== null) {

                        reportFatal("Two <tt> elements at (" + this.line + "," + this.column + ")");

                    }

                    doc = new TT();

                    doc.initFromNode(node, errorHandler);

                    estack.unshift(doc);

                } else if (node.local === 'head') {

                    if (!(estack[0] instanceof TT)) {
                        reportFatal("Parent of <head> element is not <tt> at (" + this.line + "," + this.column + ")");
                    }

                    if (doc.head !== null) {
                        reportFatal("Second <head> element at (" + this.line + "," + this.column + ")");
                    }

                    doc.head = new Head();

                    estack.unshift(doc.head);

                } else if (node.local === 'styling') {

                    if (!(estack[0] instanceof Head)) {
                        reportFatal("Parent of <styling> element is not <head> at (" + this.line + "," + this.column + ")");
                    }

                    if (doc.head.styling !== null) {
                        reportFatal("Second <styling> element at (" + this.line + "," + this.column + ")");
                    }

                    doc.head.styling = new Styling();

                    estack.unshift(doc.head.styling);

                } else if (node.local === 'style') {

                    var s;

                    if (estack[0] instanceof Styling) {

                        s = new Style();

                        s.initFromNode(node, errorHandler);

                        /* ignore <style> element missing @id */

                        if (!s.id) {

                            reportError("<style> element missing @id attribute");

                        } else {

                            doc.head.styling.styles[s.id] = s;

                        }

                        estack.unshift(s);

                    } else if (estack[0] instanceof Region) {

                        /* nested styles can be merged with specified styles
                         * immediately, with lower priority
                         * (see 8.4.4.2(3) at TTML1 )
                         */

                        s = new Style();

                        s.initFromNode(node, errorHandler);

                        mergeStylesIfNotPresent(s.styleAttrs, estack[0].styleAttrs);

                        estack.unshift(s);

                    } else {

                        reportFatal(errorHandler, "Parent of <style> element is not <styling> or <region> at (" + this.line + "," + this.column + ")");

                    }

                } else if (node.local === 'layout') {

                    if (!(estack[0] instanceof Head)) {

                        reportFatal(errorHandler, "Parent of <layout> element is not <head> at " + this.line + "," + this.column + ")");

                    }

                    if (doc.head.layout !== null) {

                        reportFatal(errorHandler, "Second <layout> element at " + this.line + "," + this.column + ")");

                    }

                    doc.head.layout = new Layout();

                    estack.unshift(doc.head.layout);

                } else if (node.local === 'region') {

                    if (!(estack[0] instanceof Layout)) {
                        reportFatal(errorHandler, "Parent of <region> element is not <layout> at " + this.line + "," + this.column + ")");
                    }

                    var r = new Region();

                    r.initFromNode(doc, node, errorHandler);

                    if (!r.id || r.id in doc.head.layout.regions) {

                        reportError(errorHandler, "Ignoring <region> with duplicate or missing @id at " + this.line + "," + this.column + ")");

                    } else {

                        doc.head.layout.regions[r.id] = r;

                        doc._registerEvent(r);

                    }

                    estack.unshift(r);

                } else if (node.local === 'body') {

                    if (!(estack[0] instanceof TT)) {

                        reportFatal(errorHandler, "Parent of <body> element is not <tt> at " + this.line + "," + this.column + ")");

                    }

                    if (doc.body !== null) {

                        reportFatal(errorHandler, "Second <body> element at " + this.line + "," + this.column + ")");

                    }

                    var b = new Body();

                    b.initFromNode(doc, node, errorHandler);

                    doc._registerEvent(b);

                    doc.body = b;

                    estack.unshift(b);

                } else if (node.local === 'div') {

                    if (!(estack[0] instanceof Div || estack[0] instanceof Body)) {

                        reportFatal(errorHandler, "Parent of <div> element is not <body> or <div> at " + this.line + "," + this.column + ")");

                    }

                    var d = new Div();

                    d.initFromNode(doc, estack[0], node, errorHandler);

                    doc._registerEvent(d);

                    estack[0].contents.push(d);

                    estack.unshift(d);

                } else if (node.local === 'p') {

                    if (!(estack[0] instanceof Div)) {

                        reportFatal(errorHandler, "Parent of <p> element is not <div> at " + this.line + "," + this.column + ")");

                    }

                    var p = new P();

                    p.initFromNode(doc, estack[0], node, errorHandler);

                    doc._registerEvent(p);

                    estack[0].contents.push(p);

                    estack.unshift(p);

                } else if (node.local === 'span') {

                    if (!(estack[0] instanceof Span || estack[0] instanceof P)) {

                        reportFatal(errorHandler, "Parent of <span> element is not <span> or <p> at " + this.line + "," + this.column + ")");

                    }

                    var ns = new Span();

                    ns.initFromNode(doc, estack[0], node, xmlspacestack[0], errorHandler);

                    doc._registerEvent(ns);

                    estack[0].contents.push(ns);

                    estack.unshift(ns);

                } else if (node.local === 'br') {

                    if (!(estack[0] instanceof Span || estack[0] instanceof P)) {

                        reportFatal(errorHandler, "Parent of <br> element is not <span> or <p> at " + this.line + "," + this.column + ")");

                    }

                    var nb = new Br();

                    nb.initFromNode(doc, estack[0], node, errorHandler);

                    doc._registerEvent(nb);

                    estack[0].contents.push(nb);

                    estack.unshift(nb);

                } else if (node.local === 'set') {

                    if (!(estack[0] instanceof Span ||
                        estack[0] instanceof P ||
                        estack[0] instanceof Div ||
                        estack[0] instanceof Body ||
                        estack[0] instanceof Region ||
                        estack[0] instanceof Br)) {

                        reportFatal(errorHandler, "Parent of <set> element is not a content element or a region at " + this.line + "," + this.column + ")");

                    }

                    var st = new Set();

                    st.initFromNode(doc, estack[0], node, errorHandler);

                    doc._registerEvent(st);

                    estack[0].sets.push(st);

                    estack.unshift(st);

                } else {

                    /* element in the TT namespace, but not a content element */

                    estack.unshift(new ForeignElement(node));
                }

            } else {

                /* ignore elements not in the TTML namespace unless in metadata element */

                estack.unshift(new ForeignElement(node));

            }

            /* handle metadata callbacks */

            if (estack[0] instanceof ForeignElement) {

                if (node.uri === imscNames.ns_tt &&
                    node.local === 'metadata') {

                    /* enter the metadata element */

                    metadata_depth++;

                } else if (
                    metadata_depth > 0 &&
                    metadataHandler &&
                    'onOpenTag' in metadataHandler
                    ) {

                    /* start of child of metadata element */

                    var attrs = [];

                    for (var a in node.attributes) {
                        attrs[node.attributes[a].uri + " " + node.attributes[a].local] =
                            {
                                uri: node.attributes[a].uri,
                                local: node.attributes[a].local,
                                value: node.attributes[a].value
                            };
                    }

                    metadataHandler.onOpenTag(node.uri, node.local, attrs);

                }

            }

        };

        // parse the document

        p.write(xmlstring).close();

        // all referential styling has been flatten, so delete the styling elements if there is a head
        // otherwise create an empty head

        if (doc.head !== null) {
            delete doc.head.styling;
        } else {
            doc.head = new Head();
        }

        // create default region if no regions specified

        if (doc.head.layout === null) {

            doc.head.layout = new Layout();

        }

        var hasRegions = false;

        /* AFAIK the only way to determine whether an object has members */

        for (var i in doc.head.layout.regions) {

            hasRegions = true;

            break;

        }

        if (!hasRegions) {

            var dr = Region.createDefaultRegion();

            doc.head.layout.regions[dr.id] = dr;

        }

        return doc;
    };

    function ForeignElement(node) {
        this.node = node;
    }

    function TT() {
        this.events = [];
        this.head = null;
        this.body = null;
    }

    TT.prototype.initFromNode = function (node, errorHandler) {

        /* compute cell resolution */

        this.cellResolution = extractCellResolution(node, errorHandler);

        /* extract frame rate and tick rate */

        var frtr = extractFrameAndTickRate(node, errorHandler);

        this.effectiveFrameRate = frtr.effectiveFrameRate;

        this.tickRate = frtr.tickRate;

        /* extract aspect ratio */

        this.aspectRatio = extractAspectRatio(node, errorHandler);

        /* check timebase */

        var attr = findAttribute(node, imscNames.ns_ttp, "timeBase");

        if (attr !== null && attr !== "media") {

            reportFatal(errorHandler, "Unsupported time base");

        }

        /* retrieve extent */

        var e = extractExtent(node, errorHandler);

        if (e === null) {

            /* TODO: remove once unit tests are ready */

            this.pxDimensions = {'h': 480, 'w': 640};

        } else {

            if (e.h.unit !== "px" || e.w.unit !== "px") {
                reportFatal(errorHandler, "Extent on TT must be in px or absent");
            }

            this.pxDimensions = {'h': e.h.value, 'w': e.w.value};
        }

    };

    /* register a temporal events */
    TT.prototype._registerEvent = function (elem) {

        /* skip if begin is not < then end */

        if (elem.end <= elem.begin) return;

        /* index the begin time of the event */

        var b_i = indexOf(this.events, elem.begin);

        if (!b_i.found) {
            this.events.splice(b_i.index, 0, elem.begin);
        }

        /* index the end time of the event */

        if (elem.end !== Number.POSITIVE_INFINITY) {

            var e_i = indexOf(this.events, elem.end);

            if (!e_i.found) {
                this.events.splice(e_i.index, 0, elem.end);
            }

        }

    };


    /*
     * Retrieves the range of ISD times covered by the document
     * 
     * @returns {Array} Array of two elements: min_begin_time and max_begin_time
     * 
     */
    TT.prototype.getMediaTimeRange = function () {

        return [this.events[0], this.events[this.events.length - 1]];
    };

    /*
     * Returns list of ISD begin times  
     * 
     * @returns {Array}
     */
    TT.prototype.getMediaTimeEvents = function () {

        return this.events;
    };

    /*
     * Represents a TTML Head element
     */

    function Head() {
        this.styling = null;
        this.layout = null;
    }

    /*
     * Represents a TTML Styling element
     */

    function Styling() {
        this.styles = {};
    }

    /*
     * Represents a TTML Style element
     */

    function Style() {
        this.id = null;
        this.styleAttrs = null;
        this.styleRefs = null;
    }

    Style.prototype.initFromNode = function (node, errorHandler) {
        this.id = elementGetXMLID(node);
        this.styleAttrs = elementGetStyles(node, errorHandler);
        this.styleRefs = elementGetStyleRefs(node);
    };

    /*
     * Represents a TTML Layout element
     * 
     */

    function Layout() {
        this.regions = {};
    }

    /*
     * Represents a TTML Content element
     * 
     */

    function ContentElement(kind) {
        this.kind = kind;
        this.begin = null;
        this.end = null;
        this.styleAttrs = null;
        this.contents = null;
        this.regionID = null;
        this.sets = null;
        this.timeContainer = null;
    }

    ContentElement.prototype.initFromNode = function (doc, parent, node, errorHandler) {

        var t = processTiming(doc, parent, node, errorHandler);
        this.begin = t.begin;
        this.end = t.end;

        this.styleAttrs = elementGetStyles(node, errorHandler);

        if (doc.head !== null && doc.head.styling !== null) {
            mergeReferencedStyles(doc.head.styling, elementGetStyleRefs(node), this.styleAttrs, errorHandler);
        }

        this.contents = [];

        this.regionID = elementGetRegionID(node);

        this.sets = [];

        this.timeContainer = elementGetTimeContainer(node, errorHandler);

    };

    /*
     * Represents a TTML body element
     */

    function Body() {
        ContentElement.call(this, 'body');
    }

    Body.prototype.initFromNode = function (doc, node, errorHandler) {
        ContentElement.prototype.initFromNode.call(this, doc, null, node, errorHandler);
    };

    /*
     * Represents a TTML div element
     */

    function Div() {
        ContentElement.call(this, 'div');
    }

    Div.prototype.initFromNode = function (doc, parent, node, errorHandler) {
        ContentElement.prototype.initFromNode.call(this, doc, parent, node, errorHandler);
    };

    /*
     * Represents a TTML p element
     */

    function P() {
        ContentElement.call(this, 'p');
    }

    P.prototype.initFromNode = function (doc, parent, node, errorHandler) {
        ContentElement.prototype.initFromNode.call(this, doc, parent, node, errorHandler);
    };

    /*
     * Represents a TTML span element
     */

    function Span() {
        ContentElement.call(this, 'span');
        this.text = null;
        this.space = null;
        this.anon = null;
    }

    Span.prototype.initFromNode = function (doc, parent, node, xmlspace, errorHandler) {
        ContentElement.prototype.initFromNode.call(this, doc, parent, node, errorHandler);
        this.text = null;
        this.space = xmlspace;
        this.anon = false;
    };

    Span.createAnonymousSpan = function (doc, parent, xmlspace, text, errorHandler) {

        var s = new Span();

        ContentElement.prototype.initFromNode.call(s, doc, parent, null, errorHandler);
        s.text = text;
        s.space = xmlspace;
        s.anon = true;

        return s;

    };

    /*
     * Represents a TTML br element
     */

    function Br() {
        ContentElement.call(this, 'br');
    }

    Br.prototype.initFromNode = function (doc, parent, node, errorHandler) {
        ContentElement.prototype.initFromNode.call(this, doc, parent, node, errorHandler);
    };

    /*
     * Represents a TTML Region element
     * 
     */

    function Region() {
        this.id = null;
        this.begin = null;
        this.end = null;
        this.styleAttrs = null;
        this.sets = null;
    }

    Region.createDefaultRegion = function () {
        var r = new Region();

        r.id = '';
        r.begin = 0;
        r.end = Number.POSITIVE_INFINITY;
        r.styleAttrs = {};
        r.sets = [];

        return r;
    };

    Region.prototype.initFromNode = function (doc, node, errorHandler) {

        this.id = elementGetXMLID(node);

        var t = processTiming(doc, null, node, errorHandler);
        this.begin = t.begin;
        this.end = t.end;

        this.styleAttrs = elementGetStyles(node, errorHandler);

        this.sets = [];

        /* immediately merge referenced styles */

        if (doc.head !== null && doc.head.styling !== null) {
            mergeReferencedStyles(doc.head.styling, elementGetStyleRefs(node), this.styleAttrs, errorHandler);
        }

    };

    /*
     * Represents a TTML Set element
     * 
     */

    function Set() {
        this.begin = null;
        this.end = null;
        this.qname = null;
        this.value = null;
    }

    Set.prototype.initFromNode = function (doc, parent, node, errorHandler) {

        var t = processTiming(doc, parent, node, errorHandler);

        this.begin = t.begin;
        this.end = t.end;

        var styles = elementGetStyles(node, errorHandler);

        for (var qname in styles) {

            if (this.qname) {

                reportError(errorHandler, "More than one style specified on set");
                break;

            }

            this.qname = qname;
            this.value = styles[qname];

        }

    };

    /*
     * Utility functions
     * 
     */


    function elementGetXMLID(node) {
        return node && 'xml:id' in node.attributes ? node.attributes['xml:id'].value || null : null;
    }

    function elementGetRegionID(node) {
        return node && 'region' in node.attributes ? node.attributes.region.value : '';
    }

    function elementGetTimeContainer(node, errorHandler) {

        var tc = node && 'timeContainer' in node.attributes ? node.attributes.timeContainer.value : null;

        if ((!tc) || tc === "par") {

            return "par";

        } else if (tc === "seq") {

            return "seq";

        } else {

            reportError(errorHandler, "Illegal value of timeContainer (assuming 'par')");

            return "par";

        }

    }

    function elementGetStyleRefs(node) {

        return node && 'style' in node.attributes ? node.attributes.style.value.split(" ") : [];

    }

    function elementGetStyles(node, errorHandler) {

        var s = {};

        if (node !== null) {

            for (var i in node.attributes) {

                var qname = node.attributes[i].uri + " " + node.attributes[i].local;

                var sa = imscStyles.byQName[qname];

                if (sa !== undefined) {

                    var val = sa.parse(node.attributes[i].value);

                    if (val !== null) {

                        s[qname] = val;

                        /* TODO: consider refactoring errorHandler into parse and compute routines */

                        if (sa === imscStyles.byName.zIndex) {
                            reportWarning(errorHandler, "zIndex attribute present but not used by IMSC1 since regions do not overlap");
                        }

                    } else {

                        reportError(errorHandler, "Cannot parse styling attribute " + qname + " --> " + node.attributes[i].value);

                    }

                }

            }

        }

        return s;
    }

    function findAttribute(node, ns, name) {
        for (var i in node.attributes) {

            if (node.attributes[i].uri === ns &&
                node.attributes[i].local === name) {

                return node.attributes[i].value;
            }
        }

        return null;
    }

    function extractAspectRatio(node, errorHandler) {

        var ar = findAttribute(node, imscNames.ns_ittp, "aspectRatio");

        var rslt = null;

        if (ar !== null) {

            var ASPECT_RATIO_RE = /(\d+) (\d+)/;

            var m = ASPECT_RATIO_RE.exec(ar);

            if (m !== null) {

                var w = parseInt(m[1]);

                var h = parseInt(m[2]);

                if (w !== 0 && h !== 0) {

                    rslt = w / h;

                } else {

                    reportError(errorHandler, "Illegal aspectRatio values (ignoring)");
                }

            } else {

                reportError(errorHandler, "Malformed aspectRatio attribute (ignoring)");
            }

        }

        return rslt;

    }

    /*
     * Returns the cellResolution attribute from a node
     * 
     */
    function extractCellResolution(node, errorHandler) {

        var cr = findAttribute(node, imscNames.ns_ttp, "cellResolution");

        // initial value

        var h = 15;
        var w = 32;

        if (cr !== null) {

            var CELL_RESOLUTION_RE = /(\d+) (\d+)/;

            var m = CELL_RESOLUTION_RE.exec(cr);

            if (m !== null) {

                w = parseInt(m[1]);

                h = parseInt(m[2]);

            } else {

                reportWarning(errorHandler, "Malformed cellResolution value (using initial value instead)");

            }

        }

        return {'w': w, 'h': h};

    }


    function extractFrameAndTickRate(node, errorHandler) {

        // subFrameRate is ignored per IMSC1 specification

        // extract frame rate

        var fps_attr = findAttribute(node, imscNames.ns_ttp, "frameRate");

        // initial value

        var fps = 30;

        // match variable

        var m;

        if (fps_attr !== null) {

            var FRAME_RATE_RE = /(\d+)/;

            m = FRAME_RATE_RE.exec(fps_attr);

            if (m !== null) {

                fps = parseInt(m[1]);

            } else {

                reportWarning(errorHandler, "Malformed frame rate attribute (using initial value instead)");
            }

        }

        // extract frame rate multiplier

        var frm_attr = findAttribute(node, imscNames.ns_ttp, "frameRateMultiplier");

        // initial value

        var frm = 1;

        if (frm_attr !== null) {

            var FRAME_RATE_MULT_RE = /(\d+) (\d+)/;

            m = FRAME_RATE_MULT_RE.exec(frm_attr);

            if (m !== null) {

                frm = parseInt(m[1]) / parseInt(m[2]);

            } else {

                reportWarning(errorHandler, "Malformed frame rate multiplier attribute (using initial value instead)");
            }

        }

        var efps = frm * fps;

        // extract tick rate

        var tr = 1;

        var trattr = findAttribute(node, imscNames.ns_ttp, "tickRate");

        if (trattr === null) {

            if (fps_attr !== null) tr = efps;

        } else {

            var TICK_RATE_RE = /(\d+)/;

            m = TICK_RATE_RE.exec(trattr);

            if (m !== null) {

                tr = parseInt(m[1]);

            } else {

                reportWarning(errorHandler, "Malformed tick rate attribute (using initial value instead)");
            }

        }

        return {effectiveFrameRate: efps, tickRate: tr};

    }

    function extractExtent(node, errorHandler) {

        var attr = findAttribute(node, imscNames.ns_tts, "extent");

        if (attr === null) return null;

        var s = attr.split(" ");

        if (s.length !== 2) {

            reportWarning(errorHandler, "Malformed extent (ignoring)");

            return null;
        }

        var w = imscUtils.parseLength(s[0]);

        var h = imscUtils.parseLength(s[1]);

        if (!h || !w) {

            reportWarning(errorHandler, "Malformed extent values (ignoring)");

            return null;
        }

        return {'h': h, 'w': w};

    }

    function parseTimeExpression(tickRate, effectiveFrameRate, str) {

        var CLOCK_TIME_FRACTION_RE = /^(\d{2,}):(\d\d):(\d\d(?:\.\d+)?)$/;
        var CLOCK_TIME_FRAMES_RE = /^(\d{2,}):(\d\d):(\d\d)\:(\d{2,})$/;
        var OFFSET_FRAME_RE = /^(\d+(?:\.\d+)?)f$/;
        var OFFSET_TICK_RE = /^(\d+(?:\.\d+)?)t$/;
        var OFFSET_MS_RE = /^(\d+(?:\.\d+)?)ms$/;
        var OFFSET_S_RE = /^(\d+(?:\.\d+)?)s$/;
        var OFFSET_H_RE = /^(\d+(?:\.\d+)?)h$/;
        var OFFSET_M_RE = /^(\d+(?:\.\d+)?)m$/;
        var m;
        var r = null;
        if ((m = OFFSET_FRAME_RE.exec(str)) !== null) {

            if (effectiveFrameRate !== null) {

                r = parseFloat(m[1]) / effectiveFrameRate;
            }

        } else if ((m = OFFSET_TICK_RE.exec(str)) !== null) {

            if (tickRate !== null) {

                r = parseFloat(m[1]) / tickRate;
            }

        } else if ((m = OFFSET_MS_RE.exec(str)) !== null) {

            r = parseFloat(m[1]) / 1000.0;

        } else if ((m = OFFSET_S_RE.exec(str)) !== null) {

            r = parseFloat(m[1]);

        } else if ((m = OFFSET_H_RE.exec(str)) !== null) {

            r = parseFloat(m[1]) * 3600.0;

        } else if ((m = OFFSET_M_RE.exec(str)) !== null) {

            r = parseFloat(m[1]) * 60.0;

        } else if ((m = CLOCK_TIME_FRACTION_RE.exec(str)) !== null) {

            r = parseInt(m[1]) * 3600 +
                parseInt(m[2]) * 60 +
                parseFloat(m[3]);

        } else if ((m = CLOCK_TIME_FRAMES_RE.exec(str)) !== null) {

            /* this assumes that HH:MM:SS is a clock-time-with-fraction */

            if (effectiveFrameRate !== null) {

                r = parseInt(m[1]) * 3600 +
                    parseInt(m[2]) * 60 +
                    parseInt(m[3]) +
                    (m[4] === null ? 0 : parseInt(m[4]) / effectiveFrameRate);
            }

        }

        return r;
    }

    function processTiming(doc, parent, node, errorHandler) {

        /* Q: what does this do <div b=1 e=3><p b=1 e=5> ?*/
        /* Q: are children clipped by parent time interval? */

        var isseq = parent && parent.timeContainer === "seq";

        /* retrieve begin value */

        var b = 0;

        if (node && 'begin' in node.attributes) {

            b = parseTimeExpression(doc.tickRate, doc.effectiveFrameRate, node.attributes.begin.value);

            if (b === null) {

                reportWarning(errorHandler, "Malformed begin value " + node.attributes.begin.value + " (using 0)");

                b = 0;

            }

        }

        /* retrieve dur value */

        /* NOTE: end is not meaningful on seq container children and dur is equal to 0 if not specified */

        var d = isseq ? 0 : null;

        if (node && 'dur' in node.attributes) {

            d = parseTimeExpression(doc.tickRate, doc.effectiveFrameRate, node.attributes.dur.value);

            if (d === null) {

                reportWarning(errorHandler, "Malformed dur value " + node.attributes.dur.value + " (ignoring)");

            }

        }

        /* retrieve end value */

        var e = null;

        if (node && 'end' in node.attributes) {

            e = parseTimeExpression(doc.tickRate, doc.effectiveFrameRate, node.attributes.end.value);

            if (e === null) {

                reportWarning(errorHandler, "Malformed end value (ignoring)");

            }

        }

        /* compute starting offset */

        var start_off = 0;

        if (parent) {

            if (isseq && parent.contents.length > 0) {

                /*
                 * if seq time container, offset from the previous sibling end
                 */

                start_off = parent.contents[parent.contents.length - 1].end;


            } else {

                /* 
                 * retrieve parent begin. Assume 0 if no parent.
                 * 
                 */

                start_off = parent.begin || 0;

            }

        }

        /* offset begin per time container semantics */

        b += start_off;

        /* set end */

        if (d !== null) {

            // use dur if specified

            e = b + d;

        } else {

            /* retrieve parent end, or +infinity if none */

            var parent_e = (parent && 'end' in parent) ? parent.end : Number.POSITIVE_INFINITY;

            e = (e !== null) ? e + start_off : parent_e;

        }

        return {begin: b, end: e};

    }



    function mergeChainedStyles(styling, style, errorHandler) {

        while (style.styleRefs.length > 0) {

            var sref = style.styleRefs.pop();

            if (!(sref in styling.styles)) {
                reportError(errorHandler, "Non-existant style id referenced");
                continue;
            }

            mergeChainedStyles(styling, styling.styles[sref], errorHandler);

            mergeStylesIfNotPresent(styling.styles[sref].styleAttrs, style.styleAttrs);

        }

    }

    function mergeReferencedStyles(styling, stylerefs, styleattrs, errorHandler) {

        for (var i = stylerefs.length - 1; i >= 0; i--) {

            var sref = stylerefs[i];

            if (!(sref in styling.styles)) {
                reportError(errorHandler, "Non-existant style id referenced");
                continue;
            }

            mergeStylesIfNotPresent(styling.styles[sref].styleAttrs, styleattrs);

        }

    }

    function mergeStylesIfNotPresent(from_styles, into_styles) {

        for (var sname in from_styles) {

            if (sname in into_styles)
                continue;

            into_styles[sname] = from_styles[sname];

        }

    }

    /* TODO: validate style format at parsing */


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

    /*
     * Binary search utility function
     * 
     * @typedef {Object} BinarySearchResult
     * @property {boolean} found Was an exact match found?
     * @property {number} index Position of the exact match or insert position
     * 
     * @returns {BinarySearchResult}
     */

    function indexOf(arr, searchval) {

        var min = 0;
        var max = arr.length - 1;
        var cur;

        while (min <= max) {

            cur = Math.floor((min + max) / 2);

            var curval = arr[cur];

            if (curval < searchval) {

                min = cur + 1;

            } else if (curval > searchval) {

                max = cur - 1;

            } else {

                return {found: true, index: cur};

            }

        }

        return {found: false, index: min};
    }


})(typeof exports === 'undefined' ? this.imscDoc = {} : exports,
    typeof sax === 'undefined' ? require("sax") : sax,
    typeof imscNames === 'undefined' ? require("./names") : imscNames,
    typeof imscStyles === 'undefined' ? require("./styles") : imscStyles,
    typeof imscUtils === 'undefined' ? require("./utils") : imscUtils);
