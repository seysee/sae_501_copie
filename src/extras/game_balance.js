import axios from "axios";

export default async function gameBalance({ containerId, questionId, sessionId, onComplete }) {
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
        return Math.sqrt(Math.pow(pos1.x - pos2.x, 2) + Math.pow(pos1.y - pos2.y, 2));
    }

    function generateRandomPosition(existingPositions) {
        let position;
        do {
            position = {
                x: Math.random() * 80 + 10,
                y: Math.random() * 80 + 10,
            };
        } while (existingPositions.some((existing) => calculateDistance(position, existing) < radiusThreshold));
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
                type: Math.random() < 0.5 ? "wall" : "death",
            });
        }
        return obstacles;
    }

    function renderGame() {
        container.innerHTML = '';

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
        `;
        hole.innerHTML = "🏁";
        container.appendChild(hole);

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
            `;
            obstacleElement.innerHTML = obstacle.type === "wall" ? "🧱" : "💀";
            container.appendChild(obstacleElement);
        });

        const ball = document.createElement("div");
        ball.style = `
            position: absolute;
            width: 8%;
            height: 8%;
            border-radius: 50%;
            top: ${ballPosition.y}%;
            left: ${ballPosition.x}%;
            transform: translate(-50%, -50%);
        `;
        ball.innerHTML = "⚽";
        container.appendChild(ball);

        const status = document.createElement("p");
        status.style = "color: white; text-align: center; margin-top: 20px;";
        status.innerHTML = `Vies : ${lives} | Succès : ${successCount}/3`;
        container.appendChild(status);
    }

    async function handleGameEnd(success) {
        try {
            const response = await axios.post('/api/question/answer', {
                id: questionId,
                answer: success ? "success" : "failure",
            });

            // Envoie également via le socket
            if (window.socket) {
                window.socket.emit("submitAnswer", {
                    sessionId,
                    questionId,
                    answer: success ? "success" : "failure",
                });
            }

            if (success) {
                onComplete({ correct: true, message: "Action réussie !" });
            } else {
                onComplete({ correct: false, message: "Échec de l'action, essayez encore." });
            }

            console.log(response.data.message);
            onComplete(response.data); // Envoie les résultats au composant parent
        } catch (error) {
            console.error("Erreur lors de l'envoi de la réponse :", error);
        }
    }

    function handleOrientation(event) {
        if (lives === 0 || successCount === 3) return;

        const beta = event.beta;
        const gamma = event.gamma;

        const newX = Math.min(Math.max(ballPosition.x + gamma / 15, 0), 100);
        const newY = Math.min(Math.max(ballPosition.y + beta / 15, 0), 100);

        const newBallPosition = { x: newX, y: newY };

        for (const obstacle of obstacles) {
            const distance = calculateDistance(newBallPosition, obstacle);
            if (distance < 5) {
                if (obstacle.type === "wall") {
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

    renderGame();

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
