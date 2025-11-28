import { WebSocketServer } from "ws";

const wss = new WebSocketServer({
  port: process.env.PORT || 8080
});

console.log("Signaling server running...");

const clients = new Map(); // socket => {team, name}

wss.on("connection", socket => {
  console.log("Client connected");

  socket.on("message", msg => {
    let data;
    try {
      data = JSON.parse(msg);
    } catch (e) {
      console.error("Invalid JSON", msg);
      return;
    }

    // join 메시지 처리
    if (data.type === "join") {
      clients.set(socket, { team: data.team, name: data.fromName });
      return;
    }

    // OFFER/ANSWER/ICE 모두 처리
    wss.clients.forEach(client => {
      if (client.readyState !== client.OPEN || client === socket) return;

      if (data.to === "all") {
        client.send(JSON.stringify(data));
      } else {
        const targetInfo = clients.get(client);
        if (!targetInfo) return;
        if (targetInfo.team === data.to) {
          client.send(JSON.stringify(data));
        }
      }
    });
  });

  socket.on("close", () => {
    clients.delete(socket);
    console.log("Client disconnected");
  });
});