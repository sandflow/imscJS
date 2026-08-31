import sax from "sax";

/**
 * @typedef {import("../../../main/js/parser.js").Parser} Parser
 */

/**
 * Creates a sax-based parser for use in the unit tests, which run in node,
 * where the DOMParser global required by the default DOM parser does not
 * exist. The library itself is browser-only and does not use sax.
 *
 * @returns {Parser}
 */
export function createSAXParser() {
  return sax.parser(true, { xmlns: true });
}
