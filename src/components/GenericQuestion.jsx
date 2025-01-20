import React, { useEffect, useState } from "react";
import Button from "./_button";
import Timer from "./_timer";

export default function GenericQuestion({ question, onSuccess, socket, isActive, activePlayerName }) {
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
        } catch {
            return null;
        }
    };

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
            const loadAssets = async () => {
                try {
                    const assets = JSON.parse(question.assets || "[]");
                    const loadedAssets = assets.map((asset) => `/puzzle/${asset}`);
                    setAssetsLoaded(loadedAssets);
                } catch {}
            };
            loadAssets();
            const container = document.getElementById("game-container");
            if (container) {
                container.dataset.assets = question.assets;
            }
        }
    }, [question.assets]);

    useEffect(() => {
        if (question.extraData && typeof question.extraData === "string") {
            const loadExtraLogic = async () => {
                try {
                    const logic = await import(`../extras/${question.extraData}`);
                    setExtraLogic(() => logic.default || logic);
                } catch {}
            };
            loadExtraLogic();
        }
    }, [question.extraData]);

    const handleAnswerChange = (e) => {
        setAnswer(e.target.value);
    };

    const handleSubmit = (event) => {
        event.preventDefault();
        if (!isActive) {
            return;
        }
        const storedUserData = getStoredUserData();
        if (!storedUserData || !socket) {
            return;
        }
        socket.emit("submitAnswer", {
            sessionId: storedUserData.sessionId,
            questionId: question.id,
            answer
        });
        setFeedback("Vérification en cours...");
    };

    const handleExtraLogic = () => {
        if (!isActive) {
            return;
        }
        if (extraLogic) {
            const storedUserData = getStoredUserData();
            const containerId = "game-container";
            extraLogic({
                containerId,
                questionId: question.id,
                sessionId: storedUserData.sessionId,
                socket,
                onComplete: (result) => {
                    socket.emit("submitAnswer", {
                        sessionId: storedUserData.sessionId,
                        questionId: question.id,
                        answer: result.answer
                    });
                    setFeedback(result.message || "Interaction terminée.");
                    if (result.correct) onSuccess();
                },
            });
        }
    };

    const handleTimeUp = () => {
        setTimeUp(true);
        setFeedback("Temps écoulé.");
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

            {isActive ? (
                <>
                    {(question.type === "text" || question.type === "number") && (
                        <form className="flex flex-col items-center space-y-4" onSubmit={handleSubmit}>
                            <input
                                type="text"
                                placeholder="Votre réponse"
                                value={answer}
                                onChange={handleAnswerChange}
                                className="w-full p-3 bg-black text-white border border-gray-500 rounded-lg mb-6"
                            />
                            <button
                                type="submit"
                                className="py-3 px-6 bg-black text-green-500 border-green-500"
                            >
                                Envoyer
                            </button>
                        </form>
                    )}
                    {question.extraData && (question.type !== "text" && question.type !== "number") && (
                        <Button
                            label="Lancer l'énigme"
                            onClick={handleExtraLogic}
                            className="py-3 px-6 bg-blue-500 text-white rounded-lg mt-4"
                        />
                    )}
                </>
            ) : (
                <div className="mt-6">
                    <p className="text-xl text-gray-300">
                        Aidez <span className="font-bold">{activePlayerName}</span> à répondre pour obtenir l'indice...
                    </p>
                </div>
            )}

            <div id="game-container" className="relative w-full h-80 bg-black rounded-lg mt-6"></div>
            {feedback && <p className="text-green-500 mt-4">{feedback}</p>}
        </div>
    );
}
