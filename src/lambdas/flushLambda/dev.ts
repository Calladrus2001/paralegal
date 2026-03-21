import { handler } from "./index";

(async () => {
  console.log("Executing Flush Lambda locally...");
  await handler();
  console.log("Local execution complete.");
  process.exit(0);
})().catch((error) => {
  console.error("Handler error:", error);
  process.exit(1);
});
