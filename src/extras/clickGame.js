export default async function colorReactionGame({
                                                    containerId,
                                                    onComplete,
                                                    socket,
                                                    sessionId,
                                                    questionId,
                                                }) {
    const container = document.getElementById(containerId);
    if (!container) {
        console.error("Impossible de trouver le conteneur pour le jeu.");
        return;
    }

    const colors = [
        "green", "blue", "yellow", "red", "purple", "orange", "pink",
        "violet", "brown", "cyan", "gray", "white", "black", "gold",
        "silver", "beige", "magenta", "teal", "lime", "indigo"
    ];

    const colorNames = [
        "green", "blue", "yellow", "red", "purple", "orange", "pink",
        "violet", "brown", "cyan", "gray", "white", "black", "gold",
        "silver", "beige", "magenta", "teal", "lime", "indigo"
    ];

    let gameTimer;
    let colorTimer;
    let currentColor;
    let currentColorName;
    let isGameActive = true;
    let redAppearances = 0;
    let wordsAndColors = [];
    let redClicked = false;

    container.innerHTML = `
        <div id="game-container" style="text-align: center; margin-top: 20px; font-family: 'Amatic SC', cursive;">
            <div id="color-display" style="font-size: 3rem; color: black; padding: 20px;">
                -- 
            </div>
            <div id="status" style="font-size: 1.5rem; color: black;"></div>
            <button id="action-button" style="font-size: 1.5rem; padding: 10px 20px; margin-top: 20px; border: 4px solid #ffffff; border-radius: 8px;">
                Cliquez lorsque la couleur est rouge !
            </button>
        </div>
        <link href="https://fonts.googleapis.com/css2?family=Amatic+SC&display=swap" rel="stylesheet">
    `;

    const colorDisplay = container.querySelector("#color-display");
    const statusDisplay = container.querySelector("#status");
    const actionButton = container.querySelector("#action-button");

    const handleButtonClick = () => {
        if (!isGameActive || redClicked) return;

        if (currentColor === "red") {
            redClicked = true;
            onGameSuccess();
        } else {
            onGameFailure();
        }
    };

    actionButton.addEventListener("click", handleButtonClick);

    const startGame = async () => {
        isGameActive = true;
        redAppearances = 0;
        redClicked = false;
        wordsAndColors = [];
        statusDisplay.textContent = "";
        colorDisplay.textContent = "--";

        gameTimer = setTimeout(() => {
            onGameFailure();
        }, 10000);

        generateWordsAndColors();
        startColorCycle();
    };

    const generateWordsAndColors = () => {
        let redCount = 0;

        // Assurer qu'il y a au moins 2 apparitions de la couleur rouge
        while (redCount < 2) {
            wordsAndColors = [];
            redCount = 0;
            for (let i = 0; i < 20; i++) {
                const randomColor = colors[Math.floor(Math.random() * colors.length)];
                const randomWord = colorNames[Math.floor(Math.random() * colorNames.length)];
                wordsAndColors.push({ word: randomWord, color: randomColor });

                if (randomColor === "red") {
                    redCount++;
                }
            }
        }
    };

    const startColorCycle = () => {
        let index = 0;

        colorTimer = setInterval(() => {
            if (!isGameActive || index >= wordsAndColors.length) {
                clearInterval(colorTimer);
                return;
            }

            currentColorName = wordsAndColors[index].word;
            currentColor = wordsAndColors[index].color;

            colorDisplay.textContent = currentColorName;
            colorDisplay.style.color = currentColor;

            if (currentColor === "red") {
                redAppearances++;
            }

            if (redAppearances >= 2 && !redClicked) {
                // Si la couleur rouge apparaît 2 fois, on arrête le cycle
                clearInterval(colorTimer);
            }

            index++;
        }, 500);
    };

    const onGameSuccess = () => {
        isGameActive = false;
        clearInterval(colorTimer);
        clearTimeout(gameTimer);
        colorDisplay.textContent = "Gagné!";
        colorDisplay.style.color = "green";
        statusDisplay.textContent = "Vous avez cliqué au bon moment !";
        actionButton.disabled = true;

        if (socket) {
            socket.emit("submitAnswer", {
                sessionId,
                questionId,
                answer: "clic_success"
            });
        }

        onComplete({ correct: true, message: "Gagné!" });
    };

    const onGameFailure = () => {
        isGameActive = false;
        clearInterval(colorTimer);
        clearTimeout(gameTimer);
        colorDisplay.textContent = "Perdu!";
        colorDisplay.style.color = "red";
        statusDisplay.textContent = "La couleur rouge n'est pas apparue au moment voulu !";
        actionButton.disabled = true;

        if (socket) {
            socket.emit("submitAnswer", {
                sessionId,
                questionId,
                answer: "clic_failure"
            });
        }

        onComplete({ correct: false, message: "Perdu!" });
    };

    startGame();
}
