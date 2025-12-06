#!/usr/bin/env tsx
/**
 * Script para mostrar la IP local que se usará en dispositivos físicos
 */

import { networkInterfaces } from "os";

function getLocalIP(): string | null {
  const interfaces = networkInterfaces();
  const isIPv4 = (family: string | number) => family === "IPv4" || family === 4;
  
  // Buscar IP preferida (WiFi/Ethernet)
  for (const name of Object.keys(interfaces)) {
    const nets = interfaces[name];
    if (!nets) continue;

    for (const net of nets) {
      if (isIPv4(net.family) && !net.internal) {
        const nameLower = name.toLowerCase();
        if (nameLower.includes("wi-fi") || nameLower.includes("ethernet") || 
            nameLower.includes("wifi") || nameLower.includes("eth0") || 
            nameLower.includes("wlan0") || nameLower.includes("wireless")) {
          return net.address;
        }
      }
    }
  }

  // Buscar cualquier IP IPv4 no interna
  for (const name of Object.keys(interfaces)) {
    const nets = interfaces[name];
    if (!nets) continue;

    for (const net of nets) {
      if (isIPv4(net.family) && !net.internal) {
        return net.address;
      }
    }
  }

  return null;
}

const ip = getLocalIP();
if (ip) {
  console.log(`\n📍 IP local detectada: ${ip}`);
  console.log(`🔗 URL del servidor: http://${ip}:5000`);
  console.log(`\n💡 Asegúrate de que tu dispositivo físico esté en la misma red Wi-Fi.\n`);
} else {
  console.log(`\n⚠️  No se pudo detectar una IP local.`);
  console.log(`💡 Puedes configurarla manualmente con: CAPACITOR_SERVER_URL=http://TU_IP:5000\n`);
}






