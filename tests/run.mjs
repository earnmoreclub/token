// Starts the mock upstream, runs the upstream client tests, then shuts the mock down.
import { spawn } from "node:child_process";

const port = String(4100 + Math.floor(Math.random() * 800));
const env = { ...process.env, MOCK_PORT: port };

const mock = spawn(process.execPath, ["tests/mock-upstream.mjs"], { env, stdio: ["ignore", "pipe", "inherit"] });

await new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error("mock upstream did not start")), 5000);
  mock.stdout.on("data", (d) => {
    if (String(d).includes("listening")) {
      clearTimeout(timer);
      resolve();
    }
  });
  mock.on("exit", (code) => reject(new Error(`mock upstream exited (${code})`)));
});

const test = spawn(
  process.execPath,
  ["--experimental-transform-types", "--disable-warning=ExperimentalWarning", "--disable-warning=MODULE_TYPELESS_PACKAGE_JSON", "tests/upstream.test.mts"],
  { env, stdio: "inherit" },
);

const killTimer = setTimeout(() => test.kill("SIGKILL"), 30_000);
const code = await new Promise((resolve) => test.on("exit", resolve));
clearTimeout(killTimer);
mock.kill("SIGKILL");
process.exit(code ?? 1);
