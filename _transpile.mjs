
import fs from 'fs';
import path from 'path';
import ts from 'typescript';

const inFile = process.argv[2];
const outFile = process.argv[3];
const isTSX = inFile.endsWith('.tsx');

const source = fs.readFileSync(inFile, 'utf8');
const result = ts.transpileModule(source, {
  compilerOptions: {
    target: ts.ScriptTarget.ES2020,
    module: ts.ModuleKind.ESNext,
    jsx: isTSX ? ts.JsxEmit.ReactJSX : ts.JsxEmit.Preserve,
    importsNotUsedAsValues: ts.ImportsNotUsedAsValues.Remove,
    preserveValueImports: false,
    sourceMap: false,
    inlineSourceMap: false,
  },
  fileName: path.basename(inFile),
});

let out = result.outputText;

// Small cleanups for JS output in Astro context:
out = out.replace(/^export \{\};\s*$/m, ''); // remove empty export if any
out = out.replace(/\n{3,}/g, '\n\n');

fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, out, 'utf8');
