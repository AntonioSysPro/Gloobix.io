// Zoom con la rueda del mouse limitado dinámicamente según el tamaño del jugador
class Game {
    constructor() {
        this.setOverlay = this.setOverlay.bind(this);
        this.drawMinimap = this.drawMinimap.bind(this);
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.camera = { x: 0, y: 0, zoom: 1 };
        this.playerId = null;
        this.players = {};
        this.foods = [];
        this.bots = [];
        this.powerUps = [];
        this.activePowerUps = {};
        this.settings = {
            mostrarMasa: true,
            mostrarBordes: true,
            temaOscuro: false,
            mostrarLineas: false,
        };
        this.fps = 30;
        this.lastTime = 0;
        this.menuPrincipal = document.getElementById('menuPrincipal');
        this.gameContainer = document.getElementById('gameContainer');
        this.socket = io();
        this.isConnected = false;
        this.setupSocketEvents();
        this.setupEventListeners();
        this.ping = 0;
        setInterval(() => {
            if (this.isConnected && this.socket) {
                this._pingStart = Date.now();
                this.socket.emit('pingcheck', this._pingStart);
            }
        }, 1000);
        this.skinsImgsLoaded = {};
        const skinFiles = [
            'dragons.jpg', 'war-unit.jpg', 'doge.png', 'fly.png', 'chick.png', 'bbear.png', 'p1.png', 'p2.png', 'p3.png'
        ];
        for (const file of skinFiles) {
            const img = new Image();
            img.src = 'assets/' + file;
            this.skinsImgsLoaded[file] = img;
        }
        window.addEventListener('resize', () => this.setupCanvas());
        this.userZoom = 1;
        this.lastZoomChange = 0;
        this.zoomMax = 2.2;
        this.zoomMin = 0.15;
        this.zoomRecommended = 1;
        this.canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            let delta = e.deltaY > 0 ? -0.13 : 0.13;
            this.userZoom = Math.max(this.zoomMin, Math.min(this.zoomMax, this.userZoom + delta));
            this.lastZoomChange = Date.now();
        }, { passive: false });
    }

    setupSocketEvents() {
        this.socket.on('connect', () => {
            this.isConnected = true;
            this.playerId = this.socket.id;
            this.addChatMessage('Sistema', '¡Conectado al servidor!');
        });
        this.socket.on('disconnect', () => {
            this.isConnected = false;
            this.addChatMessage('Sistema', 'Desconectado del servidor.');
        });
        this.socket.on('gameData', (data) => {
            this.players = {};
            data.players.forEach(p => {
                this.players[p.id] = p;
            });
            this.foods = data.foods || [];
            this.bots = data.bots || [];
            this.powerUps = data.powerUps || [];
            this.virus = data.virus || [];
            // Sincronizar los powerups activos con el servidor
            const player = this.players[this.playerId];
            if (player && player.activePowerUps) {
                this.activePowerUps = { ...player.activePowerUps };
            }
            this.handlePowerUpPickup();
            let muerto = false;
            if (!player || !player.cells || player.cells.length === 0) {
                muerto = true;
            }
            if (this.playerId && muerto && !this.isDead) {
                this.isDead = true;
                this.activePowerUps = {};
                this.showDeathDialog();
            }
        });
        this.socket.on('chatMessage', (data) => {
            this.addChatMessage(data.name, data.msg);
        });
        this.socket.on('pongcheck', (timestamp) => {
            if (timestamp && this._pingStart) {
                this.ping = Date.now() - timestamp;
            }
        });
    }

    handlePowerUpPickup() {
        const player = this.players[this.playerId];
        if (!player || !player.cells) return;
        if (!this._lastPowerUpCheck) this._lastPowerUpCheck = {};
        for (const cell of player.cells) {
            for (const powerUp of this.powerUps) {
                const dx = cell.x - powerUp.x;
                const dy = cell.y - powerUp.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < (cell.radius + (powerUp.radius || 15))) {
                    const now = Date.now();
                    if (!this._lastPowerUpCheck[powerUp.id]) {
                        this._lastPowerUpCheck[powerUp.id] = true;
                        // No modificar activePowerUps aquí, solo dejar que el servidor lo gestione
                    }
                }
            }
        }
        for (const id in this._lastPowerUpCheck) {
            if (!this.powerUps.find(p => p.id === id)) {
                delete this._lastPowerUpCheck[id];
            }
        }
    }

    addOrExtendPowerUp(type) {
        const now = Date.now();
        // Duraciones personalizadas por tipo
        let duration = 10000;
        if (type === 'invisible') duration = 7000;
        if (type === 'freeze') duration = 6000;
        if (this.activePowerUps[type] && this.activePowerUps[type] > now) {
            this.activePowerUps[type] += duration;
        } else {
            this.activePowerUps[type] = now + duration;
        }
    }

    showDeathDialog() {
        const deathDialog = document.getElementById('deathDialog');
        deathDialog.classList.remove('hidden');
        if (window.playerProgress) {
            const experienciaPorPartida = 50;
            window.playerProgress.addExperiencia(experienciaPorPartida);
        }
        document.getElementById('revivirBtn').onclick = () => {
            deathDialog.classList.add('hidden');
            this.menuPrincipal = document.getElementById('menuPrincipal');
            this.menuPrincipal.classList.add('hidden');
            this.gameContainer.classList.remove('hidden');
            this.isDead = false;
            this.activePowerUps = {};
            const playerName = document.getElementById('nombreJugador').value.trim() || 'Jugador';
            const modoJuego = document.getElementById('modoJuego') ? document.getElementById('modoJuego').value : 'clasico';
            const skin = window.getSkinSeleccionada ? window.getSkinSeleccionada() : 'dragons.jpg';
            this.socket.emit('join', { name: playerName, mode: modoJuego, skin });
        };
        document.getElementById('salirMenuBtn').onclick = () => {
            deathDialog.classList.add('hidden');
            this.menuPrincipal = document.getElementById('menuPrincipal');
            this.menuPrincipal.classList.remove('hidden');
            this.gameContainer.classList.add('hidden');
            this.isDead = false;
            this.activePowerUps = {};
        };
    }

    setupEventListeners() {
        document.getElementById('jugarBtn').addEventListener('click', () => {
            const playerName = document.getElementById('nombreJugador').value.trim() || 'Jugador';
            const modoJuego = document.getElementById('modoJuego') ? document.getElementById('modoJuego').value : 'clasico';
            const skin = window.getSkinSeleccionada ? window.getSkinSeleccionada() : 'dragons.jpg';
            this.socket.emit('join', { name: playerName, mode: modoJuego, skin });
            this.menuPrincipal.classList.add('hidden');
            this.gameContainer.classList.remove('hidden');
            this.setupCanvas();
            this.startGameLoop();
        });
        this.lastMouseScreen = { x: null, y: null };
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const mouseScreenX = e.clientX - rect.left;
            const mouseScreenY = e.clientY - rect.top;
            this.lastMouseScreen.x = mouseScreenX;
            this.lastMouseScreen.y = mouseScreenY;
        });
        this.chatActive = false;
        const chatInput = document.getElementById('chat-input');
        window.addEventListener('keydown', (e) => {
            if (document.activeElement === chatInput) {
                if (e.key === 'Enter') {
                    if (chatInput.value.trim() !== '') {
                        const msg = chatInput.value.trim();
                        this.socket.emit('chatMessage', msg);
                        chatInput.value = '';
                    }
                    chatInput.blur();
                    this.chatActive = false;
                    e.preventDefault();
                }
                return;
            }
            if (e.key === 'Enter') {
                chatInput.focus();
                this.chatActive = true;
                e.preventDefault();
                return;
            }
            if (e.code === 'Space') {
                e.preventDefault();
                let mouseX = 0, mouseY = 0;
                if (this.lastMouseScreen) {
                    const pixelRatio = window.devicePixelRatio || 1;
                    mouseX = (this.lastMouseScreen.x / this.camera.zoom / pixelRatio) + this.camera.x;
                    mouseY = (this.lastMouseScreen.y / this.camera.zoom / pixelRatio) + this.camera.y;
                }
                this.socket.emit('split', { x: mouseX, y: mouseY });
            } else if (e.key === 'w') {
                if (!this.ejecting) {
                    this.ejecting = true;
                    this.ejectMassLoop();
                }
            }
        });
        window.addEventListener('keyup', (e) => {
            if (e.key === 'w') {
                this.ejecting = false;
            }
        });
        chatInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
            }
        });
    }

    ejectMassLoop() {
        if (!this.ejecting) return;
        let mouseX = 0, mouseY = 0;
        if (this.lastMouseScreen) {
            const pixelRatio = window.devicePixelRatio || 1;
            mouseX = (this.lastMouseScreen.x / this.camera.zoom / pixelRatio) + this.camera.x;
            mouseY = (this.lastMouseScreen.y / this.camera.zoom / pixelRatio) + this.camera.y;
        }
        this.socket.emit('eject', { x: mouseX, y: mouseY });
        setTimeout(() => this.ejectMassLoop(), 70);
    }

    addChatMessage(nombre, mensaje) {
        const chatMessages = document.getElementById('chat-messages');
        const div = document.createElement('div');
        div.className = 'chat-message';
        const now = new Date();
        const timestamp = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        div.innerHTML = `<span class=\"chat-timestamp\">[${timestamp}]</span> <strong>${nombre}:</strong> ${mensaje}`;
        chatMessages.appendChild(div);
        while (chatMessages.children.length > 50) {
            chatMessages.removeChild(chatMessages.firstChild);
        }
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    setupCanvas() {
        const width = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
        const height = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
        const pixelRatio = window.devicePixelRatio || 1;
        this.canvas.width = width * pixelRatio;
        this.canvas.height = height * pixelRatio;
        this.canvas.style.width = width + 'px';
        this.canvas.style.height = height + 'px';
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.scale(pixelRatio, pixelRatio);
        this.camera.zoom = Math.min(width / 1920, height / 1080);
    }

    startGameLoop() {
        this.lastTime = performance.now();
        const width = this.canvas.width;
        const height = this.canvas.height;
        if (this.lastMouseScreen) {
            this.lastMouseScreen.x = width / 2;
            this.lastMouseScreen.y = height / 2;
        }
        this.gameLoop();
    }

    gameLoop() {
        if (this.lastMouseScreen && this.isConnected && !this.isDead) {
            const pixelRatio = window.devicePixelRatio || 1;
            const mouseX = (this.lastMouseScreen.x / this.camera.zoom / pixelRatio) + this.camera.x;
            const mouseY = (this.lastMouseScreen.y / this.camera.zoom / pixelRatio) + this.camera.y;
            this.socket.emit('move', { x: mouseX, y: mouseY });
        }
        this.render();
        requestAnimationFrame(this.gameLoop.bind(this));
    }

    render() {
        const WORLD_WIDTH = 4000;
        const WORLD_HEIGHT = 4000;
        let minZoom = this.zoomMin;
        let maxZoom = this.zoomMax;
        let recommendedZoom = 1;
        if (this.playerId && this.players[this.playerId] && !this.isDead) {
            const player = this.players[this.playerId];
            if (player.cells && player.cells.length > 0) {
                let sumX = 0, sumY = 0, totalMass = 0;
                player.cells.forEach(cell => {
                    sumX += cell.x * cell.mass;
                    sumY += cell.y * cell.mass;
                    totalMass += cell.mass;
                });
                const centerX = sumX / totalMass;
                const centerY = sumY / totalMass;
                const maxRadius = Math.max(...player.cells.map(c => c.radius));
                recommendedZoom = Math.max(minZoom, Math.min(maxZoom, Math.min(this.canvas.width, this.canvas.height) / (2.5 * maxRadius)));
                this.zoomRecommended = recommendedZoom;
                if (Date.now() - this.lastZoomChange > 2000) {
                    this.userZoom += (recommendedZoom - this.userZoom) * 0.12;
                }
                this.userZoom = Math.max(minZoom, Math.min(maxZoom, this.userZoom));
                this.camera.zoom = this.userZoom;
                const width = this.canvas.width / this.camera.zoom;
                const height = this.canvas.height / this.camera.zoom;
                this.camera.x = Math.max(0, Math.min(centerX - width / 2, WORLD_WIDTH - width));
                this.camera.y = Math.max(0, Math.min(centerY - height / 2, WORLD_HEIGHT - height));
            }
        }
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        let grad = this.ctx.createLinearGradient(0, 0, this.canvas.width, this.canvas.height);
        grad.addColorStop(0, '#0a0033');
        grad.addColorStop(1, '#1a0033');
        this.ctx.fillStyle = grad;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.save();
        this.ctx.scale(this.camera.zoom, this.camera.zoom);
        this.ctx.translate(-this.camera.x, -this.camera.y);
        this.ctx.save();
        this.ctx.strokeStyle = '#00fff7';
        this.ctx.lineWidth = 10;
        this.ctx.shadowColor = '#00fff7';
        this.ctx.shadowBlur = 18;
        this.ctx.strokeRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
        this.ctx.restore();
        this.foods.forEach(food => {
            this.ctx.beginPath();
            this.ctx.arc(food.x, food.y, food.radius, 0, Math.PI * 2);
            this.ctx.fillStyle = food.color;
            this.ctx.fill();
        });
        this.bots.forEach(bot => {
            this.ctx.beginPath();
            this.ctx.arc(bot.x, bot.y, bot.radius, 0, Math.PI * 2);
            this.ctx.fillStyle = bot.color || '#888';
            this.ctx.fill();
            this.ctx.font = '14px Arial';
            this.ctx.fillStyle = '#fff';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(bot.name || 'Bot', bot.x, bot.y - bot.radius - 10);
        });
        let allCells = [];
        Object.values(this.players).forEach(player => {
            if (player.cells && player.cells.length > 0) {
                player.cells.forEach(cell => {
                    allCells.push({
                        player,
                        cell
                    });
                });
            }
        });
        allCells.sort((a, b) => a.cell.mass - b.cell.mass);
        allCells.forEach(({ player, cell }) => {
            if (player.skin && this.skinsImgsLoaded[player.skin]) {
                this.ctx.save();
                this.ctx.beginPath();
                this.ctx.arc(cell.x, cell.y, cell.radius, 0, Math.PI * 2);
                this.ctx.closePath();
                this.ctx.clip();
                this.ctx.drawImage(this.skinsImgsLoaded[player.skin], cell.x - cell.radius, cell.y - cell.radius, cell.radius * 2, cell.radius * 2);
                this.ctx.restore();
            } else {
                this.ctx.beginPath();
                this.ctx.arc(cell.x, cell.y, cell.radius, 0, Math.PI * 2);
                this.ctx.fillStyle = player.color || '#0ff';
                this.ctx.fill();
            }
            if (player.mode === 'equipo' && player.team) {
                this.ctx.save();
                this.ctx.lineWidth = 8;
                this.ctx.strokeStyle = player.team === 'rojo' ? '#ff3860' : '#0099ff';
                this.ctx.beginPath();
                this.ctx.arc(cell.x, cell.y, cell.radius + 3, 0, Math.PI * 2);
                this.ctx.stroke();
                this.ctx.restore();
            }
            this.ctx.font = '16px Arial';
            this.ctx.fillStyle = '#fff';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(player.name, cell.x, cell.y - cell.radius - 10);
        });
        this.powerUps.forEach(powerUp => {
            this.ctx.save();
            const t = performance.now() / 600;
            const pulse = 1 + 0.15 * Math.sin(t + powerUp.x + powerUp.y);
            this.ctx.beginPath();
            this.ctx.arc(powerUp.x, powerUp.y, (powerUp.radius || 15) * pulse, 0, Math.PI * 2);
            let color = '#FFD700', symbol = '⚡';
            if (powerUp.type === 'speed') { color = '#FFD700'; symbol = '⚡'; }
            else if (powerUp.type === 'shield') { color = '#4169E1'; symbol = '🛡️'; }
            else if (powerUp.type === 'mass') { color = '#00ff85'; symbol = '+'; }
            else if (powerUp.type === 'invisible') { color = '#a100ff'; symbol = '👻'; }
            else if (powerUp.type === 'freeze') { color = '#00fff7'; symbol = '❄️'; }
            this.ctx.fillStyle = color;
            this.ctx.shadowColor = color;
            this.ctx.shadowBlur = 18;
            this.ctx.fill();
            this.ctx.font = '18px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.shadowBlur = 0;
            this.ctx.fillStyle = '#222';
            this.ctx.fillText(symbol, powerUp.x, powerUp.y);
            this.ctx.restore();
        });
        if (this.players[this.playerId] && (this.players[this.playerId].mode === 'experimental')) {
            if (this.virus && Array.isArray(this.virus)) {
                const now = performance.now();
                this.virus.forEach(virus => {
                    const spikes = 18;
                    const spikeLength = virus.radius * 1.35;
                    const baseRadius = virus.radius * 0.82;
                    const rot = (now / 900) % (2 * Math.PI);
                    this.ctx.save();
                    this.ctx.translate(virus.x, virus.y);
                    this.ctx.rotate(rot);
                    this.ctx.beginPath();
                    for (let i = 0; i < spikes; i++) {
                        const angle = (i * 2 * Math.PI) / spikes;
                        const r = i % 2 === 0 ? spikeLength : baseRadius;
                        this.ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
                    }
                    this.ctx.closePath();
                    this.ctx.fillStyle = virus.color || '#39ff14';
                    this.ctx.globalAlpha = 0.7;
                    this.ctx.shadowColor = '#00ff00';
                    this.ctx.shadowBlur = 12;
                    this.ctx.fill();
                    this.ctx.globalAlpha = 1.0;
                    this.ctx.beginPath();
                    this.ctx.arc(0, 0, virus.radius * 0.82, 0, Math.PI * 2);
                    this.ctx.fillStyle = '#1a3';
                    this.ctx.shadowBlur = 0;
                    this.ctx.fill();
                    this.ctx.restore();
                });
            }
        }
        this.ctx.restore();
        let leaderboard = Object.values(this.players)
            .sort((a, b) => b.mass - a.mass)
            .slice(0, 8);
        let leaderboardHtml = '<div style="position:fixed;top:10px;right:10px;background:rgba(0,0,0,0.6);color:#fff;padding:10px 18px;border-radius:8px;font-family:sans-serif;z-index:1000;">';
        leaderboardHtml += '<b>Leaderboard</b><br>';
        leaderboard.forEach((p, i) => {
            leaderboardHtml += `${i + 1}. ${p.name} (${Math.floor(p.mass)})<br>`;
        });
        leaderboardHtml += '</div>';
        this.setOverlay('leaderboard', leaderboardHtml);
        let oldMasa = document.getElementById('overlay-masa');
        if (oldMasa) oldMasa.remove();
        let oldStats = document.getElementById('overlay-stats');
        if (oldStats) oldStats.remove();
        let oldInfo = document.getElementById('overlay-info');
        if (oldInfo) oldInfo.remove();
        if (this.playerId && this.players[this.playerId]) {
            let masa = Math.floor(this.players[this.playerId].mass);
            const now = performance.now();
            const fps = Math.round(1000 / (now - (this.lastFrameTime || now)));
            this.lastFrameTime = now;
            let infoHtml = `<div style="position:fixed;top:10px;left:10px;background:rgba(0,0,0,0.6);color:#fff;padding:8px 16px;border-radius:8px;font-family:sans-serif;z-index:1000;min-width:90px;">Masa: <b>${masa}</b><br>FPS: <b>${fps}</b><br>Ping: <b>${this.ping} ms</b></div>`;
            this.setOverlay('info', infoHtml);
        }
        this.drawMinimap(WORLD_WIDTH, WORLD_HEIGHT);
        this.renderActivePowerUps();
    }

    drawMinimap(WORLD_WIDTH, WORLD_HEIGHT) {
        const size = 180;
        const padding = 12;
        const x = window.innerWidth - size - padding;
        const y = window.innerHeight - size - padding;
        const scale = size / WORLD_WIDTH;
        let el = document.getElementById('overlay-minimap');
        if (!el) {
            el = document.createElement('canvas');
            el.id = 'overlay-minimap';
            el.width = size;
            el.height = size;
            el.style.position = 'fixed';
            el.style.right = padding + 'px';
            el.style.bottom = padding + 'px';
            el.style.background = 'rgba(0,0,0,0.5)';
            el.style.borderRadius = '8px';
            el.style.zIndex = 1000;
            document.body.appendChild(el);
        }
        const ctx = el.getContext('2d');
        ctx.clearRect(0, 0, size, size);
        ctx.fillStyle = '#222';
        ctx.fillRect(0, 0, size, size);
        this.foods.forEach(food => {
            ctx.beginPath();
            ctx.arc(food.x * scale, food.y * scale, 2, 0, Math.PI * 2);
            ctx.fillStyle = food.color;
            ctx.fill();
        });
        this.bots.forEach(bot => {
            ctx.beginPath();
            ctx.arc(bot.x * scale, bot.y * scale, 4, 0, Math.PI * 2);
            ctx.fillStyle = bot.color || '#888';
            ctx.fill();
        });
        Object.values(this.players).forEach(player => {
            if (player.cells && player.cells.length > 0) {
                player.cells.forEach(cell => {
                    ctx.beginPath();
                    ctx.arc(cell.x * scale, cell.y * scale, 5, 0, Math.PI * 2);
                    if (player.mode === 'equipo' && player.team && player.mode === this.players[this.playerId]?.mode) {
                        ctx.fillStyle = player.team === 'rojo' ? '#ff3860' : '#0099ff';
                    } else {
                        ctx.fillStyle = player.id === this.playerId ? '#0ff' : (player.color || '#fff');
                    }
                    ctx.fill();
                });
            }
        });
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.strokeRect(0, 0, size, size);
    }

    setOverlay(id, html) {
        let el = document.getElementById('overlay-' + id);
        if (!el) {
            el = document.createElement('div');
            el.id = 'overlay-' + id;
            document.body.appendChild(el);
        }
        el.innerHTML = html;
    }

    renderActivePowerUps() {
        const containerId = 'overlay-powerups';
        let el = document.getElementById(containerId);
        if (!el) {
            el = document.createElement('div');
            el.id = containerId;
            el.style.position = 'fixed';
            el.style.top = '10px';
            el.style.left = '50%';
            el.style.transform = 'translateX(-50%)';
            el.style.zIndex = '1200';
            el.style.display = 'flex';
            el.style.gap = '18px';
            el.style.background = 'rgba(0,0,0,0.45)';
            el.style.borderRadius = '12px';
            el.style.padding = '6px 18px';
            el.style.alignItems = 'center';
            document.body.appendChild(el);
        }
        el.innerHTML = '';
        const now = Date.now();
        const icons = {
            speed: '⚡',
            shield: '🛡️',
            mass: '+',
            invisible: '👻',
            freeze: '❄️'
        };
        // Mostrar todos los powerups activos con su tiempo restante y descripción
        const descriptions = {
            speed: 'Velocidad x2',
            shield: 'Inmune a comer',
            mass: 'Ganas masa extra',
            invisible: 'Invisible para otros',
            freeze: 'Congela a los rivales cercanos'
        };
        Object.entries(this.activePowerUps).forEach(([type, endTime]) => {
            if (endTime > now) {
                const segs = Math.ceil((endTime - now) / 1000);
                const div = document.createElement('div');
                div.style.display = 'flex';
                div.style.flexDirection = 'column';
                div.style.alignItems = 'center';
                div.style.justifyContent = 'center';
                div.style.minWidth = '38px';
                div.style.color = '#00fff7';
                div.style.fontWeight = 'bold';
                div.style.fontSize = '1.3em';
                div.style.textShadow = '0 0 8px #00fff7, 0 0 12px #ff00e6';
                div.innerHTML = `<span style=\"font-size:2em;\">${icons[type] || '?'}<\/span><span style=\"font-size:0.9em;\">${segs}s<\/span><span style=\"font-size:0.7em;\">${descriptions[type] || ''}<\/span>`;
                el.appendChild(div);
            }
        });
        el.style.display = Object.values(this.activePowerUps).some(end => end > now) ? 'flex' : 'none';
    }
}

window.addEventListener('load', () => {
    new Game();
});
