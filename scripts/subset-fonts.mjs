import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  promises as fs,
  rmSync,
  writeFileSync
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pyftsubsetCommand, uvEnv } from "./lib/fonttools.mjs";

const root = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const cjkSourceFont = path.join(root, "fonts/wqy-zenhei-sharp-0.9.45.ttf");
const cjkOutputFont = path.join(root, "public/fonts/wqy-zenhei-sharp-bitmap-subset.ttf");
const asciiSourceFont = path.join(root, "fonts/gohu.woff");
const asciiOutputFont = path.join(root, "public/fonts/gohu-subset.woff");
const contentRoots = ["src/content", "src/config", "src/components", "src/pages"];
const textExtensions = new Set([".astro", ".phile", ".ts"]);
const pyftsubset = pyftsubsetCommand();
const tempDir = mkdtempSync(path.join(os.tmpdir(), "entropic-font-"));
const textFile = path.join(tempDir, "chars.txt");

try {
  if (!existsSync(cjkSourceFont)) {
    throw new Error(`Missing source font: ${path.relative(root, cjkSourceFont)}`);
  }

  if (!existsSync(asciiSourceFont)) {
    throw new Error(`Missing source font: ${path.relative(root, asciiSourceFont)}`);
  }

  const chars = await collectChars();
  await fs.mkdir(path.dirname(cjkOutputFont), { recursive: true });
  writeFileSync(textFile, chars, "utf8");

  subsetAsciiFont();
  subsetCjkFont();
} finally {
  rmSync(tempDir, { force: true, recursive: true });
}

function subsetAsciiFont() {
  runPyftsubset([
    asciiSourceFont,
    `--output-file=${asciiOutputFont}`,
    "--unicodes=U+0000-00FF,U+03BB,U+2190-21FF,U+2500-259F,U+25A0-25FF,U+2600-26FF",
    "--layout-features=*",
    "--flavor=woff"
  ]);
}

function subsetCjkFont(output = cjkOutputFont) {
  runPyftsubset([
    cjkSourceFont,
    `--output-file=${output}`,
    `--text-file=${textFile}`,
    "--layout-features=*",
    "--desubroutinize",
    "--drop-tables-=EBDT,EBLC,BDF",
    "--no-subset-tables+=EBDT,EBLC,BDF",
    "--passthrough-tables"
  ]);
}

async function collectChars() {
  const files = (await Promise.all(contentRoots.map((dir) => listTextFiles(path.join(root, dir))))).flat();
  const chars = new Set(["　", "，", "。", "：", "；", "、", "？", "！", "（", "）", "《", "》", "「", "」"]);

  for (const file of files) {
    const text = await fs.readFile(file, "utf8");

    for (const char of text) {
      if (isCjkFontChar(char)) {
        chars.add(char);
      }
    }
  }

  return [...chars].join("");
}

async function listTextFiles(dir) {
  if (!existsSync(dir)) {
    return [];
  }

  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map((entry) => {
      const entryPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        return listTextFiles(entryPath);
      }

      return entry.isFile() && textExtensions.has(path.extname(entry.name)) ? [entryPath] : [];
    })
  );

  return files.flat();
}

function isCjkFontChar(char) {
  return /[\u3000-\u303f\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uff00-\uffef]/u.test(char);
}

function runPyftsubset(args) {
  execFileSync(pyftsubset.command, [...pyftsubset.prefixArgs, ...args], {
    env: uvEnv,
    stdio: "inherit"
  });
}
