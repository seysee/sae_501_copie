import React, { useEffect, useState } from "react";

export default function BalanceGame({ questionId, socket, sessionId }) {
    const radiusThreshold = 10;

    const [holePosition, setHolePosition] = useState(() => generateRandomPosition([]));
    const [ballPosition, setBallPosition] = useState(() => generateSpawnPosition(holePosition, []));
    const [obstacles, setObstacles] = useState(() => generateObstacles([holePosition, ballPosition]));
    const [successCount, setSuccessCount] = useState(0);
    const [lives, setLives] = useState(3);
    const [message, setMessage] = useState(null);
    const [isCompleted, setIsCompleted] = useState(false);

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
        } while (
            existingPositions.some((existing) => calculateDistance(position, existing) < radiusThreshold)
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
                type: Math.random() < 0.5 ? "wall" : "death",
            });
        }
        return obstacles;
    }

    useEffect(() => {
        const handleOrientation = (event) => {
            if (isCompleted || lives === 0) return;

            const beta = event.beta;
            const gamma = event.gamma;

            const newX = Math.min(Math.max(ballPosition.x + gamma / 15, 0), 100);
            const newY = Math.min(Math.max(ballPosition.y + beta / 15, 0), 100);

            const newBallPosition = { x: newX, y: newY };

            for (const obstacle of obstacles) {
                const distance = calculateDistance(newBallPosition, obstacle);
                if (distance < 5) {
                    if (obstacle.type === "wall") {
                        setMessage("Mur bloqué !");
                        return;
                    } else if (obstacle.type === "death") {
                        const remainingLives = lives - 1;
                        setLives(remainingLives);
                        setMessage(
                            remainingLives > 0
                                ? `Oh non, vous avez touché un piège ! Vies restantes : ${remainingLives}`
                                : "Vous avez perdu toutes vos vies !"
                        );

                        if (remainingLives === 0) {
                            setIsCompleted(true);
                            window.removeEventListener("deviceorientation", handleOrientation);
                            submitAnswer("failure");
                        } else {
                            resetGame();
                        }
                        return;
                    }
                }
            }

            setBallPosition(newBallPosition);

            const distanceToHole = calculateDistance(newBallPosition, holePosition);

            if (distanceToHole < 5) {
                const nextSuccessCount = successCount + 1;
                setSuccessCount(nextSuccessCount);
                setMessage(`Bravo ! ${nextSuccessCount}/3 réussites.`);

                if (nextSuccessCount === 3) {
                    setMessage("Action réussie !");
                    setIsCompleted(true);
                    window.removeEventListener("deviceorientation", handleOrientation);
                    submitAnswer("hole_success");
                } else {
                    resetGame();
                }
            }
        };

        if (window.DeviceOrientationEvent) {
            if (typeof DeviceOrientationEvent.requestPermission === "function") {
                DeviceOrientationEvent.requestPermission()
                    .then((permissionState) => {
                        if (permissionState === "granted") {
                            window.addEventListener("deviceorientation", handleOrientation);
                        } else {
                            setMessage("Permission refusée pour accéder au gyroscope.");
                        }
                    })
                    .catch(() => {
                        setMessage("Erreur lors de la demande de permission.");
                    });
            } else {
                window.addEventListener("deviceorientation", handleOrientation);
            }
        } else {
            setMessage("Votre appareil ne supporte pas DeviceOrientationEvent.");
        }

        return () => {
            window.removeEventListener("deviceorientation", handleOrientation);
        };
    }, [ballPosition, holePosition, isCompleted, obstacles, successCount, lives]);

    function resetGame() {
        const newHolePosition = generateRandomPosition([]);
        const newBallPosition = generateSpawnPosition(newHolePosition, []);
        const newObstacles = generateObstacles([newHolePosition, newBallPosition]);
        setBallPosition(newBallPosition);
        setHolePosition(newHolePosition);
        setObstacles(newObstacles);
    }

    function submitAnswer(answer) {
        socket.emit("submitAnswer", { sessionId: sessionId, questionId, answer });
    }

    return (
        <div className="flex flex-col items-center justify-center text-white">
            <h1 className="text-xl font-bold mb-4">Jeu d'équilibre</h1>
            <div className="flex justify-center items-center mb-2">
                {Array.from({ length: lives }).map((_, index) => (
                    <span key={index} className="mx-1 text-red-500 text-2xl">❤️</span>
                ))}
            </div>
            <div
                style={{
                    position: "relative",
                    width: "70vw",
                    height: "70vw",
                    maxWidth: "250px",
                    maxHeight: "250px",
                    border: "2px solid white",
                    borderRadius: "10px",
                    background: "black",
                }}
            >
                <div
                    style={{
                        position: "absolute",
                        width: "10%",
                        height: "10%",
                        borderRadius: "50%",
                        top: `${holePosition.y}%`,
                        left: `${holePosition.x}%`,
                        transform: "translate(-50%, -50%)",
                    }}
                >
                    🏁
                </div>
                {obstacles.map((obstacle) => (
                    <div
                        key={obstacle.id}
                        style={{
                            position: "absolute",
                            width: "8%",
                            height: "8%",
                            borderRadius: "50%",
                            top: `${obstacle.y}%`,
                            left: `${obstacle.x}%`,
                            transform: "translate(-50%, -50%)",
                        }}
                    >
                        {obstacle.type === "wall" ? "🧱" : "💀"}
                    </div>
                ))}
                <div
                    style={{
                        position: "absolute",
                        width: "8%",
                        height: "8%",
                        borderRadius: "50%",
                        top: `${ballPosition.y}%`,
                        left: `${ballPosition.x}%`,
                        transform: "translate(-50%, -50%)",
                    }}
                >
                    ⚽
                </div>
            </div>
            {message && <p className="text-green-500 text-sm mt-4">{message}</p>}
            {/* Bouton Skip */}
            <button
                onClick={() => submitAnswer("hole_success")}
                className="mt-4 px-6 py-3 bg-blue-500 hover:bg-blue-700 text-white font-bold rounded-lg"
            >
                Skip
            </button>
        </div>
    );

}
