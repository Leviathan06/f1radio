import { WebSocketServer } from "ws";

const wss = new WebSocketServer({
  port: process.env.PORT || 8080
});

console.log("Signaling server running...");

const clients = new Map(); // socket => {team, name}

wss.on("connection", socket => {
  console.log("Client connected");

  // 연결 시 join 메시지 요청
  socket.write(JSON.stringify({ type: "request", action: "join" }));

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
      console.log(`User joined - Team: ${data.team}, Name: ${data.fromName}`);
      return;
    }

    // 모든 메시지 (offer/answer/ice) 전달
    wss.clients.forEach(client => {
      if (client.readyState !== client.OPEN || client === socket) return;

      // "all" 대상 메시지는 모두에게 전달
      if (data.to === "all") {
        client.send(JSON.stringify(data));
      } 
      // 팀/사용자 대상 메시지는 필터링 후 전달
      else if (data.to === "team") {
        const targetInfo = clients.get(client);
        if (targetInfo && targetInfo.team === data.toTeam) {
          client.send(JSON.stringify(data));
        }
      } 
      // 특정 사용자에게 전달
      else if (data.to === "user" && data.toName) {
        const targetInfo = clients.get(client);
        if (targetInfo && targetInfo.name === data.toName) {
          client.send(JSON.stringify(data));
        }
      }
    });
  });

  socket.on("close", () => {
    const info = clients.get(socket);
    if (info) {
      console.log(`User disconnected - Team: ${info.team}, Name: ${info.name}`);
    }
    clients.delete(socket);
  });
});