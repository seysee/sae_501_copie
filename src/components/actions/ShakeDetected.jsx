import React, { useEffect, useState } from "react";
import axios from "axios";

export default function ShakeDetected({ questionId, onSuccess }) {
    const [shakeDetected, setShakeDetected] = useState(false);
    const shakeHistory = []; // Historique des détections de shake
    const maxHistory = 5; // Taille maximale de l'historique

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

                // Appel API avec Axios pour valider l'action
                axios.post('/api/question/answer', {
                    id: questionId,
                    answer: "shake_detected"
                })
                    .then((response) => {
                        if (response.data.correct && onSuccess) {
                            onSuccess(response.data.message);
                        }
                    })
                    .catch((error) => {
                        console.error("Erreur lors de l'envoi des données :", error);
                    })
                    .finally(() => {
                        window.removeEventListener("devicemotion", handleMotion); // Arrêter la détection
                    });
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
        </div>
    );
}
