import React, { useEffect, useState } from "react";
import axios from "axios";

export default function BalanceGame({ questionId, onSuccess }) {
    const [ballPosition, setBallPosition] = useState({ x: 50, y: 50 }); // Position initiale de la balle
    const [holePosition] = useState({ x: 75, y: 75 }); // Position fixe du trou
    const [message, setMessage] = useState(null); // Message de succès
    const [isCompleted, setIsCompleted] = useState(false); // Éviter les doubles appels

    useEffect(() => {
        const handleOrientation = (event) => {
            if (isCompleted) return;

            const beta = event.beta; // Inclinaison avant/arrière (-180 à 180)
            const gamma = event.gamma; // Inclinaison gauche/droite (-90 à 90)

            // Ajuster les valeurs pour le déplacement de la balle
            const newX = Math.min(Math.max(ballPosition.x + gamma / 10, 0), 100); // Limiter entre 0 et 100%
            const newY = Math.min(Math.max(ballPosition.y + beta / 10, 0), 100); // Limiter entre 0 et 100%

            setBallPosition({ x: newX, y: newY });

            // Vérifier si la balle est dans le trou
            const distance = Math.sqrt(
                Math.pow(newX - holePosition.x, 2) + Math.pow(newY - holePosition.y, 2)
            );
            if (distance < 5) { // Si la balle est proche du trou
                setMessage("Bravo ! La balle est dans le trou !");
                setIsCompleted(true); // Éviter les appels multiples
                window.removeEventListener("deviceorientation", handleOrientation);

                // Valider via l'API
                axios.post('/api/question/answer', {
                    id: questionId,
                    answer: "hole_success"
                })
                    .then((response) => {
                        if (response.data.correct && onSuccess) {
                            onSuccess(response.data.message);
                        }
                    })
                    .catch((error) => {
                        console.error("Erreur lors de la validation :", error);
                    });
            }
        };

        // Vérifier la compatibilité et demander les permissions si nécessaire
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
    }, [ballPosition, holePosition, isCompleted, questionId, onSuccess]);

    return (
        <div className="min-h-screen flex flex-col items-center justify-center text-white bg-gray-900">
            <h1 className="text-4xl font-bold mb-6">Jeu d'équilibre</h1>

            <div
                style={{
                    position: "relative",
                    width: "300px",
                    height: "300px",
                    border: "2px solid white",
                    borderRadius: "50%",
                    overflow: "hidden",
                    background: "black",
                }}
            >
                {/* Trou */}
                <div
                    style={{
                        position: "absolute",
                        width: "30px",
                        height: "30px",
                        background: "red",
                        borderRadius: "50%",
                        top: `${holePosition.y}%`,
                        left: `${holePosition.x}%`,
                        transform: "translate(-50%, -50%)",
                    }}
                ></div>

                {/* Balle */}
                <div
                    style={{
                        position: "absolute",
                        width: "20px",
                        height: "20px",
                        background: "yellow",
                        borderRadius: "50%",
                        top: `${ballPosition.y}%`,
                        left: `${ballPosition.x}%`,
                        transform: "translate(-50%, -50%)",
                    }}
                ></div>
            </div>

            {message && <p className="text-green-500 text-2xl mt-6">{message}</p>}
        </div>
    );
}
