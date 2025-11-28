import { WebSocketServer } from "ws";

const wss = new WebSocketServer({ port: process.env.PORT || 8080 });
console.log("Signaling server running...");

const clients = new Map(); // socket => { team, name }

wss.on("connection", socket => {
  console.log("Client connected");

  socket.on("message", async msg => {
    let data;
    try {
      data = JSON.parse(msg);
    } catch (e) {
      console.error("Invalid JSON", msg);
      return;
    }

    // join 메시지 처리
    if (data.type === "join") {
      clients.set(socket, { team: data.team, name: data.name });
      console.log(`User joined - Team: ${data.team}, Name: ${data.name}`);

      // 다른 클라이언트에게 join 알림
      wss.clients.forEach(other => {
        if (other !== socket && other.readyState === other.OPEN) {
          other.send(JSON.stringify({
            type: "join",
            team: data.team,
            name: data.name
          }));
        }
      });
      return;
    }

    // 메시지 브로드캐스트
    if (data.type === "offer" || data.type === "answer" || data.type === "ice") {
      wss.clients.forEach(other => {
        if (other !== socket && other.readyState === other.OPEN) {
          const targetInfo = clients.get(other);
          // "all" 또는 대상자 팀/이름 확인
          if (data.to === "all" || 
             (data.to === "team" && targetInfo && targetInfo.team === data.toTeam) || 
             (data.to === "user" && targetInfo && targetInfo.name === data.toName)) {
            other.send(JSON.stringify(data));
          }
        }
      });
    }
  });

  socket.on("close", () => {
    const info = clients.get(socket);
    if (info) {
      console.log(`User disconnected - Team: ${info.team}, Name: ${info.name}`);
    }
    clients.delete(socket);
  });
});
