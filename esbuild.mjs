import * as esbuild from "esbuild";

await esbuild
  .build({
    entryPoints: ["./src/server/index.ts"],
    entryNames: "index",
    tsconfig: "./tsconfig.json",
    bundle: true,
    minify: true,
    sourcemap: true,
    keepNames: true,
    platform: "node",
    target: "node20",
    outdir: "./dist/server",
    logLevel: "info",
  })
  .then((res) => console.log(`esbuild result: ${JSON.stringify(res)}`))
  .catch(() => process.exit(1));

const lambdaOutDir = "./dist/server/processFileLambda";
await esbuild
  .build({
    entryPoints: ["./src/server/lambdas/processFileLambda/index.ts"],
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

const attributionLambdaOutDir = "./dist/server/attributionLambda";
await esbuild
  .build({
    entryPoints: ["./src/server/lambdas/attributionLambda/index.ts"],
    entryNames: "index",
    tsconfig: "./tsconfig.json",
    bundle: true,
    minify: true,
    sourcemap: true,
    keepNames: true,
    platform: "node",
    target: "node20",
    outdir: attributionLambdaOutDir,
    logLevel: "info",
  })
  .then((res) => console.log(`attributionLambda esbuild result: ${JSON.stringify(res)}`))
  .catch(() => process.exit(1));

const switchLambdaOutDir = "./dist/server/switchLambda";
await esbuild
  .build({
    entryPoints: ["./src/server/lambdas/switchLambda/index.ts"],
    entryNames: "index",
    tsconfig: "./tsconfig.json",
    bundle: true,
    minify: true,
    sourcemap: true,
    keepNames: true,
    platform: "node",
    target: "node20",
    outdir: switchLambdaOutDir,
    logLevel: "info",
  })
  .then((res) => console.log(`switchLambda esbuild result: ${JSON.stringify(res)}`))
  .catch(() => process.exit(1));

const scoringLambdaOutDir = "./dist/server/scoringLambda";
await esbuild
  .build({
    entryPoints: ["./src/server/lambdas/scoringLambda/index.ts"],
    entryNames: "index",
    tsconfig: "./tsconfig.json",
    bundle: true,
    minify: true,
    sourcemap: true,
    keepNames: true,
    platform: "node",
    target: "node20",
    outdir: scoringLambdaOutDir,
    logLevel: "info",
  })
  .then((res) => console.log(`scoringLambda esbuild result: ${JSON.stringify(res)}`))
  .catch(() => process.exit(1));

const flushLambdaOutDir = "./dist/server/flushLambda";
await esbuild
  .build({
    entryPoints: ["./src/server/lambdas/flushLambda/index.ts"],
    entryNames: "index",
    tsconfig: "./tsconfig.json",
    bundle: true,
    minify: true,
    sourcemap: true,
    keepNames: true,
    platform: "node",
    target: "node20",
    outdir: flushLambdaOutDir,
    logLevel: "info",
  })
  .then((res) => console.log(`flushLambda esbuild result: ${JSON.stringify(res)}`))
  .catch(() => process.exit(1));
