import express from "express";
import { createServer } from "http";

const app = express();

app.get("/api/progress", (_, res) => {
  res.json({ ok: true });
});

const server = createServer(app);

const PORT = Number(process.env.PORT) || 5000;

server.listen(PORT, "0.0.0.0", () => {
  console.log("SERVER UP ON", PORT);
});
