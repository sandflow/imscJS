import assert from "node:assert";
import fs from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { withGenRendersPage } from "../script/lib/gen-renders-page.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REFERENCE_FILES_ROOT = path.resolve(__dirname, "..", "resources", "reference-files");

const REFFILES_ROOTS = ["imsc-tests/imsc1", "imsc-tests/imsc1_1"];

async function listFilesRecursively(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true, recursive: true });

  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => path.relative(dir, path.join(entry.parentPath, entry.name)).split(path.sep).join("/"))
    .sort();
}

async function generateAndCompare(browserProduct) {

  await withGenRendersPage(browserProduct, async (page) => {

    for (const reffilesRoot of REFFILES_ROOTS) {

      const generatedFiles = await page.evaluate(async (root) => {
        // eslint-disable-next-line no-undef -- injected by gen-renders.js in the page context
        return await generateReferenceFiles(root);
      }, reffilesRoot);

      const referenceDir = path.join(REFERENCE_FILES_ROOT, path.basename(reffilesRoot));

      const generatedPaths = Object.keys(generatedFiles).sort();
      const referencePaths = await listFilesRecursively(referenceDir);

      assert.deepStrictEqual(
        generatedPaths,
        referencePaths,
        `generated files for ${reffilesRoot} do not match the set of reference files at ${referenceDir}`,
      );

      for (const relativePath of generatedPaths) {

        const referenceContents = await fs.readFile(path.join(referenceDir, relativePath), "utf8");

        assert.strictEqual(
          generatedFiles[relativePath],
          referenceContents,
          `${reffilesRoot}/${relativePath} does not match its reference file`,
        );

      }

    }

  });

}

test("Generated reference files match committed reference files (chrome)", { timeout: 120000 }, async () => {
  await generateAndCompare("chrome");
});

test("Generated reference files match committed reference files (firefox)", { timeout: 120000 }, async () => {
  await generateAndCompare("firefox");
});
