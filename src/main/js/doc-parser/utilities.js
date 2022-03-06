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

/*
 * Utility functions
 */

const {reportError, reportWarning} = require('../error');
const imscNames = require('./namespaces');
const imscStyles = require('../styles');
const imscUtils = require('../utils');

function elementGetXMLID(node) {
    return node && 'xml:id' in node.attributes ? node.attributes['xml:id'].value || null : null;
}

function elementGetRegionID(node) {
    return node && 'region' in node.attributes ? node.attributes.region.value : '';
}

function elementGetTimeContainer(node, errorHandler) {

    const tc = node && 'timeContainer' in node.attributes ? node.attributes.timeContainer.value : null;

    if ((!tc) || tc === 'par') {

        return 'par';

    } else if (tc === 'seq') {

        return 'seq';

    } else {

        reportError(errorHandler, 'Illegal value of timeContainer (assuming \'par\')');

        return 'par';

    }

}

function elementGetStyleRefs(node) {

    return node && 'style' in node.attributes ? node.attributes.style.value.split(' ') : [];

}

function elementGetStyles(node, errorHandler) {

    const s = {};

    if (node !== null) {

        for (const i in node.attributes) {

            const qname = node.attributes[i].uri + ' ' + node.attributes[i].local;

            const sa = imscStyles.byQName[qname];

            if (sa !== undefined) {

                const val = sa.parse(node.attributes[i].value);

                if (val !== null) {

                    s[qname] = val;

                    /* TODO: consider refactoring errorHandler into parse and compute routines */

                    if (sa === imscStyles.byName.zIndex) {
                        reportWarning(errorHandler, 'zIndex attribute present but not used by IMSC1 since regions do not overlap');
                    }

                } else {

                    reportError(errorHandler, 'Cannot parse styling attribute ' + qname + ' --> ' + node.attributes[i].value);

                }

            }

        }

    }

    return s;
}

function findAttribute(node, ns, name) {
    for (const i in node.attributes) {

        if (node.attributes[i].uri === ns &&
            node.attributes[i].local === name) {

            return node.attributes[i].value;
        }
    }

    return null;
}

function extractAspectRatio(node, errorHandler) {

    let ar = findAttribute(node, imscNames.ns_ittp, 'aspectRatio');

    if (ar === null) {

        ar = findAttribute(node, imscNames.ns_ttp, 'displayAspectRatio');

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

                reportError(errorHandler, 'Illegal aspectRatio values (ignoring)');
            }

        } else {

            reportError(errorHandler, 'Malformed aspectRatio attribute (ignoring)');
        }

    }

    return rslt;

}

/*
 * Returns the cellResolution attribute from a node
 *
 */
function extractCellResolution(node, errorHandler) {

    const cr = findAttribute(node, imscNames.ns_ttp, 'cellResolution');

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

            reportWarning(errorHandler, 'Malformed cellResolution value (using initial value instead)');

        }

    }

    return {'w': w, 'h': h};

}


function extractFrameAndTickRate(node, errorHandler) {

    // subFrameRate is ignored per IMSC1 specification

    // extract frame rate

    const fps_attr = findAttribute(node, imscNames.ns_ttp, 'frameRate');

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

            reportWarning(errorHandler, 'Malformed frame rate attribute (using initial value instead)');
        }

    }

    // extract frame rate multiplier

    const frm_attr = findAttribute(node, imscNames.ns_ttp, 'frameRateMultiplier');

    // initial value

    let frm = 1;

    if (frm_attr !== null) {

        const FRAME_RATE_MULT_RE = /(\d+) (\d+)/;

        m = FRAME_RATE_MULT_RE.exec(frm_attr);

        if (m !== null) {

            frm = parseInt(m[1]) / parseInt(m[2]);

        } else {

            reportWarning(errorHandler, 'Malformed frame rate multiplier attribute (using initial value instead)');
        }

    }

    const efps = frm * fps;

    // extract tick rate

    let tr = 1;

    const trickRateAttr = findAttribute(node, imscNames.ns_ttp, 'tickRate');

    if (trickRateAttr === null) {

        if (fps_attr !== null)
            tr = efps;

    } else {

        const TICK_RATE_RE = /(\d+)/;

        m = TICK_RATE_RE.exec(trickRateAttr);

        if (m !== null) {

            tr = parseInt(m[1]);

        } else {

            reportWarning(errorHandler, 'Malformed tick rate attribute (using initial value instead)');
        }

    }

    return {effectiveFrameRate: efps, tickRate: tr};

}

function extractExtent(node, errorHandler) {

    const attr = findAttribute(node, imscNames.ns_tts, 'extent');

    if (attr === null)
        return null;

    const s = attr.split(' ');

    if (s.length !== 2) {

        reportWarning(errorHandler, 'Malformed extent (ignoring)');

        return null;
    }

    const w = imscUtils.parseLength(s[0]);

    const h = imscUtils.parseLength(s[1]);

    if (!h || !w) {

        reportWarning(errorHandler, 'Malformed extent values (ignoring)');

        return null;
    }

    return {'h': h, 'w': w};

}

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

function processTiming(doc, parent, node, errorHandler) {

    /* determine explicit begin */

    let explicit_begin = null;

    if (node && 'begin' in node.attributes) {

        explicit_begin = parseTimeExpression(doc.tickRate, doc.effectiveFrameRate, node.attributes.begin.value);

        if (explicit_begin === null) {

            reportWarning(errorHandler, 'Malformed begin value ' + node.attributes.begin.value + ' (using 0)');

        }

    }

    /* determine explicit duration */

    let explicit_dur = null;

    if (node && 'dur' in node.attributes) {

        explicit_dur = parseTimeExpression(doc.tickRate, doc.effectiveFrameRate, node.attributes.dur.value);

        if (explicit_dur === null) {

            reportWarning(errorHandler, 'Malformed dur value ' + node.attributes.dur.value + ' (ignoring)');

        }

    }

    /* determine explicit end */

    let explicit_end = null;

    if (node && 'end' in node.attributes) {

        explicit_end = parseTimeExpression(doc.tickRate, doc.effectiveFrameRate, node.attributes.end.value);

        if (explicit_end === null) {

            reportWarning(errorHandler, 'Malformed end value (ignoring)');

        }

    }

    return {
        explicit_begin: explicit_begin,
        explicit_end: explicit_end,
        explicit_dur: explicit_dur
    };

}


function mergeChainedStyles(styling, style, errorHandler) {

    while (style.styleRefs.length > 0) {

        const sRef = style.styleRefs.pop();

        if (!(sRef in styling.styles)) {
            reportError(errorHandler, 'Non-existant style id referenced');
            continue;
        }

        mergeChainedStyles(styling, styling.styles[sRef], errorHandler);

        mergeStylesIfNotPresent(styling.styles[sRef].styleAttrs, style.styleAttrs);

    }

}

function mergeReferencedStyles(styling, styleRefs, styleAttrs, errorHandler) {

    for (let i = styleRefs.length - 1; i >= 0; i--) {

        const sRef = styleRefs[i];

        if (!(sRef in styling.styles)) {
            reportError(errorHandler, 'Non-existant style id referenced');
            continue;
        }

        mergeStylesIfNotPresent(styling.styles[sRef].styleAttrs, styleAttrs);

    }

}

function mergeStylesIfNotPresent(from_styles, into_styles) {

    for (const sname in from_styles) {

        if (!imscUtils.checkHasOwnProperty(from_styles, sname)) continue;

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
 * @param {number} searchVal
 *
 * @returns {BinarySearchResult}
 */
function indexOf(arr, searchVal) {

    let min = 0;
    let max = arr.length - 1;
    let cur;

    while (min <= max) {

        cur = Math.floor((min + max) / 2);

        const curVal = arr[cur];

        if (curVal < searchVal) {

            min = cur + 1;

        } else if (curVal > searchVal) {

            max = cur - 1;

        } else {

            return {found: true, index: cur};

        }

    }

    return {found: false, index: min};
}


/**
 * Called when a text node is encountered.
 * @callback TextCallBack
 * @param {string} contents Contents of the text node
 */
function cleanRubyContainers(element) {

    if (!('contents' in element)) return;

    const rubyval = 'styleAttrs' in element ? element.styleAttrs[imscStyles.byName.ruby.qname] : null;

    const isrubycontainer = (element.kind === 'span' && (rubyval === 'container' || rubyval === 'textContainer' || rubyval === 'baseContainer'));

    for (let i = element.contents.length - 1; i >= 0; i--) {

        if (isrubycontainer && !('styleAttrs' in element.contents[i] && imscStyles.byName.ruby.qname in element.contents[i].styleAttrs)) {

            /* prune undefined <span> in ruby containers */

            delete element.contents[i];

        } else {

            cleanRubyContainers(element.contents[i]);

        }

    }

}

function resolveTiming(doc, element, prev_sibling, parent) {

    /* are we in a seq container? */

    const isinseq = parent && parent.timeContainer === 'seq';

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

    if ('sets' in element) {

        for (let set_i = 0; set_i < element.sets.length; set_i++) {

            resolveTiming(doc, element.sets[set_i], s, element);

            if (element.timeContainer === 'seq') {

                implicit_end = element.sets[set_i].end;

            } else {

                implicit_end = Math.max(implicit_end, element.sets[set_i].end);

            }

            s = element.sets[set_i];

        }

    }

    if (!('contents' in element)) {

        /* anonymous spans and regions and <set> and <br>s and spans with only children text nodes */

        if (isinseq) {

            /* in seq container, implicit duration is zero */

            implicit_end = element.begin;

        } else {

            /* in par container, implicit duration is indefinite */

            implicit_end = Number.POSITIVE_INFINITY;

        }

    } else if ('contents' in element) {

        for (let content_i = 0; content_i < element.contents.length; content_i++) {

            resolveTiming(doc, element.contents[content_i], s, element);

            if (element.timeContainer === 'seq') {

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

module.exports = {
    cleanRubyContainers,
    elementGetRegionID,
    elementGetXMLID,
    elementGetStyles,
    elementGetStyleRefs,
    elementGetTimeContainer,
    extractAspectRatio,
    extractExtent,
    extractCellResolution,
    extractFrameAndTickRate,
    findAttribute,
    indexOf,
    mergeStylesIfNotPresent,
    mergeChainedStyles,
    mergeReferencedStyles,
    processTiming,
    resolveTiming
};
