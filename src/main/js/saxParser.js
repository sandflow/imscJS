import sax from "sax";

/**
 * @typedef {import("./parser.js").Parser} Parser
 */

/**
 * @returns {Parser}
 */
export function createSAXParser() {
  return sax.parser(true, { xmlns: true });
}
