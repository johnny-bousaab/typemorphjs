import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import terser from "@rollup/plugin-terser";
import gzip from "rollup-plugin-gzip";

const external = ["marked", "dompurify"];

export default [
  {
    input: "./src/typemorph.js",
    output: {
      file: "./dist/typemorph.esm.js",
      format: "esm",
      sourcemap: false,
    },
    external,
  },
  {
    input: "./src/typemorph.js",
    output: {
      file: "./dist/typemorph.umd.min.js",
      format: "umd",
      name: "TypeMorph",
      sourcemap: true,
      manualChunks: (id) => {
        if (id.includes("typemorph.js")) {
          return "typemorph";
        }
        return "typemorph";
      },
    },
    plugins: [resolve(), commonjs(), terser()],
  },
  {
    input: "./src/typemorph.js",
    output: {
      file: "./dist/typemorph.core.umd.min.js",
      format: "umd",
      name: "TypeMorph",
      sourcemap: true,
    },
    plugins: [terser()],
    external,
  },
];
