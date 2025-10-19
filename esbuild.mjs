import * as esbuild from "esbuild";
import AdmZip from "adm-zip";
import { existsSync } from "fs";
import { join } from "path";

await esbuild
  .build({
    entryPoints: ["./index.ts"],
    entryNames: "[dir]/index",
    tsconfig: "./tsconfig.json",
    bundle: true,
    minify: true,
    sourcemap: true,
    keepNames: true,
    platform: "node",
    target: "node20",
    outdir: "./dist",
    logLevel: "info",
  })
  .then((res) => console.log(`esbuild result: ${res}`))
  .catch(() => process.exit(1));

const lambdaOutDir = "./dist/processFileLambda";
await esbuild
  .build({
    entryPoints: ["./src/lambdas/processFileLambda/index.ts"],
    entryNames: "index",
    tsconfig: "./tsconfig.json",
    bundle: true,
    minify: true,
    sourcemap: true,
    keepNames: true,
    platform: "node",
    target: "node20",
    outdir: lambdaOutDir,
    logLevel: "info",
  })
  .then((res) => console.log(`processFileLambda esbuild result: ${res}`))
  .catch(() => process.exit(1));

if (existsSync(lambdaOutDir)) {
  const zip = new AdmZip();
  zip.addLocalFolder(lambdaOutDir);
  const zipPath = join("./dist", "processFileLambda.zip");
  zip.writeZip(zipPath);
} else {
  console.error("❌ Lambda output folder not found, cannot zip");
  process.exit(1);
}
