const express = require('express');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname)));
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'Gloobix.io.html'));
});

const server = http.createServer(app);
const io = new Server(server);

const WORLD_WIDTH = 4000;
const WORLD_HEIGHT = 4000;
const FOOD_COUNT = 300;
const BOT_COUNT = 10;
const POWERUP_COUNT = 5;

const MODOS = ['ffa', 'equipos', 'experimental', 'party', 'clasico', 'batalla', 'equipo', 'supervivencia', 'SelfFeed'];
let mundos = {};
MODOS.forEach(modo => {
  mundos[modo] = {
    players: {},
    foods: [],
    bots: [],
    powerUps: [],
    virus: modo === 'experimental' ? [] : undefined
  };
});

function randomColor() {
  return `hsl(${Math.random() * 360}, 70%, 50%)`;
}

function createFood() {
  return {
    id: Math.random().toString(36).substr(2, 9),
    x: Math.random() * WORLD_WIDTH,
    y: Math.random() * WORLD_HEIGHT,
    radius: 12,
    color: randomColor(),
    value: 1
  };
}

function createBot() {
  return {
    id: Math.random().toString(36).substr(2, 9),
    name: 'Bot_' + Math.floor(Math.random() * 1000),
    x: Math.random() * WORLD_WIDTH,
    y: Math.random() * WORLD_HEIGHT,
    radius: 30,
    color: randomColor(),
    mass: 3800,
    target: { x: Math.random() * WORLD_WIDTH, y: Math.random() * WORLD_HEIGHT },
    speed: 2 + Math.random() * 1.5
  };
}

function createPowerUp() {
  // Añadimos todos los tipos de powerups
  const types = ['speed', 'shield', 'mass', 'invisible', 'freeze'];
  const type = types[Math.floor(Math.random() * types.length)];
  let color = '#FFD700';
  if (type === 'speed') color = '#FFD700';
  else if (type === 'shield') color = '#4169E1';
  else if (type === 'mass') color = '#00ff85';
  else if (type === 'invisible') color = '#a100ff';
  else if (type === 'freeze') color = '#00fff7';
  return {
    id: Math.random().toString(36).substr(2, 9),
    x: Math.random() * WORLD_WIDTH,
    y: Math.random() * WORLD_HEIGHT,
    radius: 18,
    color,
    type
  };
}

function createCell(x, y, mass, color, skin) {
  return {
    id: Math.random().toString(36).substr(2, 9),
    x: x,
    y: y,
    radius: Math.sqrt(mass / Math.PI),
    color: color,
    mass: mass,
    speed: 4,
    target: null,
    splitCooldown: 0,
    ejectCooldown: 0,
    canMerge: false,
    mergeTimer: 10000, // 10 segundos para merge individual
    skin: skin || ''
  };
}

function distance(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function moveTowards(entity, target, speed) {
  const dx = target.x - entity.x;
  const dy = target.y - entity.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist > 1) {
    entity.x += (dx / dist) * speed;
    entity.y += (dy / dist) * speed;
    entity.x = Math.max(entity.radius, Math.min(WORLD_WIDTH - entity.radius, entity.x));
    entity.y = Math.max(entity.radius, Math.min(WORLD_HEIGHT - entity.radius, entity.y));
  }
}

function separateCells(player) {
  // Separar partes divididas que no pueden mergear
  for (let i = 0; i < player.cells.length; i++) {
    for (let j = i + 1; j < player.cells.length; j++) {
      const a = player.cells[i];
      const b = player.cells[j];
      if (!a.canMerge || !b.canMerge) {
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const minDist = a.radius + b.radius + 2;
        if (dist < minDist && dist > 0.1) {
          // Fuerza de repulsión proporcional al solapamiento
          const overlap = minDist - dist;
          const pushX = (dx / dist) * (overlap / 2);
          const pushY = (dy / dist) * (overlap / 2);
          a.x -= pushX;
          a.y -= pushY;
          b.x += pushX;
          b.y += pushY;
          // Limitar dentro del mundo
          a.x = Math.max(a.radius, Math.min(WORLD_WIDTH - a.radius, a.x));
          a.y = Math.max(a.radius, Math.min(WORLD_HEIGHT - a.radius, a.y));
          b.x = Math.max(b.radius, Math.min(WORLD_WIDTH - b.radius, b.x));
          b.y = Math.max(b.radius, Math.min(WORLD_HEIGHT - b.radius, b.y));
        }
      }
    }
  }
}

function createVirus() {
  return {
    id: Math.random().toString(36).substr(2, 9),
    x: Math.random() * WORLD_WIDTH,
    y: Math.random() * WORLD_HEIGHT,
    radius: 36,
    color: '#39ff14',
    mass: 1000
  };
}

function gameLoop() {
  Object.entries(mundos).forEach(([modo, mundo]) => {
    // Virus solo en experimental
    if (modo === 'experimental') {
      if (!mundo.virus) mundo.virus = [];
      while (mundo.virus.length < 15) mundo.virus.push(createVirus());
    }
    mundo.bots.forEach(bot => {
      if (!bot.target || Math.random() < 0.01) {
        bot.target = { x: Math.random() * WORLD_WIDTH, y: Math.random() * WORLD_HEIGHT };
      }
      moveTowards(bot, bot.target, bot.speed);
    });
    Object.values(mundo.players).forEach(player => {
      // Asignar equipos en modo equipos
      if (modo === 'equipos' && !player.team) {
        player.team = Math.random() < 0.5 ? 'rojo' : 'azul';
      }
      player.cells.forEach(cell => {
        // Impulso inicial tras división
        if (cell.impulseFrames && cell.impulseFrames > 0) {
          cell.x += cell.vx;
          cell.y += cell.vy;
          cell.vx *= 0.75;
          cell.vy *= 0.75;
          cell.impulseFrames--;
        } else {
          if (player.target) {
            moveTowards(cell, player.target, cell.speed);
          }
        }
        // Temporizador de merge individual
        if (cell.mergeTimer > 0) {
          cell.mergeTimer -= 1000 / 30;
          if (cell.mergeTimer <= 0) {
            cell.canMerge = true;
          }
        }
        // Virus (solo experimental): si una célula grande toca un virus, se divide
        if (modo === 'experimental' && mundo.virus) {
          mundo.virus.forEach(virus => {
            if (distance(cell, virus) < cell.radius + virus.radius && cell.mass > 7000) {
              // Divide la célula en 4 partes
              for (let k = 0; k < 4; k++) {
                const angle = (Math.PI * 2 * k) / 4;
                const splitMass = cell.mass / 4;
                const newCell = createCell(
                  cell.x + Math.cos(angle) * (cell.radius + 40),
                  cell.y + Math.sin(angle) * (cell.radius + 40),
                  splitMass,
                  cell.color,
                  player.skin
                );
                newCell.vx = Math.cos(angle) * 10;
                newCell.vy = Math.sin(angle) * 10;
                newCell.impulseFrames = 8;
                newCell.canMerge = false;
                newCell.mergeTimer = 10000;
                player.cells.push(newCell);
              }
              // Eliminar la célula original y el virus
              player.cells = player.cells.filter(c => c !== cell);
              mundo.virus = mundo.virus.filter(v => v !== virus);
            }
          });
        }
      });
      // Separar partes divididas
      separateCells(player);
    });
    Object.values(mundo.players).forEach(player => {
      // Eliminar efectos de powerups expirados
      if (!player.activePowerUps) player.activePowerUps = {};
      const now = Date.now();
      // Resetear efectos antes de aplicar los activos
      player.cells.forEach(cell => {
        cell.speed = 4;
        cell.shielded = false;
      });
      // Aplicar efectos de powerups activos
      for (const [type, endTime] of Object.entries(player.activePowerUps)) {
        if (endTime > now) {
          if (type === 'speed') {
            player.cells.forEach(cell => { cell.speed = 8; });
          } else if (type === 'shield') {
            player.cells.forEach(cell => { cell.shielded = true; });
          }
        }
      }
      // Eliminar powerups expirados
      for (const [type, endTime] of Object.entries(player.activePowerUps)) {
        if (endTime <= now) {
          delete player.activePowerUps[type];
        }
      }
      player.cells.forEach(cell => {
        // Comer comida normal
        mundo.foods = mundo.foods.filter(food => {
          if (distance(cell, food) < cell.radius + food.radius) {
            cell.mass += food.value * 300;
            cell.radius = Math.sqrt(cell.mass / Math.PI);
            return false;
          }
          return true;
        });
        // Comer powerups
        if (mundo.powerUps && Array.isArray(mundo.powerUps)) {
          mundo.powerUps = mundo.powerUps.filter(powerUp => {
            if (distance(cell, powerUp) < cell.radius + (powerUp.radius || 15)) {
              // Aplicar efecto del powerup
              if (!player.activePowerUps) player.activePowerUps = {};
              const now = Date.now();
              if (powerUp.type === 'speed') {
                if (player.activePowerUps.speed && player.activePowerUps.speed > now) {
                  player.activePowerUps.speed += 10000;
                } else {
                  player.activePowerUps.speed = now + 10000;
                }
                cell.speed = 8;
              } else if (powerUp.type === 'shield') {
                if (player.activePowerUps.shield && player.activePowerUps.shield > now) {
                  player.activePowerUps.shield += 10000;
                } else {
                  player.activePowerUps.shield = now + 10000;
                }
                cell.shielded = true;
              } else if (powerUp.type === 'mass') {
                if (player.activePowerUps.mass && player.activePowerUps.mass > now) {
                  player.activePowerUps.mass += 10000;
                } else {
                  player.activePowerUps.mass = now + 10000;
                }
                cell.mass += 4000;
                cell.radius = Math.sqrt(cell.mass / Math.PI);
              } else if (powerUp.type === 'invisible') {
                if (player.activePowerUps.invisible && player.activePowerUps.invisible > now) {
                  player.activePowerUps.invisible += 7000;
                } else {
                  player.activePowerUps.invisible = now + 7000;
                }
              } else if (powerUp.type === 'freeze') {
                if (player.activePowerUps.freeze && player.activePowerUps.freeze > now) {
                  player.activePowerUps.freeze += 6000;
                } else {
                  player.activePowerUps.freeze = now + 6000;
                }
              }
              return false;
            }
            return true;
          });
        }
      });
    });
    mundo.bots.forEach(bot => {
      mundo.foods = mundo.foods.filter(food => {
        if (distance(bot, food) < bot.radius + food.radius) {
          bot.mass += food.value * 300;
          bot.radius = Math.sqrt(bot.mass / Math.PI);
          return false;
        }
        return true;
      });
    });
    Object.values(mundo.players).forEach(p => {
      if ((p.mode === 'equipo' || modo === 'equipos') && !p.team) {
        p.team = Math.random() < 0.5 ? 'rojo' : 'azul';
      }
    });
    Object.values(mundo.players).forEach(player => {
      player.cells.forEach(cell => {
        mundo.bots.forEach(bot => {
          if (cell.mass > bot.mass * 1.15 && distance(cell, bot) < cell.radius) {
            cell.mass += bot.mass;
            cell.radius = Math.sqrt(cell.mass / Math.PI);
            bot.x = Math.random() * WORLD_WIDTH;
            bot.y = Math.random() * WORLD_HEIGHT;
            bot.mass = 3800;
            bot.radius = 30;
          }
        });
      });
    });
    // MERGE: SelfFeed se fusiona de inmediato, otros modos requieren canMerge
    Object.values(mundo.players).forEach(player => {
      let merged = true;
      while (merged) {
        merged = false;
        for (let i = 0; i < player.cells.length; i++) {
          for (let j = i + 1; j < player.cells.length; j++) {
            const a = player.cells[i];
            const b = player.cells[j];
            if (
              (modo === 'SelfFeed' && distance(a, b) < Math.max(a.radius, b.radius)) ||
              (modo !== 'SelfFeed' && a.canMerge && b.canMerge && distance(a, b) < Math.max(a.radius, b.radius))
            ) {
              // Fusionar b en a
              a.mass += b.mass;
              a.radius = Math.sqrt(a.mass / Math.PI);
              player.cells.splice(j, 1);
              merged = true;
              break;
            }
          }
          if (merged) break;
        }
      }
    });
    // Colisiones entre jugadores
    const playerList = Object.values(mundo.players);
    for (let i = 0; i < playerList.length; i++) {
      for (let j = 0; j < playerList.length; j++) {
        if (i !== j) {
          const a = playerList[i];
          const b = playerList[j];
          // Lógica de modos
          // SelfFeed: ahora sí pueden comerse entre sí
          // Equipos: no colisionan entre sí
          if ((a.mode === 'equipo' || a.mode === 'equipos' || modo === 'equipos') && (b.mode === 'equipo' || b.mode === 'equipos' || modo === 'equipos') && a.team === b.team) continue;
          // Party: solo colisionan si tienen el mismo partyId o ambos no tienen partyId
          if (a.mode === 'party' && b.mode === 'party') {
            if (a.partyId && b.partyId && a.partyId !== b.partyId) continue;
          }
          a.cells.forEach(cellA => {
            b.cells.forEach(cellB => {
              // Si el defensor tiene escudo, no puede ser comido
              if (cellB.shielded) return;
              if (cellA.mass > cellB.mass * 1.15 && distance(cellA, cellB) < cellA.radius) {
                cellA.mass += cellB.mass;
                cellA.radius = Math.sqrt(cellA.mass / Math.PI);
                b.cells = b.cells.filter(c => c !== cellB);
              }
            });
          });
        }
      }
    }
    Object.keys(mundo.players).forEach(pid => {
      if (mundo.players[pid].cells.length === 0) {
        delete mundo.players[pid];
      }
    });
    if (playerList.some(p => p.mode === 'batalla' && p.cells.reduce((acc, c) => acc + c.mass, 0) > 50000)) {
      const ganador = playerList.find(p => p.mode === 'batalla' && p.cells.reduce((acc, c) => acc + c.mass, 0) > 50000);
      if (ganador) {
        io.emit('chatMessage', { name: 'Sistema', msg: `¡${ganador.name} es el Rey del Mapa!` });
        mundo.foods = Array.from({ length: FOOD_COUNT }, createFood);
        mundo.bots = Array.from({ length: BOT_COUNT }, createBot);
        mundo.powerUps = Array.from({ length: POWERUP_COUNT }, createPowerUp);
        Object.values(mundo.players).forEach(p => {
          p.cells = [createCell(Math.random() * WORLD_WIDTH, Math.random() * WORLD_HEIGHT, 3800, p.color, p.skin)];
        });
      }
    }
    const vivos = playerList.filter(p => p.mode === 'supervivencia' && p.cells.length > 0);
    if (vivos.length === 1) {
      io.emit('chatMessage', { name: 'Sistema', msg: `¡${vivos[0].name} es el Último en Pie!` });
      mundo.foods = Array.from({ length: FOOD_COUNT }, createFood);
      mundo.bots = Array.from({ length: BOT_COUNT }, createBot);
      mundo.powerUps = Array.from({ length: POWERUP_COUNT }, createPowerUp);
      Object.values(mundo.players).forEach(p => {
        p.cells = [createCell(Math.random() * WORLD_WIDTH, Math.random() * WORLD_HEIGHT, 3800, p.color, p.skin)];
      });
    }
    while (mundo.foods.length < FOOD_COUNT) mundo.foods.push(createFood());
    while (mundo.powerUps.length < POWERUP_COUNT) mundo.powerUps.push(createPowerUp());
    Object.values(mundo.players).forEach(p => {
      io.to(p.id).emit('gameData', {
        players: Object.values(mundo.players).map(pl => ({
          id: pl.id,
          name: pl.name,
          color: pl.color,
          skin: pl.skin,
          team: pl.team,
          mode: pl.mode,
          partyId: pl.partyId,
          mass: pl.cells.reduce((acc, c) => acc + c.mass, 0),
          cells: pl.cells,
          activePowerUps: pl.activePowerUps || {}
        })),
        foods: mundo.foods,
        bots: mundo.bots,
        powerUps: mundo.powerUps,
        virus: mundo.virus || []
      });
    });
  });
  setTimeout(gameLoop, 1000 / 30);
}
gameLoop();

io.on('connection', (socket) => {
  console.log('Jugador conectado:', socket.id);
  socket.on('join', (data) => {
    const modo = MODOS.includes(data.mode) ? data.mode : 'clasico';
    const mundo = mundos[modo];
    let nombre = typeof data.name === 'string' ? data.name.trim().substring(0, 15) : 'Jugador';
    let skin = typeof data.skin === 'string' ? data.skin : '';
    const color = randomColor();
    // Lógica de equipos y party
    let team = null;
    if (modo === 'equipos' || modo === 'equipo') {
      team = Math.random() < 0.5 ? 'rojo' : 'azul';
    }
    // Party: asignar una partyId si se provee
    let partyId = null;
    if (modo === 'party' && typeof data.partyId === 'string') {
      partyId = data.partyId;
    }
    mundo.players[socket.id] = {
      id: socket.id,
      name: nombre,
      color: color,
      skin: skin,
      team: team,
      mode: modo,
      partyId: partyId,
      target: null,
      cells: [createCell(Math.random() * WORLD_WIDTH, Math.random() * WORLD_HEIGHT, 3800, color, skin)],
      activePowerUps: {}
    };
    socket.modo = modo;
    socket.partyId = partyId;
  });
  socket.on('move', (data) => {
    const modo = socket.modo || 'clasico';
    const mundo = mundos[modo];
    if (mundo.players[socket.id] && data && typeof data.x === 'number' && typeof data.y === 'number') {
      mundo.players[socket.id].target = { x: data.x, y: data.y };
    }
  });
  socket.on('split', (data) => {
    const modo = socket.modo || 'clasico';
    const mundo = mundos[modo];
    const player = mundo.players[socket.id];
    if (player && data && typeof data.x === 'number' && typeof data.y === 'number') {
      let newCells = [];
      player.cells.forEach(cell => {
        if (cell.mass >= 3800) {
          // Calcular ángulo real hacia el mouse
          const dx = data.x - cell.x;
          const dy = data.y - cell.y;
          const angle = Math.atan2(dy, dx);
          const splitMass = cell.mass / 2;
          cell.mass = splitMass;
          cell.radius = Math.sqrt(cell.mass / Math.PI);
          cell.canMerge = false;
          // SelfFeed: merge instantáneo
          cell.mergeTimer = (modo === 'SelfFeed') ? 1 : 10000;
          // Calcular posición inicial y rebote en el borde
          let sx = cell.x + Math.cos(angle) * (cell.radius + 40);
          let sy = cell.y + Math.sin(angle) * (cell.radius + 40);
          let svx = Math.cos(angle) * 18;
          let svy = Math.sin(angle) * 18;
          let minR = Math.sqrt(splitMass / Math.PI);
          if (sx < minR) { sx = minR; svx = Math.abs(svx); }
          if (sx > WORLD_WIDTH - minR) { sx = WORLD_WIDTH - minR; svx = -Math.abs(svx); }
          if (sy < minR) { sy = minR; svy = Math.abs(svy); }
          if (sy > WORLD_HEIGHT - minR) { sy = WORLD_HEIGHT - minR; svy = -Math.abs(svy); }
          const newCell = createCell(
            sx,
            sy,
            splitMass,
            cell.color,
            player.skin
          );
          // Impulso inicial: velocidad extra que se desacelera
          newCell.vx = svx;
          newCell.vy = svy;
          newCell.impulseFrames = 12;
          newCell.canMerge = false;
          newCell.mergeTimer = (modo === 'SelfFeed') ? 1 : 10000;
          newCells.push(newCell);
        }
      });
      player.cells = player.cells.concat(newCells);
    }
  });
  socket.on('eject', (data) => {
    const modo = socket.modo || 'clasico';
    const mundo = mundos[modo];
    const player = mundo.players[socket.id];
    if (player && player.cells.length > 0 && data && typeof data.x === 'number' && typeof data.y === 'number') {
      player.cells.forEach(cell => {
        if (cell.mass > 1200) {
          const dx = data.x - cell.x;
          const dy = data.y - cell.y;
          const angle = Math.atan2(dy, dx);
          const ejectMass = 400;
          cell.mass -= ejectMass;
          cell.radius = Math.sqrt(cell.mass / Math.PI);
          let value = 1;
          if (modo === 'SelfFeed') value = 2;
          // Calcular posición inicial
          let ex = cell.x + Math.cos(angle) * (cell.radius + 30);
          let ey = cell.y + Math.sin(angle) * (cell.radius + 30);
          let vx = Math.cos(angle) * 18;
          let vy = Math.sin(angle) * 18;
          // Rebote en el borde del mundo
          if (ex < 10) { ex = 10; vx = Math.abs(vx); }
          if (ex > WORLD_WIDTH - 10) { ex = WORLD_WIDTH - 10; vx = -Math.abs(vx); }
          if (ey < 10) { ey = 10; vy = Math.abs(vy); }
          if (ey > WORLD_HEIGHT - 10) { ey = WORLD_HEIGHT - 10; vy = -Math.abs(vy); }
          mundo.foods.push({
            id: 'eject_' + Math.random().toString(36).substr(2, 9),
            x: ex,
            y: ey,
            radius: 10,
            color: '#fff',
            value: value,
            vx: vx,
            vy: vy
          });
        }
      });
    }
  });
  socket.on('chatMessage', (msg) => {
    const modo = socket.modo || 'clasico';
    const mundo = mundos[modo];
    const jugador = mundo.players[socket.id];
    // Solo enviar a los jugadores del mismo modo
    Object.values(mundo.players).forEach(p => {
      io.to(p.id).emit('chatMessage', { name: jugador?.name || 'Jugador', msg: String(msg).substring(0, 100) });
    });
  });
  socket.on('pingcheck', (timestamp) => {
    socket.emit('pongcheck', timestamp);
  });
  socket.on('disconnect', () => {
    const modo = socket.modo || 'clasico';
    const mundo = mundos[modo];
    delete mundo.players[socket.id];
    console.log('Jugador desconectado:', socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});
