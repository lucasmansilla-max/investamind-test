import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.capsulecodes.investamind",
  appName: "investamind",
  webDir: "dist/public",
  server: {
    url: "http://10.0.2.2:5000",
    cleartext: true,
  },
};

export default config;
