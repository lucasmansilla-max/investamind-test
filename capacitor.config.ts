import type { CapacitorConfig } from "@capacitor/cli";
import { networkInterfaces } from "os";

const isDev = process.env.CAPACITOR_DEV === "true";

function getLocalIP(): string {
  if (process.env.CAPACITOR_SERVER_URL) {
    return process.env.CAPACITOR_SERVER_URL;
  }

  if (process.env.CAPACITOR_USE_EMULATOR === "true") {
    return "http://10.0.2.2:5000";
  }

  const interfaces = networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    const nets = interfaces[name];
    if (!nets) continue;

    for (const net of nets) {
      if ((net.family === "IPv4" || String(net.family) === "4") && !net.internal) {
        return `http://${net.address}:5000`;
      }
    }
  }

  return "http://localhost:5000";
}

const config: CapacitorConfig = {
  appId: "com.capsulecodes.investamind",
  appName: "investamind",
  webDir: "dist/public",

  ...(isDev && {
    server: {
      url: getLocalIP(),
      cleartext: true,
    },
  }),
};

export default config;
