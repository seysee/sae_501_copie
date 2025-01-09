import React, { useEffect, useState } from "react";
import TiltDetected from "./actions/TiltDetected";
import ShakeDetected from "./actions/ShakeDetected";
import BalanceGame from "./actions/BalanceGame";

export default function ActionQuestion({ question, onSuccess, socket }) {
    const [sessionId, setSessionId] = useState(null);

    const handleSuccess = (message) => {
        console.log(message); // Affiche un message de succès
        alert(message); // Optionnel : Affiche une alerte
        onSuccess(message); // Appelle la callback de validation
    };

    const getStoredUserData = () => {
        try {
            const storedPlayer = sessionStorage.getItem("userData");
            if (storedPlayer) {
                return JSON.parse(storedPlayer);
            }
        } catch (error) {
            console.error("Erreur lors de la récupération des données utilisateur:", error);
        }
        return null;
    };

    useEffect(() => {
        const storedPlayer = getStoredUserData();
        if (storedPlayer?.sessionId) {
            setSessionId(storedPlayer.sessionId);
        } else {
            console.error("Aucune sessionId trouvée dans les données utilisateur.");
        }
    }, []);

    return (
        <div>
            {question.assets && <img src={question.assets} alt="Instruction" />}
            {question.answer === "tilt_detected" && (
                <TiltDetected
                    questionId={question.id}
                    onSuccess={handleSuccess}
                    socket={socket}
                    sessionId={sessionId} // Transmet l'id de session
                />
            )}
            {question.answer === "shake_detected" && (
                <ShakeDetected
                    questionId={question.id}
                    onSuccess={handleSuccess}
                    socket={socket}
                    sessionId={sessionId} // Transmet l'id de session
                />
            )}
            {question.answer === "hole_success" && (
                <BalanceGame
                    questionId={question.id}
                    onSuccess={handleSuccess}
                    socket={socket}
                    sessionId={sessionId} // Transmet l'id de session
                />
            )}
        </div>
    );
}
