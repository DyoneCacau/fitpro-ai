import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = join(root, ".env");

function loadEnv() {
  const env = { ...process.env };
  if (!existsSync(envPath)) return env;
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

const env = loadEnv();
env.SUPABASE_CLI_BINARY_OVERRIDE =
  env.SUPABASE_CLI_BINARY_OVERRIDE ??
  join(root, "node_modules", "@supabase", "cli-windows-x64", "bin", "supabase-go.exe");

console.log("Aplicando migrations no Supabase remoto...");
try {
  execSync("npx supabase db push", {
    cwd: root,
    stdio: "inherit",
    env,
  });
  console.log("Migrations aplicadas com sucesso.");
} catch (error) {
  console.error(
    "\nFalha ao conectar no Postgres remoto. Se o projeto estiver pausado, reative em https://supabase.com/dashboard e rode npm run db:push novamente.",
  );
  process.exit(typeof error.status === "number" ? error.status : 1);
}
