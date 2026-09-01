/*
 * Copyright (c) Sandflow Consulting LLC
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
 * Implements an XML parser from the web browser's DOMParser
 *
 * @module parser
 */

/**
 * @typedef {import("./parser.js").Node} Node
 * @typedef {import("./parser.js").Parser} Parser
 * @typedef {import("./parser.js").Attribute} Attribute
 */

export class XMLParser {
  /**
   * @param {Element} element
   * @returns {Node}
   */
  static toNode(element) {
    const attrs = element.attributes;
    const node = XMLParser.toNS(element);
    node.attributes = {};

    for (let i = 0, len = attrs.length; i < len; i++) {
      const attr = attrs[i];
      node.attributes[attr.name] = XMLParser.toNS(attr);
    }

    return node;
  }

  static toNS(node) {
    return {
      name: node.nodeName,
      prefix: node.prefix,
      local: node.localName,
      uri: node.namespaceURI,
      value: node.value,
    };
  }

  onopentag = (node) => { console.log(node); }
  ontext = (str) => { console.log(str); }
  onclosetag = () => { }

  write(xmlstring) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlstring, "application/xml");
    const errorNode = doc.querySelector("parsererror");

    if (errorNode) {
      throw new Error("XML parsing error: " + errorNode.textContent);
    }

    this.process(doc.documentElement);

    return this;
  }

  process(element) {
    const node = XMLParser.toNode(element);
    this.onopentag(node);

    const children = element.childNodes;

    for (let i = 0, len = children.length; i < len; i++) {
      const child = children[i];

      if (child.nodeType === Node.TEXT_NODE) {
        this.ontext(child.textContent);
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        this.process(child);
      }
    }

    this.onclosetag();
  }

  close() {
    return this;
  }
}

/**
 * @returns {Parser}
 */
export function createSAXParserFromDOMParser() {
  return new XMLParser();
}

