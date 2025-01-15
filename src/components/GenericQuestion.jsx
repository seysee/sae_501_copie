import React, { useEffect, useState } from "react";
import Button from "./_button";
import Timer from "./_timer";

export default function GenericQuestion({ question, onSuccess, socket }) {
    const [assetsLoaded, setAssetsLoaded] = useState([]);
    const [extraLogic, setExtraLogic] = useState(null);
    const [feedback, setFeedback] = useState('');
    const [answer, setAnswer] = useState('');
    const [paused, setPaused] = useState(false);
    const [timeUp, setTimeUp] = useState(false);
    const getStoredUserData = () => {
        try {
            const storedPlayer = sessionStorage.getItem("userData");
            return storedPlayer ? JSON.parse(storedPlayer) : null;
        } catch (error) {
            console.error("Erreur lors de la récupération des données utilisateur :", error);
            return null;
        }
    };

    // Écouter l'événement `answerSubmitted` pour rediriger les joueurs
    useEffect(() => {
        if (socket) {
            socket.on("answerSubmitted", ({ redirectUrl }) => {
                if (redirectUrl) {
                    window.location.href = redirectUrl;
                }
            });
        }
    }, [socket]);

    useEffect(() => {
        if (question.assets) {
            const container = document.getElementById("game-container");
            if (container) {
                container.dataset.assets = question.assets;
                console.log("Injected assets into container:", question.assets);
            } else {
                console.error("Game container not found.");
            }
        }
    }, [question.assets]);

    useEffect(() => {
        if (question.extraData && typeof question.extraData === "string") {
            const loadExtraLogic = async () => {
                try {
                    const logic = await import(`../extras/${question.extraData}`);
                    setExtraLogic(() => logic.default || logic);
                } catch (error) {
                    console.error(`Erreur lors du chargement de la logique extra : ${question.extraData}`, error);
                }
            };
            loadExtraLogic().then(() => null);
        }
    }, [question.extraData]);

    const handleAnswerChange = (e) => {
        setAnswer(e.target.value);
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        const storedUserData = getStoredUserData();
        if (!storedUserData || !socket) {
            console.error("Données utilisateur ou socket non disponibles.");
            return;
        }

        // Envoi de la réponse à l'API via Socket.IO
        socket.emit("submitAnswer", {
            sessionId: storedUserData.sessionId,
            questionId: question.id,
            answer,
        });

        // Feedback temporaire en attendant la réponse de l'API
        setFeedback("Vérification en cours...");
    };

    const handleExtraLogic = async () => {
        if (extraLogic) {
            const storedUserData = getStoredUserData();
            const containerId = "game-container";
            extraLogic({
                containerId,
                questionId: question.id,
                sessionId: storedUserData.sessionId,
                onComplete: (result) => {
                    socket.emit("submitAnswer", {
                        sessionId: storedUserData.sessionId,
                        questionId: question.id,
                        answer: result.answer,
                    });

                    setFeedback(result.message || "Interaction terminée.");
                    if (result.correct) onSuccess();
                },
            });
        }
    };

    const handleTimeUp = () => {
        setTimeUp(true);
        setFeedback("Temps écoulé. Vous avez perdu !");
        if (socket) {
            const storedUserData = getStoredUserData();
            socket.emit("submitAnswer", {
                sessionId: storedUserData?.sessionId,
                questionId: question.id,
                answer: "time_up",
            });
        }
    };

    return (
        <div className="flex flex-col items-center justify-center text-white">
            <h1 className="text-4xl mb-4 font-Amatic font-bold">{question.question}</h1>
            <Timer initialTime={question.duration} onTimeUp={handleTimeUp} paused={paused || timeUp} />
            {assetsLoaded.map((asset, index) => (
                <img key={index} src={asset} alt={`asset-${index}`} className="mb-4" />
            ))}
            {question.type === "text" || question.type === "number" ? (
                <form className="flex flex-col items-center space-y-4" onSubmit={handleSubmit}>
                    <input
                        type="text"
                        placeholder="Votre réponse"
                        value={answer}
                        onChange={handleAnswerChange}
                        className="w-full p-3 bg-black text-white border border-gray-500 rounded-lg mb-6"
                    />
                    <button type="submit" className="py-3 px-6 bg-black text-green-500 border-green-500">Envoyer</button>
                </form>
            ) : (
                question.extraData && (
                    <Button label="Commencer l'interaction" onClick={handleExtraLogic} className="py-3 px-6 bg-blue-500 text-white rounded-lg mt-4" />
                )
            )}
            <div id="game-container" className="relative w-full h-80 bg-black rounded-lg"></div>
            {feedback && <p className="text-green-500 mt-4">{feedback}</p>}
        </div>
    );
}
