export default async function simonGame({
                                            containerId,
                                            questionId,
                                            sessionId,
                                            onComplete,
                                            socket
                                        }) {
    const container = document.getElementById(containerId);
    if (!container) {
        console.error("Impossible de trouver le conteneur pour le jeu Simon.");
        return;
    }

    const colors = ["green", "red", "blue", "yellow"];
    const sounds = {
        green: new Audio("https://s3.amazonaws.com/freecodecamp/simonSound1.mp3"),
        red: new Audio("https://s3.amazonaws.com/freecodecamp/simonSound2.mp3"),
        blue: new Audio("https://s3.amazonaws.com/freecodecamp/simonSound3.mp3"),
        yellow: new Audio("https://s3.amazonaws.com/freecodecamp/simonSound4.mp3"),
    };

    let sequence = [];
    let playerSequence = [];
    let isGameActive = false;
    let isInputLocked = false; // Pour verrouiller l'entrée tant qu'une action est en cours

    // Interface HTML (SVG)
    container.innerHTML = `
        <div id="simon-game" style="position: relative; width: 300px; height: 300px; margin: auto;">
            <div id="simon-svg">
                <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 591 585" style="width: 100%; height: auto;">
                    <path id="green" d="M157,275c0,0,6.5-100,128.5-126V12c0,0-245.5,2.5-266.5,263C19,275,134,279,157,275z" fill="#00A74A" />
                    <path id="red" d="M308.5,12c0,0,238.5,0,269.5,264.778H436.5c0,0-9-113.889-128-129.278V12z" fill="#F82A15" />
                    <path id="blue" d="M308.5,428c0,0,115-16,127-128.5H578c0,0-15.5,251-269.5,268V428z" fill="#0297EB" />
                    <path id="yellow" d="M156.5,299.5c0,0,21,113.5,129,129.5v138.5c0,0-245.5-11.5-266.5-268H156.5z" fill="#FEF735" />
                </svg>
            </div>
            <div id="count-display" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 2rem; color: white;">--</div>
        </div>
    `;

    const colorElements = {
        green: container.querySelector("#green"),
        red: container.querySelector("#red"),
        blue: container.querySelector("#blue"),
        yellow: container.querySelector("#yellow"),
    };
    const countDisplay = container.querySelector("#count-display");

    Object.keys(colorElements).forEach((color) => {
        colorElements[color].addEventListener("click", () => handlePlayerInput(color));
    });

    const startGame = async () => {
        sequence = [];
        playerSequence = [];
        isGameActive = false;

        countDisplay.textContent = "--";

        // Attendre quelques secondes avant de commencer la première séquence
        await new Promise((resolve) => setTimeout(resolve, 2000));
        addColorToSequence();
        playSequence();
    };

    const addColorToSequence = () => {
        const randomColor = colors[Math.floor(Math.random() * colors.length)];
        sequence.push(randomColor);
    };

    const playSequence = async () => {
        isGameActive = false;
        countDisplay.textContent = sequence.length < 10 ? `0${sequence.length}` : sequence.length;

        for (const color of sequence) {
            await highlightColor(color);
            await new Promise((resolve) => setTimeout(resolve, 500));
        }

        // Le joueur peut immédiatement commencer à jouer
        isGameActive = true;
        playerSequence = [];
    };

    const highlightColor = (color) => {
        return new Promise((resolve) => {
            const element = colorElements[color];
            const originalFill = element.getAttribute("fill");

            element.setAttribute("fill", lightenColor(originalFill, 30));
            sounds[color].currentTime = 0;
            sounds[color].play();

            setTimeout(() => {
                element.setAttribute("fill", originalFill);
                resolve();
            }, 500);
        });
    };

    const handlePlayerInput = async (color) => {
        if (!isGameActive || isInputLocked) return;

        isInputLocked = true; // Verrouiller l'entrée
        playerSequence.push(color);
        await highlightColor(color);

        if (playerSequence[playerSequence.length - 1] !== sequence[playerSequence.length - 1]) {
            countDisplay.textContent = "!!";
            await new Promise((resolve) => setTimeout(resolve, 1000));
            isGameActive = false;
            onGameFailure();
            return;
        }

        if (playerSequence.length === sequence.length) {
            isGameActive = false; // Le joueur ne peut pas cliquer pendant la latence
            await new Promise((resolve) => setTimeout(resolve, 1000)); // Latence avant le prochain round

            if (sequence.length === 5) {
                onGameSuccess();
            } else {
                addColorToSequence();
                playSequence();
            }
        }

        isInputLocked = false; // Déverrouiller l'entrée après le traitement
    };

    const onGameSuccess = () => {
        countDisplay.textContent = "WIN!";
        isGameActive = false;

        if (socket) {
            socket.emit("submitAnswer", {
                sessionId,
                questionId,
                answer: "simon_success",
            });
        }

        onComplete({ correct: true, message: "Vous avez complété le jeu Simon avec succès !" });
    };

    const onGameFailure = () => {
        countDisplay.textContent = "FAIL";
        isGameActive = false;

        if (socket) {
            socket.emit("submitAnswer", {
                sessionId,
                questionId,
                answer: "simon_failure",
            });
        }

        onComplete({ correct: false, message: "Échec du jeu Simon. Réessayez !" });
    };

    const lightenColor = (color, percent) => {
        const num = parseInt(color.slice(1), 16);
        const amt = Math.round(2.55 * percent);
        const R = (num >> 16) + amt;
        const G = ((num >> 8) & 0x00ff) + amt;
        const B = (num & 0x0000ff) + amt;

        return `#${(
            0x1000000 +
            (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
            (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
            (B < 255 ? (B < 1 ? 0 : B) : 255)
        )
            .toString(16)
            .slice(1)
            .toUpperCase()}`;
    };

    // Lancer le jeu
    startGame();
}
