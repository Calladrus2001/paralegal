import { spawn } from "bun";

const server = spawn(
  ["bun", "run", "./src/common/run-with-env.ts", "config/local.json", "./src/server/index.ts"],
  { stdio: ["inherit", "inherit", "inherit"] }
);

const client = spawn(
  ["bun", "x", "vite"],
  { stdio: ["inherit", "inherit", "inherit"] }
);

process.on("SIGINT", () => {
  server.kill();
  client.kill();
});

const [serverCode, clientCode] = await Promise.all([server.exited, client.exited]);
process.exit(serverCode || clientCode || 0);
