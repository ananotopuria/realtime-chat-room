import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { io, type Socket } from "socket.io-client";
import "./App.css";

type Message = {
  id: string;
  sender: string;
  text: string;
  roomCode: string;
  timestamp: string;
};

const socket: Socket = io("http://localhost:3001", {
  autoConnect: false,
});

const handleRoomCodeInput = (value: string) =>
  value.replace(/\s+/g, "").toUpperCase();

function App() {
  const [name, setName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentRoom, setCurrentRoom] = useState("");
  const [feedback, setFeedback] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [isInRoom, setIsInRoom] = useState(false);
  const messageEndRef = useRef<HTMLDivElement | null>(null);
  const currentRoomRef = useRef("");

  const roomLabel = useMemo(
    () => (currentRoom ? `Room ${currentRoom}` : "No room joined"),
    [currentRoom],
  );

  useEffect(() => {
    currentRoomRef.current = currentRoom;
  }, [currentRoom]);

  useEffect(() => {
    socket.connect();

    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => {
      setIsConnected(false);
      setIsInRoom(false);
      setCurrentRoom("");
      currentRoomRef.current = "";
      setMessages([]);
      setFeedback("You were disconnected. Reconnect and join a room again.");
    };
    const onRoomJoined = (payload: {
      roomCode: string;
      messages: Message[];
    }) => {
      setCurrentRoom(payload.roomCode);
      currentRoomRef.current = payload.roomCode;
      setMessages(payload.messages);
      setIsInRoom(true);
      setFeedback("");
    };
    const onRoomMessage = (payload: Message) => {
      setMessages((prev) => [...prev, payload]);
    };
    const onRoomSystem = (payload: { text: string; roomCode: string }) => {
      if (payload.roomCode !== currentRoomRef.current) {
        return;
      }
      setMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}-${Math.random()}`,
          sender: "System",
          text: payload.text,
          roomCode: payload.roomCode,
          timestamp: new Date().toISOString(),
        },
      ]);
    };
    const onRoomError = (payload: { message: string }) => {
      setFeedback(payload.message);
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("room-joined", onRoomJoined);
    socket.on("room-message", onRoomMessage);
    socket.on("room-system", onRoomSystem);
    socket.on("room-error", onRoomError);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("room-joined", onRoomJoined);
      socket.off("room-message", onRoomMessage);
      socket.off("room-system", onRoomSystem);
      socket.off("room-error", onRoomError);
    };
  }, []);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleCreateRoom = (event: FormEvent) => {
    event.preventDefault();
    const cleanedName = name.trim();
    const cleanedCode = roomCode.trim();

    if (!cleanedName) {
      setFeedback("Please enter your name before creating a room.");
      return;
    }

    if (!cleanedCode) {
      setFeedback("Please enter a room code to create a room.");
      return;
    }

    socket.emit("create-room", { name: cleanedName, roomCode: cleanedCode });
  };

  const handleJoinRoom = (event: FormEvent) => {
    event.preventDefault();
    const cleanedName = name.trim();
    const cleanedCode = roomCode.trim();

    if (!cleanedName) {
      setFeedback("Please enter your name before joining a room.");
      return;
    }

    if (!cleanedCode) {
      setFeedback("Please enter a room code to join.");
      return;
    }

    socket.emit("join-room", { name: cleanedName, roomCode: cleanedCode });
  };

  const handleSendMessage = (event: FormEvent) => {
    event.preventDefault();

    if (!isInRoom) {
      setFeedback("Join a room before sending a message.");
      return;
    }

    if (!message.trim()) {
      setFeedback("Your message cannot be empty.");
      return;
    }

    socket.emit("send-message", { message });
    setMessage("");
  };

  return (
    <div className="app-shell">
      <div className="app-card">
        <header className="topbar">
          <div>
            <p className="eyebrow">Realtime room chat</p>
            <h1>Socket.IO Chat</h1>
          </div>
          <span className={`status ${isConnected ? "online" : "offline"}`}>
            {isConnected ? "Connected" : "Offline"}
          </span>
        </header>

        <div className="join-panel">
          <label>
            Your name
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Enter your name"
            />
          </label>

          <label>
            Room code
            <input
              value={roomCode}
              onChange={(event) =>
                setRoomCode(handleRoomCodeInput(event.target.value))
              }
              placeholder="ABC123"
              maxLength={8}
            />
          </label>

          <div className="actions">
            <button type="button" onClick={handleCreateRoom}>
              Create room
            </button>
            <button
              type="button"
              className="secondary"
              onClick={handleJoinRoom}
            >
              Join room
            </button>
          </div>
        </div>

        {feedback && <div className="feedback">{feedback}</div>}

        <section className="chat-panel">
          <div className="chat-header">
            <strong>{roomLabel}</strong>
            {currentRoom && <span>{currentRoom}</span>}
          </div>

          <div className="messages">
            {messages.length === 0 ? (
              <p className="empty-state">
                No messages yet. Create or join a room to start chatting.
              </p>
            ) : (
              messages.map((item) => (
                <div
                  key={item.id}
                  className={`message ${item.sender === "System" ? "system" : item.sender === name ? "mine" : "other"}`}
                >
                  <div className="message-meta">
                    <span>{item.sender}</span>
                    <time>
                      {new Date(item.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </time>
                  </div>
                  <div className="message-text">{item.text}</div>
                </div>
              ))
            )}
            <div ref={messageEndRef} />
          </div>

          <form className="composer" onSubmit={handleSendMessage}>
            <input
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder={
                isInRoom ? "Type a message…" : "Join a room to send messages"
              }
              disabled={!isInRoom}
            />
            <button type="submit" disabled={!isInRoom}>
              Send
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}

export default App;
