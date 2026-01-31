import * as esbuild from "esbuild";

await esbuild
  .build({
    entryPoints: ["./src/index.ts"],
    entryNames: "index",
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
  .then((res) => console.log(`esbuild result: ${JSON.stringify(res)}`))
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
  .then((res) => console.log(`processFileLambda esbuild result: ${JSON.stringify(res)}`))
  .catch(() => process.exit(1));
