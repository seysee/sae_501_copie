import React, { useEffect, useState } from "react";
import axios from "axios";

export default function BalanceGame({ questionId, onSuccess }) {
    const [ballPosition, setBallPosition] = useState(generateRandomPosition());
    const [holePosition, setHolePosition] = useState(generateRandomPosition());
    const [successCount, setSuccessCount] = useState(0); // Nombre de validations réussies
    const [message, setMessage] = useState(null); // Message de succès
    const [isCompleted, setIsCompleted] = useState(false); // Éviter les doubles appels

    // Fonction pour générer une position aléatoire
    function generateRandomPosition() {
        return {
            x: Math.random() * 80 + 10, // Entre 10% et 90%
            y: Math.random() * 80 + 10, // Entre 10% et 90%
        };
    }

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
                const nextSuccessCount = successCount + 1;
                setSuccessCount(nextSuccessCount);
                setMessage(`Bravo ! ${nextSuccessCount}/3 réussites.`);

                if (nextSuccessCount === 3) { // Action validée après 3 succès
                    setMessage("Action réussie !");
                    setIsCompleted(true); // Éviter les appels multiples
                    window.removeEventListener("deviceorientation", handleOrientation);

                    // Valider via l'API
                    axios
                        .post('/api/question/answer', {
                            id: questionId,
                            answer: "hole_success",
                        })
                        .then((response) => {
                            if (response.data.correct && onSuccess) {
                                onSuccess(response.data.message);
                            }
                        })
                        .catch((error) => {
                            console.error("Erreur lors de la validation :", error);
                        });
                } else {
                    // Réinitialiser les positions de la balle et du trou
                    setBallPosition(generateRandomPosition());
                    setHolePosition(generateRandomPosition());
                }
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
    }, [ballPosition, holePosition, isCompleted, successCount, questionId, onSuccess]);

    return (
        <div className="min-h-screen flex flex-col items-center justify-center text-white">
            <h1 className="text-2xl font-bold mb-4">Jeu d'équilibre</h1>

            <div
                style={{
                    position: "relative",
                    width: "80vw", // 80% de la largeur de l'écran
                    height: "80vw", // Maintenir un ratio carré
                    maxWidth: "300px", // Taille maximale pour limiter sur les téléphones avec grands écrans
                    maxHeight: "300px",
                    margin: "0 auto", // Centrer horizontalement
                    border: "2px solid white",
                    overflow: "hidden",
                    background: "black",
                }}
            >
                {/* Trou */}
                <div
                    style={{
                        position: "absolute",
                        width: "12%",
                        height: "12%",
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
                        width: "8%",
                        height: "8%",
                        background: "yellow",
                        borderRadius: "50%",
                        top: `${ballPosition.y}%`,
                        left: `${ballPosition.x}%`,
                        transform: "translate(-50%, -50%)",
                    }}
                ></div>
            </div>

            {message && <p className="text-green-500 text-xl mt-4">{message}</p>}
        </div>
    );
}
