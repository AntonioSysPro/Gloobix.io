/**
 * Sistema de Keep-Alive para mantener el servidor activo en Render.com
 * Evita que el servidor se suspenda por inactividad realizando auto-ping
 * 
 * Características:
 * - Auto-ping cada 14 minutos (antes del límite de 15 min de Render)
 * - Endpoint de salud para monitoreo externo
 * - Logs detallados para debugging
 * - Manejo robusto de errores
 * - Configuración flexible por variables de entorno
 */

const https = require('https');
const http = require('http');

class KeepAliveService {
    constructor(options = {}) {
        // Configuración por defecto optimizada para Render
        this.config = {
            // URL del servidor (se detecta automáticamente o se configura)
            serverUrl: options.serverUrl || process.env.RENDER_EXTERNAL_URL || process.env.SERVER_URL,
            
            // Intervalo de ping en milisegundos (14 minutos por defecto)
            pingInterval: options.pingInterval || parseInt(process.env.PING_INTERVAL) || 14 * 60 * 1000,
            
            // Timeout para las peticiones HTTP
            requestTimeout: options.requestTimeout || 10000,
            
            // Endpoint de salud
            healthEndpoint: options.healthEndpoint || '/health',
            
            // Habilitar logs detallados
            verbose: options.verbose !== undefined ? options.verbose : process.env.NODE_ENV !== 'production',
            
            // Reintentos en caso de fallo
            maxRetries: options.maxRetries || 3,
            
            // Delay entre reintentos
            retryDelay: options.retryDelay || 5000
        };

        this.pingTimer = null;
        this.isActive = false;
        this.stats = {
            totalPings: 0,
            successfulPings: 0,
            failedPings: 0,
            lastPingTime: null,
            lastPingStatus: null,
            uptime: Date.now()
        };

        this.log('KeepAlive Service inicializado', this.config);
    }

    /**
     * Inicia el servicio de keep-alive
     */
    start() {
        if (this.isActive) {
            this.log('El servicio ya está activo');
            return;
        }

        // Verificar si tenemos URL del servidor
        if (!this.config.serverUrl) {
            this.log('ADVERTENCIA: No se ha configurado SERVER_URL. Intentando detectar automáticamente...');
            this.detectServerUrl();
        }

        this.isActive = true;
        this.log(`Iniciando keep-alive con intervalo de ${this.config.pingInterval / 1000}s`);
        
        // Primer ping inmediato
        setTimeout(() => this.performPing(), 5000);
        
        // Configurar ping periódico
        this.pingTimer = setInterval(() => {
            this.performPing();
        }, this.config.pingInterval);

        this.log('✅ Keep-Alive Service iniciado correctamente');
    }

    /**
     * Detiene el servicio de keep-alive
     */
    stop() {
        if (!this.isActive) {
            return;
        }

        this.isActive = false;
        if (this.pingTimer) {
            clearInterval(this.pingTimer);
            this.pingTimer = null;
        }

        this.log('🛑 Keep-Alive Service detenido');
    }

    /**
     * Intenta detectar la URL del servidor automáticamente
     */
    detectServerUrl() {
        // Intentar diferentes fuentes de URL
        const possibleUrls = [
            process.env.RENDER_EXTERNAL_URL,
            process.env.RAILWAY_STATIC_URL,
            process.env.HEROKU_APP_NAME ? `https://${process.env.HEROKU_APP_NAME}.herokuapp.com` : null,
            process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null
        ].filter(Boolean);

        if (possibleUrls.length > 0) {
            this.config.serverUrl = possibleUrls[0];
            this.log(`URL detectada automáticamente: ${this.config.serverUrl}`);
        } else {
            this.log('❌ No se pudo detectar la URL del servidor automáticamente');
        }
    }

    /**
     * Realiza un ping al servidor con reintentos
     */
    async performPing(retryCount = 0) {
        if (!this.config.serverUrl) {
            this.log('❌ No hay URL configurada para hacer ping');
            return;
        }

        this.stats.totalPings++;
        this.stats.lastPingTime = new Date().toISOString();

        try {
            const success = await this.makeHttpRequest();
            
            if (success) {
                this.stats.successfulPings++;
                this.stats.lastPingStatus = 'success';
                this.log(`✅ Ping exitoso #${this.stats.totalPings}`);
            } else {
                throw new Error('Respuesta no válida del servidor');
            }

        } catch (error) {
            this.stats.failedPings++;
            this.stats.lastPingStatus = 'failed';
            this.log(`❌ Ping fallido #${this.stats.totalPings}: ${error.message}`);

            // Reintentar si no hemos alcanzado el máximo
            if (retryCount < this.config.maxRetries) {
                this.log(`🔄 Reintentando en ${this.config.retryDelay / 1000}s... (${retryCount + 1}/${this.config.maxRetries})`);
                setTimeout(() => {
                    this.performPing(retryCount + 1);
                }, this.config.retryDelay);
            }
        }
    }

    /**
     * Realiza la petición HTTP al servidor
     */
    makeHttpRequest() {
        return new Promise((resolve, reject) => {
            const url = new URL(this.config.serverUrl + this.config.healthEndpoint);
            const isHttps = url.protocol === 'https:';
            const client = isHttps ? https : http;

            const options = {
                hostname: url.hostname,
                port: url.port || (isHttps ? 443 : 80),
                path: url.pathname + url.search,
                method: 'GET',
                timeout: this.config.requestTimeout,
                headers: {
                    'User-Agent': 'KeepAlive-Service/1.0',
                    'Accept': 'application/json, text/plain, */*',
                    'Cache-Control': 'no-cache'
                }
            };

            const req = client.request(options, (res) => {
                let data = '';
                
                res.on('data', (chunk) => {
                    data += chunk;
                });

                res.on('end', () => {
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        resolve(true);
                    } else {
                        reject(new Error(`HTTP ${res.statusCode}: ${data}`));
                    }
                });
            });

            req.on('error', (error) => {
                reject(error);
            });

            req.on('timeout', () => {
                req.destroy();
                reject(new Error('Timeout de petición'));
            });

            req.end();
        });
    }

    /**
     * Obtiene las estadísticas del servicio
     */
    getStats() {
        return {
            ...this.stats,
            isActive: this.isActive,
            config: {
                serverUrl: this.config.serverUrl,
                pingInterval: this.config.pingInterval,
                healthEndpoint: this.config.healthEndpoint
            },
            uptime: Date.now() - this.stats.uptime,
            successRate: this.stats.totalPings > 0 ? 
                ((this.stats.successfulPings / this.stats.totalPings) * 100).toFixed(2) + '%' : '0%'
        };
    }

    /**
     * Middleware Express para endpoint de estadísticas
     */
    getStatsMiddleware() {
        return (req, res) => {
            res.json({
                status: 'ok',
                service: 'keep-alive',
                ...this.getStats()
            });
        };
    }

    /**
     * Middleware Express para endpoint de salud
     */
    getHealthMiddleware() {
        return (req, res) => {
            const stats = this.getStats();
            const isHealthy = this.isActive && (
                stats.totalPings === 0 || 
                stats.successfulPings > 0 || 
                Date.now() - new Date(stats.lastPingTime).getTime() < this.config.pingInterval * 2
            );

            res.status(isHealthy ? 200 : 503).json({
                status: isHealthy ? 'healthy' : 'unhealthy',
                timestamp: new Date().toISOString(),
                uptime: stats.uptime,
                service: 'gloobix-server'
            });
        };
    }

    /**
     * Función de logging con timestamp
     */
    log(message, data = null) {
        if (!this.config.verbose) return;

        const timestamp = new Date().toISOString();
        const prefix = `[${timestamp}] [KeepAlive]`;
        
        if (data) {
            console.log(`${prefix} ${message}`, data);
        } else {
            console.log(`${prefix} ${message}`);
        }
    }
}

// Instancia global del servicio
let keepAliveInstance = null;

/**
 * Inicializa el servicio de keep-alive
 */
function initKeepAlive(options = {}) {
    if (keepAliveInstance) {
        console.log('[KeepAlive] Servicio ya inicializado');
        return keepAliveInstance;
    }

    keepAliveInstance = new KeepAliveService(options);
    
    // Auto-iniciar si estamos en producción o si se especifica
    if (process.env.NODE_ENV === 'production' || options.autoStart !== false) {
        keepAliveInstance.start();
    }

    // Manejar cierre graceful
    process.on('SIGTERM', () => {
        console.log('[KeepAlive] Recibida señal SIGTERM, deteniendo servicio...');
        if (keepAliveInstance) {
            keepAliveInstance.stop();
        }
    });

    process.on('SIGINT', () => {
        console.log('[KeepAlive] Recibida señal SIGINT, deteniendo servicio...');
        if (keepAliveInstance) {
            keepAliveInstance.stop();
        }
    });

    return keepAliveInstance;
}

/**
 * Obtiene la instancia actual del servicio
 */
function getKeepAlive() {
    return keepAliveInstance;
}

module.exports = {
    KeepAliveService,
    initKeepAlive,
    getKeepAlive
};