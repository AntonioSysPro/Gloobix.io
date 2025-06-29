// Submenú de skins y barra de búsqueda para selección visual
window.addEventListener('DOMContentLoaded', function() {
    const abrirSkinsBtn = document.getElementById('abrirSkinsBtn');
    const skinsSubmenu = document.getElementById('skinsSubmenu');
    const cerrarSkinsBtn = document.getElementById('cerrarSkinsBtn');
    const skinsGrid = document.getElementById('skinsGrid');
    const buscadorSkins = document.getElementById('buscadorSkins');
    const skinSeleccionadaTexto = document.getElementById('skinSeleccionadaTexto');
    const nombreJugadorInput = document.getElementById('nombreJugador');

    // Lista de skins (debe coincidir con las opciones y assets)
    const skins = [
        { value: 'dragons.jpg', name: '🐉 Dragón', img: 'assets/dragons.jpg' },
        { value: 'war-unit.jpg', name: '⚔️ Unidad de guerra', img: 'assets/war-unit.jpg' },
        { value: 'doge.png', name: '🐶 Perro', img: 'assets/doge.png' },
        { value: 'fly.png', name: '🪰 Mosca', img: 'assets/fly.png' },
        { value: 'chick.png', name: '🐔 Pollo', img: 'assets/chick.png' },
        { value: 'bbear.png', name: '�� Oso', img: 'assets/bbear.png' },
        { value: 'p1.png', name: '🟢 P1', img: 'assets/p1.png' },
        { value: 'p2.png', name: '🔵 P2', img: 'assets/p2.png' },
        { value: 'p3.png', name: '🟣 P3', img: 'assets/p3.png' }
    ];

    // Cargar nombre y skin de localStorage
    let skinSeleccionada = localStorage.getItem('skinSeleccionada') || skins[0].value;
    if (nombreJugadorInput) {
        const nombreGuardado = localStorage.getItem('nombreJugador');
        if (nombreGuardado) {
            nombreJugadorInput.value = nombreGuardado;
        }
        nombreJugadorInput.addEventListener('input', function() {
            localStorage.setItem('nombreJugador', nombreJugadorInput.value);
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
    cargarProgreso();

    function renderSkinsGrid(filtro = '') {
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

    // Guardar la skin seleccionada en window para acceso global
    window.getSkinSeleccionada = function() {
        return skinSeleccionada;
    };
});
