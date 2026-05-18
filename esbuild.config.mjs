import esbuild from "esbuild";
import { builtinModules } from "node:module";

const production = process.argv[2] === "production";
const external = [
	"obsidian",
	"electron",
	"@codemirror/autocomplete",
	"@codemirror/collab",
	"@codemirror/commands",
	"@codemirror/language",
	"@codemirror/lint",
	"@codemirror/search",
	"@codemirror/state",
	"@codemirror/view",
	"@lezer/common",
	"@lezer/highlight",
	"@lezer/lr",
	...builtinModules,
	...builtinModules.map((moduleName) => `node:${moduleName}`),
];

await esbuild.build({
	entryPoints: ["main.ts"],
	bundle: true,
	external,
	format: "cjs",
	target: "es2018",
	logLevel: "info",
	sourcemap: production ? false : "inline",
	treeShaking: true,
	outfile: "main.js",
	minify: production,
});
