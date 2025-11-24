/**
 * Environment configuration
 * Centralizes all environment variable loading and validation
 */

import "dotenv/config";

export interface EnvConfig {
  // Database
  DATABASE_URL: string;

  // Session
  SESSION_SECRET: string;

  // CORS - Client origins for CORS
  CLIENT_ORIGINS: string[];

  // S3/R2 Storage (optional)
  S3_BUCKET?: string;
  S3_REGION?: string;
  S3_ACCESS_KEY_ID?: string;
  S3_SECRET_ACCESS_KEY?: string;
  S3_ENDPOINT?: string;

  // Application
  NODE_ENV: string;
  PORT: number;
}

/**
 * Load and validate environment variables
 */
export function loadEnv(): EnvConfig {
  const DATABASE_URL = process.env.DATABASE_URL;
  if (!DATABASE_URL) {
    throw new Error(
      "DATABASE_URL must be set. Did you forget to provision a database?",
    );
  }

  // Session secret - generate a random one if not provided (for development)
  const SESSION_SECRET =
    process.env.SESSION_SECRET ||
    (process.env.NODE_ENV === "production"
      ? (() => {
          throw new Error("SESSION_SECRET must be set in production");
        })()
      : "dev-secret-change-in-production");

  // Parse CLIENT_ORIGINS from comma-separated list
  const CLIENT_ORIGINS = process.env.CLIENT_ORIGINS
    ? process.env.CLIENT_ORIGINS.split(",").map((origin) => origin.trim())
    : ["http://localhost:5000", "http://localhost:5173"];

  return {
    DATABASE_URL,
    SESSION_SECRET,
    CLIENT_ORIGINS,
    S3_BUCKET: process.env.S3_BUCKET,
    S3_REGION: process.env.S3_REGION || "us-east-1",
    S3_ACCESS_KEY_ID: process.env.S3_ACCESS_KEY_ID,
    S3_SECRET_ACCESS_KEY: process.env.S3_SECRET_ACCESS_KEY,
    S3_ENDPOINT: process.env.S3_ENDPOINT,
    NODE_ENV: process.env.NODE_ENV || "development",
    PORT: parseInt(process.env.PORT || "5000", 10),
  };
}

export const env = loadEnv();
