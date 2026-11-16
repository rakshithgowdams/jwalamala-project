/**
 * Socket.IO companion for Admin > Chat (text/URL only).
 * Run: npm run chat
 * Default: http://127.0.0.1:3002
 */
import { createServer } from "node:http";
import { Server } from "socket.io";

const port = Number(process.env.CHAT_SOCKET_PORT || 3002);
const origin = process.env.CHAT_SOCKET_CORS_ORIGIN || "http://localhost:3001";
const internalSecret = process.env.CHAT_INTERNAL_SECRET || process.env.CHAT_WEBHOOK_SECRET || "";

const httpServer = createServer(async (req, res) => {
  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, service: "jwalamala-chat-socket" }));
    return;
  }
  if (req.method === "POST" && req.url === "/internal/broadcast") {
    const auth = req.headers.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    if (!internalSecret || token !== internalSecret) {
      res.writeHead(401).end("Unauthorized");
      return;
    }
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    try {
      const payload = JSON.parse(Buffer.concat(chunks).toString("utf8"));
      if (payload?.roomId) {
        io.to(`room:${payload.roomId}`).emit("message:new", payload);
        io.to(`room:${payload.roomId}`).emit("typing:stop", {
          roomId: payload.roomId,
          userId: payload.senderId || "webhook",
        });
      }
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true }));
    } catch {
      res.writeHead(400).end("Bad JSON");
    }
    return;
  }
  res.writeHead(404).end("Not found");
});

const io = new Server(httpServer, {
  cors: { origin, methods: ["GET", "POST"] },
  transports: ["websocket", "polling"],
});

io.use((socket, next) => {
  const userId = String(socket.handshake.auth?.userId || "").trim();
  const name = String(socket.handshake.auth?.name || "Staff").trim().slice(0, 80);
  if (!userId) return next(new Error("Authentication required"));
  socket.data.userId = userId;
  socket.data.name = name || "Staff";
  next();
});

function roomIdOf(value) {
  const id = String(value || "");
  return /^[0-9a-f-]{36}$/i.test(id) ? id : "";
}

io.on("connection", (socket) => {
  socket.on("room:join", (roomId) => {
    const id = roomIdOf(roomId);
    if (!id) return;
    socket.join(`room:${id}`);
  });

  socket.on("room:leave", (roomId) => {
    const id = roomIdOf(roomId);
    if (!id) return;
    socket.leave(`room:${id}`);
    socket.to(`room:${id}`).emit("typing:stop", {
      roomId: id,
      userId: socket.data.userId,
    });
  });

  socket.on("typing:start", (roomId) => {
    const id = roomIdOf(roomId);
    if (!id) return;
    socket.to(`room:${id}`).emit("typing:start", {
      roomId: id,
      userId: socket.data.userId,
      name: socket.data.name,
    });
  });

  socket.on("typing:stop", (roomId) => {
    const id = roomIdOf(roomId);
    if (!id) return;
    socket.to(`room:${id}`).emit("typing:stop", {
      roomId: id,
      userId: socket.data.userId,
    });
  });

  /** Fan-out a just-sent message instantly to everyone else in the group. */
  socket.on("message:share", (payload) => {
    const id = roomIdOf(payload?.roomId);
    if (!id || !payload?.id || !payload?.body) return;
    socket.to(`room:${id}`).emit("message:new", {
      id: String(payload.id),
      roomId: id,
      senderId: payload.senderId || socket.data.userId,
      senderName: String(payload.senderName || socket.data.name || "Staff").slice(0, 80),
      body: String(payload.body).slice(0, 4000),
      kind: ["text", "url", "system"].includes(payload.kind) ? payload.kind : "text",
      createdAt: payload.createdAt || new Date().toISOString(),
    });
    socket.to(`room:${id}`).emit("typing:stop", {
      roomId: id,
      userId: payload.senderId || socket.data.userId,
    });
  });

  socket.on("disconnect", () => {
    for (const room of socket.rooms) {
      if (!room.startsWith("room:")) continue;
      socket.to(room).emit("typing:stop", {
        roomId: room.slice(5),
        userId: socket.data.userId,
      });
    }
  });
});

httpServer.listen(port, "127.0.0.1", () => {
  console.log(`Jwalamala chat socket on http://127.0.0.1:${port}`);
});
