/**
 * @typedef {import("sax").Tag | import("sax").QualifiedTag} Node
 */

/**
 * @typedef {Object} Parser
 * @property {(xml: string) => Parser} write
 * @property {() => Parser} close
 * @property {(node: Node) => void} onopentag
 * @property {(text: string) => void} ontext
 * @property {() => void} onclosetag
 */

export class XMLParser {
  /**
   * @param {Element} element
   * @returns {SAX}
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
export function createDOMParser() {
  return new XMLParser();
}

