import React, { useEffect, useState } from "react";
import TiltDetected from "./actions/TiltDetected";
import ShakeDetected from "./actions/ShakeDetected";
import BalanceGame from "./actions/BalanceGame";
import Camera from "./actions/Camera";

export default function ActionQuestion({ question, onSuccess }) {
    const [targetColor, setTargetColor] = useState("red");
    const [sessionId, setSessionId] = useState(null);

    useEffect(() => {
        if (question.answer === "color_detected") {
            const colors = ["red", "green", "blue"];
            const randomColor = colors[Math.floor(Math.random() * colors.length)];
            setTargetColor(randomColor);
        }
    }, [question]);


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
            {question.assets && <img src={question.assets} alt="Instruction" className="mb-4" />}

            {/* Détection de Tilt */}
            {question.answer === "tilt_detected" && (
                <TiltDetected
                    questionId={question.id}
                    onSuccess={handleSuccess}
                    socket={socket}
                    sessionId={sessionId} // Transmet l'id de session
                />
            )}

            {/* Détection de Shake */}
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

            {/* Détection de Couleur avec la caméra */}
            {question.answer === "color_detected" && (
                <>
                    <h1
                        className={`text-4xl font-Amatic mb-6 capitalize ${
                            targetColor === "red"
                                ? "text-red-500"
                                : targetColor === "green"
                                    ? "text-green-500"
                                    : targetColor === "blue"
                                        ? "text-blue-400"
                                        : "text-gray-500"
                        }`}
                    >
                        {targetColor}
                    </h1>
                    <Camera
                        questionId={question.id}
                        targetColor={targetColor}
                        onSuccess={handleSuccess}
                    />
                </>
            )}
        </div>
    );
}
