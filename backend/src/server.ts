import http from "node:http";
import { connectDB } from "./config/db.ts";
import app from "./app.ts";
import { wsService } from "./websocket.ts";
import "dotenv/config";

const PORT = Number(process.env.PORT || 5000);

const startServer = async () => {
  await connectDB();

  const server = http.createServer(app);

  // Initialize Realtime WebSocket Server
  wsService.init(server);

  server.listen(PORT, '0.0.0.0', 1024, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`WebSocket server active on ws://localhost:${PORT}/ws`);
  });
};

void startServer();
