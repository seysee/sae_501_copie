import React, { useEffect, useState } from "react";
import axios from "axios";

export default function ShakeDetected({ questionId, onSuccess, socket, sessionId }) {
    const [shakeDetected, setShakeDetected] = useState(false);
    const shakeHistory = []; // Historique des détections de shake
    const maxHistory = 5; // Taille maximale de l'historique

    function submitAnswer(answer) {
        socket.emit("submitAnswer", { sessionId: sessionId , questionId, answer });
    }
    useEffect(() => {
        let shakeValidated = false; // Empêche la validation multiple

        const handleMotion = (event) => {
            if (shakeValidated) return; // Arrêter si l'action est déjà validée

            const acceleration = event.acceleration || {};
            const delta = Math.abs(acceleration.x) + Math.abs(acceleration.y) + Math.abs(acceleration.z);
            const shakeThreshold = 20; // Ajuster le seuil selon les besoins (plus élevé = moins sensible)

            // Ajouter la détection actuelle à l'historique
            shakeHistory.push(delta > shakeThreshold);
            if (shakeHistory.length > maxHistory) {
                shakeHistory.shift(); // Supprime les anciennes valeurs pour limiter la taille
            }

            // Valider si un certain nombre de secousses consécutives dépassent le seuil
            const shakesDetected = shakeHistory.filter(Boolean).length;
            if (shakesDetected >= Math.ceil(maxHistory / 2)) {
                shakeValidated = true; // Bloquer les futures détections
                setShakeDetected(true);

                submitAnswer("shake_detected");
            }
        };

        window.addEventListener("devicemotion", handleMotion);
        return () => window.removeEventListener("devicemotion", handleMotion);
    }, [questionId, onSuccess]);

    return (
        <div>
            {shakeDetected ? (
                <p className="text-green-500">Secousse détectée et validée !</p>
            ) : (
                <p>Secouez votre téléphone pour valider cette action.</p>
            )}
            {/* Bouton Skip */}
            <button
                onClick={() => submitAnswer("shake_detected")}
                className="mt-4 px-6 py-3 bg-blue-500 hover:bg-blue-700 text-white font-bold rounded-lg"
            >
                Skip
            </button>
        </div>
    );
}
