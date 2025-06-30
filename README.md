# Gloobix.io 🎮

Un juego multijugador en tiempo real inspirado en Agar.io con características avanzadas y sistema de progreso.

## 🚀 Características

- **Multijugador en tiempo real** con Socket.IO
- **9 modos de juego** diferentes (FFA, Equipos, Experimental, etc.)
- **Sistema de progreso** con experiencia, niveles y estadísticas
- **12 células máximo** por jugador con zoom inteligente
- **Power-ups** especiales (velocidad, escudo, masa, invisibilidad, congelación)
- **Skins personalizables** con selector visual
- **Sistema de equipos** con colores distintivos
- **Respawn automático** sin interrupciones
- **Keep-alive integrado** para despliegue en Render.com

## 🎯 Modos de Juego

1. **Modo Normal** 🎯 - Clásico estilo Agar.io
2. **FFA** ⚔️ - Todos contra todos
3. **Equipos** 🤝 - Colaboración en equipos
4. **Experimental** 🧪 - Con virus que dividen células
5. **Party** 🎉 - Partidas privadas
6. **Rey del Mapa** �� - Alcanza 50,000 de masa
7. **Guerra de Equipos** ⚡ - Batalla rojo vs azul
8. **Último en Pie** 🏆 - Supervivencia
9. **Entrenamiento** 🎓 - Práctica individual

## 🎮 Controles

- **Mouse**: Moverse
- **Espacio**: Dividirse (máximo 12 células)
- **W**: Expulsar masa
- **Enter**: Chat
- **Z**: Volver al menú

## 🛠️ Instalación y Desarrollo

```bash
# Clonar repositorio
git clone https://github.com/usuario/gloobix-io.git
cd gloobix-io

# Instalar dependencias
npm install

# Desarrollo local
npm run dev

# Producción
npm start
```

## 🌐 Despliegue en Render.com

### Configuración Automática

El proyecto incluye configuración automática para Render.com:

1. **render.yaml** - Configuración de despliegue
2. **keep-alive.js** - Sistema anti-suspensión
3. **package.json** - Dependencias y scripts

### Variables de Entorno

```env
NODE_ENV=production
PING_INTERVAL=840000  # 14 minutos
```

### Endpoints de Monitoreo

- `/health` - Estado de salud del servidor
- `/stats` - Estadísticas del keep-alive
- `/api/status` - Estado general del servidor

## 🔧 Sistema Keep-Alive

El servidor incluye un sistema inteligente de keep-alive que:

- **Auto-ping cada 14 minutos** (antes del límite de Render)
- **Detección automática** de URL del servidor
- **Reintentos automáticos** en caso de fallo
- **Logs detallados** para debugging
- **Estadísticas completas** de funcionamiento

### Características del Keep-Alive

```javascript
// Configuración automática
const keepAlive = initKeepAlive({
  serverUrl: process.env.RENDER_EXTERNAL_URL,
  pingInterval: 14 * 60 * 1000, // 14 minutos
  maxRetries: 3,
  verbose: true
});
```

## 📊 Sistema de Progreso

- **Experiencia**: Gana XP comiendo enemigos y masa
- **Niveles**: 1000 XP por nivel
- **Estadísticas**: Victorias, mejor puntuación, enemigos derrotados
- **Notificaciones**: Visuales para XP, niveles y victorias

## 🎨 Personalización

### Skins Disponibles
- 🐉 Dragón
- ⚔️ Unidad de guerra
- 🐶 Perro
- 🪰 Mosca
- 🐔 Pollo
- 🐻 Oso
- 🟢🔵🟣 Patrones geométricos

### Power-ups
- ⚡ **Velocidad** - Movimiento x2
- 🛡️ **Escudo** - Inmunidad temporal
- ➕ **Masa** - Masa extra instantánea
- 👻 **Invisibilidad** - Oculto de otros jugadores
- ❄️ **Congelación** - Congela rivales cercanos

## 🏗️ Arquitectura Técnica

### Backend
- **Node.js** + Express
- **Socket.IO** para tiempo real
- **Sistema modular** de modos de juego
- **Validaciones robustas** cliente-servidor
- **Keep-alive integrado**

### Frontend
- **HTML5 Canvas** para renderizado
- **JavaScript vanilla** optimizado
- **CSS3** con animaciones fluidas
- **Responsive design**
- **Sistema de notificaciones**

### Optimizaciones
- **Zoom basado en masa total** (no en células individuales)
- **Límite de 12 células** por jugador
- **Spawn seguro** sin colisiones
- **Renderizado eficiente** con overlays
- **Gestión de memoria** optimizada

## 📈 Monitoreo y Logs

### Logs del Keep-Alive
```
[2024-01-01T12:00:00.000Z] [KeepAlive] ✅ Ping exitoso #42
[2024-01-01T12:14:00.000Z] [KeepAlive] ✅ Ping exitoso #43
```

### Estadísticas Disponibles
- Total de pings realizados
- Tasa de éxito
- Tiempo de actividad
- Último ping exitoso
- Estado del servidor

## 🤝 Contribución

1. Fork el proyecto
2. Crea una rama para tu feature
3. Commit tus cambios
4. Push a la rama
5. Abre un Pull Request

## 📝 Licencia

MIT License - ver [LICENSE](LICENSE) para detalles.

## 🎯 Roadmap

- [ ] Sistema de clanes
- [ ] Torneos automáticos
- [ ] Más power-ups
- [ ] Sistema de ranking global
- [ ] Modo espectador
- [ ] Replays de partidas

---

**Desarrollado con ❤️ para la comunidad gaming**