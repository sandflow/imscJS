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

sax = typeof sax === 'undefined' ? require('sax') : sax; // must be defined this way to make it UMD peer dependency
const imscUtils = require('../utils');
const imscNames = require('./namespaces');
const imscStyles = require('../styles');
const {reportFatal, reportError} = require('../error');
const {Region,TT, Styling, Head, SetElement, ForeignElement, AnonymousSpan, P, Span, Div, Body, Br, Style, Layout,
    Initial, ImageElement
} = require('./node-types');
const {resolveTiming, cleanRubyContainers, mergeReferencedStyles, mergeChainedStyles, mergeStylesIfNotPresent} = require('./utilities');

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
 * Parses an IMSC1 document into an opaque in-memory representation that exposes
 * a single method <pre>getMediaTimeEvents()</pre> that returns a list of time
 * offsets (in seconds) of the ISD, i.e. the points in time where the visual
 * representation of the document change. `metadataHandler` allows the caller to
 * be called back when nodes are present in <metadata> elements.
 *
 * @param {string} xmlString XML document
 * @param {?module:imscUtils.ErrorHandler} errorHandler Error callback
 * @param {?MetadataHandler} metadataHandler Callback for <Metadata> elements
 * @returns {Object} Opaque in-memory representation of an IMSC1 document
 */
exports.fromXML = function (xmlString, errorHandler, metadataHandler) {
    const p = sax.parser(true, {xmlns: true});
    const elStack = [];
    const xmlLangStack = [];
    const xmlSpacesStack = [];
    let metadata_depth = 0;
    let doc = null;

    p.onclosetag = function () { // function (node) {

        if (elStack[0] instanceof Region) {

            /* merge referenced styles */

            if (doc.head !== null && doc.head.styling !== null) {
                mergeReferencedStyles(doc.head.styling, elStack[0].styleRefs, elStack[0].styleAttrs, errorHandler);
            }

            delete elStack[0].styleRefs;

        } else if (elStack[0] instanceof Styling) {

            /* flatten chained referential styling */

            for (const sid in elStack[0].styles) {

                if (!imscUtils.checkHasOwnProperty(elStack[0].styles, sid)) continue;

                mergeChainedStyles(elStack[0], elStack[0].styles[sid], errorHandler);

            }

        } else if (elStack[0] instanceof P || elStack[0] instanceof Span) {

            /* merge anonymous spans */

            if (elStack[0].contents.length > 1) {

                const cs = [elStack[0].contents[0]];

                let c;

                for (c = 1; c < elStack[0].contents.length; c++) {

                    if (elStack[0].contents[c] instanceof AnonymousSpan &&
                        cs[cs.length - 1] instanceof AnonymousSpan) {

                        cs[cs.length - 1].text += elStack[0].contents[c].text;

                    } else {

                        cs.push(elStack[0].contents[c]);

                    }

                }

                elStack[0].contents = cs;

            }

            // remove redundant nested anonymous spans (9.3.3(1)(c))

            if (elStack[0] instanceof Span &&
                elStack[0].contents.length === 1 &&
                elStack[0].contents[0] instanceof AnonymousSpan) {

                elStack[0].text = elStack[0].contents[0].text;
                delete elStack[0].contents;

            }

        } else if (elStack[0] instanceof ForeignElement) {

            if (elStack[0].node.uri === imscNames.ns_tt &&
                elStack[0].node.local === 'metadata') {

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

        xmlSpacesStack.shift();

        // maintain the xml:lang stack

        xmlLangStack.shift();

        // prepare for the next element

        elStack.shift();
    };

    p.ontext = function (str) {

        if (elStack[0] === undefined) {

            /* ignoring text outside of elements */

        } else if (elStack[0] instanceof Span || elStack[0] instanceof P) {

            /* ignore children text nodes in ruby container spans */

            if (elStack[0] instanceof Span) {

                const ruby = elStack[0].styleAttrs[imscStyles.byName.ruby.qname];

                if (ruby === 'container' || ruby === 'textContainer' || ruby === 'baseContainer') {

                    return;

                }

            }

            /* create an anonymous span */

            const s = new AnonymousSpan();

            s.initFromText(doc, elStack[0], str, xmlLangStack[0], xmlSpacesStack[0], errorHandler);

            elStack[0].contents.push(s);

        } else if (elStack[0] instanceof ForeignElement &&
            metadata_depth > 0 &&
            metadataHandler &&
            'onText' in metadataHandler) {

            /* text node within a child of metadata element */

            metadataHandler.onText(str);

        }

    };


    p.onopentag = function (node) {

        // maintain the xml:space stack

        const xmlspace = node.attributes['xml:space'];

        if (xmlspace) {

            xmlSpacesStack.unshift(xmlspace.value);

        } else {

            if (xmlSpacesStack.length === 0) {

                xmlSpacesStack.unshift('default');

            } else {

                xmlSpacesStack.unshift(xmlSpacesStack[0]);

            }

        }

        /* maintain the xml:lang stack */


        const xmllang = node.attributes['xml:lang'];

        if (xmllang) {

            xmlLangStack.unshift(xmllang.value);

        } else {

            if (xmlLangStack.length === 0) {

                xmlLangStack.unshift('');

            } else {

                xmlLangStack.unshift(xmlLangStack[0]);

            }

        }


        /* process the element */

        if (node.uri === imscNames.ns_tt) {

            if (node.local === 'tt') {

                if (doc !== null) {

                    reportFatal(errorHandler, 'Two <tt> elements at (' + this.line + ',' + this.column + ')');

                }

                doc = new TT();

                doc.initFromNode(node, xmlLangStack[0], errorHandler);

                elStack.unshift(doc);

            } else if (node.local === 'head') {

                if (!(elStack[0] instanceof TT)) {
                    reportFatal(errorHandler, 'Parent of <head> element is not <tt> at (' + this.line + ',' + this.column + ')');
                }

                elStack.unshift(doc.head);

            } else if (node.local === 'styling') {

                if (!(elStack[0] instanceof Head)) {
                    reportFatal(errorHandler, 'Parent of <styling> element is not <head> at (' + this.line + ',' + this.column + ')');
                }

                elStack.unshift(doc.head.styling);

            } else if (node.local === 'style') {

                let s;

                if (elStack[0] instanceof Styling) {

                    s = new Style();

                    s.initFromNode(node, errorHandler);

                    /* ignore <style> element missing @id */

                    if (!s.id) {

                        reportError(errorHandler, '<style> element missing "id" attribute');

                    } else {

                        doc.head.styling.styles[s.id] = s;

                    }

                    elStack.unshift(s);

                } else if (elStack[0] instanceof Region) {

                    /* nested styles can be merged with specified styles
                     * immediately, with lower priority
                     * (see 8.4.4.2(3) at TTML1 )
                     */

                    s = new Style();

                    s.initFromNode(node, errorHandler);

                    mergeStylesIfNotPresent(s.styleAttrs, elStack[0].styleAttrs);

                    elStack.unshift(s);

                } else {

                    reportFatal(errorHandler, 'Parent of <style> element is not <styling> or <region> at (' + this.line + ',' + this.column + ')');

                }

            } else if (node.local === 'initial') {

                let ini;

                if (elStack[0] instanceof Styling) {

                    ini = new Initial();

                    ini.initFromNode(node, errorHandler);

                    for (const qn in ini.styleAttrs) {

                        if (!imscUtils.checkHasOwnProperty(ini.styleAttrs, qn)) continue;

                        doc.head.styling.initials[qn] = ini.styleAttrs[qn];

                    }

                    elStack.unshift(ini);

                } else {

                    reportFatal(errorHandler, 'Parent of <initial> element is not <styling> at (' + this.line + ',' + this.column + ')');

                }

            } else if (node.local === 'layout') {

                if (!(elStack[0] instanceof Head)) {

                    reportFatal(errorHandler, 'Parent of <layout> element is not <head> at ' + this.line + ',' + this.column + ')');

                }

                elStack.unshift(doc.head.layout);

            } else if (node.local === 'region') {

                if (!(elStack[0] instanceof Layout)) {
                    reportFatal(errorHandler, 'Parent of <region> element is not <layout> at ' + this.line + ',' + this.column + ')');
                }

                const r = new Region();

                r.initFromNode(doc, node, xmlLangStack[0], errorHandler);

                if (!r.id || r.id in doc.head.layout.regions) {

                    reportError(errorHandler, 'Ignoring <region> with duplicate or missing @id at ' + this.line + ',' + this.column + ')');

                } else {

                    doc.head.layout.regions[r.id] = r;

                }

                elStack.unshift(r);

            } else if (node.local === 'body') {

                if (!(elStack[0] instanceof TT)) {

                    reportFatal(errorHandler, 'Parent of <body> element is not <tt> at ' + this.line + ',' + this.column + ')');

                }

                if (doc.body !== null) {

                    reportFatal(errorHandler, 'Second <body> element at ' + this.line + ',' + this.column + ')');

                }

                const b = new Body();

                b.initFromNode(doc, node, xmlLangStack[0], errorHandler);

                doc.body = b;

                elStack.unshift(b);

            } else if (node.local === 'div') {

                if (!(elStack[0] instanceof Div || elStack[0] instanceof Body)) {

                    reportFatal(errorHandler, 'Parent of <div> element is not <body> or <div> at ' + this.line + ',' + this.column + ')');

                }

                const d = new Div();

                d.initFromNode(doc, elStack[0], node, xmlLangStack[0], errorHandler);

                /* transform smpte:backgroundImage to TTML2 image element */

                const bi = d.styleAttrs[imscStyles.byName.backgroundImage.qname];

                if (bi) {
                    d.contents.push(new ImageElement(bi));
                    delete d.styleAttrs[imscStyles.byName.backgroundImage.qname];
                }

                elStack[0].contents.push(d);

                elStack.unshift(d);

            } else if (node.local === 'image') {

                if (!(elStack[0] instanceof Div)) {

                    reportFatal(errorHandler, 'Parent of <image> element is not <div> at ' + this.line + ',' + this.column + ')');

                }

                const img = new ImageElement();

                img.initFromNode(doc, elStack[0], node, xmlLangStack[0], errorHandler);

                elStack[0].contents.push(img);

                elStack.unshift(img);

            } else if (node.local === 'p') {

                if (!(elStack[0] instanceof Div)) {

                    reportFatal(errorHandler, 'Parent of <p> element is not <div> at ' + this.line + ',' + this.column + ')');

                }

                const p = new P();

                p.initFromNode(doc, elStack[0], node, xmlLangStack[0], errorHandler);

                elStack[0].contents.push(p);

                elStack.unshift(p);

            } else if (node.local === 'span') {

                if (!(elStack[0] instanceof Span || elStack[0] instanceof P)) {

                    reportFatal(errorHandler, 'Parent of <span> element is not <span> or <p> at ' + this.line + ',' + this.column + ')');

                }

                const ns = new Span();

                ns.initFromNode(doc, elStack[0], node, xmlLangStack[0], xmlSpacesStack[0], errorHandler);

                elStack[0].contents.push(ns);

                elStack.unshift(ns);

            } else if (node.local === 'br') {

                if (!(elStack[0] instanceof Span || elStack[0] instanceof P)) {

                    reportFatal(errorHandler, 'Parent of <br> element is not <span> or <p> at ' + this.line + ',' + this.column + ')');

                }

                const nb = new Br();

                nb.initFromNode(doc, elStack[0], node, xmlLangStack[0], errorHandler);

                elStack[0].contents.push(nb);

                elStack.unshift(nb);

            } else if (node.local === 'set') {

                if (!(elStack[0] instanceof Span ||
                    elStack[0] instanceof P ||
                    elStack[0] instanceof Div ||
                    elStack[0] instanceof Body ||
                    elStack[0] instanceof Region ||
                    elStack[0] instanceof Br)) {

                    reportFatal(errorHandler, 'Parent of <set> element is not a content element or a region at ' + this.line + ',' + this.column + ')');

                }

                const st = new SetElement();

                st.initFromNode(doc, elStack[0], node, errorHandler);

                elStack[0].sets.push(st);

                elStack.unshift(st);

            } else {

                /* element in the TT namespace, but not a content element */

                elStack.unshift(new ForeignElement(node));
            }

        } else {

            /* ignore elements not in the TTML namespace unless in metadata element */

            elStack.unshift(new ForeignElement(node));

        }

        /* handle metadata callbacks */

        if (elStack[0] instanceof ForeignElement) {

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

                const attrs = [];

                for (const a in node.attributes) {
                    attrs[node.attributes[a].uri + ' ' + node.attributes[a].local] =
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

    p.write(xmlString).close();

    // all referential styling has been flatten, so delete styles

    delete doc.head.styling.styles;

    // create default region if no regions specified

    let hasRegions = false;

    /* AFAIK the only way to determine whether an object has members */

    for (const i in doc.head.layout.regions) {

        if (imscUtils.checkHasOwnProperty(doc.head.layout.regions, i)) {
            hasRegions = true;
            break;
        }

    }

    if (!hasRegions) {

        /* create default region */

        const dr = Region.createDefaultRegion(doc.lang);

        doc.head.layout.regions[dr.id] = dr;

    }

    /* resolve desired timing for regions */

    for (const region_i in doc.head.layout.regions) {

        if (!imscUtils.checkHasOwnProperty(doc.head.layout.regions, region_i)) continue;

        resolveTiming(doc, doc.head.layout.regions[region_i], null, null);

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
