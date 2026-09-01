import fs from "node:fs/promises";
import { fromParser } from "../../../main/js/doc.js";
import { createSAXParser } from "./saxParser.js";

const errorHandler = {
  info: function (msg) {
    throw msg;
  },
  warn: function (msg) {
    throw msg;
  },
  error: function (msg) {
    throw msg;
  },
  fatal: function (msg) {
    throw msg;
  },
};

export async function getIMSC1Document(url, metadataHandler) {
  const contents = await fs.readFile(url, "utf8");
  return fromParser(contents, errorHandler, metadataHandler, createSAXParser());
}
