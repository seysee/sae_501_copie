import React, { useEffect, useState } from "react";
import axios from "axios";

export default function TiltDetected({ questionId, sessionId, socket }) {
    const [tiltDetected, setTiltDetected] = useState(false);
    const [feedback, setFeedback] = useState(''); // Message de retour

    function submitAnswer(answer) {
        socket.emit("submitAnswer", { sessionId: sessionId , questionId, answer });
    }

    useEffect(() => {
        const handleOrientation = (event) => {
            if (event.beta < 0) { // Inclinaison détectée
                setTiltDetected(true);

                // Appel API avec Axios pour valider l'action
                submitAnswer("tilt_detected");
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
            {/* Bouton Skip */}
            <button
                onClick={() => submitAnswer("tilt_detected")}
                className="mt-4 px-6 py-3 bg-blue-500 hover:bg-blue-700 text-white font-bold rounded-lg"
            >
                Skip
            </button>
        </div>
    );
}
