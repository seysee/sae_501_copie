import React, {useState, useEffect, useRef} from "react";

export default function RepeatPhrase({ questionId, phrase, onSuccess, socket, sessionId }) {
    const [isListening, setIsListening] = useState(false);
    const [message, setMessage] = useState(null);
    const [recognizedText, setRecognizedText] = useState("");
    const recognitionRef = useRef(null);

    useEffect(() => {
        if (!("webkitSpeechRecognition" in window)) {
            setMessage("Votre navigateur ne prend pas en charge la reconnaissance vocale.");
            return;
        }

        const recognition = new window.webkitSpeechRecognition();
        recognition.lang = "fr-FR"; // Langue française
        recognition.continuous = false; // Arrête l'écoute après une seule phrase
        recognition.interimResults = false; // Ne retourne pas les résultats intermédiaires
        recognitionRef.current = recognition;

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript.trim().toLowerCase();
            setRecognizedText(transcript);

            if (transcript === phrase.trim().toLowerCase()) {
                handleSuccess();
            } else {
                setMessage("Ce n'est pas la bonne phrase. Essayez encore !");
            }
        };

        recognition.onerror = (event) => {
            console.error("Erreur de reconnaissance vocale :", event.error);
            setMessage("Une erreur est survenue lors de la reconnaissance vocale.");
        };

        return () => {
            if (recognition) recognition.abort();
        };
    }, [phrase]);

    const handleStartListening = () => {
        if (recognitionRef.current) {
            setIsListening(true);
            setMessage("Écoute en cours... Répétez la phrase !");
            recognitionRef.current.start();
        }
    };

    const handleStopListening = () => {
        if (recognitionRef.current) {
            setIsListening(false);
            recognitionRef.current.stop();
            setMessage("Écoute terminée. Vérification...");
        }
    };

    const handleSuccess = () => {
        setMessage("Félicitations ! Vous avez correctement répété la phrase.");
        if (onSuccess) {
            onSuccess("La phrase a été répétée avec succès !");
        }

        // Envoie la réponse au serveur si nécessaire
        if (socket && sessionId) {
            socket.emit("submitAnswer", { sessionId, questionId, answer: "repeat_success" });
        }
    };

    return (
        <div className="flex flex-col items-center text-white">
            <h1 className="text-2xl font-bold mb-4">Répétez cette phrase :</h1>
            <p className="text-lg text-yellow-500 mb-6">{phrase}</p>

            <button
                onMouseDown={handleStartListening}
                onMouseUp={handleStopListening}
                onTouchStart={handleStartListening} // Pour les appareils tactiles
                onTouchEnd={handleStopListening} // Pour les appareils tactiles
                className={`px-6 py-3 rounded-full shadow-md ${
                    isListening ? "bg-red-500" : "bg-blue-500"
                } text-white text-lg font-bold transition duration-300`}
            >
                {isListening ? "Relâchez pour arrêter" : "Maintenez pour parler"}
            </button>

            {message && <p className="text-green-500 mt-4">{message}</p>}
            {recognizedText && (
                <p className="text-gray-300 mt-2">Vous avez dit : "{recognizedText}"</p>
            )}
        </div>
    );
}
