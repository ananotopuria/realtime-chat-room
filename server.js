import express from "express";
import http from "http";
import { Server } from "socket.io";

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

const PORT = 3001;
const rooms = new Map();

const normalizeText = (value) =>
  typeof value === "string" ? value.trim() : "";

const createRoom = (roomCode) => {
  if (!rooms.has(roomCode)) {
    rooms.set(roomCode, {
      code: roomCode,
      messages: [],
    });
  }

  return rooms.get(roomCode);
};

const getRoom = (roomCode) => rooms.get(roomCode);

const leaveSocketRoom = (socket) => {
  const currentRoom = socket.data.roomCode;

  if (!currentRoom) {
    return;
  }

  socket.leave(currentRoom);
  socket.data.roomCode = null;
};

io.on("connection", (socket) => {
  socket.on("create-room", ({ name, roomCode }) => {
    const cleanedName = normalizeText(name);
    const cleanedCode = normalizeText(roomCode).toUpperCase();

    if (!cleanedName) {
      socket.emit("room-error", {
        message: "Please enter your name before creating a room.",
      });
      return;
    }

    if (!cleanedCode) {
      socket.emit("room-error", { message: "Please provide a room code." });
      return;
    }

    if (rooms.has(cleanedCode)) {
      socket.emit("room-error", {
        message: `Room ${cleanedCode} already exists. Try a different code.`,
      });
      return;
    }

    const room = createRoom(cleanedCode);
    leaveSocketRoom(socket);

    socket.data.name = cleanedName;
    socket.data.roomCode = cleanedCode;
    socket.join(cleanedCode);

    socket.emit("room-joined", {
      roomCode: cleanedCode,
      messages: room.messages,
    });

    socket.emit("room-system", {
      message: `You created room ${cleanedCode}. Share the code with a friend.`,
      sender: "System",
      text: `You created room ${cleanedCode}. Share the code with a friend.`,
      roomCode: cleanedCode,
      timestamp: new Date().toISOString(),
    });
  });

  socket.on("join-room", ({ name, roomCode }) => {
    const cleanedName = normalizeText(name);
    const cleanedCode = normalizeText(roomCode).toUpperCase();

    if (!cleanedName) {
      socket.emit("room-error", {
        message: "Please enter your name before joining a room.",
      });
      return;
    }

    if (!cleanedCode) {
      socket.emit("room-error", {
        message: "Please enter a room code to join.",
      });
      return;
    }

    const room = getRoom(cleanedCode);

    if (!room) {
      socket.emit("room-error", {
        message: `Room ${cleanedCode} does not exist. Check the code and try again.`,
      });
      return;
    }

    leaveSocketRoom(socket);

    socket.data.name = cleanedName;
    socket.data.roomCode = cleanedCode;
    socket.join(cleanedCode);

    io.to(cleanedCode).emit("room-system", {
      message: `${cleanedName} joined the room.`,
      sender: "System",
      text: `${cleanedName} joined the room.`,
      roomCode: cleanedCode,
      timestamp: new Date().toISOString(),
    });

    socket.emit("room-joined", {
      roomCode: cleanedCode,
      messages: room.messages,
    });
  });

  socket.on("send-message", ({ message }) => {
    const roomCode = socket.data.roomCode;
    const sender = normalizeText(socket.data.name) || "Anonymous";
    const text = normalizeText(message);

    if (!roomCode) {
      socket.emit("room-error", {
        message: "Please join a room before sending a message.",
      });
      return;
    }

    if (!text) {
      socket.emit("room-error", { message: "Your message cannot be empty." });
      return;
    }

    const room = getRoom(roomCode);

    if (!room) {
      socket.emit("room-error", { message: "That room no longer exists." });
      return;
    }

    const messagePayload = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      sender,
      text,
      roomCode,
      timestamp: new Date().toISOString(),
    };

    room.messages.push(messagePayload);
    io.to(roomCode).emit("room-message", messagePayload);
  });

  socket.on("disconnect", () => {
    const currentRoom = socket.data.roomCode;

    if (!currentRoom) {
      return;
    }

    const name = normalizeText(socket.data.name) || "A user";
    socket.leave(currentRoom);

    io.to(currentRoom).emit("room-system", {
      message: `${name} left the room.`,
      sender: "System",
      text: `${name} left the room.`,
      roomCode: currentRoom,
      timestamp: new Date().toISOString(),
    });

    socket.data.roomCode = null;
  });
});

app.get("/health", (_req, res) => {
  res.json({ status: "ok", rooms: rooms.size });
});

server.listen(PORT, () => {
  console.log(`Socket.IO server running on http://localhost:${PORT}`);
});
