import { cpSync, existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { basename, dirname, join } from "node:path";
import process from "node:process";

const require = createRequire(import.meta.url);

const properties = JSON.parse(readFileSync("properties.json", "utf8"));

function copy(src, dest) {
  /* the imsc-tests submodule is not always checked out; skip sources that are absent */
  if (!existsSync(src)) return;
  mkdirSync(dirname(dest), { recursive: true });
  cpSync(src, dest, { recursive: true });
}

function assembleWebapp(bundleName) {
  const out = properties.webappBuildDir;
  const resources = properties.unitTestsResourcesDir;

  copy(properties.webappTestDir, out);

  copy(join(resources, "imsc-tests/imsc1/ttml"), join(out, "imsc-tests/imsc1/ttml"));
  copy(join(resources, "imsc-tests/imsc1/tests.json"), join(out, "imsc-tests/imsc1/tests.json"));
  copy(join(resources, "imsc-tests/imsc1_1/ttml"), join(out, "imsc-tests/imsc1_1/ttml"));
  copy(join(resources, "imsc-tests/imsc1_1/tests.json"), join(out, "imsc-tests/imsc1_1/tests.json"));
  copy(join(resources, "unit-tests"), join(out, "unit-tests"));

  for (const lib of [
    require.resolve("sax"),
    require.resolve("filesaver.js-npm"),
    require.resolve("jszip/dist/jszip.js"),
  ]) {
    copy(lib, join(out, "libs", basename(lib)));
  }

  copy(join(properties.umdBuildDir, bundleName), join(out, "libs/imsc.js"));
}

switch (process.argv[2]) {
  case "clean":
    rmSync(properties.webappBuildDir, { recursive: true, force: true });
    rmSync(properties.umdBuildDir, { recursive: true, force: true });
    break;
  case "webapp:debug":
    assembleWebapp(properties.umdDebugName);
    break;
  case "webapp:release":
    assembleWebapp(properties.umdMinName);
    break;
  default:
    console.error("Usage: node scripts/build.js <clean | webapp:debug | webapp:release>");
    process.exit(1);
}
