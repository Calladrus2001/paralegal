// src/common/run-with-env.ts
import { readFileSync } from "fs";
import { spawn } from "child_process";
import { resolve } from "path";

// Get the config path and entry file from CLI args
const [configPathArg, entryPathArg] = Bun.argv.slice(2);

if (!configPathArg || !entryPathArg) {
  console.error("Usage: bun run src/common/run-with-env.ts <config path> <entry path>");
  process.exit(1);
}

// Resolve full paths
const configPath = resolve(configPathArg);
const entryPath = resolve(entryPathArg);

// Read and parse config
const configRaw = readFileSync(configPath, "utf-8");
const config = JSON.parse(configRaw);

// Spawn Bun process with merged env
const child = spawn(process.execPath, [entryPath], {
  stdio: "inherit",
  env: { ...config, ...process.env },
});

child.on("exit", (code) => process.exit(code ?? 0));
