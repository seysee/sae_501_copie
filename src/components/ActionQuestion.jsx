import React from "react";
import TiltDetected from "./actions/TiltDetected";
import ShakeDetected from "./actions/ShakeDetected";
import BalanceGame from "./actions/BalanceGame";

export default function ActionQuestion({ question, onSuccess }) {
    const handleSuccess = (message) => {
        console.log(message); // Affiche un message de succès
        alert(message); // Optionnel : Affiche une alerte
        onSuccess(message); // Appelle la callback de validation
    };

    return (
        <div>
            {question.assets && <img src={question.assets} alt="Instruction" />}
            {question.answer === "tilt_detected" && (
                <TiltDetected questionId={question.id} onSuccess={handleSuccess} />
            )}
            {question.answer === "shake_detected" && (
                <ShakeDetected questionId={question.id} onSuccess={handleSuccess} />
            )}
            {question.answer === "hole_success" && (
                <BalanceGame questionId={question.id} onSuccess={handleSuccess} />
            )}
        </div>
    );
}
