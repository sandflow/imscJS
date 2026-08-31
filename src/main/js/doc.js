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

import sax from "sax";
import { reportError, reportFatal, reportWarning } from "./error.js";
import { ns_ebutts, ns_ittp, ns_itts, ns_tt, ns_ttp, ns_tts } from "./names.js";
import { byName, byQName } from "./styles.js";
import { ComputedLength, hasOwnProperty, parseLength } from "./utils.js";

/**
 * @module imscDoc
 */

/**
 * @typedef {import("./error").ErrorHandler} ErrorHandler
 */

/**
 * @typedef {sax.Tag | sax.QualifiedTag} Node
 */

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
 * @param {Record<string, {uri: string, name: string, value: string}>} attributes List of attributes, each consisting of a
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
 * @param {ErrorHandler} errorHandler Error callback
 * @param {?MetadataHandler} metadataHandler Callback for <Metadata> elements
 * @returns {?TT} Opaque in-memory representation of an IMSC1 document
 */

export function fromXML(xmlstring, errorHandler, metadataHandler) {
    const p = sax.parser(true, { xmlns: true });
    const estack = [];
    const xmllangstack = [];
    const xmlspacestack = [];
    let metadata_depth = 0;
    let doc = null;

    p.onclosetag = function () {

        if (estack[0] instanceof Region) {

            /* merge referenced styles */

            if (doc.head !== null && doc.head.styling !== null) {
                mergeReferencedStyles(doc.head.styling, estack[0].styleRefs, estack[0].styleAttrs, errorHandler);
            }

            delete estack[0].styleRefs;

        } else if (estack[0] instanceof Styling) {

            /* flatten chained referential styling */

            for (const sid in estack[0].styles) {

                if (!hasOwnProperty(estack[0].styles, sid)) continue;

                mergeChainedStyles(estack[0], estack[0].styles[sid], errorHandler);

            }

        } else if (estack[0] instanceof P || estack[0] instanceof Span) {

            /* merge anonymous spans */

            if (estack[0].contents.length > 1) {

                const cs = [estack[0].contents[0]];

                let c;

                for (c = 1; c < estack[0].contents.length; c++) {

                    if (estack[0].contents[c] instanceof AnonymousSpan &&
                        cs[cs.length - 1] instanceof AnonymousSpan) {

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
                estack[0].contents[0] instanceof AnonymousSpan) {

                estack[0].text = estack[0].contents[0].text;
                delete estack[0].contents;

            }

        } else if (estack[0] instanceof ForeignElement) {

            if (estack[0].node.uri === ns_tt &&
                estack[0].node.local === "metadata") {

                /* leave the metadata element */

                metadata_depth--;

            } else if (metadata_depth > 0 &&
                metadataHandler &&
                "onCloseTag" in metadataHandler) {

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

            /* ignore children text nodes in ruby container spans */

            if (estack[0] instanceof Span) {

                const ruby = estack[0].styleAttrs[byName.ruby.qname];

                if (ruby === "container" || ruby === "textContainer" || ruby === "baseContainer") {

                    return;

                }

            }

            /* create an anonymous span */

            const s = new AnonymousSpan();

            s.initFromText(doc, estack[0], str, xmllangstack[0], xmlspacestack[0], errorHandler);

            estack[0].contents.push(s);

        } else if (estack[0] instanceof ForeignElement &&
            metadata_depth > 0 &&
            metadataHandler &&
            "onText" in metadataHandler) {

            /* text node within a child of metadata element */

            metadataHandler.onText(str);

        }

    };

    p.onopentag = function (node) {

        // maintain the xml:space stack

        const xmlspace = node.attributes["xml:space"];

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

        const xmllang = node.attributes["xml:lang"];

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

        if (node.uri === ns_tt) {

            if (node.local === "tt") {

                if (doc !== null) {

                    reportFatal(errorHandler, "Two <tt> elements at (" + this.line + "," + this.column + ")");

                }

                doc = new TT();

                doc.initFromNode(node, xmllangstack[0], errorHandler);

                estack.unshift(doc);

            } else if (node.local === "head") {

                if (!(estack[0] instanceof TT)) {
                    reportFatal(errorHandler, "Parent of <head> element is not <tt> at (" + this.line + "," + this.column + ")");
                }

                estack.unshift(doc.head);

            } else if (node.local === "styling") {

                if (!(estack[0] instanceof Head)) {
                    reportFatal(errorHandler, "Parent of <styling> element is not <head> at (" + this.line + "," + this.column + ")");
                }

                estack.unshift(doc.head.styling);

            } else if (node.local === "style") {

                let s;

                if (estack[0] instanceof Styling) {

                    s = new Style();

                    s.initFromNode(node, errorHandler);

                    /* ignore <style> element missing @id */

                    if (!s.id) {

                        reportError(errorHandler, "<style> element missing @id attribute");

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

            } else if (node.local === "initial") {

                let ini;

                if (estack[0] instanceof Styling) {

                    ini = new Initial();

                    ini.initFromNode(node, errorHandler);

                    for (const qn in ini.styleAttrs) {

                        if (!hasOwnProperty(ini.styleAttrs, qn)) continue;

                        doc.head.styling.initials[qn] = ini.styleAttrs[qn];

                    }

                    estack.unshift(ini);

                } else {

                    reportFatal(errorHandler, "Parent of <initial> element is not <styling> at (" + this.line + "," + this.column + ")");

                }

            } else if (node.local === "layout") {

                if (!(estack[0] instanceof Head)) {

                    reportFatal(errorHandler, "Parent of <layout> element is not <head> at " + this.line + "," + this.column + ")");

                }

                estack.unshift(doc.head.layout);

            } else if (node.local === "region") {

                if (!(estack[0] instanceof Layout)) {
                    reportFatal(errorHandler, "Parent of <region> element is not <layout> at " + this.line + "," + this.column + ")");
                }

                const r = new Region();

                r.initFromNode(doc, node, xmllangstack[0], errorHandler);

                if (!r.id || r.id in doc.head.layout.regions) {

                    reportError(errorHandler, "Ignoring <region> with duplicate or missing @id at " + this.line + "," + this.column + ")");

                } else {

                    doc.head.layout.regions[r.id] = r;

                }

                estack.unshift(r);

            } else if (node.local === "body") {

                if (!(estack[0] instanceof TT)) {

                    reportFatal(errorHandler, "Parent of <body> element is not <tt> at " + this.line + "," + this.column + ")");

                }

                if (doc.body !== null) {

                    reportFatal(errorHandler, "Second <body> element at " + this.line + "," + this.column + ")");

                }

                const b = new Body();

                b.initFromNode(doc, node, xmllangstack[0], errorHandler);

                doc.body = b;

                estack.unshift(b);

            } else if (node.local === "div") {

                if (!(estack[0] instanceof Div || estack[0] instanceof Body)) {

                    reportFatal(errorHandler, "Parent of <div> element is not <body> or <div> at " + this.line + "," + this.column + ")");

                }

                const d = new Div();

                d.initFromNode(doc, estack[0], node, xmllangstack[0], errorHandler);

                /* transform smpte:backgroundImage to TTML2 image element */

                const bi = d.styleAttrs[byName.backgroundImage.qname];

                if (bi) {
                    d.contents.push(new Image(bi));
                    delete d.styleAttrs[byName.backgroundImage.qname];
                }

                estack[0].contents.push(d);

                estack.unshift(d);

            } else if (node.local === "image") {

                if (!(estack[0] instanceof Div)) {

                    reportFatal(errorHandler, "Parent of <image> element is not <div> at " + this.line + "," + this.column + ")");

                }

                const img = new Image();

                img.initFromNode(doc, estack[0], node, xmllangstack[0], errorHandler);

                estack[0].contents.push(img);

                estack.unshift(img);

            } else if (node.local === "p") {

                if (!(estack[0] instanceof Div)) {

                    reportFatal(errorHandler, "Parent of <p> element is not <div> at " + this.line + "," + this.column + ")");

                }

                const p = new P();

                p.initFromNode(doc, estack[0], node, xmllangstack[0], errorHandler);

                estack[0].contents.push(p);

                estack.unshift(p);

            } else if (node.local === "span") {

                if (!(estack[0] instanceof Span || estack[0] instanceof P)) {

                    reportFatal(errorHandler, "Parent of <span> element is not <span> or <p> at " + this.line + "," + this.column + ")");

                }

                const ns = new Span();

                ns.initFromNode(doc, estack[0], node, xmllangstack[0], xmlspacestack[0], errorHandler);

                estack[0].contents.push(ns);

                estack.unshift(ns);

            } else if (node.local === "br") {

                if (!(estack[0] instanceof Span || estack[0] instanceof P)) {

                    reportFatal(errorHandler, "Parent of <br> element is not <span> or <p> at " + this.line + "," + this.column + ")");

                }

                const nb = new Br();

                nb.initFromNode(doc, estack[0], node, xmllangstack[0], errorHandler);

                estack[0].contents.push(nb);

                estack.unshift(nb);

            } else if (node.local === "set") {

                if (!(estack[0] instanceof Span ||
                    estack[0] instanceof P ||
                    estack[0] instanceof Div ||
                    estack[0] instanceof Body ||
                    estack[0] instanceof Region ||
                    estack[0] instanceof Br)) {

                    reportFatal(errorHandler, "Parent of <set> element is not a content element or a region at " + this.line + "," + this.column + ")");

                }

                const st = new Set();

                st.initFromNode(doc, estack[0], node, errorHandler);

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

            if (node.uri === ns_tt &&
                node.local === "metadata") {

                /* enter the metadata element */

                metadata_depth++;

            } else if (
                metadata_depth > 0 &&
                metadataHandler &&
                "onOpenTag" in metadataHandler
            ) {

                /* start of child of metadata element */

                const attrs = [];

                for (const a in node.attributes) {
                    attrs[node.attributes[a].uri + " " + node.attributes[a].local] =
                    {
                        uri: node.attributes[a].uri,
                        local: node.attributes[a].local,
                        value: node.attributes[a].value,
                    };
                }

                metadataHandler.onOpenTag(node.uri, node.local, attrs);

            }

        }

    };

    // parse the document

    p.write(xmlstring).close();

    // all referential styling has been flatten, so delete styles

    delete doc.head.styling.styles;

    // create default region if no regions specified

    const regions = doc.head.layout.regions;
    let hasRegions = false;

    /* AFAIK the only way to determine whether an object has members */

    for (const i in regions) {

        if (hasOwnProperty(regions, i)) {
            hasRegions = true;
            break;
        }

    }

    if (!hasRegions) {

        /* create default region */

        const dr = Region.prototype.createDefaultRegion(doc.lang);

        regions[dr.id] = dr;

    }

    /* resolve desired timing for regions */

    for (const region_i in regions) {

        if (!hasOwnProperty(regions, region_i)) continue;

        resolveTiming(doc, regions[region_i], null, null);

    }

    /* resolve desired timing for content elements */

    if (doc.body) {
        resolveTiming(doc, doc.body, null, null);
    }

    /* remove undefined spans in ruby containers */

    if (doc.body) {
        cleanRubyContainers(doc.body);
    }

    return doc;
};

function cleanRubyContainers(element) {

    if (!("contents" in element)) return;

    const rubyval = "styleAttrs" in element ? element.styleAttrs[byName.ruby.qname] : null;

    const isrubycontainer = (element.kind === "span" && (rubyval === "container" || rubyval === "textContainer" || rubyval === "baseContainer"));

    for (let i = element.contents.length - 1; i >= 0; i--) {

        if (isrubycontainer && !("styleAttrs" in element.contents[i] && byName.ruby.qname in element.contents[i].styleAttrs)) {

            /* prune undefined <span> in ruby containers */

            delete element.contents[i];

        } else {

            cleanRubyContainers(element.contents[i]);

        }

    }

}

function resolveTiming(doc, element, prev_sibling, parent) {

    /* are we in a seq container? */

    const isinseq = parent && parent.timeContainer === "seq";

    /* determine implicit begin */

    let implicit_begin = 0; /* default */

    if (parent) {

        if (isinseq && prev_sibling) {

            /*
             * if seq time container, offset from the previous sibling end
             */

            implicit_begin = prev_sibling.end;

        } else {

            implicit_begin = parent.begin;

        }

    }

    /* compute desired begin */

    element.begin = element.explicit_begin ? element.explicit_begin + implicit_begin : implicit_begin;

    /* determine implicit end */

    let implicit_end = element.begin;

    let s = null;

    if ("sets" in element) {

        for (let set_i = 0; set_i < element.sets.length; set_i++) {

            resolveTiming(doc, element.sets[set_i], s, element);

            if (element.timeContainer === "seq") {

                implicit_end = element.sets[set_i].end;

            } else {

                implicit_end = Math.max(implicit_end, element.sets[set_i].end);

            }

            s = element.sets[set_i];

        }

    }

    if (!("contents" in element)) {

        /* anonymous spans and regions and <set> and <br>s and spans with only children text nodes */

        if (isinseq) {

            /* in seq container, implicit duration is zero */

            implicit_end = element.begin;

        } else {

            /* in par container, implicit duration is indefinite */

            implicit_end = Number.POSITIVE_INFINITY;

        }

    } else if ("contents" in element) {

        for (let content_i = 0; content_i < element.contents.length; content_i++) {

            resolveTiming(doc, element.contents[content_i], s, element);

            if (element.timeContainer === "seq") {

                implicit_end = element.contents[content_i].end;

            } else {

                implicit_end = Math.max(implicit_end, element.contents[content_i].end);

            }

            s = element.contents[content_i];

        }

    }

    /* determine desired end */
    /* it is never made really clear in SMIL that the explicit end is offset by the implicit begin */

    if (element.explicit_end !== null && element.explicit_dur !== null) {

        element.end = Math.min(element.begin + element.explicit_dur, implicit_begin + element.explicit_end);

    } else if (element.explicit_end === null && element.explicit_dur !== null) {

        element.end = element.begin + element.explicit_dur;

    } else if (element.explicit_end !== null && element.explicit_dur === null) {

        element.end = implicit_begin + element.explicit_end;

    } else {

        element.end = implicit_end;
    }

    delete element.explicit_begin;
    delete element.explicit_dur;
    delete element.explicit_end;

    doc._registerEvent(element);

}

export class ForeignElement {
    constructor(node) {
        this.node = node;
    }
}

export class TT {
    constructor() {
        /**
         * @type {number[]}
         */
        this.events = [];
        this.head = new Head();

        /**
         * @type {?Body}
         */
        this.body = null;
    }

    /**
     * @param {Node} node
     * @param {string} xmllang
     * @param {ErrorHandler} errorHandler
     */
    initFromNode(node, xmllang, errorHandler) {

        /* compute cell resolution */

        const cr = extractCellResolution(node, errorHandler);

        this.cellLength = {
            "h": new ComputedLength(0, 1 / cr.h),
            "w": new ComputedLength(1 / cr.w, 0),
        };

        /* extract frame rate and tick rate */

        const frtr = extractFrameAndTickRate(node, errorHandler);

        this.effectiveFrameRate = frtr.effectiveFrameRate;

        this.tickRate = frtr.tickRate;

        /* extract aspect ratio */

        this.aspectRatio = extractAspectRatio(node, errorHandler);

        /* check timebase */

        const attr = findAttribute(node, ns_ttp, "timeBase");

        if (attr !== null && attr !== "media") {

            reportFatal(errorHandler, "Unsupported time base");

        }

        /* retrieve extent */

        const e = extractExtent(node, errorHandler);

        if (e === null) {

            this.pxLength = {
                "h": null,
                "w": null,
            };

        } else {

            if (e.h.unit !== "px" || e.w.unit !== "px") {
                reportFatal(errorHandler, "Extent on TT must be in px or absent");
            }

            this.pxLength = {
                "h": new ComputedLength(0, 1 / e.h.value),
                "w": new ComputedLength(1 / e.w.value, 0),
            };
        }

        /** set root container dimensions to (1, 1) arbitrarily
          * the root container is mapped to actual dimensions at rendering
        **/

        this.dimensions = {
            "h": new ComputedLength(0, 1),
            "w": new ComputedLength(1, 0),

        };

        /* xml:lang */
        /**
         * @type {string}
         */
        this.lang = xmllang;

    }

    /* register a temporal events */
    _registerEvent(elem) {

        /* skip if begin is not < then end */

        if (elem.end <= elem.begin)
            return;

        /* index the begin time of the event */

        const b_i = indexOf(this.events, elem.begin);

        if (!b_i.found) {
            this.events.splice(b_i.index, 0, elem.begin);
        }

        /* index the end time of the event */

        if (elem.end !== Number.POSITIVE_INFINITY) {

            const e_i = indexOf(this.events, elem.end);

            if (!e_i.found) {
                this.events.splice(e_i.index, 0, elem.end);
            }

        }

    }

    /**
     * Retrieves the range of ISD times covered by the document
     *
     * @returns {[number, number]} Array of two elements: min_begin_time and max_begin_time
     *
     */
    getMediaTimeRange() {

        return [this.events[0], this.events[this.events.length - 1]];
    };

    /**
     * Returns list of ISD begin times
     *
     * @returns {number[]}
     */
    getMediaTimeEvents() {

        return this.events;
    };
}

/*
 * Represents a TTML Head element
 */

export class Head {
    constructor() {
        this.styling = new Styling();
        this.layout = new Layout();
    }
}

/*
 * Represents a TTML Styling element
 */

export class Styling {
    constructor() {
        /**
         * @type {Record<string, Style>}
         */
        this.styles = {};

        /**
         * @type {Record<string, any>}
         */
        this.initials = {};
    }
}

/*
 * Represents a TTML Style element
 */

export class Style {
    constructor() {
        /**
         * @type {string}
         */
        this.id = null;

        /**
         * @type {Record<string, any>}
         */
        this.styleAttrs = null;

        /**
         * @type {string[]}
         */
        this.styleRefs = null;
    }

    /**
     * @param {Node} node
     * @param {ErrorHandler} errorHandler
     */
    initFromNode(node, errorHandler) {
        this.id = elementGetXMLID(node);
        this.styleAttrs = elementGetStyles(node, errorHandler);
        this.styleRefs = elementGetStyleRefs(node);
    };
}

/*
 * Represents a TTML initial element
 */

export class Initial {
    constructor() {
        /**
         * @type {Record<string, string>}
         */
        this.styleAttrs = null;
    }

    /**
     * @param {Node} node
     */
    initFromNode(node) {

        this.styleAttrs = {};

        for (const i in node.attributes) {

            if (node.attributes[i].uri === ns_itts ||
                node.attributes[i].uri === ns_ebutts ||
                node.attributes[i].uri === ns_tts) {

                const qname = node.attributes[i].uri + " " + node.attributes[i].local;

                this.styleAttrs[qname] = node.attributes[i].value;

            }
        }

    }
}

/*
 * Represents a TTML Layout element
 *
 */

export class Layout {
    constructor() {
        this.regions = {};
    }
}

export class ContentElement {
    /**
     * @param {string} kind
     */
    constructor(kind) {
        this.kind = kind;
    }
}

/*
 * Represents a TTML image element
 */

export class Image extends ContentElement {
    /**
     * @param {string} src
     * @param {string} type
     */
    constructor(src, type) {
        super("image");

        /**
         * @type {string}
         */
        this.src = src;

        /**
         * @type {string}
         */
        this.type = type;
    }

    /**
     * @param {TT} doc
     * @param {Node} parent
     * @param {Node} node
     * @param {string} xmllang
     * @param {ErrorHandler} errorHandler
     */
    initFromNode(doc, parent, node, xmllang, errorHandler) {
        this.src = "src" in node.attributes ? node.attributes.src.value : null;

        if (!this.src) {
            reportError(errorHandler, "Invalid image@src attribute");
        }

        this.type = "type" in node.attributes ? node.attributes.type.value : null;

        if (!this.type) {
            reportError(errorHandler, "Invalid image@type attribute");
        }

        StyledElement.prototype.initFromNode.call(this, doc, parent, node, errorHandler);
        TimedElement.prototype.initFromNode.call(this, doc, parent, node, errorHandler);
        AnimatedElement.prototype.initFromNode.call(this, doc, parent, node, errorHandler);
        LayoutElement.prototype.initFromNode.call(this, doc, parent, node, errorHandler);

        this.lang = xmllang;
    }
}

/*
 * TTML element utility functions
 *
 */

export class IdentifiedElement {
    /**
     * @param {string} id
     */
    constructor(id) {
        this.id = id;
    }

    /**
     * @param {TT} doc
     * @param {Node} parent
     * @param {Node} node
     */
    initFromNode(doc, parent, node) {
        this.id = elementGetXMLID(node);
    }
}

export class LayoutElement {
    /**
     * @param {string} id
     */
    constructor(id) {
        this.regionID = id;
    }

    /**
     * @param {TT} doc
     * @param {Node} parent
     * @param {Node} node
     */
    initFromNode(doc, parent, node) {
        this.regionID = elementGetRegionID(node);
    }
}

export class StyledElement {
    /**
     * @param {Record<string, any>} styleAttrs
     */
    constructor(styleAttrs) {
        this.styleAttrs = styleAttrs;
    }

    /**
     * @param {TT} doc
     * @param {Node} parent
     * @param {Node} node
     * @param {ErrorHandler} errorHandler
     */
    initFromNode(doc, parent, node, errorHandler) {

        this.styleAttrs = elementGetStyles(node, errorHandler);

        if (doc.head !== null && doc.head.styling !== null) {
            mergeReferencedStyles(doc.head.styling, elementGetStyleRefs(node), this.styleAttrs, errorHandler);
        }

    }
}

export class AnimatedElement {
    /**
     * @param {any[]} sets
     */
    constructor(sets) {
        this.sets = sets;
    }

    initFromNode() {
        this.sets = [];
    }
}

export class ContainerElement {
    /**
     * @param {string} contents
     */
    constructor(contents) {
        this.contents = contents;
    }

    initFromNode() {
        this.contents = [];
    }
}

export class TimedElement {
    /**
     *
     * @param {number} explicit_begin
     * @param {number} explicit_end
     * @param {number} explicit_dur
     */
    constructor(explicit_begin, explicit_end, explicit_dur) {
        this.explicit_begin = explicit_begin;
        this.explicit_end = explicit_end;
        this.explicit_dur = explicit_dur;
    }

    /**
     * @param {TT} doc
     * @param {Node} parent
     * @param {Node} node
     * @param {ErrorHandler} errorHandler
     */
    initFromNode(doc, parent, node, errorHandler) {
        const t = processTiming(doc, parent, node, errorHandler);
        this.explicit_begin = t.explicit_begin;
        this.explicit_end = t.explicit_end;
        this.explicit_dur = t.explicit_dur;

        this.timeContainer = elementGetTimeContainer(node, errorHandler);
    }
}

/*
 * Represents a TTML body element
 */

export class Body extends ContentElement {
    constructor() {
        super("body");
    }

    /**
     * @param {TT} doc
     * @param {Node} node
     * @param {string} xmllang
     * @param {ErrorHandler} errorHandler
     */
    initFromNode(doc, node, xmllang, errorHandler) {
        StyledElement.prototype.initFromNode.call(this, doc, null, node, errorHandler);
        TimedElement.prototype.initFromNode.call(this, doc, null, node, errorHandler);
        AnimatedElement.prototype.initFromNode.call(this, doc, null, node, errorHandler);
        LayoutElement.prototype.initFromNode.call(this, doc, null, node, errorHandler);
        ContainerElement.prototype.initFromNode.call(this, doc, null, node, errorHandler);

        this.lang = xmllang;
    }
}

/*
 * Represents a TTML div element
 */

export class Div extends ContentElement {
    constructor() {
        super("div");
    }

    /**
     * @param {TT} doc
     * @param {Node} parent
     * @param {Node} node
     * @param {string} xmllang
     * @param {ErrorHandler} errorHandler
     */
    initFromNode(doc, parent, node, xmllang, errorHandler) {
        StyledElement.prototype.initFromNode.call(this, doc, parent, node, errorHandler);
        TimedElement.prototype.initFromNode.call(this, doc, parent, node, errorHandler);
        AnimatedElement.prototype.initFromNode.call(this, doc, parent, node, errorHandler);
        LayoutElement.prototype.initFromNode.call(this, doc, parent, node, errorHandler);
        ContainerElement.prototype.initFromNode.call(this, doc, parent, node, errorHandler);

        this.lang = xmllang;
    }
}

/*
 * Represents a TTML p element
 */

export class P extends ContentElement {
    constructor() {
        super("p");
    }

    /**
     * @param {TT} doc
     * @param {Node} parent
     * @param {Node} node
     * @param {string} xmllang
     * @param {ErrorHandler} errorHandler
     */
    initFromNode(doc, parent, node, xmllang, errorHandler) {
        StyledElement.prototype.initFromNode.call(this, doc, parent, node, errorHandler);
        TimedElement.prototype.initFromNode.call(this, doc, parent, node, errorHandler);
        AnimatedElement.prototype.initFromNode.call(this, doc, parent, node, errorHandler);
        LayoutElement.prototype.initFromNode.call(this, doc, parent, node, errorHandler);
        ContainerElement.prototype.initFromNode.call(this, doc, parent, node, errorHandler);

        this.lang = xmllang;
    }
}

/*
 * Represents a TTML span element
 */

export class Span extends ContentElement {
    constructor() {
        super("span");
    }

    /**
     * @param {TT} doc
     * @param {Node} parent
     * @param {Node} node
     * @param {string} xmllang
     * @param {string} xmlspace
     * @param {ErrorHandler} errorHandler
     */
    initFromNode(doc, parent, node, xmllang, xmlspace, errorHandler) {
        StyledElement.prototype.initFromNode.call(this, doc, parent, node, errorHandler);
        TimedElement.prototype.initFromNode.call(this, doc, parent, node, errorHandler);
        AnimatedElement.prototype.initFromNode.call(this, doc, parent, node, errorHandler);
        LayoutElement.prototype.initFromNode.call(this, doc, parent, node, errorHandler);
        ContainerElement.prototype.initFromNode.call(this, doc, parent, node, errorHandler);

        this.space = xmlspace;
        this.lang = xmllang;
    }
}

/*
 * Represents a TTML anonymous span element
 */

export class AnonymousSpan extends ContentElement {
    constructor() {
        super("span");
    }

    /**
     * @param {TT} doc
     * @param {Node} parent
     * @param {string} text
     * @param {string} xmlspace
     * @param {string} xmllang
     * @param {ErrorHandler} errorHandler
     */
    initFromText(doc, parent, text, xmllang, xmlspace, errorHandler) {
        TimedElement.prototype.initFromNode.call(this, doc, parent, null, errorHandler);

        this.text = text;
        this.space = xmlspace;
        this.lang = xmllang;
    }
}

/*
 * Represents a TTML br element
 */

export class Br extends ContentElement {
    constructor() {
        super("br");
    }

    /**
     * @param {TT} doc
     * @param {Node} parent
     * @param {Node} node
     * @param {string} xmllang
     * @param {ErrorHandler} errorHandler
     */
    initFromNode(doc, parent, node, xmllang, errorHandler) {
        LayoutElement.prototype.initFromNode.call(this, doc, parent, node, errorHandler);
        TimedElement.prototype.initFromNode.call(this, doc, parent, node, errorHandler);

        this.lang = xmllang;
    }
}

/*
 * Represents a TTML Region element
 *
 */

export class Region {
    constructor() { }

    /**
     * @param {string} xmllang
     * @returns {Region}
     */
    createDefaultRegion(xmllang) {
        const r = new Region();

        r.id = "";
        r.styleAttrs = {};
        r.sets = [];
        r.explicit_begin = 0;
        r.explicit_end = Number.POSITIVE_INFINITY;
        r.explicit_dur = null;

        this.lang = xmllang;

        return r;
    }

    /**
     * @param {TT} doc
     * @param {Node} node
     * @param {string} xmllang
     * @param {ErrorHandler} errorHandler
     */
    initFromNode(doc, node, xmllang, errorHandler) {
        IdentifiedElement.prototype.initFromNode.call(this, doc, null, node, errorHandler);
        TimedElement.prototype.initFromNode.call(this, doc, null, node, errorHandler);
        AnimatedElement.prototype.initFromNode.call(this, doc, null, node, errorHandler);

        /* add specified styles */

        this.styleAttrs = elementGetStyles(node, errorHandler);

        /* remember referential styles for merging after nested styling is processed*/

        this.styleRefs = elementGetStyleRefs(node);

        /* xml:lang */

        this.lang = xmllang;
    }
}

/*
 * Represents a TTML Set element
 *
 */

export class Set {
    constructor() {
    }

    /**
     * @param {TT} doc
     * @param {Node} parent
     * @param {Node} node
     * @param {ErrorHandler} errorHandler
     */
    initFromNode(doc, parent, node, errorHandler) {

        TimedElement.prototype.initFromNode.call(this, doc, parent, node, errorHandler);

        const styles = elementGetStyles(node, errorHandler);

        this.qname = null;
        this.value = null;

        for (const qname in styles) {

            if (!hasOwnProperty(styles, qname)) continue;

            if (this.qname) {

                reportError(errorHandler, "More than one style specified on set");
                break;

            }

            this.qname = qname;
            this.value = styles[qname];

        }

    }
}

/*
 * Utility functions
 *
 */

/**
 * @param {Node} node
 * @returns {string | null}
 */
function elementGetXMLID(node) {
    return node && "xml:id" in node.attributes ? node.attributes["xml:id"].value || null : null;
}

/**
 * @param {Node} node
 * @returns {string}
 */
function elementGetRegionID(node) {
    return node && "region" in node.attributes ? node.attributes.region.value : "";
}

/**
 * @param {Node} node
 * @param {ErrorHandler} errorHandler
 * @returns {string}
 */
function elementGetTimeContainer(node, errorHandler) {

    const tc = node && "timeContainer" in node.attributes ? node.attributes.timeContainer.value : null;

    if ((!tc) || tc === "par") {

        return "par";

    } else if (tc === "seq") {

        return "seq";

    } else {

        reportError(errorHandler, "Illegal value of timeContainer (assuming 'par')");

        return "par";

    }

}

/**
 * @param {Node} node
 * @returns {string[]}
 */
function elementGetStyleRefs(node) {

    return node && "style" in node.attributes ? node.attributes.style.value.split(" ") : [];

}

/**
 * @param {Node} node
 * @param {ErrorHandler} errorHandler
 * @returns {Record<string, any>}
 */
function elementGetStyles(node, errorHandler) {

    const s = {};

    if (node !== null) {

        for (const i in node.attributes) {

            const qname = node.attributes[i].uri + " " + node.attributes[i].local;

            const sa = byQName[qname];

            if (sa !== undefined) {

                const val = sa.parse(node.attributes[i].value);

                if (val !== null) {

                    s[qname] = val;

                    /* TODO: consider refactoring errorHandler into parse and compute routines */

                    if (sa === byName.zIndex) {
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

/**
 * @param {Node} node
 * @param {string} ns
 * @param {string} name
 * @returns {string | null}
 */
function findAttribute(node, ns, name) {
    for (const i in node.attributes) {

        if (node.attributes[i].uri === ns &&
            node.attributes[i].local === name) {

            return node.attributes[i].value;
        }
    }

    return null;
}

/**
 * @param {Node} node
 * @param {ErrorHandler} errorHandler
 * @returns {number | null}
 */
function extractAspectRatio(node, errorHandler) {

    let ar = findAttribute(node, ns_ittp, "aspectRatio");

    if (ar === null) {

        ar = findAttribute(node, ns_ttp, "displayAspectRatio");

    }

    let rslt = null;

    if (ar !== null) {

        const ASPECT_RATIO_RE = /(\d+)\s+(\d+)/;

        const m = ASPECT_RATIO_RE.exec(ar);

        if (m !== null) {

            const w = parseInt(m[1]);

            const h = parseInt(m[2]);

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

/**
 * Returns the cellResolution attribute from a node
 *
 * @param {Node} node
 * @param {ErrorHandler} errorHandler
 * @returns {{w: number, h: number}}
 */
function extractCellResolution(node, errorHandler) {

    const cr = findAttribute(node, ns_ttp, "cellResolution");

    // initial value

    let h = 15;
    let w = 32;

    if (cr !== null) {

        const CELL_RESOLUTION_RE = /(\d+) (\d+)/;

        const m = CELL_RESOLUTION_RE.exec(cr);

        if (m !== null) {

            w = parseInt(m[1]);

            h = parseInt(m[2]);

        } else {

            reportWarning(errorHandler, "Malformed cellResolution value (using initial value instead)");

        }

    }

    return { "w": w, "h": h };

}

/**
 * @param {Node} node
 * @param {ErrorHandler} errorHandler
 * @returns {{ effectiveFrameRate: number, tickRate: number }}
 */
function extractFrameAndTickRate(node, errorHandler) {

    // subFrameRate is ignored per IMSC1 specification

    // extract frame rate

    const fps_attr = findAttribute(node, ns_ttp, "frameRate");

    // initial value

    let fps = 30;

    // match variable

    let m;

    if (fps_attr !== null) {

        const FRAME_RATE_RE = /(\d+)/;

        m = FRAME_RATE_RE.exec(fps_attr);

        if (m !== null) {

            fps = parseInt(m[1]);

        } else {

            reportWarning(errorHandler, "Malformed frame rate attribute (using initial value instead)");
        }

    }

    // extract frame rate multiplier

    const frm_attr = findAttribute(node, ns_ttp, "frameRateMultiplier");

    // initial value

    let frm = 1;

    if (frm_attr !== null) {

        const FRAME_RATE_MULT_RE = /(\d+) (\d+)/;

        m = FRAME_RATE_MULT_RE.exec(frm_attr);

        if (m !== null) {

            frm = parseInt(m[1]) / parseInt(m[2]);

        } else {

            reportWarning(errorHandler, "Malformed frame rate multiplier attribute (using initial value instead)");
        }

    }

    const efps = frm * fps;

    // extract tick rate

    let tr = 1;

    const trattr = findAttribute(node, ns_ttp, "tickRate");

    if (trattr === null) {

        if (fps_attr !== null)
            tr = efps;

    } else {

        const TICK_RATE_RE = /(\d+)/;

        m = TICK_RATE_RE.exec(trattr);

        if (m !== null) {

            tr = parseInt(m[1]);

        } else {

            reportWarning(errorHandler, "Malformed tick rate attribute (using initial value instead)");
        }

    }

    return { effectiveFrameRate: efps, tickRate: tr };

}

/**
 * @param {Node} node
 * @param {ErrorHandler} errorHandler
 * @returns {{w: number, h: number} | null}
 */
function extractExtent(node, errorHandler) {

    const attr = findAttribute(node, ns_tts, "extent");

    if (attr === null)
        return null;

    const s = attr.split(" ");

    if (s.length !== 2) {

        reportWarning(errorHandler, "Malformed extent (ignoring)");

        return null;
    }

    const w = parseLength(s[0]);

    const h = parseLength(s[1]);

    if (!h || !w) {

        reportWarning(errorHandler, "Malformed extent values (ignoring)");

        return null;
    }

    return { "h": h, "w": w };

}

/**
 * @param {number} tickRate
 * @param {number} effectiveFrameRate
 * @param {string} str
 * @returns {number | null}
 */
function parseTimeExpression(tickRate, effectiveFrameRate, str) {

    const CLOCK_TIME_FRACTION_RE = /^(\d{2,}):(\d\d):(\d\d(?:\.\d+)?)$/;
    const CLOCK_TIME_FRAMES_RE = /^(\d{2,}):(\d\d):(\d\d):(\d{2,})$/;
    const OFFSET_FRAME_RE = /^(\d+(?:\.\d+)?)f$/;
    const OFFSET_TICK_RE = /^(\d+(?:\.\d+)?)t$/;
    const OFFSET_MS_RE = /^(\d+(?:\.\d+)?)ms$/;
    const OFFSET_S_RE = /^(\d+(?:\.\d+)?)s$/;
    const OFFSET_H_RE = /^(\d+(?:\.\d+)?)h$/;
    const OFFSET_M_RE = /^(\d+(?:\.\d+)?)m$/;
    let m;
    let r = null;
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

/**
 * @param {TT} doc
 * @param {Node} parent
 * @param {Node} node
 * @param {ErrorHandler} errorHandler
 * @returns {{explicit_begin: number, explicit_end: number, explicit_dur: number}}
 */
function processTiming(doc, parent, node, errorHandler) {

    /* determine explicit begin */

    let explicit_begin = null;

    if (node && "begin" in node.attributes) {

        explicit_begin = parseTimeExpression(doc.tickRate, doc.effectiveFrameRate, node.attributes.begin.value);

        if (explicit_begin === null) {

            reportWarning(errorHandler, "Malformed begin value " + node.attributes.begin.value + " (using 0)");

        }

    }

    /* determine explicit duration */

    let explicit_dur = null;

    if (node && "dur" in node.attributes) {

        explicit_dur = parseTimeExpression(doc.tickRate, doc.effectiveFrameRate, node.attributes.dur.value);

        if (explicit_dur === null) {

            reportWarning(errorHandler, "Malformed dur value " + node.attributes.dur.value + " (ignoring)");

        }

    }

    /* determine explicit end */

    let explicit_end = null;

    if (node && "end" in node.attributes) {

        explicit_end = parseTimeExpression(doc.tickRate, doc.effectiveFrameRate, node.attributes.end.value);

        if (explicit_end === null) {

            reportWarning(errorHandler, "Malformed end value (ignoring)");

        }

    }

    return {
        explicit_begin: explicit_begin,
        explicit_end: explicit_end,
        explicit_dur: explicit_dur,
    };

}

/**
 * @param {Styling} styling
 * @param {Style} style
 * @param {ErrorHandler} errorHandler
 */
function mergeChainedStyles(styling, style, errorHandler) {

    while (style.styleRefs.length > 0) {

        const sref = style.styleRefs.pop();

        if (!(sref in styling.styles)) {
            reportError(errorHandler, "Non-existant style id referenced");
            continue;
        }

        mergeChainedStyles(styling, styling.styles[sref], errorHandler);

        mergeStylesIfNotPresent(styling.styles[sref].styleAttrs, style.styleAttrs);

    }

}

/**
 * @param {Styling} styling
 * @param {string[]} stylerefs
 * @param {Record<string, any>} styleattrs
 * @param {ErrorHandler} errorHandler
 */
function mergeReferencedStyles(styling, stylerefs, styleattrs, errorHandler) {

    for (let i = stylerefs.length - 1; i >= 0; i--) {

        const sref = stylerefs[i];

        if (!(sref in styling.styles)) {
            reportError(errorHandler, "Non-existant style id referenced");
            continue;
        }

        mergeStylesIfNotPresent(styling.styles[sref].styleAttrs, styleattrs);

    }

}

/**
 * @param {Record<string, any>} from_styles
 * @param {Record<string, any>} into_styles
 */
function mergeStylesIfNotPresent(from_styles, into_styles) {

    for (const sname in from_styles) {

        if (!hasOwnProperty(from_styles, sname)) continue;

        if (sname in into_styles)
            continue;

        into_styles[sname] = from_styles[sname];

    }

}

/* TODO: validate style format at parsing */

/**
 * Binary search utility function
 *
 * @typedef {Object} BinarySearchResult
 * @property {boolean} found Was an exact match found?
 * @property {number} index Position of the exact match or insert position
 *
 * @param {number[]} arr
 * @param {number} searchval
 * @returns {BinarySearchResult}
 */

function indexOf(arr, searchval) {

    let min = 0;
    let max = arr.length - 1;
    let cur;

    while (min <= max) {

        cur = Math.floor((min + max) / 2);

        const curval = arr[cur];

        if (curval < searchval) {

            min = cur + 1;

        } else if (curval > searchval) {

            max = cur - 1;

        } else {

            return { found: true, index: cur };

        }

    }

    return { found: false, index: min };
}
