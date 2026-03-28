from fastapi import WebSocket, WebSocketDisconnect
from typing import Dict, List


class ConnectionManager:
    def __init__(self):
        self.connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, channel: str, ws: WebSocket):
        await ws.accept()
        self.connections.setdefault(channel, []).append(ws)

    def disconnect(self, channel: str, ws: WebSocket):
        if channel in self.connections:
            self.connections[channel] = [c for c in self.connections[channel] if c != ws]

    async def broadcast(self, channel: str, data: dict):
        dead = []
        for ws in self.connections.get(channel, []):
            try:
                await ws.send_json(data)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(channel, ws)


ws_manager = ConnectionManager()
