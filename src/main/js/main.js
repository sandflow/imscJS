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

import { fromParser } from "./doc.js";
import { createSAXParserFromDOMParser } from "./dom_to_parser.js";

export { renderHTML } from "./html.js";
export { generateISD } from "./isd.js";
export { createSAXParserFromDOMParser };

/**
 * @typedef {import("./error.js").ErrorHandler} ErrorHandler
 * @typedef {import("./doc.js").MetadataHandler} MetadataHandler
 * @typedef {import("./doc.js").TT} TT
 * @typedef {import("./parser.js").Parser} Parser
 */

/**
 * Parses an IMSC1 document into an opaque in-memory representation, using the
 * DOMParser-backed parser unless a parser is provided.
 *
 * @param {string} xmlstring XML document
 * @param {ErrorHandler} errorHandler Error callback
 * @param {?MetadataHandler} metadataHandler Callback for <Metadata> elements
 * @param {?Parser} parser XML parser
 * @returns {?TT} Opaque in-memory representation of an IMSC1 document
 */
export function fromXML(xmlstring, errorHandler, metadataHandler, parser = createSAXParserFromDOMParser()) {
    return fromParser(xmlstring, errorHandler, metadataHandler, parser);
}
