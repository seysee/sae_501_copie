import React from "react";
import TiltDetected from "./actions/TiltDetected";
import ShakeDetected from "./actions/ShakeDetected";

export default function ActionQuestion({ question }) {
    const handleSuccess = (message) => {
        console.log(message); // Affiche un message de succès
        alert(message); // Optionnel : Affiche une alerte
    };

    return (
        <div>
            <h1>{question.question}</h1>
            {question.assets && <img src={question.assets} alt="Instruction" />}
            {question.answer === "tilt_detected" && (
                <TiltDetected questionId={question.id} onSuccess={handleSuccess} />
            )}
            {question.answer === "shake_detected" && (
                <ShakeDetected questionId={question.id} onSuccess={handleSuccess} />
            )}
        </div>
    );
}
