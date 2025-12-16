import type { CapacitorConfig } from "@capacitor/cli";
import { networkInterfaces } from "os";

/**
 * Obtiene la IP local de la máquina para desarrollo en dispositivos físicos
 * En emuladores, usa 10.0.2.2 (especial para Android emulator)
 */
function getLocalIP(): string {
  // Si hay una variable de entorno, úsala (útil para emuladores o IPs específicas)
  if (process.env.CAPACITOR_SERVER_URL) {
    return process.env.CAPACITOR_SERVER_URL;
  }

  // Para emuladores, usar 10.0.2.2
  if (process.env.CAPACITOR_USE_EMULATOR === "true") {
    return "http://10.0.2.2:4000";
  }

  // Obtener la IP local de la máquina
  const interfaces = networkInterfaces();
  const isIPv4 = (family: string | number) => family === "IPv4" || family === 4;
  
  for (const name of Object.keys(interfaces)) {
    const nets = interfaces[name];
    if (!nets) continue;

    for (const net of nets) {
      // Ignorar direcciones internas y no IPv4
      if (isIPv4(net.family) && !net.internal) {
        // Preferir conexiones WiFi/Ethernet sobre otras
        const nameLower = name.toLowerCase();
        if (nameLower.includes("wi-fi") || nameLower.includes("ethernet") || 
            nameLower.includes("wifi") || nameLower.includes("eth0") || 
            nameLower.includes("wlan0") || nameLower.includes("wireless")) {
          return `http://${net.address}:4000`;
        }
      }
    }
  }

  // Si no se encuentra una IP preferida, usar la primera IPv4 no interna
  for (const name of Object.keys(interfaces)) {
    const nets = interfaces[name];
    if (!nets) continue;

    for (const net of nets) {
      if (isIPv4(net.family) && !net.internal) {
        return `http://${net.address}:4000`;
      }
    }
  }

  // Fallback a localhost (solo funcionará si el dispositivo está en la misma máquina)
  return "http://localhost:4000";
}

const config: CapacitorConfig = {
  appId: "com.capsulecodes.investamind",
  appName: "investamind",
  webDir: "dist/public",
  server: {
    url: getLocalIP(),
    cleartext: true,
  },
  plugins: {
    App: {
      // Configuración de deeplinks
      launchUrl: "investamind://",
    },
  },
};

export default config;
