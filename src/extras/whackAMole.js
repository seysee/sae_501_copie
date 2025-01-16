export default async function whackAMoleGame({ containerId, questionId, sessionId, onComplete, socket }) {
    const container = document.getElementById(containerId);

    if (!container) {
        console.error("Impossible de trouver le conteneur pour le jeu de la taupe.");
        return;
    }

    // Récupération et parsing des assets
    let moleImageUrl = null;
    let trapImageUrl = null;

    try {
        const assets = JSON.parse(container.dataset.assets);
        moleImageUrl = assets[0]; // Première image : taupe
        trapImageUrl = assets[1]; // Deuxième image : piège (chat)
    } catch (error) {
        console.error("Erreur lors de la récupération des assets :", error);
        return;
    }

    if (!moleImageUrl || !trapImageUrl) {
        console.error("Les images nécessaires (taupe et piège) sont introuvables dans les assets.");
        return;
    }

    const holes = 9; // Nombre de trous
    const goal = 15; // Points nécessaires pour gagner
    const maxLives = 3; // Nombre de vies initiales
    let lives = maxLives;
    let score = 0;
    let activeMoles = new Set(); // Ensemble des taupes actives
    let activeTraps = new Set(); // Ensemble des pièges actifs
    let gameInterval = null;

    // Ajout des styles CSS directement dans le fichier
    const style = document.createElement("style");
    style.innerHTML = `
        .hole {
            width: 80px;
            height: 80px;
            background-color: #4b5563; /* Gris */
            border-radius: 50%;
            position: relative;
            display: inline-block;
            overflow: hidden;
        }

        .mole, .trap {
            width: 50px;
            height: 50px;
            position: absolute;
            bottom: -50px; /* Position initiale hors du trou */
            left: 50%;
            transform: translateX(-50%);
            transition: bottom 0.3s ease-in-out;
        }

        .mole.active, .trap.active {
            bottom: 10px; /* L'objet sort du trou */
        }

        .mole {
            background-image: url('${moleImageUrl}');
            background-size: cover;
        }

        .trap {
            background-image: url('${trapImageUrl}');
            background-size: cover;
        }

        .grid-container {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 20px;
            justify-items: center;
            margin-top: 20px;
        }

        .score {
            font-size: 1.5rem;
            color: white;
            margin-bottom: 10px;
        }

        .lives {
            font-size: 1.5rem;
            color: red;
            display: flex;
            justify-content: center;
            gap: 5px;
            margin-bottom: 10px;
        }
    `;
    document.head.appendChild(style);

    // Met à jour l'interface utilisateur avec le score et les cœurs
    const updateUI = () => {
        const scoreElement = document.getElementById("mole-score");
        const livesContainer = document.getElementById("mole-lives");

        if (scoreElement) {
            scoreElement.innerText = `Score : ${score} / ${goal}`;
        }

        if (livesContainer) {
            livesContainer.innerHTML = ""; // Vide le conteneur des vies

            for (let i = 0; i < maxLives; i++) {
                livesContainer.innerHTML += i < lives ? "❤️" : "🖤";
            }
        }
    };

    // Gestion de la réussite
    const handleSuccess = () => {
        clearInterval(gameInterval); // Arrête le jeu
        if (socket) {
            socket.emit("submitAnswer", {
                sessionId,
                questionId,
                answer: "whack_a_mole_success",
            });
        }

        onComplete({ correct: true, message: "Vous avez gagné au jeu de la taupe !" });
    };

    // Gestion de la défaite
    const handleGameOver = () => {
        if (socket) {
            socket.emit("submitAnswer", {
                sessionId,
                questionId,
                answer: "failure",
            });
        }

        onComplete({ correct: false, message: "Vous avez perdu toutes vos vies !" });
    };

    // Gestion des clics
    const handleClick = (holeId, type) => {
        if (type === "mole" && activeMoles.has(holeId)) {
            score++;
            activeMoles.delete(holeId);
            document.getElementById(`hole-${holeId}`).querySelector(".mole").classList.remove("active");

            if (score >= goal) {
                handleSuccess();
            }
        } else if (type === "trap" && activeTraps.has(holeId)) {
            lives--;
            activeTraps.delete(holeId);
            document.getElementById(`hole-${holeId}`).querySelector(".trap").classList.remove("active");

            if (lives <= 0) {
                handleGameOver();
            }
        }

        updateUI();
    };

    // Affiche une taupe ou un piège dans un trou aléatoire
    const showObject = (holeId, type) => {
        const element = document.getElementById(`hole-${holeId}`).querySelector(`.${type}`);
        element.classList.add("active");

        if (type === "mole") {
            activeMoles.add(holeId);
        } else if (type === "trap") {
            activeTraps.add(holeId);
        }

        // Retire l'objet après un délai
        setTimeout(() => {
            element.classList.remove("active");
            if (type === "mole") {
                activeMoles.delete(holeId);
            } else if (type === "trap") {
                activeTraps.delete(holeId);
            }
        }, 1000);
    };

    // Affiche des taupes et des pièges aléatoires
    const showRandomObjects = () => {
        const randomMoles = Math.floor(Math.random() * 3) + 1; // 1 à 3 taupes
        const randomTraps = Math.random() < 0.3 ? 1 : 0; // 30% de chance d'avoir un piège

        const availableHoles = Array.from({ length: holes }, (_, index) => index);

        // Taupes
        for (let i = 0; i < randomMoles; i++) {
            const randomIndex = Math.floor(Math.random() * availableHoles.length);
            const holeId = availableHoles.splice(randomIndex, 1)[0];
            showObject(holeId, "mole");
        }

        // Pièges
        for (let i = 0; i < randomTraps; i++) {
            const randomIndex = Math.floor(Math.random() * availableHoles.length);
            const holeId = availableHoles.splice(randomIndex, 1)[0];
            showObject(holeId, "trap");
        }
    };

    // Initialisation de l'interface utilisateur
    const initializeUI = () => {
        container.innerHTML = `
            <div class="text-center">
                <p id="mole-score" class="score">Score : 0 / ${goal}</p>
                <div id="mole-lives" class="lives"></div>
            </div>
            <div class="grid-container">
                ${Array.from({ length: holes })
            .map(
                (_, index) =>
                    `<div id="hole-${index}" class="hole">
                                <div class="mole"></div>
                                <div class="trap"></div>
                            </div>`
            )
            .join("")}
            </div>
        `;

        // Ajouter les gestionnaires de clics
        for (let i = 0; i < holes; i++) {
            const holeElement = document.getElementById(`hole-${i}`);
            holeElement.addEventListener("click", (e) => {
                if (e.target.classList.contains("mole")) {
                    handleClick(i, "mole");
                } else if (e.target.classList.contains("trap")) {
                    handleClick(i, "trap");
                }
            });
        }

        updateUI();
    };

    // Démarrer le jeu
    const startGame = () => {
        gameInterval = setInterval(showRandomObjects, 1000); // Taupes et pièges toutes les secondes
    };

    initializeUI();
    startGame();
}
