/*
 * Node entry point. Identical to main.js, except that fromXML() defaults to
 * the sax parser, since node does not provide the DOMParser global that the
 * default DOM parser relies on.
 */

import { fromXML as fromXMLWithParser } from "./doc.js";
import { createSAXParser } from "./saxParser.js";

export { renderHTML } from "./html.js";
export { generateISD } from "./isd.js";
export { createDOMParser } from "./parser.js";
export { createSAXParser };

/**
 * @typedef {import("./error.js").ErrorHandler} ErrorHandler
 * @typedef {import("./doc.js").MetadataHandler} MetadataHandler
 * @typedef {import("./doc.js").TT} TT
 * @typedef {import("./parser.js").Parser} Parser
 */

/**
 * Same as fromXML() in doc.js, but defaults to the sax parser.
 *
 * @param {string} xmlstring XML document
 * @param {ErrorHandler} errorHandler Error callback
 * @param {?MetadataHandler} metadataHandler Callback for <Metadata> elements
 * @param {?Parser} parser XML parser
 * @returns {?TT} Opaque in-memory representation of an IMSC1 document
 */
export function fromXML(xmlstring, errorHandler, metadataHandler, parser = createSAXParser()) {
    return fromXMLWithParser(xmlstring, errorHandler, metadataHandler, parser);
}
