import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

export async function tmp() {
  const dir = await mkdtemp(join(tmpdir(), "csv-dedup-"));
  return {
    dir,
    file: (name: string, content: string) => {
      const p = join(dir, name);
      return Bun.write(p, content).then(() => p);
    },
    cleanup: () => rm(dir, { recursive: true }),
  };
}

export async function run(...args: string[]) {
  const proc = Bun.spawn(["bun", "run", "src/index.ts", ...args], {
    cwd: join(import.meta.dir, ".."),
    stdout: "pipe",
    stderr: "pipe",
  });
  const stdout = await new Response(proc.stdout).text();
  const stderr = await new Response(proc.stderr).text();
  const code = await proc.exited;
  return { stdout, stderr, code };
}
