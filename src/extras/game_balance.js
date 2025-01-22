import axios from "axios";

/**
 * Jeu d'équilibre avec vies (affichées en coeurs) et succès.
 */
export default async function gameBalance({
                                              containerId,
                                              questionId,
                                              sessionId,
                                              onComplete,
                                              socket
                                          }) {
    const radiusThreshold = 10;
    const container = document.getElementById(containerId);

    if (!container) {
        console.error("Impossible de trouver le conteneur pour le jeu d'équilibre.");
        return;
    }

    let holePosition = generateRandomPosition([]);
    let ballPosition = generateSpawnPosition(holePosition, []);
    let obstacles = generateObstacles([holePosition, ballPosition]);
    let successCount = 0;
    let lives = 3;

    function calculateDistance(pos1, pos2) {
        return Math.sqrt(
            Math.pow(pos1.x - pos2.x, 2) + Math.pow(pos1.y - pos2.y, 2)
        );
    }

    function generateRandomPosition(existingPositions) {
        let position;
        do {
            position = {
                x: Math.random() * 80 + 10,
                y: Math.random() * 80 + 10
            };
        } while (
            existingPositions.some(
                (existing) => calculateDistance(position, existing) < radiusThreshold
            )
            );
        return position;
    }

    function generateSpawnPosition(holePosition, existingPositions) {
        let position;
        do {
            position = generateRandomPosition(existingPositions);
        } while (calculateDistance(position, holePosition) < radiusThreshold * 2);
        return position;
    }

    function generateObstacles(existingPositions) {
        const obstacleCount = 5;
        const obstacles = [];
        for (let i = 0; i < obstacleCount; i++) {
            const position = generateRandomPosition([...existingPositions, ...obstacles]);
            obstacles.push({
                id: i,
                x: position.x,
                y: position.y,
                type: Math.random() < 0.5 ? "wall" : "death"
            });
        }
        return obstacles;
    }

    function renderGame() {
        container.innerHTML = "";

        // Trou (arrivée)
        const hole = document.createElement("div");
        hole.style = `
      position: absolute;
      width: 40px;
      height: 40px;
      display: flex;
      justify-content: center;
      align-items: center;
      border-radius: 50%;
      top: ${holePosition.y}%;
      left: ${holePosition.x}%;
      transform: translate(-50%, -50%);
      background: green;
      z-index: 1;
    `;
        hole.innerHTML = "🏁";
        container.appendChild(hole);

        // Obstacles
        obstacles.forEach((obstacle) => {
            const obstacleElement = document.createElement("div");
            obstacleElement.style = `
        position: absolute;
        width: 40px;
        height: 40px;
        display: flex;
        justify-content: center;
        align-items: center;
        border-radius: 50%;
        top: ${obstacle.y}%;
        left: ${obstacle.x}%;
        transform: translate(-50%, -50%);
        background: ${obstacle.type === "wall" ? "gray" : "red"};
        z-index: 2;
      `;
            obstacleElement.innerHTML = obstacle.type === "wall" ? "🧱" : "💀";
            container.appendChild(obstacleElement);
        });

        // Balle
        const ball = document.createElement("div");
        ball.style = `
      position: absolute;
      width: 40px;
      height: 40px;
      display: flex;
      justify-content: center;
      align-items: center;
      border-radius: 50%;
      top: ${ballPosition.y}%;
      left: ${ballPosition.x}%;
      transform: translate(-50%, -50%);
      z-index: 3;
      font-size: 24px;
    `;
        ball.innerHTML = "⚽";
        container.appendChild(ball);

        // Vies + succès
        const uiWrapper = document.createElement("div");
        uiWrapper.style = `
      position: absolute;
      top: 10px;
      left: 50%;
      transform: translateX(-50%);
      color: white;
      z-index: 999;
      font-size: 20px;
      pointer-events: none; /* pour que le doigt ne bloque pas */
    `;
        const hearts = Array(lives).fill("❤️").join(" ");
        uiWrapper.innerHTML = `${hearts} &nbsp; | &nbsp; Succès : ${successCount}/3`;
        container.appendChild(uiWrapper);
    }

    async function handleGameEnd(success) {
        try {
            const response = await axios.post("/api/question/answer", {
                id: questionId,
                answer: success ? "success" : "failure"
            });

            // Emission socket
            if (socket) {
                socket.emit("submitAnswer", {
                    sessionId,
                    questionId,
                    answer: success ? "hole_success" : "hole_failure"
                });
            }

            if (success) {
                onComplete({ correct: true, message: "Action réussie !" });
            } else {
                onComplete({ correct: false, message: "Échec de l'action, essayez encore." });
            }

            console.log(response.data.message);
            onComplete(response.data);
        } catch (error) {
            console.error("Erreur lors de l'envoi de la réponse :", error);
        }
    }

    function handleOrientation(event) {
        if (lives === 0 || successCount === 3) return;

        const beta = event.beta;
        const gamma = event.gamma;

        // Ajuster la vitesse / sensibilité
        const newX = Math.min(Math.max(ballPosition.x + gamma / 15, 0), 100);
        const newY = Math.min(Math.max(ballPosition.y + beta / 15, 0), 100);

        const newBallPosition = { x: newX, y: newY };

        // Collision obstacles
        for (const obstacle of obstacles) {
            const distance = calculateDistance(newBallPosition, obstacle);
            if (distance < 5) {
                if (obstacle.type === "wall") {
                    // simple mur => on bloque le déplacement
                    return;
                } else if (obstacle.type === "death") {
                    lives--;
                    renderGame();
                    if (lives === 0) {
                        window.removeEventListener("deviceorientation", handleOrientation);
                        handleGameEnd(false);
                        return;
                    } else {
                        resetGame();
                        return;
                    }
                }
            }
        }

        ballPosition = newBallPosition;

        // Collision trou (arrivée)
        const distanceToHole = calculateDistance(newBallPosition, holePosition);
        if (distanceToHole < 5) {
            successCount++;
            renderGame();
            if (successCount === 3) {
                window.removeEventListener("deviceorientation", handleOrientation);
                handleGameEnd(true);
            } else {
                resetGame();
            }
        }

        renderGame();
    }

    function resetGame() {
        holePosition = generateRandomPosition([]);
        ballPosition = generateSpawnPosition(holePosition, []);
        obstacles = generateObstacles([holePosition, ballPosition]);
        renderGame();
    }

    // Initial rendering
    renderGame();

    // Gérer gyroscope
    if (window.DeviceOrientationEvent) {
        if (typeof DeviceOrientationEvent.requestPermission === "function") {
            DeviceOrientationEvent.requestPermission()
                .then((permissionState) => {
                    if (permissionState === "granted") {
                        window.addEventListener("deviceorientation", handleOrientation);
                    } else {
                        handleGameEnd(false);
                    }
                })
                .catch(() => {
                    handleGameEnd(false);
                });
        } else {
            window.addEventListener("deviceorientation", handleOrientation);
        }
    } else {
        await handleGameEnd(false);
    }
}
