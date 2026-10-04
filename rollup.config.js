import commonjs from "@rollup/plugin-commonjs";
import nodeResolve from "@rollup/plugin-node-resolve";
import terser from "@rollup/plugin-terser";
import nodePolyfill from "rollup-plugin-polyfill-node";

const DEPRECATED_BUNDLE_BANNER = "/*! DEPRECATED: this bundle is subject to removal in a future release; use imsc.debug.js or imsc.min.js instead. */";

export default [
  {
    input: "dist/main/main.js",
    plugins: [
      commonjs({
        sourceMap: true,
      }),
      nodeResolve({
        preferBuiltins: true,
        browser: true,
      }),
      nodePolyfill(),
    ],
    output: [{
      file: "dist/imsc.debug.js",
      format: "umd",
      name: "imsc",
      sourcemap: true,
    }, {
      file: "dist/imsc.min.js",
      format: "umd",
      name: "imsc",
      sourcemap: true,
      plugins: [terser()],
    }, {
      /* DEPRECATED: imscJS 1.x bundle names, retained for backward compatibility and subject to removal in a future release */
      file: "dist/imsc.all.debug.js",
      format: "umd",
      name: "imsc",
      sourcemap: true,
      banner: DEPRECATED_BUNDLE_BANNER,
    }, {
      file: "dist/imsc.all.min.js",
      format: "umd",
      name: "imsc",
      sourcemap: true,
      banner: DEPRECATED_BUNDLE_BANNER,
      plugins: [terser()],
    }],
  },
];
