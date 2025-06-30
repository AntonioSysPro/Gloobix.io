// Sistema de selección de modos y skins
window.addEventListener('DOMContentLoaded', function() {
    // Elementos del DOM
    const abrirSkinsBtn = document.getElementById('abrirSkinsBtn');
    const skinsSubmenu = document.getElementById('skinsSubmenu');
    const cerrarSkinsBtn = document.getElementById('cerrarSkinsBtn');
    const skinsGrid = document.getElementById('skinsGrid');
    const buscadorSkins = document.getElementById('buscadorSkins');
    const skinSeleccionadaTexto = document.getElementById('skinSeleccionadaTexto');
    const nombreJugadorInput = document.getElementById('nombreJugador');
    
    // Elementos de modos de juego
    const abrirModosBtn = document.getElementById('abrirModosBtn');
    const modosSubmenu = document.getElementById('modosSubmenu');
    const cerrarModosBtn = document.getElementById('cerrarModosBtn');
    const modosCarousel = document.getElementById('modosCarousel');
    const carouselPrev = document.getElementById('carouselPrev');
    const carouselNext = document.getElementById('carouselNext');
    const modoSeleccionadoTexto = document.getElementById('modoSeleccionadoTexto');
    const modoSeleccionadoInfo = document.getElementById('modoSeleccionadoInfo');

    // Lista de skins
    const skins = [
        { value: 'dragons.jpg', name: '🐉 Dragón', img: 'assets/dragons.jpg' },
        { value: 'war-unit.jpg', name: '⚔️ Unidad de guerra', img: 'assets/war-unit.jpg' },
        { value: 'doge.png', name: '🐶 Perro', img: 'assets/doge.png' },
        { value: 'fly.png', name: '🪰 Mosca', img: 'assets/fly.png' },
        { value: 'chick.png', name: '🐔 Pollo', img: 'assets/chick.png' },
        { value: 'bbear.png', name: '🐻 Oso', img: 'assets/bbear.png' },
        { value: 'p1.png', name: '🟢 P1', img: 'assets/p1.png' },
        { value: 'p2.png', name: '🔵 P2', img: 'assets/p2.png' },
        { value: 'p3.png', name: '🟣 P3', img: 'assets/p3.png' }
    ];

    // Lista de modos de juego con información detallada
    const modos = [
        { 
            value: 'clasico', 
            name: 'Modo Normal', 
            emoji: '🎯',
            descripcion: 'El modo clásico de Agar.io. Come células más pequeñas y evita las más grandes.',
            gradient: 'linear-gradient(135deg, #00fff7, #ff00e6)'
        },
        { 
            value: 'ffa', 
            name: 'FFA', 
            emoji: '⚔️',
            descripcion: 'Todos contra todos. Batalla épica sin equipos ni alianzas.',
            gradient: 'linear-gradient(135deg, #ff3860, #ff00e6)'
        },
        { 
            value: 'equipos', 
            name: 'Equipos', 
            emoji: '🤝',
            descripcion: 'Únete a un equipo y colabora para dominar el mapa.',
            gradient: 'linear-gradient(135deg, #0099ff, #00fff7)'
        },
        { 
            value: 'experimental', 
            name: 'Experimental', 
            emoji: '🧪',
            descripcion: 'Modo con virus verdes que dividen células grandes. ¡Cuidado!',
            gradient: 'linear-gradient(135deg, #00ff85, #a100ff)'
        },
        { 
            value: 'party', 
            name: 'Party', 
            emoji: '🎉',
            descripcion: 'Crea o únete a partidas privadas con amigos.',
            gradient: 'linear-gradient(135deg, #ffe600, #ff00e6)'
        },
        { 
            value: 'batalla', 
            name: 'Rey del Mapa', 
            emoji: '👑',
            descripcion: 'Conviértete en el rey alcanzando 50,000 de masa.',
            gradient: 'linear-gradient(135deg, #ffe600, #ff3860)'
        },
        { 
            value: 'equipo', 
            name: 'Guerra de Equipos', 
            emoji: '⚡',
            descripcion: 'Batalla intensa entre equipos rojos y azules.',
            gradient: 'linear-gradient(135deg, #ff3860, #0099ff)'
        },
        { 
            value: 'supervivencia', 
            name: 'Último en Pie', 
            emoji: '🏆',
            descripcion: 'Sobrevive hasta ser el último jugador en el mapa.',
            gradient: 'linear-gradient(135deg, #a100ff, #00fff7)'
        },
        { 
            value: 'SelfFeed', 
            name: 'Entrenamiento', 
            emoji: '🎓',
            descripcion: 'Practica tus habilidades en un entorno controlado.',
            gradient: 'linear-gradient(135deg, #00ff85, #00fff7)'
        }
    ];

    // Variables de estado
    let skinSeleccionada = localStorage.getItem('skinSeleccionada') || skins[0].value;
    let modoSeleccionado = localStorage.getItem('modoSeleccionado') || 'clasico';

    // Configuración del nombre de jugador
    if (nombreJugadorInput) {
        const nombreGuardado = localStorage.getItem('nombreJugador');
        if (nombreGuardado) {
            nombreJugadorInput.value = nombreGuardado;
        }
        
        // Validación y limpieza del nombre en tiempo real
        nombreJugadorInput.addEventListener('input', function() {
            // Permitir espacios pero controlar múltiples espacios consecutivos
            this.value = this.value.replace(/\s{2,}/g, ' ');
            
            // Eliminar espacios al inicio
            if (this.value.startsWith(' ')) {
                this.value = this.value.trimStart();
            }
            
            // Guardar en localStorage
            localStorage.setItem('nombreJugador', this.value);
        });
        
        // Validación al perder el foco
        nombreJugadorInput.addEventListener('blur', function() {
            this.value = this.value.trim();
            if (this.value.length === 0) {
                this.value = 'Jugador';
            }
            localStorage.setItem('nombreJugador', this.value);
        });
    }

    // Experiencia y progreso
    const nivelActual = document.getElementById('nivelActual');
    const progresoNivel = document.getElementById('progresoNivel');
    const expActual = document.getElementById('expActual');
    const victorias = document.getElementById('victorias');
    const mejorPuntuacion = document.getElementById('mejorPuntuacion');
    const enemigosDerrotados = document.getElementById('enemigosDerrotados');

    function cargarProgreso() {
        const exp = parseInt(localStorage.getItem('exp') || '0', 10);
        const nivel = Math.floor(exp / 1000) + 1;
        const expNivel = exp % 1000;
        if (nivelActual) nivelActual.textContent = nivel;
        if (progresoNivel) progresoNivel.style.width = (expNivel / 10) + '%';
        if (expActual) expActual.textContent = expNivel + ' / 1000 XP';
        if (victorias) victorias.textContent = localStorage.getItem('victorias') || '0';
        if (mejorPuntuacion) mejorPuntuacion.textContent = localStorage.getItem('mejorPuntuacion') || '0';
        if (enemigosDerrotados) enemigosDerrotados.textContent = localStorage.getItem('enemigosDerrotados') || '0';
    }
    
    // Cargar progreso inicial
    cargarProgreso();
    
    // Actualizar progreso cada segundo para reflejar cambios en tiempo real
    setInterval(cargarProgreso, 1000);
    
    // Actualizar progreso cuando se muestre el menú
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                const menuPrincipal = document.getElementById('menuPrincipal');
                if (menuPrincipal && !menuPrincipal.classList.contains('hidden')) {
                    setTimeout(cargarProgreso, 100);
                }
            }
        });
    });
    
    const menuPrincipal = document.getElementById('menuPrincipal');
    if (menuPrincipal) {
        observer.observe(menuPrincipal, { attributes: true });
    }

    // Funciones para modos de juego
    function renderModosCarousel() {
        if (!modosCarousel) return;
        
        modosCarousel.innerHTML = '';
        modos.forEach(modo => {
            const card = document.createElement('div');
            card.className = 'modo-card' + (modoSeleccionado === modo.value ? ' selected' : '');
            card.onclick = () => seleccionarModo(modo.value);
            
            card.innerHTML = `
                <div class="modo-imagen" style="background: ${modo.gradient}">
                    ${modo.emoji}
                </div>
                <div class="modo-nombre">${modo.name}</div>
                <div class="modo-descripcion">${modo.descripcion}</div>
            `;
            
            modosCarousel.appendChild(card);
        });
    }

    function seleccionarModo(valor) {
        modoSeleccionado = valor;
        localStorage.setItem('modoSeleccionado', modoSeleccionado);
        actualizarTextoModoSeleccionado();
        renderModosCarousel();
        
        const modoObj = modos.find(m => m.value === valor);
        if (modoSeleccionadoInfo && modoObj) {
            modoSeleccionadoInfo.textContent = `Modo seleccionado: ${modoObj.name}`;
        }
    }

    function actualizarTextoModoSeleccionado() {
        const modoObj = modos.find(m => m.value === modoSeleccionado);
        if (modoSeleccionadoTexto && modoObj) {
            modoSeleccionadoTexto.textContent = modoObj.name;
        }
    }

    function scrollCarousel(direccion) {
        if (!modosCarousel) return;
        
        const scrollAmount = 300;
        const currentScroll = modosCarousel.scrollLeft;
        const targetScroll = direccion === 'next' 
            ? currentScroll + scrollAmount 
            : currentScroll - scrollAmount;
        
        modosCarousel.scrollTo({
            left: targetScroll,
            behavior: 'smooth'
        });
    }

    // Event listeners para modos
    if (abrirModosBtn && modosSubmenu && cerrarModosBtn) {
        abrirModosBtn.onclick = () => {
            modosSubmenu.classList.remove('hidden');
            renderModosCarousel();
            actualizarTextoModoSeleccionado();
        };
        
        cerrarModosBtn.onclick = () => {
            modosSubmenu.classList.add('hidden');
        };
    }

    if (carouselPrev && carouselNext) {
        carouselPrev.onclick = () => scrollCarousel('prev');
        carouselNext.onclick = () => scrollCarousel('next');
    }

    // Funciones para skins
    function renderSkinsGrid(filtro = '') {
        if (!skinsGrid) return;
        
        skinsGrid.innerHTML = '';
        const filtroLower = filtro.trim().toLowerCase();
        skins.filter(skin => skin.name.toLowerCase().includes(filtroLower) || skin.value.toLowerCase().includes(filtroLower)).forEach(skin => {
            const div = document.createElement('div');
            div.className = 'skins-grid-item' + (skinSeleccionada === skin.value ? ' selected' : '');
            div.onclick = () => {
                skinSeleccionada = skin.value;
                localStorage.setItem('skinSeleccionada', skinSeleccionada);
                actualizarTextoSeleccionada();
                skinsSubmenu.classList.add('hidden');
            };
            const img = document.createElement('img');
            img.src = skin.img;
            img.alt = skin.name;
            div.appendChild(img);
            const label = document.createElement('div');
            label.className = 'skins-label';
            label.textContent = skin.name;
            div.appendChild(label);
            skinsGrid.appendChild(div);
        });
    }

    function actualizarTextoSeleccionada() {
        const skinObj = skins.find(s => s.value === skinSeleccionada);
        if (skinSeleccionadaTexto && skinObj) {
            skinSeleccionadaTexto.textContent = `Skin seleccionada: ${skinObj.name}`;
        }
    }

    // Event listeners para skins
    if (abrirSkinsBtn && skinsSubmenu && cerrarSkinsBtn && skinsGrid && buscadorSkins) {
        abrirSkinsBtn.onclick = () => {
            skinsSubmenu.classList.remove('hidden');
            renderSkinsGrid('');
            buscadorSkins.value = '';
            buscadorSkins.focus();
            actualizarTextoSeleccionada();
        };
        cerrarSkinsBtn.onclick = () => {
            skinsSubmenu.classList.add('hidden');
        };
        buscadorSkins.oninput = (e) => {
            renderSkinsGrid(buscadorSkins.value);
        };
    }

    // Inicializar textos
    actualizarTextoModoSeleccionado();

    // Funciones globales para acceso desde otros archivos
    window.getSkinSeleccionada = function() {
        return skinSeleccionada;
    };

    window.getModoSeleccionado = function() {
        return modoSeleccionado;
    };
});