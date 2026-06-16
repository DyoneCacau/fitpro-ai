import { execSync } from "node:child_process";
import { networkInterfaces } from "node:os";

function getLocalIp() {
  for (const interfaces of Object.values(networkInterfaces())) {
    for (const net of interfaces ?? []) {
      if (net.family === "IPv4" && !net.internal) {
        return net.address;
      }
    }
  }

  return "localhost";
}

const port = process.env.CAPACITOR_DEV_PORT ?? "8080";
const serverUrl = `http://${getLocalIp()}:${port}`;

process.env.CAPACITOR_SERVER_URL = serverUrl;
console.log(`Capacitor apontando para: ${serverUrl}`);

const command = process.argv[2] ?? "sync";
const capCommand =
  command === "run-android"
    ? "npx cap run android"
    : command === "run-ios"
      ? "npx cap run ios"
      : "npx cap sync";

execSync(capCommand, { stdio: "inherit", env: process.env });
