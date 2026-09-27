# Socket.IO Room Chat Assignment

This app is a simple real-time chat where users create or join a room by code and exchange messages only with users in that same room.

## Tech stack

- Frontend: React + TypeScript + Vite
- Backend: Node.js + Express + Socket.IO
- Storage: in-memory server state only, suitable for assignment work

## How to run

```bash
npm install
npm run dev
```

Then open two browser tabs to:

- http://localhost:5173
- http://localhost:5173

Use the same room code in both tabs to test the conversation. For example:

1. In Window 1, enter name `Alice`, room code `ROOM1`, and click `Create room`.
2. In Window 2, enter name `Bob`, room code `ROOM1`, and click `Join room`.
3. Send messages in either window.

## Socket.IO events used

- `create-room`: creates a new room with a unique code
- `join-room`: joins an existing room if the code exists
- `send-message`: sends a message to all sockets in the current room
- `room-joined`: sends the room code and conversation history to the user
- `room-message`: broadcast message payload to the room
- `room-system`: system messages for join/leave events
- `room-error`: validation feedback such as invalid room codes or empty messages

## Important code areas

- [server.js](server.js): creates the Express server and Socket.IO room logic, keeps rooms in memory, and broadcasts messages only to sockets in the same room.
- [src/App.tsx](src/App.tsx): React interface for entering a name, creating or joining a room, displaying messages, and sending chat messages.
- [src/App.css](src/App.css): styling for a simple responsive layout.

## Assignment notes

The main idea is that every connected browser tab is a Socket.IO socket. The server keeps a map of room codes to messages. When a user joins a room, they are added to that room channel. Messages are sent with `io.to(roomCode).emit(...)`, so only users in that room receive them.
