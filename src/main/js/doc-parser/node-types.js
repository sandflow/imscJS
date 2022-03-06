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
 * File contains all IMSC/TTML node types used across library.
 */

const imscUtils = require('../utils');
const imscNames = require('./namespaces');
const {reportError, reportFatal} = require('../error');
const {
    elementGetStyles,
    elementGetStyleRefs,
    elementGetTimeContainer,
    extractAspectRatio,
    extractExtent,
    extractCellResolution,
    extractFrameAndTickRate,
    indexOf,
    findAttribute,
    processTiming, mergeReferencedStyles, elementGetXMLID, elementGetRegionID,
} = require('./utilities');


class TT {
    constructor() {
        this.events = [];
        this.head = new Head();
        this.body = null;
    }

    initFromNode(node, xmlLang, errorHandler) {

        /* compute cell resolution */

        const cr = extractCellResolution(node, errorHandler);

        this.cellLength = {
            'h': new imscUtils.ComputedLength(0, 1 / cr.h),
            'w': new imscUtils.ComputedLength(1 / cr.w, 0)
        };

        /* extract frame rate and tick rate */

        const frtr = extractFrameAndTickRate(node, errorHandler);

        this.effectiveFrameRate = frtr.effectiveFrameRate;

        this.tickRate = frtr.tickRate;

        /* extract aspect ratio */

        this.aspectRatio = extractAspectRatio(node, errorHandler);

        /* check timebase */

        const attr = findAttribute(node, imscNames.ns_ttp, 'timeBase');

        if (attr !== null && attr !== 'media') {

            reportFatal(errorHandler, 'Unsupported time base');

        }

        /* retrieve extent */

        const e = extractExtent(node, errorHandler);

        if (e === null) {

            this.pxLength = {
                'h': null,
                'w': null
            };

        } else {

            if (e.h.unit !== 'px' || e.w.unit !== 'px') {
                reportFatal(errorHandler, 'Extent on TT must be in px or absent');
            }

            this.pxLength = {
                'h': new imscUtils.ComputedLength(0, 1 / e.h.value),
                'w': new imscUtils.ComputedLength(1 / e.w.value, 0)
            };
        }

        /**
         * set root container dimensions to (1, 1) arbitrarily
         * the root container is mapped to actual dimensions at rendering
         */
        this.dimensions = {
            'h': new imscUtils.ComputedLength(0, 1),
            'w': new imscUtils.ComputedLength(1, 0)

        };

        /* xml:lang */

        this.lang = xmlLang;

    }

    /** register a temporal events */
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
     * @returns {Array} Array of two elements: min_begin_time and max_begin_time
     *
     */
    getMediaTimeRange() {

        return [this.events[0], this.events[this.events.length - 1]];
    }

    /**
     * Returns list of ISD begin times
     *
     * @returns {Array}
     */
    getMediaTimeEvents() {

        return this.events;
    }
}
exports.TT = TT;

/**
 * Represents a TTML initial element
 */
class Initial {
    constructor() {
        this.styleAttrs = null;
    }

    initFromNode(node) {

        this.styleAttrs = {};

        for (const i in node.attributes) {

            if (node.attributes[i].uri === imscNames.ns_itts ||
                node.attributes[i].uri === imscNames.ns_ebutts ||
                node.attributes[i].uri === imscNames.ns_tts) {

                const qname = node.attributes[i].uri + ' ' + node.attributes[i].local;

                this.styleAttrs[qname] = node.attributes[i].value;

            }
        }
    }
}
exports.Initial = Initial;

class Region {
    constructor() {
    }

    /**
     * @param {string} xmlLang
     * @returns {Region}
     */
    static createDefaultRegion(xmlLang) {
        const r = new Region();

        // todo: replace with reasonable mixins and a factory
        IdentifiedElement.call(r, '');
        StyledElement.call(r, {});
        AnimatedElement.call(r, []);
        TimedElement.call(r, 0, Number.POSITIVE_INFINITY, null);

        r.lang = xmlLang;

        return r;
    }

    initFromNode(doc, node, xmlLang, errorHandler) {
        IdentifiedElement.prototype.initFromNode.call(this, doc, null, node, errorHandler);
        TimedElement.prototype.initFromNode.call(this, doc, null, node, errorHandler);
        AnimatedElement.prototype.initFromNode.call(this, doc, null, node, errorHandler);

        /* add specified styles */

        this.styleAttrs = elementGetStyles(node, errorHandler);

        /* remember referential styles for merging after nested styling is processed*/

        this.styleRefs = elementGetStyleRefs(node);

        /* xml:lang */

        this.lang = xmlLang;
    }
}
exports.Region = Region;

/**
 * Represents a TTML Head element
 */
class Head {
    constructor() {
        this.styling = new Styling();
        this.layout = new Layout();
    }
}
exports.Head = Head;

/**
 * Represents a TTML Style element
 */
class Style {
    constructor() {
        this.id = null;
        this.styleAttrs = null;
        this.styleRefs = null;
    }

    initFromNode(node, errorHandler) {
        this.id = elementGetXMLID(node);
        this.styleAttrs = elementGetStyles(node, errorHandler);
        this.styleRefs = elementGetStyleRefs(node);
    }
}
exports.Style = Style;

/**
 * Represents a TTML Styling element
 */
class Styling {
    constructor() {
        this.styles = {};
        this.initials = {};
    }
}
exports.Styling = Styling;

/**
 * Represents a TTML Layout element
 *
 */
class Layout {
    constructor() {
        this.regions = {};
    }
}
exports.Layout = Layout;

class ContentElement {
    constructor(kind) {
        this.kind = kind;
    }
}

class IdentifiedElement {
    constructor(id) {
        this.id = id;
    }

    initFromNode(doc, parent, node) {
        this.id = elementGetXMLID(node);
    }
}
exports.IdentifiedElement = IdentifiedElement;

class LayoutElement{
    constructor(id) {
        this.regionID = id;
    }

    initFromNode(doc, parent, node) {
        this.regionID = elementGetRegionID(node);
    }
}

class AnimatedElement{
    constructor(sets) {
        this.sets = sets;
    }

    initFromNode() { // function (doc, parent, node, errorHandler) {
        this.sets = [];
    }
}

class ContainerElement {
    constructor(contents) {
        this.contents = contents;
    }

    initFromNode() { // function (doc, parent, node, errorHandler) {
        this.contents = [];
    }
}


/**
 * Represents a TTML body element
 */
class Body extends ContentElement {
    constructor() {
        super('body');
    }

    initFromNode(doc, node, xmllang, errorHandler) {
        StyledElement.prototype.initFromNode.call(this, doc, null, node, errorHandler);
        TimedElement.prototype.initFromNode.call(this, doc, null, node, errorHandler);
        AnimatedElement.prototype.initFromNode.call(this, doc, null, node, errorHandler);
        LayoutElement.prototype.initFromNode.call(this, doc, null, node, errorHandler);
        ContainerElement.prototype.initFromNode.call(this, doc, null, node, errorHandler);

        this.lang = xmllang;
    }
}
exports.Body = Body;

/**
 * Represents a TTML div element
 */
class Div extends ContentElement {
    constructor() {
        super('div');
    }

    initFromNode(doc, parent, node, xmllang, errorHandler) {
        StyledElement.prototype.initFromNode.call(this, doc, parent, node, errorHandler);
        TimedElement.prototype.initFromNode.call(this, doc, parent, node, errorHandler);
        AnimatedElement.prototype.initFromNode.call(this, doc, parent, node, errorHandler);
        LayoutElement.prototype.initFromNode.call(this, doc, parent, node, errorHandler);
        ContainerElement.prototype.initFromNode.call(this, doc, parent, node, errorHandler);

        this.lang = xmllang;
    }
}
exports.Div = Div;

/*
 * Represents a TTML p element
 */

class P extends ContentElement {
    constructor() {
        super('p');
    }

    initFromNode(doc, parent, node, xmllang, errorHandler) {
        StyledElement.prototype.initFromNode.call(this, doc, parent, node, errorHandler);
        TimedElement.prototype.initFromNode.call(this, doc, parent, node, errorHandler);
        AnimatedElement.prototype.initFromNode.call(this, doc, parent, node, errorHandler);
        LayoutElement.prototype.initFromNode.call(this, doc, parent, node, errorHandler);
        ContainerElement.prototype.initFromNode.call(this, doc, parent, node, errorHandler);

        this.lang = xmllang;
    }
}
exports.P = P;

/**s
 * Represents a TTML span element
 */
class Span extends ContentElement {
    constructor() {
        super('span');
    }

    initFromNode(doc, parent, node, xmlLang, xmlSpace, errorHandler) {
        StyledElement.prototype.initFromNode.call(this, doc, parent, node, errorHandler);
        TimedElement.prototype.initFromNode.call(this, doc, parent, node, errorHandler);
        AnimatedElement.prototype.initFromNode.call(this, doc, parent, node, errorHandler);
        LayoutElement.prototype.initFromNode.call(this, doc, parent, node, errorHandler);
        ContainerElement.prototype.initFromNode.call(this, doc, parent, node, errorHandler);

        this.space = xmlSpace;
        this.lang = xmlLang;
    }
}
exports.Span = Span;

/**
 * Represents a TTML anonymous span element
 */
class AnonymousSpan extends ContentElement {
    constructor() {
        super('span');
    }

    initFromText(doc, parent, text, xmlLang, xmlSpace, errorHandler) {
        TimedElement.prototype.initFromNode.call(this, doc, parent, null, errorHandler);

        this.text = text;
        this.space = xmlSpace;
        this.lang = xmlLang;
    }
}
exports.AnonymousSpan = AnonymousSpan;

/*
 * Represents a TTML br element
 */

class Br extends ContentElement{
    constructor() {
        super('br');
    }

    initFromNode(doc, parent, node, xmlLang, errorHandler) {
        LayoutElement.prototype.initFromNode.call(this, doc, parent, node, errorHandler);
        TimedElement.prototype.initFromNode.call(this, doc, parent, node, errorHandler);

        this.lang = xmlLang;
    }
}
exports.Br = Br;

class StyledElement{
    constructor(styleAttrs) {
        this.styleAttrs = styleAttrs;
    }

    initFromNode(doc, parent, node, errorHandler) {

        this.styleAttrs = elementGetStyles(node, errorHandler);

        if (doc.head !== null && doc.head.styling !== null) {
            mergeReferencedStyles(doc.head.styling, elementGetStyleRefs(node), this.styleAttrs, errorHandler);
        }

    }
}
exports.StyledElement = StyledElement;

/*
 * Represents a TTML Set element
 *
 * Called SetElement in order to avoid name collision with native "Set"
 */
class SetElement {
    initFromNode(doc, parent, node, errorHandler) {

        TimedElement.prototype.initFromNode.call(this, doc, parent, node, errorHandler);

        const styles = elementGetStyles(node, errorHandler);

        this.qname = null;
        this.value = null;

        for (const qname in styles) {

            if (!imscUtils.checkHasOwnProperty(styles, qname)) continue;

            if (this.qname) {

                reportError(errorHandler, 'More than one style specified on set');
                break;

            }

            this.qname = qname;
            this.value = styles[qname];

        }

    }
}
exports.SetElement = SetElement;


class TimedElement {
    constructor(explicit_begin, explicit_end, explicit_dur) {
        this.explicit_begin = explicit_begin;
        this.explicit_end = explicit_end;
        this.explicit_dur = explicit_dur;
    }

    initFromNode(doc, parent, node, errorHandler) {
        const t = processTiming(doc, parent, node, errorHandler);

        this.explicit_begin = t.explicit_begin;
        this.explicit_end = t.explicit_end;
        this.explicit_dur = t.explicit_dur;

        this.timeContainer = elementGetTimeContainer(node, errorHandler);
    }
}
exports.TimedElement = TimedElement;

class ForeignElement {
    constructor(node) {
        this.node = node;
    }
}
exports.ForeignElement = ForeignElement;

/**
 * Represents a TTML image element
 * Named ImageElement to avoid native JS name collision with HTML's Image class.
 */
class ImageElement extends ContentElement {
    constructor(src, type) {
        super('image');
        this.src = src;
        this.type = type;
    }
    
    initFromNode(doc, parent, node, xmllang, errorHandler) {
        this.src = 'src' in node.attributes ? node.attributes.src.value : null;

        if (!this.src) {
            reportError(errorHandler, 'Invalid image@src attribute');
        }

        this.type = 'type' in node.attributes ? node.attributes.type.value : null;

        if (!this.type) {
            reportError(errorHandler, 'Invalid image@type attribute');
        }

        StyledElement.prototype.initFromNode.call(this, doc, parent, node, errorHandler);
        TimedElement.prototype.initFromNode.call(this, doc, parent, node, errorHandler);
        AnimatedElement.prototype.initFromNode.call(this, doc, parent, node, errorHandler);
        LayoutElement.prototype.initFromNode.call(this, doc, parent, node, errorHandler);

        this.lang = xmllang;
    }
}
exports.ImageElement = ImageElement;
