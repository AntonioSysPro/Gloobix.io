const WebSocket = require('ws');
const http = require('http');
const { fileURLToPath } = require('url');
const { fsync } = require('fs');
const server = http.createServer();
const wss = new WebSocket.Server({ server });

const players = new Map();
const foods = new Set();
const powerUps = new Set();

// Generar comida inicial
function generateFood() {
    const food = {
        id: Math.random().toString(36).substr(2, 9),
        x: Math.random() * 4000,
        y: Math.random() * 4000,
        radius: 5,
        color: `hsl(${Math.random() * 360}, 50%, 50%)`,
        value: 1
    };
    foods.add(food);
    return food;
}

// Inicializar comida
for (let i = 0; i < 1000; i++) {
    generateFood();
}

wss.on('connection', (ws) => {
    let playerId = Math.random().toString(36).substr(2, 9);

    ws.on('message', (message) => {
        const data = JSON.parse(message);

        switch (data.type) {
            case 'join':
                players.set(playerId, {
                    id: playerId,
                    name: data.name,
                    x: data.x,
                    y: data.y,
                    radius: data.radius,
                    color: data.color,
                    mass: data.mass
                });

                ws.send(JSON.stringify({
                    type: 'gameState',
                    players: Array.from(players.values()),
                    foods: Array.from(foods),
                    powerUps: Array.from(powerUps)
                }));
                break;

            case 'update':
                if (players.has(playerId)) {
                    const player = players.get(playerId);
                    Object.assign(player, {
                        x: data.x,
                        y: data.y,
                        radius: data.radius,
                        mass: data.mass
                    });
                }
                break;

            case 'eat':
                foods.delete(data.foodId);
                const newFood = generateFood();
                broadcast({
                    type: 'foodUpdate',
                    eaten: data.foodId,
                    new: newFood
                });
                break;
        }

        broadcast({
            type: 'gameState',
            players: Array.from(players.values()),
            foods: Array.from(foods),
            powerUps: Array.from(powerUps)
        });
    });

    ws.on('close', () => {
        players.delete(playerId);
        broadcast({
            type: 'playerLeft',
            playerId: playerId
        });
    });
});

function broadcast(data) {
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
        }
    });
}

const port = process.env.PORT || 3000;
server.listen(port, () => {
    console.log(`Servidor iniciado en el puerto ${port}`);
});