// js/script.js
document.addEventListener('DOMContentLoaded', () => {
                                                     // --- 1. Selección de Elementos del DOM ---
    console.log("Seleccionando elementos del DOM...");
    const gameContainer = document.getElementById('game-container');
    const startScreen = document.getElementById('start-screen');
    const gameScreen = document.getElementById('game-screen');
    const pauseScreen = document.getElementById('pause-screen');
    const gameOverScreen = document.getElementById('game-over-screen');
    const canvas = document.getElementById('game-canvas');
    const muteButton = document.getElementById('mute-button');
    const volumeSlider = document.getElementById('volume-slider');
    const backgroundAudio = document.getElementById('background-audio');
    const levelUpNotificationElement = document.getElementById('level-up-notification');
    const levelUpValueElement = document.getElementById('level-up-value');
    const startHighScoreElement = document.getElementById('start-high-score');
    const gameOverHighScoreElement = document.getElementById('game-over-high-score'); 
    const newRecordMessageElement = document.getElementById('new-record-message');

    // Validar nuevos elementos
    if (!levelUpNotificationElement || !levelUpValueElement) {
        console.warn("Advertencia: Elementos de notificación de nivel no encontrados.");
    }

    // Validar existencia de elementos cruciales
    if (!gameContainer || !startScreen || !gameScreen || !pauseScreen || !gameOverScreen || !canvas) {
        console.error("Error: Falta uno o más contenedores principales (game-container, screens, canvas).");
        return; // No continuar si falta algo esencial
    }
    const ctx = canvas.getContext('2d');

    // Elementos de UI
    const startButton = document.getElementById('start-button');
    const pauseButton = document.getElementById('pause-button');
    const resumeButton = document.getElementById('resume-button');
    const restartButton = document.getElementById('restart-button');
    const scoreValueElement = document.getElementById('score-value');
    const levelValueElement = document.getElementById('level-value');
    const livesContainer = document.getElementById('lives-container');
    const finalScoreElement = document.getElementById('final-score');
    const targetShapeIndicator = document.getElementById('target-shape-indicator');
    const targetShapeImage = document.getElementById('target-shape-image');
    const targetShapeName = document.getElementById('target-shape-name');
    console.log("Elementos del DOM seleccionados.");

    // --- VARIABLE PARA ESTADO DE CARGA ---
    let resourcesLoaded = false; // Empieza como falso

    // --- 2. Variables y Constantes del Juego ---
    console.log("Definiendo variables y constantes del juego...");
    // Estado del juego
    let gameState = 'START'; // START, PLAYING, PAUSED, GAME_OVER
    let score = 0;
    let lives = 5;
    let level = 1;
    let gameLoopId = null;
    let targetShapeType = null;
    let shapeToDisplay = {}; // Se llenará después de seleccionar elementos
    let lastShapeSpawnTime = 0;
    let sounds = {};
    let isMuted = false;
    let previousVolume = 0.2;
    let effectsVolume = 0.5;
    let basketHighlight = { // Objeto para el estado del borde
        active: false,      // ¿Está activo el efecto?
        color: null,       // Color del borde ('green' o 'red')
        timerId: null      // ID del temporizador para quitar el efecto
    };
    let highScore = 0; // Variable para guardar el high score leído
    const HIGH_SCORE_KEY = 'cazadorFormasHighScore'; // Clave para localStorage
    let gamePausedByBlur = false; 

    // Controles
    let mouseX = 0;
    let moveLeft = false;
    let moveRight = false;
    let fallingShapes = [];

    // Configuración del juego
    const INITIAL_LIVES = 5;
    const POINTS_PER_CATCH = 3;
    const POINTS_PENALTY = -2;
    const BASKET_WIDTH = 90;
    const BASKET_HEIGHT = 70;
    const BASKET_SPEED = 15;
    const SHAPE_SIZE = 45;
    const INITIAL_SHAPE_SPEED = 2;
    const SPEED_INCREMENT_PER_LEVEL = 0.3;
    const SHAPE_SPAWN_RATE = 1000; // ms

     // Propiedades de la canasta
    const basket = {
        width: BASKET_WIDTH,
        height: BASKET_HEIGHT,
        x: 0,
        y: 0,
        speed: BASKET_SPEED,
        color: '#4CAF50',
        img: null,
        imgSrc: 'images/cesta_colorida.png'
    };

    // Formas y Colores
    const shapeTypes = ['circle', 'square', 'triangle', 'rectangle', 'rhombus', 'trapezoid', 'pentagon', 'hexagon'];
    const shapeColors = ['#FFEB3B', '#FF9800', '#F44336', '#9C27B0', '#2196F3', '#00BCD4', '#8BC34A', '#CDDC39'];

    // *** NUEVO: Mapeo de Nombres de Figuras a Español ***
    const shapeNamesSpanish = {
        circle: "Círculo",
        square: "Cuadrado",
        triangle: "Triángulo",
        rectangle: "Rectángulo",
        rhombus: "Rombo",
        trapezoid: "Trapecio",
        pentagon: "Pentágono",
        hexagon: "Hexágono"
    };

    // Asignar elementos a shapeToDisplay después de seleccionarlos
     if(targetShapeImage && targetShapeName) {
        shapeToDisplay = { img: targetShapeImage, name: targetShapeName };
     } else {
         console.warn("Elementos para indicar forma objetivo no encontrados.");
     }
     console.log("Variables y constantes definidas.");


    // --- 3. Configuración del Canvas ---
    let canvasWidth, canvasHeight;

     function resizeCanvas() {
        console.log("Ejecutando resizeCanvas..."); // Añadir log para confirmar ejecución
        canvasWidth = gameContainer.clientWidth;
        canvasHeight = gameContainer.clientHeight; // Asumiendo aspect-ratio en CSS

        // *** Actualizar atributos del canvas (BORRA el contenido) ***
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;
        console.log(`Canvas atributos actualizados a: ${canvas.width}x${canvas.height}`);

        // Cesta: Ajustar 'Y' al nuevo alto y recentrar 'X'
        basket.y = canvasHeight - basket.height - 15; // <-- ¡CLAVE! Ajustar Y
        basket.x = canvasWidth / 2 - basket.width / 2;  // <-- Recalcular X para centrarla
        mouseX = canvasWidth / 2; // Resetear posición base del ratón

        // *** FORZAR REDIBUJO INMEDIATO ***
        // Redibujar si el juego está activo, pausado o terminado (para ver el estado actual)
        if (gameState === 'PLAYING' || gameState === 'PAUSED' || gameState === 'GAME_OVER') {
            console.log("Redibujando juego después de resize...");
            drawGame(); // Llama a la función que dibuja todo (cesta, figuras)
        } else if (gameState === 'START') {
             // Si estás en la pantalla de inicio, no necesitas redibujar el canvas,
             // pero podrías querer asegurarte de que esté limpia por si acaso.
             if (ctx) ctx.clearRect(0, 0, canvasWidth, canvasHeight);
        }
    }

    // Ajustar tamaño inicial y al cambiar tamaño de ventana
    resizeCanvas(); // Llamada inicial
    window.addEventListener('resize', resizeCanvas); // Listener para cambios


    // --- FUNCIONES AUXILIARES High Score ---
    function loadHighScore() {
        const storedScore = localStorage.getItem(HIGH_SCORE_KEY);
        highScore = storedScore ? parseInt(storedScore, 10) : 0; // Convierte a número o 0
        console.log(`High Score cargado: ${highScore}`);
        updateHighScoreDisplay(); // Actualiza la UI al cargar
    }

    function saveHighScore() {
        try {
            localStorage.setItem(HIGH_SCORE_KEY, highScore.toString()); // Guarda como string
            console.log(`High Score guardado: ${highScore}`);
        } catch (e) {
            console.error("Error al guardar High Score en localStorage:", e);
        }
    }

    function updateHighScoreDisplay() {
        if (startHighScoreElement) {
            startHighScoreElement.textContent = highScore;
        }
        if (gameOverHighScoreElement) {
            gameOverHighScoreElement.textContent = highScore;
        }
        // Ocultar mensaje de nuevo récord por defecto
        if (newRecordMessageElement) {
            newRecordMessageElement.style.display = 'none';
        }
    }

    function checkAndSaveHighScore() {
        let isNewRecord = false;
        if (score > highScore) {
            console.log(`¡Nuevo Récord! ${score} > ${highScore}`);
            highScore = score; // Actualiza la variable local
            saveHighScore();   // Guarda en localStorage
            updateHighScoreDisplay(); // Actualiza la UI para mostrar el nuevo récord
            if (newRecordMessageElement) {
                newRecordMessageElement.style.display = 'block'; // Hacer visible
            }
            playSound('newRecord'); // Reutilizar sonido de level up o añadir uno nuevo
            isNewRecord = true;
        } else {
             // Asegurarse que el mensaje de nuevo récord esté oculto si no se batió
             if (newRecordMessageElement) {
                 newRecordMessageElement.style.display = 'none';
            }
            isNewRecord = false;
        }
        return isNewRecord;
    }

    // --- 4. Funciones de Sonido ---
    function preloadSounds() {
        console.log("Precargando sonidos...");
        const soundFiles = {
             'catchCorrect': 'sound/correct.mp3',
             'catchWrong': 'sound/wrong.mp3',
             'loseLife': 'sound/lose_life.mp3',
             'levelUp': 'sound/level_up.mp3',
             'gameOver': 'sound/game_over.mp3',
             'start': 'sound/start.mp3',
             'newRecord': 'sound/new_record.mp3'
         };
        try {
            for (const id in soundFiles) {
                sounds[id] = new Audio(soundFiles[id]);
                sounds[id].load(); // Inicia la carga
            }
            console.log("Objetos de audio creados y carga iniciada.");
        } catch (e) {
            console.error("Error al crear objetos Audio para precarga:", e);
        }
    }

    function playSound(soundId) {
        if (sounds[soundId]) {
            try {
                sounds[soundId].volume = effectsVolume;
                sounds[soundId].currentTime = 0; // Reinicia para reproducir desde el inicio
                sounds[soundId].play().catch(e => console.warn(`Error al reproducir sonido '${soundId}':`, e));
            } catch (e) {
                console.error(`Error general al intentar reproducir ${soundId}:`, e);
            }
        } else {
            console.warn(`Sonido no encontrado en el objeto 'sounds': ${soundId}`);
        }
    }

    function playBackgroundMusic() {
        if (backgroundAudio) {
            setMusicVolume(parseFloat(volumeSlider.value)); // Asegurar que sea número
            if (!isMuted) {
                 backgroundAudio.play().catch(error => {
                     console.warn("Música fondo: Playback falló (requiere interacción?).", error);
                 });
            } else {
                console.log("Música fondo: No se reproduce porque está muteado.");
            }
        }
    }

    function pauseBackgroundMusic() {
        if (backgroundAudio) {
            backgroundAudio.pause();
        }
    }

    function stopBackgroundMusic() {
         if (backgroundAudio) {
             backgroundAudio.pause();
             backgroundAudio.currentTime = 0;
         }
    }

     // *** FUNCIÓN Establecer volumen y actualizar estado mute ***
    function setMusicVolume(volumeLevel) {
        if (backgroundAudio) {
            const newVolume = Math.max(0, Math.min(1, volumeLevel));
            backgroundAudio.volume = newVolume;

            const muteIcon = muteButton ? muteButton.querySelector('i') : null;
            if (newVolume === 0) {
                isMuted = true;
                if (muteIcon) {
                    muteIcon.classList.remove('fa-volume-high');
                    muteIcon.classList.add('fa-volume-xmark');
                    muteButton.setAttribute('aria-label', 'Activar sonido música de fondo');
                }
            } else {
                isMuted = false;
                if (muteIcon) {
                    muteIcon.classList.remove('fa-volume-xmark');
                    muteIcon.classList.add('fa-volume-high');
                    muteButton.setAttribute('aria-label', 'Silenciar música de fondo');
                }
                 if (volumeSlider && parseFloat(volumeSlider.value) !== newVolume) {
                    volumeSlider.value = newVolume;
                 }
                 if(newVolume > 0) { // Solo guardar si no es 0
                    previousVolume = newVolume;
                 }
            }
             // console.log(`Volumen música ajustado a: ${newVolume}, Muted: ${isMuted}`);
        }
    }

    // ***FUNCIÓN Alternar Mute ***
    function toggleMute() {
        if (!backgroundAudio || !volumeSlider) return;

        if (isMuted) {
             const restoreVolume = (parseFloat(volumeSlider.value) > 0) ? parseFloat(volumeSlider.value) : previousVolume;
             setMusicVolume(restoreVolume); // Restaura y actualiza icono/estado
             volumeSlider.value = restoreVolume; // Asegura que el slider refleje el volumen
            if (gameState === 'PLAYING') {
                 playBackgroundMusic(); // Intentará reproducir con el nuevo volumen
             }
        } else {
            previousVolume = backgroundAudio.volume; // Guarda el volumen actual
            setMusicVolume(0); // Pone a 0 y actualiza icono/estado
            volumeSlider.value = 0; // Poner slider a 0
        }
    }

     // --- FUNCIÓN PARA CARGAR IMÁGENES ---
    function loadImages() {
        console.log("Cargando imágenes...");
        // Podrías tener un array de imágenes si cargas más en el futuro
        let imagesToLoad = 1; // Solo cargamos 1 imagen por ahora (la cesta)
        let imagesLoaded = 0;

        // Deshabilitar botón Start mientras carga (opcional pero recomendado)
        if (startButton) {
            startButton.disabled = true;
            startButton.textContent = "Cargando..."; // Feedback visual
        }

        // Crear y cargar imagen de la cesta
        const basketImg = new Image();

        basketImg.onload = () => { // Se ejecuta cuando la imagen se carga con ÉXITO
            console.log("Imagen de cesta cargada OK.");
            imagesLoaded++;
            basket.img = basketImg; // *** Guarda la imagen CARGADA en el objeto basket ***

            // Comprueba si todas las imágenes esperadas se han procesado
            if (imagesLoaded === imagesToLoad) {
                console.log("Todos los recursos de imagen procesados.");
                resourcesLoaded = true; // *** Marca que los recursos están listos ***
                if (startButton) {
                    startButton.disabled = false; // Habilita el botón
                    startButton.textContent = "¡Jugar!"; // Restaura texto
                }
                // Si el juego estaba en pausa esperando la imagen, redibuja
                if (gameState === 'PAUSED') {
                    drawGame();
                }
            }
        };

        basketImg.onerror = () => { // Se ejecuta si hay un ERROR al cargar la imagen
            console.error("ERROR al cargar la imagen de la cesta:", basket.imgSrc);
            imagesLoaded++; // Contamos como procesada para no bloquear el juego
            basket.img = null; // Aseguramos que sea null si falló

            if (imagesLoaded === imagesToLoad) {
                console.warn("Error en carga de imagen, pero se permite iniciar juego (usará fallback).");
                resourcesLoaded = true; // Permite iniciar, pero la cesta será un rectángulo
                if (startButton) {
                    startButton.disabled = false;
                    startButton.textContent = "¡Jugar!";
                }
            }
        };

        // *** Inicia la carga asignando la ruta a src ***
        basketImg.src = basket.imgSrc;
        console.log(`Iniciando carga de: ${basket.imgSrc}`);
    }

    // --- 5. Funciones de Dibujo ---
    function drawBasket() {
    if (!ctx) {
            console.warn("Contexto Canvas no disponible para dibujar cesta.");
            return; // Salir si no hay contexto
        }
        ctx.save();

        // --- DIBUJAR HIGHLIGHT (SI ACTIVO) ---
        if (basketHighlight.active && basketHighlight.color && basket.img && resourcesLoaded) {
            const highlightColor = basketHighlight.color === 'green' ? '#33ff33' : '#ff3333';
            const thickness = 4; // Grosor deseado del borde en píxeles (ajusta)

            // 1. Dibuja la imagen original ligeramente MÁS GRANDE
            ctx.save();
            ctx.fillStyle = highlightColor; // Establece el color de relleno deseado
            // Dibuja la imagen un poco más grande que la cesta original
            try {
                ctx.drawImage(basket.img,
                              basket.x - thickness, // Empieza 'thickness' píxeles antes en X
                              basket.y - thickness, // Empieza 'thickness' píxeles antes en Y
                              basket.width + thickness * 2, // Ancho total = ancho original + 2 * grosor
                              basket.height + thickness * 2); // Alto total = alto original + 2 * grosor

                 ctx.globalCompositeOperation = 'source-in';

                 // Ahora dibuja un rectángulo de ese color que cubra toda el área grande
                  ctx.fillRect(basket.x - thickness, basket.y - thickness, basket.width + thickness * 2, basket.height + thickness * 2);

            } catch (e) { console.error("Error dibujando base del highlight:", e); }
            ctx.restore(); // Restaura composición y fillStyle originales (pero mantiene el dibujo coloreado grande)

        }
        // --- DIBUJAR IMAGEN NORMAL / FALLBACK ---
         if (basket.img && resourcesLoaded) {
            // Aplicar sombra a la imagen principal
             ctx.save(); // Guardar para sombra
             ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
             ctx.shadowBlur = 6;
             ctx.shadowOffsetX = 0;
             ctx.shadowOffsetY = 4;
            try {
                ctx.drawImage(basket.img, basket.x, basket.y, basket.width, basket.height);
            } catch (e) { console.error("Error dibujando imagen cesta principal:", e); drawBasketFallback(); }
            ctx.restore(); // Quitar sombra
        } else {
            // Fallback si no hay imagen principal
            drawBasketFallback();
             // Si estabas intentando mostrar highlight pero falló la imagen, dibuja el borde simple
             if (basketHighlight.active && basketHighlight.color) {
                 const highlightColor = basketHighlight.color === 'green' ? '#33ff33' : '#ff3333';
                 ctx.strokeStyle = highlightColor;
                 ctx.lineWidth = 3;
                 ctx.strokeRect(basket.x - 1.5, basket.y - 1.5, basket.width + 3, basket.height + 3);
             }
        }
    }

    // Función separada para el dibujo de fallback (rectángulo)
    function drawBasketFallback() {
     if (!ctx) return;
        // console.warn("Dibujando cesta placeholder");
        ctx.fillStyle = basket.color; // Usa el color original del objeto
        ctx.fillRect(basket.x, basket.y, basket.width, basket.height);
    } 

function drawShape(shape) {
    if (!ctx) return; // Salir si no hay contexto

    // --- Configuración Base ---
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)'; // Borde oscuro sutil
    ctx.lineWidth = 1;

    // --- Aplicar Sombra ANTES de transformar/dibujar ---
    ctx.save(); // Guardar estado ANTES de sombra y transformaciones
    ctx.shadowColor = 'rgba(256, 256, 256, 0.3)'; // Color sombra (negro semi-transparente)
    ctx.shadowBlur = 5;                   // Desenfoque
    ctx.shadowOffsetX = 0;                // Desplazamiento X
    ctx.shadowOffsetY = 0;   

    // --- Transformaciones (Traslación y Rotación) ---
    ctx.translate(shape.x + shape.size / 2, shape.y + shape.size / 2);
    ctx.rotate(shape.rotation); // Aplicar rotación
    const s = shape.size / 2; // Mitad del tamaño

    // --- Crear Gradiente Lineal ---
    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, s * 1.1);
    gradient.addColorStop(0, shape.color1);
    gradient.addColorStop(0.5, shape.color2);
    gradient.addColorStop(1, shape.color3);
    ctx.fillStyle = gradient;
    // --- Fin Gradiente ---


    // --- Dibujar la Ruta de la Forma ---
    ctx.beginPath();
    switch (shape.type) {
        case 'circle':
            ctx.arc(0, 0, s, 0, Math.PI * 2);
            break;
        case 'square':
            ctx.rect(-s, -s, shape.size, shape.size);
            break;
        case 'triangle':
            ctx.moveTo(0, -s * 1.15); ctx.lineTo(s, s * 0.58); ctx.lineTo(-s, s * 0.58);
            ctx.closePath();
            break;
        case 'rectangle':
            ctx.rect(-s, -s / 2, shape.size, shape.size / 2);
            break;
        case 'rhombus':
            ctx.moveTo(0, -s); ctx.lineTo(s * 0.7, 0); ctx.lineTo(0, s); ctx.lineTo(-s * 0.7, 0);
            ctx.closePath();
            break;
        case 'trapezoid':
            ctx.moveTo(-s * 0.8, -s * 0.6); ctx.lineTo(s * 0.8, -s * 0.6); ctx.lineTo(s, s * 0.6); ctx.lineTo(-s, s * 0.6);
            ctx.closePath();
            break;
        case 'pentagon':
            for (let i = 0; i < 5; i++) { ctx.lineTo(s * Math.cos(i * 2 * Math.PI / 5 - Math.PI / 2), s * Math.sin(i * 2 * Math.PI / 5 - Math.PI / 2)); }
            ctx.closePath();
            break;
        case 'hexagon':
            for (let i = 0; i < 6; i++) { ctx.lineTo(s * Math.cos(i * 2 * Math.PI / 6), s * Math.sin(i * 2 * Math.PI / 6)); }
            ctx.closePath();
            break;
    }

    // --- Aplicar Relleno y Borde ---
    ctx.fill();   // Rellena la forma con el gradiente
    ctx.stroke(); // Dibuja el borde encima del gradiente
    ctx.restore(); // Quita la rotación y traslación
}

    function drawFallingShapes() {
        fallingShapes.forEach(drawShape);
    }

    function drawGame() {
        if (!ctx) return;
        // Limpiar Canvas
        ctx.clearRect(0, 0, canvasWidth, canvasHeight);
        // Dibujar Elementos
        drawBasket();
        drawFallingShapes();
    }


    // --- 6. Funciones de Lógica y Actualización ---
    function createShape() {
        let type;
        if (level < 6 || !targetShapeType) {
        const typeIndex = Math.floor(Math.random() * shapeTypes.length);
        type = shapeTypes[typeIndex];
        } else {
            const CHANCE_OF_TARGET_SHAPE = 0.35; 
            if (Math.random() < CHANCE_OF_TARGET_SHAPE) {
                type = targetShapeType;
            } else {
                let incorrectTypeIndex;
                do {
                    incorrectTypeIndex = Math.floor(Math.random() * shapeTypes.length);
                    type = shapeTypes[incorrectTypeIndex];
                } while (type === targetShapeType && shapeTypes.length > 1); // Asegura que NO sea la objetivo
            }
        }

        const colorIndex = Math.floor(Math.random() * shapeColors.length);
        const baseColor = shapeColors[colorIndex];
        let color2, color3;
        let colorIndex2, colorIndex3;
            do {
        colorIndex2 = Math.floor(Math.random() * shapeColors.length);} while (colorIndex2 === colorIndex && shapeColors.length > 1); // Evita repetir si hay más de 1 color
        color2 = shapeColors[colorIndex2];
        if (shapeColors.length > 2) { // Solo si hay al menos 3 colores para elegir
            do {
                 colorIndex3 = Math.floor(Math.random() * shapeColors.length);
            } while (colorIndex3 === colorIndex || colorIndex3 === colorIndex2);
             color3 = shapeColors[colorIndex3];
        } else {
             color3 = (colorIndex2 !== colorIndex) ? baseColor : shapeColors[(colorIndex2 + 1) % shapeColors.length];
        }

        // --- Calcular velocidad---
        let currentSpeed;
        if (level < 6) {
            currentSpeed = INITIAL_SHAPE_SPEED + (level - 1) * SPEED_INCREMENT_PER_LEVEL;
        } else {
            const baseSpeedLevel6 = INITIAL_SHAPE_SPEED + 1.0;
            const incrementFromLevel6 = (level - 6) * SPEED_INCREMENT_PER_LEVEL;
            currentSpeed = baseSpeedLevel6 + incrementFromLevel6;
            const MAX_SPEED = INITIAL_SHAPE_SPEED * 3;
            currentSpeed = Math.min(currentSpeed, MAX_SPEED);
        }

        // --- Posición y Creación del Objeto ---
        const initialX = Math.random() * (canvasWidth - SHAPE_SIZE);
        const initialY = -SHAPE_SIZE;
        const newShape = {
            x: initialX,
            y: initialY,
            size: SHAPE_SIZE, 
            type: type,
            color1: baseColor,
            color2: color2,
            color3: color3,
            speed: currentSpeed,
            rotation: 0, 
            rotationSpeed: (Math.random() - 0.5) * 0.05
        };
        fallingShapes.push(newShape);
    }

    function updateFallingShapes(timestamp) {
        if (!lastShapeSpawnTime) lastShapeSpawnTime = timestamp; // Inicializar si es 0

        if (timestamp - lastShapeSpawnTime > SHAPE_SPAWN_RATE) {
            createShape();
            lastShapeSpawnTime = timestamp;
        }

        for (let i = fallingShapes.length - 1; i >= 0; i--) {
            const shape = fallingShapes[i];
            shape.y += shape.speed;
            shape.rotation += shape.rotationSpeed;

            if (shape.y > canvasHeight + shape.size) {
                if (level >= 6 && targetShapeType && shape.type === targetShapeType) {
                    console.log(`Figura correcta ${shape.type} escapó!`);
                    lives--;
                    updateLivesDisplay();
                    playSound('loseLife');
                }
                fallingShapes.splice(i, 1);
            }
        }
    }

    function updateBasketPosition() {
        if (moveLeft) basket.x -= basket.speed;
        if (moveRight) basket.x += basket.speed;
        // Limitar a bordes
        basket.x = Math.max(0, Math.min(basket.x, canvasWidth - basket.width));
    }

    function checkCollisions() {
        for (let i = fallingShapes.length - 1; i >= 0; i--) {
            const shape = fallingShapes[i];
            if (
                shape.x < basket.x + basket.width && shape.x + shape.size > basket.x &&
                shape.y < basket.y + basket.height && shape.y + shape.size > basket.y
            ) {
                // Colisión
                let pointsChanged = 0; // Para saber qué mostrar
                let soundToPlay = null;
                let highlightColor = null;

                if (level < 6) {
                    pointsChanged = POINTS_PER_CATCH;
                    soundToPlay = 'catchCorrect';
                    highlightColor = 'green';
                } else {
                    if (shape.type === targetShapeType) {
                        pointsChanged = POINTS_PER_CATCH;
                        soundToPlay = 'catchCorrect';
                        highlightColor = 'green';
                    } else {
                        pointsChanged = POINTS_PENALTY;
                        soundToPlay = 'catchWrong';
                        highlightColor = 'red';
                    }
                }

                // Actualizar score
                score += pointsChanged;
                score = Math.max(0, score); // Evitar score negativo
                updateScoreDisplay();

                if (soundToPlay) playSound(soundToPlay);

                showFloatingScore(pointsChanged, shape.x + shape.size / 2, basket.y);
                activateBasketHighlight(highlightColor);

                // Eliminar figura atrapada
                fallingShapes.splice(i, 1);
                continue;
            }
        }
    }

     // *** FUNCIÓN para activar/desactivar el borde ***
     function activateBasketHighlight(color) {
         if (basketHighlight.timerId) {
             clearTimeout(basketHighlight.timerId);
         }

         basketHighlight.active = true;
         basketHighlight.color = color; // 'green' o 'red'
         console.log(`Activando borde cesta: ${color}`);

         // Poner un temporizador para desactivar el efecto después de un corto tiempo
         basketHighlight.timerId = setTimeout(() => {
             basketHighlight.active = false;
             basketHighlight.color = null;
             basketHighlight.timerId = null;
             console.log("Desactivando borde cesta.");
             // No necesitamos redibujar aquí, el siguiente gameLoop lo hará sin el borde
         }, 300); // Duración del efecto en ms (ajusta este valor)
     }

    // *** Funcion para Puntos Flotantes ***
 function showFloatingScore(points, x, y) {
        console.log("[FloatingScore] Iniciando...");
        if (!gameContainer) {
            console.error("[FloatingScore] Error: gameContainer no existe.");
            return;
        }

        const scoreElement = document.createElement('span');
        scoreElement.classList.add('floating-score');

        if (points > 0) {
            scoreElement.textContent = `+${points}`;
            scoreElement.classList.add('plus');
             console.log("[FloatingScore] Creado elemento PLUS:", scoreElement.outerHTML); // Log HTML
        } else if (points < 0) {
            scoreElement.textContent = `${points}`;
            scoreElement.classList.add('minus');
             console.log("[FloatingScore] Creado elemento MINUS:", scoreElement.outerHTML); // Log HTML
        } else {
             console.log("[FloatingScore] Puntos son 0, no se muestra nada.");
            return; // Salir si no hay puntos que mostrar
        }

        // Calcular posición (Estimación simple, ajustar si es necesario)
        const elemWidthEstimate = Math.abs(points).toString().length * 15 + 10; // Estimación ancho (+ y signo)
        const posX = Math.max(10, Math.min(x - elemWidthEstimate / 2, canvasWidth - elemWidthEstimate - 10));
        const posY = Math.max(10, y - 30); // Un poco encima de la cesta
        scoreElement.style.left = `${posX}px`;
        scoreElement.style.top = `${posY}px`;
        console.log(`[FloatingScore] Posición calculada: left=${posX}px, top=${posY}px`);

        // Forzar reflow antes de añadir (puede ayudar a iniciar animación)
        void scoreElement.offsetWidth;

        // Añadir al contenedor del juego
        gameContainer.appendChild(scoreElement);
        console.log("[FloatingScore] Elemento añadido al gameContainer.");

        let fallbackTimeoutId = null; // Variable para el ID del timeout

        const handleAnimationEnd = () => {
            console.log("[FloatingScore] AnimationEnd detectado. Eliminando elemento.");
            scoreElement.removeEventListener('animationend', handleAnimationEnd);
            if (fallbackTimeoutId) {
                clearTimeout(fallbackTimeoutId);
                fallbackTimeoutId = null;
                console.log("[FloatingScore] Fallback Timeout cancelado.");
            }
            // Eliminar el elemento si todavía existe
            if (scoreElement.parentNode === gameContainer) {
                gameContainer.removeChild(scoreElement);
            }
        };

        // Añadir el listener para 'animationend'
        scoreElement.addEventListener('animationend', handleAnimationEnd);

        // Fallback por si 'animationend' no se dispara
        fallbackTimeoutId = setTimeout(() => {
            console.warn("[FloatingScore] Fallback Timeout ejecutado. Eliminando elemento.");
            // Quitar el listener por si acaso se dispara tarde
            scoreElement.removeEventListener('animationend', handleAnimationEnd);
            // Eliminar el elemento si todavía existe
            if (scoreElement.parentNode === gameContainer) {
                gameContainer.removeChild(scoreElement);
            }
            fallbackTimeoutId = null; // Limpiar ID
        }, 1500); 
    } 

    function selectNewTargetShape() {
        let newTarget;
        do {
            const randomIndex = Math.floor(Math.random() * shapeTypes.length);
            newTarget = shapeTypes[randomIndex];
        } while (newTarget === targetShapeType && shapeTypes.length > 1);
        targetShapeType = newTarget;
        updateTargetShapeDisplay();
        console.log(`Nuevo objetivo: ${targetShapeType}`);
    }

    function checkLevelUp() {
        const POINTS_PER_LEVEL = 30;
        const targetScore = level * POINTS_PER_LEVEL;

        if (score >= targetScore) {
            level++;
            console.log(`¡Nivel ${level}!`);
            updateLevelDisplay(); // Actualiza UI del nivel
            playSound('levelUp'); // Reproduce sonido
            showLevelUpNotification(level);

            // Lógica de cambio de objetivo
            if (level >= 6) {
                console.log("Limpiando figuras existentes para el nuevo nivel/objetivo...");
                fallingShapes = [];
            }

            if (level === 6) {
                console.log("Cambiando a modo 'Atrapa Específico'");
                selectNewTargetShape();
            } else if (level > 6) {
                selectNewTargetShape();
            }
        }
    }

    // --- 7. Funciones de Actualización de UI ---
    function updateScoreDisplay() { if(scoreValueElement) scoreValueElement.textContent = score; }
    function updateLevelDisplay() { if(levelValueElement) levelValueElement.textContent = level; }
    function updateLivesDisplay() {
        if (!livesContainer) return;
        livesContainer.innerHTML = '';
        const displayLives = Math.max(0, lives); // No mostrar vidas negativas
        for (let i = 0; i < displayLives; i++) {
            const heartIcon = document.createElement('i');
            heartIcon.className = 'fas fa-heart';
            livesContainer.appendChild(heartIcon);
        }
     }
     function updateTargetShapeDisplay() {
         if (!targetShapeIndicator || !shapeToDisplay.img || !shapeToDisplay.name) return;

         if (level < 6 || !targetShapeType) {
            targetShapeIndicator.style.display = 'none';
        } else {
            targetShapeIndicator.style.display = 'flex';
            shapeToDisplay.img.src = `images/shapes/shape_${targetShapeType}.png`;
            shapeToDisplay.img.alt = `Atrapar ${targetShapeType}`;
            const spanishName = shapeNamesSpanish[targetShapeType] || (targetShapeType.charAt(0).toUpperCase() + targetShapeType.slice(1));
            shapeToDisplay.name.textContent = spanishName;
        }
    }

    let levelUpTimeoutId = null; // Para guardar el ID del temporizador

    function showLevelUpNotification(newLevel) {
        if (!levelUpNotificationElement || !levelUpValueElement) return; // Salir si no existen

        // Cancelar cualquier animación anterior pendiente
        if (levelUpTimeoutId) {
            clearTimeout(levelUpTimeoutId);
            levelUpNotificationElement.classList.remove('show'); // Quitar clase por si acaso
        }

        // Actualizar el número de nivel en la notificación
        levelUpValueElement.textContent = newLevel;

        // Forzar reflow para reiniciar la animación si se muestra rápido de nuevo (truco CSS)
        void levelUpNotificationElement.offsetWidth;

        // Añadir la clase 'show' para iniciar la animación de entrada
        levelUpNotificationElement.classList.add('show');
        console.log("Mostrando notificación Nivel " + newLevel);

        // Establecer un temporizador para ocultar la notificación después de un tiempo
        levelUpTimeoutId = setTimeout(() => {
            levelUpNotificationElement.classList.remove('show');
            console.log("Ocultando notificación");
            levelUpTimeoutId = null; // Limpiar ID del timeout
        }, 1800); // Duración en milisegundos (1.8 segundos, ajusta este valor)
    }


    // --- 8. Funciones de Gestión de Estado del Juego ---
    function startGame() {
        console.log("Iniciando juego...");
        score = 0;
        lives = INITIAL_LIVES; // Usar constante
        level = 1;
        fallingShapes = [];
        targetShapeType = null;
        basket.x = canvasWidth / 2 - basket.width / 2;
        moveLeft = false;
        moveRight = false;
        lastShapeSpawnTime = performance.now(); // Usar performance.now() para timestamp inicial

        if (levelUpNotificationElement) levelUpNotificationElement.classList.remove('show');
        if (levelUpTimeoutId) clearTimeout(levelUpTimeoutId);
        levelUpTimeoutId = null;

        updateScoreDisplay();
        updateLivesDisplay();
        updateLevelDisplay();
        updateTargetShapeDisplay();

        showScreen('game-screen');
        hideScreen('pause-screen');
        hideScreen('game-over-screen');
        gamePausedByBlur = false;
        gameState = 'PLAYING';

        playBackgroundMusic();
        playSound('start');

        if (gameLoopId) cancelAnimationFrame(gameLoopId);
        gameLoopId = requestAnimationFrame(gameLoop);
    }

    function pauseGame() {
        if (gameState !== 'PLAYING') return; // Si ya está pausado o terminado, no hacer nada

        if (!gamePausedByBlur) {
             console.log("Juego pausado (Manual)");
        } else {
             console.log("Juego pausado (Automático por Blur)");
        }

        gameState = 'PAUSED';
        showScreen('pause-screen', true);
        if (gameLoopId) cancelAnimationFrame(gameLoopId);
        pauseBackgroundMusic();
    }

    function resumeGame() {
        if (gameState !== 'PAUSED') return;
        console.log("Reanudando juego...");
        gamePausedByBlur = false;
        gameState = 'PLAYING';
        hideScreen('pause-screen');
        lastShapeSpawnTime = performance.now();
        if (gameLoopId) cancelAnimationFrame(gameLoopId); // Seguridad
        gameLoopId = requestAnimationFrame(gameLoop);
        playBackgroundMusic();
    }

    function gameOver() {
        console.log("Game Over");
        gamePausedByBlur = false;
        gameState = 'GAME_OVER';
        if (finalScoreElement) finalScoreElement.textContent = score;
        const newRecordAchieved = checkAndSaveHighScore(); // Llama a la función y guarda el resultado (true/false)
        showScreen('game-over-screen', true);
        if (gameLoopId) cancelAnimationFrame(gameLoopId);
        stopBackgroundMusic();
        if (!newRecordAchieved) { // Si newRecordAchieved es false...
            playSound('gameOver'); // ...reproduce el sonido normal de Game Over.
        }
    }


    // --- 9. Bucle Principal del Juego ---
    function gameLoop(timestamp) { // timestamp es proporcionado por requestAnimationFrame
        if (gameState !== 'PLAYING') {
             // console.log(`Game loop saltado. Estado: ${gameState}`); // Log para depurar pausa
             return;
        }

        // Actualizar lógica
        updateBasketPosition();
        updateFallingShapes(timestamp); // Pasar timestamp para spawn rate
        checkCollisions();
        checkLevelUp();

        // Comprobar Game Over después de actualizar vidas
         if (lives <= 0) {
             gameOver();
             return; // Salir del bucle
         }

        // Dibujar
        drawGame();

        // Solicitar siguiente frame
        gameLoopId = requestAnimationFrame(gameLoop);
    }


    // --- 10. Gestión de Pantallas ---
     function showScreen(screenId, isOverlay = false) {
        const screens = document.querySelectorAll('.screen');
        screens.forEach(screen => {
            if (screen.id === screenId) {
                screen.classList.add('active');
                // Quitamos la clase overlay aquí, se aplica/quita desde CSS
                // if (isOverlay) screen.classList.add('overlay');
            } else if (!isOverlay || screen.id === 'game-screen') { // Oculta otras o la de juego si aparece overlay
                 if (!(isOverlay && screen.id === 'game-screen')) { // No ocultar game-screen si es overlay
                     screen.classList.remove('active');
                 }
            }
        });
         console.log(`Mostrando pantalla: ${screenId}`);
    }

    function hideScreen(screenId) {
         const screen = document.getElementById(screenId);
         if(screen) screen.classList.remove('active');
         console.log(`Ocultando pantalla: ${screenId}`);
    }


    // --- 11. Configuración de Input ---
    function setupInputListeners() {
        console.log("Configurando listeners de entrada...");
        // Teclado
        document.addEventListener('keydown', handleKeyDown);
        document.addEventListener('keyup', handleKeyUp);
        // Ratón
        canvas.addEventListener('mousemove', handleMouseMove);
        // Táctil
        canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
        canvas.addEventListener('touchstart', handleTouchStart, { passive: false }); // Podría ser útil para pausar/reanudar
        console.log("Listeners de entrada configurados.");
    }

    // Handlers separados para mejor organización y posible eliminación futura si fuera necesario
    function handleKeyDown(e) {
        if (gameState === 'START' && e.key === 'Enter') { // Empezar con Enter en pantalla inicial
            startGame();
            return;
        }
         if (gameState === 'GAME_OVER' && e.key === 'Enter') { // Reiniciar con Enter en Game Over
            startGame();
            return;
        }
         if (gameState === 'PAUSED' && e.key === 'Enter') { // Reanudar con Enter en Pausa
            resumeGame();
            return;
        }

        if (gameState !== 'PLAYING') return; // A partir de aquí, solo si está jugando

        if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') moveLeft = true;
        else if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') moveRight = true;
        else if (e.key.toLowerCase() === 'p' || e.key === 'Escape') pauseGame();
    }

    function handleKeyUp(e) {
         // Solo necesitamos registrar keyup para teclas de movimiento
         if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') moveLeft = false;
         else if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') moveRight = false;
    }

    function handleMouseMove(e) {
         if (gameState !== 'PLAYING') return;
         const rect = canvas.getBoundingClientRect();
         mouseX = e.clientX - rect.left;
         basket.x = Math.max(0, Math.min(mouseX - basket.width / 2, canvasWidth - basket.width));
    }

    function handleTouchMove(e) {
        if (gameState !== 'PLAYING') return;
        e.preventDefault();
        if (e.touches.length > 0) { // Asegurarse que hay al menos un dedo
            const rect = canvas.getBoundingClientRect();
            const touchX = e.touches[0].clientX - rect.left;
            basket.x = Math.max(0, Math.min(touchX - basket.width / 2, canvasWidth - basket.width));
        }
    }
     function handleTouchStart(e) {
         // Podríamos usar touchstart para pausar/reanudar si no hay botón,
         // o simplemente para registrar la primera interacción si es necesario para sonidos.
         if (gameState !== 'PLAYING') return;
         // Opcional: Si tocan con más de un dedo, pausar?
         // if (e.touches.length > 1) pauseGame();
     }

    // --- 12. Inicialización del Juego ---
    console.log("Preparando inicialización final...");
    loadHighScore(); // *** CARGAR HIGH SCORE AL INICIAR ***
    resizeCanvas(); // Primera llamada para establecer tamaño
    preloadSounds(); // Precargar sonidos
    loadImages();
    setupInputListeners(); // Activar controles

    if (muteButton) {
        muteButton.addEventListener('click', toggleMute);
    } else {
        console.warn("Botón Mute no encontrado");
    }

    if (volumeSlider) {
        // Listener para cuando el valor del slider CAMBIA
        volumeSlider.addEventListener('input', () => {
            if(backgroundAudio) {
                 const newVolume = parseFloat(volumeSlider.value);
                 setMusicVolume(newVolume); // Aplica el volumen y actualiza estado/icono
                 // Si estaba muteado y suben volumen, desmutear implícitamente
                 if (isMuted && newVolume > 0) {
                     isMuted = false; // Actualizar estado lógico
                      // Si el juego está corriendo, la música debería empezar a sonar (o seguir)
                      if(gameState === 'PLAYING'){
                         playBackgroundMusic();
                      }
                 } else if (!isMuted && newVolume === 0) {
                     // Si bajan a 0, mutear implícitamente
                      isMuted = true; // Actualizar estado lógico
                      // El icono se actualiza dentro de setMusicVolume
                 }
            }
        });
    } else {
        console.warn("Slider de Volumen no encontrado");
    }

    // Añadir listeners a botones UI (con validación)
    window.addEventListener('blur', () => {
        // Pausar solo si el juego está corriendo activamente
        if (gameState === 'PLAYING') {
            console.log("Ventana perdió foco. Pausando juego automáticamente...");
            gamePausedByBlur = true; // Marcar que fue pausa automática
            pauseGame(); // Llama a tu función de pausa existente
        }
    });

    window.addEventListener('focus', () => {
        // Reanudar solo si estaba pausado Y fue por perder foco
        if (gameState === 'PAUSED' && gamePausedByBlur) {
            console.log("Ventana recuperó foco. Reanudando juego...");
            gamePausedByBlur = false; // Resetear la marca
            resumeGame(); // Llama a tu función de reanudar existente
        }
        // Si recupera foco pero no estaba pausado por blur, solo resetea la marca
        else if (gamePausedByBlur) {
             gamePausedByBlur = false;
        }
    });

    if (startButton) {
         startButton.addEventListener('click', () => {
             if (resourcesLoaded) {
                 startGame();
             } else {
                 console.warn("Intento de iniciar juego antes de cargar recursos.");
                 alert("El juego aún está cargando, ¡un segundo!"); // Opcional: feedback al usuario
             }
         });
     } else { console.warn("Botón Start no encontrado"); }

    if (pauseButton) pauseButton.addEventListener('click', pauseGame); else console.warn("Botón Pause no encontrado");
    if (resumeButton) resumeButton.addEventListener('click', resumeGame); else console.warn("Botón Resume no encontrado");
    if (restartButton) restartButton.addEventListener('click', startGame); else console.warn("Botón Restart no encontrado");
    showScreen('start-screen'); // Mostrar pantalla inicial
    setMusicVolume(parseFloat(volumeSlider ? volumeSlider.value : 0.2)); // Establecer volumen inicial

    showScreen('start-screen'); // Mostrar pantalla inicial
    setMusicVolume(parseFloat(volumeSlider ? volumeSlider.value : 0.2));
    console.log("Juego listo. Esperando acción del usuario.");


}); // --- Fin de DOMContentLoaded ---