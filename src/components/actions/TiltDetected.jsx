import React, { useEffect, useState } from "react";
import axios from "axios";

export default function TiltDetected({ questionId }) {
    const [tiltDetected, setTiltDetected] = useState(false);
    const [feedback, setFeedback] = useState(''); // Message de retour

    useEffect(() => {
        const handleOrientation = (event) => {
            if (event.beta < 0) { // Inclinaison détectée
                setTiltDetected(true);

                // Appel API avec Axios pour valider l'action
                axios.post('/api/question/answer', {
                    id: questionId,
                    answer: "tilt_detected"
                })
                    .then((response) => {
                        if (response.data.correct) {
                            setFeedback(response.data.message); // Affiche le message de succès
                        } else {
                            setFeedback("Action non réalisée, essayez encore.");
                        }
                    })
                    .catch((error) => {
                        console.error("Erreur lors de l'envoi des données :", error);
                    });
            }
        };

        window.addEventListener("deviceorientation", handleOrientation);
        return () => window.removeEventListener("deviceorientation", handleOrientation);
    }, [questionId]);

    return (
        <div>
            {tiltDetected ? (
                <p className="text-green-500">{feedback || "Inclinaison détectée !"}</p>
            ) : (
                <p>Inclinez votre téléphone pour valider cette action.</p>
            )}
        </div>
    );
}
