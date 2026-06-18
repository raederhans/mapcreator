import { spawn } from "node:child_process";

const pythonArgs = process.argv.slice(2);

if (pythonArgs.length === 0) {
  console.error("Usage: node tools/run_python.mjs <python-args...>");
  process.exit(1);
}

const candidates = process.platform === "win32"
  ? [
      { command: "py", args: ["-3"] },
      { command: "python", args: [] },
    ]
  : [
      { command: "python3", args: [] },
      { command: "python", args: [] },
    ];

function runCandidate(index = 0) {
  const candidate = candidates[index];
  if (!candidate) {
    console.error("No Python interpreter found. Install Python 3 or make it available on PATH.");
    process.exit(1);
  }

  const child = spawn(candidate.command, [...candidate.args, ...pythonArgs], {
    stdio: "inherit",
    shell: false,
  });

  child.on("error", (error) => {
    if (error.code === "ENOENT") {
      runCandidate(index + 1);
      return;
    }
    console.error(error.message);
    process.exit(1);
  });

  child.on("exit", (code, signal) => {
    if (signal) {
      console.error(`Python process exited with signal ${signal}`);
      process.exit(1);
    }
    process.exit(code ?? 1);
  });
}

runCandidate();
