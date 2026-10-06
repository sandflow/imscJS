import nodeResolve from "@rollup/plugin-node-resolve";
import terser from "@rollup/plugin-terser";

export default [
  {
    input: "dist/main/main.js",
    plugins: [
      nodeResolve({
        browser: true,
      }),
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
    }],
  },
];
