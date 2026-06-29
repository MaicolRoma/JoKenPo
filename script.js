// Opciones disponibles del juego. Cada una sabe a cuál jugada le gana.
const choices = {
    rock: { icon: '👊', label: 'Piedra', winsAgainst: 'scissors' },
    paper: { icon: '🖐', label: 'Papel', winsAgainst: 'rock' },
    scissors: { icon: '✌', label: 'Tijera', winsAgainst: 'paper' },
};

// Estado central de la partida. Desde aquí se controlan puntos, rondas y bloqueos.
const state = {
    scoreHuman: 0,
    scoreMachine: 0,
    round: 0,
    streak: 0,
    targetScore: 5,
    locked: false,
    sound: true,
};

// Elementos del HTML que se actualizan durante la partida.
const result = document.querySelector('.result');
const humanScore = document.querySelector('#human-score');
const machineScore = document.querySelector('#machine-score');
const movePlayer = document.querySelector('#playerMove');
const moveMachine = document.querySelector('#machineMove');
const roundCount = document.querySelector('#round-count');
const streakCount = document.querySelector('#streak-count');
const targetScore = document.querySelector('#target-score');
const battleSubtitle = document.querySelector('#battle-subtitle');
const historyList = document.querySelector('#history');
const resetButton = document.querySelector('#reset-game');
const soundButton = document.querySelector('#toggle-sound');
const humanButtons = document.querySelectorAll('.container-human .container-buttons button');
const machineButtons = document.querySelectorAll('.container-machine .container-buttons button');

targetScore.textContent = state.targetScore;

// Pequeña pausa reutilizable para sincronizar animaciones con la lógica.
const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

// Entrada principal del jugador: prepara la animación, espera y resuelve la ronda.
const playHuman = async (humanChoice) => {
    if (state.locked) return;

    state.locked = true;
    clearRoundClasses();
    setButtonsDisabled(true);
    result.textContent = 'Jo... Ken... Pô!';
    battleSubtitle.textContent = 'La máquina está pensando...';
    movePlayer.textContent = choices[humanChoice].icon;
    moveMachine.textContent = '❔';
    movePlayer.classList.add('throwing-left');
    moveMachine.classList.add('throwing-right');
    markMachineChoice(null);
    playTone(220, 0.08);

    await wait(650);

    const machineChoice = playMachine();
    const outcome = getOutcome(humanChoice, machineChoice);
    playTheGame(humanChoice, machineChoice, outcome);

    await wait(500);

    if (!isGameOver()) {
        state.locked = false;
        setButtonsDisabled(false);
    }
};

// La máquina elige una jugada al azar entre piedra, papel y tijera.
const playMachine = () => {
    const choiceKeys = Object.keys(choices);
    return choiceKeys[Math.floor(Math.random() * choiceKeys.length)];
};

// Devuelve el resultado desde el punto de vista del jugador.
function getOutcome(human, machine) {
    if (human === machine) return 'draw';
    return choices[human].winsAgainst === machine ? 'win' : 'lose';
}

// Aplica las reglas de la ronda: suma puntos, actualiza textos, efectos e historial.
function playTheGame(human, machine, outcome) {
    state.round++;
    moveMachine.textContent = choices[machine].icon;
    markMachineChoice(machine);
    updateMoveLabels(human, machine);

    if (outcome === 'draw') {
        state.streak = 0;
        result.textContent = 'Empate técnico';
        battleSubtitle.textContent = `${choices[human].label} contra ${choices[machine].label}. Nadie suma.`;
        document.body.classList.add('round-draw');
        playTone(180, 0.08);
    } else if (outcome === 'win') {
        state.scoreHuman++;
        state.streak++;
        result.textContent = state.streak >= 3 ? 'Combo salvaje!' : 'Ganaste la ronda!';
        battleSubtitle.textContent = `${choices[human].label} vence a ${choices[machine].label}.`;
        humanScore.textContent = state.scoreHuman;
        setShadowScoreHuman();
        document.body.classList.add('round-win');
        playTone(560, 0.1);
        launchConfetti(state.streak >= 3 ? 22 : 12);
    } else {
        state.scoreMachine++;
        state.streak = 0;
        result.textContent = 'La máquina puntuó';
        battleSubtitle.textContent = `${choices[machine].label} vence a ${choices[human].label}.`;
        machineScore.textContent = state.scoreMachine;
        setShadowScoreMachine();
        document.body.classList.add('round-lose');
        playTone(110, 0.12);
    }

    updateHud();
    addHistory(human, machine, outcome);

    if (isGameOver()) {
        finishGame();
    }
}

// Mejora accesibilidad: describe la jugada mostrada para lectores de pantalla.
function updateMoveLabels(human, machine) {
    movePlayer.setAttribute('aria-label', `Jugador eligió ${choices[human].label}`);
    moveMachine.setAttribute('aria-label', `Máquina eligió ${choices[machine].label}`);
}

// Refresca los indicadores pequeños del centro: ronda actual y racha.
function updateHud() {
    roundCount.textContent = state.round;
    streakCount.textContent = state.streak;
}

// Agrega la ronda más reciente arriba y conserva solo las últimas cinco.
function addHistory(human, machine, outcome) {
    const item = document.createElement('li');
    const label = outcome === 'win' ? 'Victoria' : outcome === 'lose' ? 'Derrota' : 'Empate';
    item.className = outcome;
    item.innerHTML = `<span>${state.round}</span><strong>${choices[human].icon} vs ${choices[machine].icon}</strong><em>${label}</em>`;
    historyList.prepend(item);

    if (historyList.children.length > 5) {
        historyList.lastElementChild.remove();
    }
}

// La partida termina cuando alguien llega a la meta configurada.
function isGameOver() {
    return state.scoreHuman >= state.targetScore || state.scoreMachine >= state.targetScore;
}

// Bloquea nuevas jugadas y muestra el mensaje final de victoria o derrota.
function finishGame() {
    const humanWon = state.scoreHuman > state.scoreMachine;
    result.textContent = humanWon ? 'Campeón de JokenPô!' : 'La máquina ganó la partida';
    battleSubtitle.textContent = humanWon ? 'Perfecto. Reinicia y defiende el título.' : 'Toca revancha: el botón está listo.';
    document.body.classList.add(humanWon ? 'game-won' : 'game-lost');
    setButtonsDisabled(true);

    if (humanWon) {
        launchConfetti(45);
        playTone(740, 0.16);
        setTimeout(() => playTone(920, 0.16), 160);
    }
}

// Devuelve todo al estado inicial para jugar una revancha.
function resetGame() {
    state.scoreHuman = 0;
    state.scoreMachine = 0;
    state.round = 0;
    state.streak = 0;
    state.locked = false;

    humanScore.textContent = '0';
    machineScore.textContent = '0';
    movePlayer.textContent = '?';
    moveMachine.textContent = '?';
    result.textContent = 'Elige tu jugada';
    battleSubtitle.textContent = 'Gana 5 puntos antes que la máquina.';
    historyList.innerHTML = '';
    updateHud();
    clearRoundClasses();
    markMachineChoice(null);
    setButtonsDisabled(false);
}

// Evita clics repetidos mientras la ronda todavía está animándose.
function setButtonsDisabled(disabled) {
    humanButtons.forEach((button) => {
        button.disabled = disabled;
    });
}

// Resalta visualmente la opción que eligió la máquina.
function markMachineChoice(choice) {
    machineButtons.forEach((button) => {
        button.classList.toggle('selected-machine', button.id === `machine-${choice}`);
    });
}

// Limpia clases visuales antes de comenzar una nueva ronda o reiniciar.
function clearRoundClasses() {
    document.body.classList.remove('round-win', 'round-lose', 'round-draw', 'game-won', 'game-lost');
    movePlayer.classList.remove('throwing-left');
    moveMachine.classList.remove('throwing-right');
}

// Efecto de brillo cuando el jugador suma punto.
function setShadowScoreHuman() {
    humanScore.classList.add('shadowBlue');
    setTimeout(() => {
        humanScore.classList.remove('shadowBlue');
    }, 800);
}

// Efecto de brillo cuando la máquina suma punto.
function setShadowScoreMachine() {
    machineScore.classList.add('shadowRed');
    setTimeout(() => {
        machineScore.classList.remove('shadowRed');
    }, 800);
}

// Crea partículas temporales para celebrar victorias y combos.
function launchConfetti(amount) {
    const confettiLayer = document.createElement('div');
    confettiLayer.className = 'confetti-layer';
    document.body.appendChild(confettiLayer);

    for (let index = 0; index < amount; index++) {
        const particle = document.createElement('span');
        particle.style.left = `${Math.random() * 100}%`;
        particle.style.animationDelay = `${Math.random() * 0.25}s`;
        particle.style.setProperty('--spin', `${Math.random() * 540 + 180}deg`);
        particle.style.setProperty('--fall', `${Math.random() * 35 + 55}vh`);
        confettiLayer.appendChild(particle);
    }

    setTimeout(() => confettiLayer.remove(), 1300);
}

// Genera sonidos simples con Web Audio, sin depender de archivos externos.
function playTone(frequency, duration) {
    const AudioEngine = window.AudioContext || window.webkitAudioContext;
    if (!state.sound || !AudioEngine) return;

    const audioContext = new AudioEngine();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();

    oscillator.frequency.value = frequency;
    oscillator.type = 'triangle';
    gain.gain.setValueAtTime(0.05, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);
    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + duration);
}

// Controles de la interfaz.
resetButton.addEventListener('click', resetGame);

soundButton.addEventListener('click', () => {
    state.sound = !state.sound;
    soundButton.textContent = state.sound ? 'Sonido ON' : 'Sonido OFF';
});

// Atajos de teclado: R/P/T o 1/2/3 para jugar más rápido.
document.addEventListener('keydown', (event) => {
    const keyMap = {
        r: 'rock',
        p: 'paper',
        t: 'scissors',
        1: 'rock',
        2: 'paper',
        3: 'scissors',
    };

    const choice = keyMap[event.key.toLowerCase()];
    if (choice) playHuman(choice);
});

// Hace que los onclick del HTML puedan encontrar la función playHuman.
window.playHuman = playHuman;
