/**
 * Socket.IO companion for Admin > Chat (text/URL only).
 * Run: npm run chat
 * Default: http://127.0.0.1:3002
 */
import { createServer } from "node:http";
import { Server } from "socket.io";

const port = Number(process.env.CHAT_SOCKET_PORT || 3002);
const host = process.env.CHAT_SOCKET_HOST || "0.0.0.0";
const origins = String(
  process.env.CHAT_SOCKET_CORS_ORIGIN ||
    "http://localhost:3001,http://127.0.0.1:3001",
)
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);
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
      if (payload?.event === "room:sync" && payload?.roomId) {
        // Fan out to everyone so newly added staff pick up the group live.
        io.emit("room:sync", payload);
      } else if (payload?.roomId) {
        // System activity must reach desks that just gained membership.
        if (payload.kind === "system") io.emit("message:new", payload);
        else io.to(`room:${payload.roomId}`).emit("message:new", payload);
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
  cors: {
    origin: origins.length <= 1 ? origins[0] || true : origins,
    methods: ["GET", "POST"],
  },
  transports: ["websocket", "polling"],
  // Keep the live path snappy for desk chat fan-out.
  pingInterval: 10000,
  pingTimeout: 5000,
  perMessageDeflate: false,
});

io.use((socket, next) => {
  const userId = String(socket.handshake.auth?.userId || "").trim();
  const name = String(socket.handshake.auth?.name || "Staff").trim().slice(0, 80);
  const roleRaw = String(socket.handshake.auth?.role || "staff").trim().toLowerCase();
  const role = roleRaw === "admin" ? "admin" : "staff";
  if (!userId) return next(new Error("Authentication required"));
  socket.data.userId = userId;
  socket.data.name = name || "Staff";
  socket.data.role = role;
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
      role: socket.data.role || "staff",
    });
  });

  socket.on("typing:stop", (roomId) => {
    const id = roomIdOf(roomId);
    if (!id) return;
    socket.to(`room:${id}`).emit("typing:stop", {
      roomId: id,
      userId: socket.data.userId,
      role: socket.data.role || "staff",
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

  socket.on("message:delete", (payload) => {
    const id = roomIdOf(payload?.roomId);
    const messageId = String(payload?.messageId || "");
    if (!id || !/^[0-9a-f-]{36}$/i.test(messageId)) return;
    socket.to(`room:${id}`).emit("message:removed", { roomId: id, messageId });
  });

  socket.on("room:delete", (payload) => {
    const id = roomIdOf(payload?.roomId);
    if (!id) return;
    socket.to(`room:${id}`).emit("room:removed", { roomId: id });
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

httpServer.listen(port, host, () => {
  console.log(`Jwalamala chat socket on http://${host}:${port}`);
  console.log(`CORS origins: ${origins.join(", ") || "(any)"}`);
});
