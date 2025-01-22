import React, { useEffect, useState } from "react";
import Button from "./_button";
import Timer from "./_timer";

export default function GenericQuestion({
                                            question,
                                            onSuccess,
                                            socket,
                                            isActive,
                                            activePlayerName
                                        }) {
    const [assetsLoaded, setAssetsLoaded] = useState([]);
    const [extraLogic, setExtraLogic] = useState(null);
    const [feedback, setFeedback] = useState("");
    const [answer, setAnswer] = useState("");
    const [paused, setPaused] = useState(false);
    const [timeUp, setTimeUp] = useState(false);

    // Compte à rebours local pour "action_wait"
    const [countdown, setCountdown] = useState(null);

    const getStoredUserData = () => {
        try {
            const storedPlayer = sessionStorage.getItem("userData");
            return storedPlayer ? JSON.parse(storedPlayer) : null;
        } catch {
            return null;
        }
    };

    // Écouter answerSubmitted
    useEffect(() => {
        if (!socket || !question) return;

        socket.on("answerSubmitted", ({ redirectUrl }) => {
            if (redirectUrl) {
                sessionStorage.removeItem("currentQuestion");
                sessionStorage.removeItem("activePlayer");
                sessionStorage.removeItem(`timerEndTime:${question.id}`);
                window.location.href = redirectUrl;
            }
        });

        return () => {
            if (socket) {
                socket.off("answerSubmitted");
            }
        };
    }, [socket, question]);

    // Charger assets
    useEffect(() => {
        if (!question) return;

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
    }, [question]);

    // Charger extraLogic
    useEffect(() => {
        if (!question) return;

        if (question.extraData && typeof question.extraData === "string") {
            const loadExtraLogic = async () => {
                try {
                    const logic = await import(`../extras/${question.extraData}`);
                    setExtraLogic(() => logic.default || logic);
                } catch {}
            };
            loadExtraLogic();
        }
    }, [question]);

    // ----- Lancement auto si question.type = "action" ou "action_wait" -----
    useEffect(() => {
        if (!question || !isActive) return;
        if (!extraLogic) return; // On attend que l'extraLogic soit chargé

        if (question.type === "action") {
            // Se lance immédiatement
            handleExtraLogic();
        } else if (question.type === "action_wait") {
            // Lance un compte à rebours de 3 secondes
            setCountdown(3);
        }
    }, [question, isActive, extraLogic]);

    // Gérer le compte à rebours pour action_wait
    useEffect(() => {
        if (countdown === null) return; // pas de countdown en cours
        if (countdown <= 0) {
            // On lance le jeu
            handleExtraLogic();
            setCountdown(null);
            return;
        }
        const timerId = setInterval(() => {
            setCountdown((c) => c - 1);
        }, 1000);
        return () => clearInterval(timerId);
    }, [countdown]);

    // ---------------

    const handleAnswerChange = (e) => {
        setAnswer(e.target.value);
    };

    const handleSubmit = (event) => {
        event.preventDefault();
        if (!isActive) return;

        const storedUserData = getStoredUserData();
        if (!storedUserData || !socket) return;

        socket.emit("submitAnswer", {
            sessionId: storedUserData.sessionId,
            questionId: question.id,
            answer
        });
        setFeedback("Vérification en cours...");
    };

    const handleExtraLogic = () => {
        if (!isActive) return;
        if (!extraLogic) return;

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
            }
        });
    };

    const handleTimeUp = () => {
        setTimeUp(true);
        setFeedback("Temps écoulé.");
        sessionStorage.removeItem("currentQuestion");
        sessionStorage.removeItem("activePlayer");

        if (socket) {
            const storedUserData = getStoredUserData();
            socket.emit("submitAnswer", {
                sessionId: storedUserData?.sessionId,
                questionId: question.id,
                answer: "time_up"
            });
        }
    };

    if (!question) {
        return (
            <div className="text-gray-300 text-xl">
                Chargement de la question...
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center text-white">
            <h1 className="text-4xl mb-4 font-Amatic font-bold">{question.question}</h1>

            <Timer
                questionId={question.id}
                initialTime={question.duration}
                onTimeUp={handleTimeUp}
                paused={paused || timeUp}
            />

            {isActive ? (
                <>
                    {/* Text ou number => input */}
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

                    {/* Type "action" => auto-lancement => PAS de bouton */}
                    {/* Type "action_wait" => auto-lancement après 3s => PAS de bouton */}
                    {question.type === "action_wait" && countdown > 0 && (
                        <p className="text-lg text-yellow-400 mb-2">
                            Le jeu commencera dans {countdown} seconde{countdown > 1 ? "s" : ""}...
                        </p>
                    )}
                    {/*
            Si c’est un "mini-jeu" (extraData) MAIS ni text/number => "action" ou "action_wait" =>
            => plus de bouton "Lancer l'énigme"
            => car c’est auto-lancé
          */}
                </>
            ) : (
                <div className="mt-6">
                    <p className="text-xl text-gray-300">
                        Aidez <span className="font-bold">{activePlayerName}</span> à répondre pour obtenir l'indice...
                    </p>
                </div>
            )}

            {question.extraData &&
                question.type !== "text" &&
                question.type !== "number" && (
                    <div
                        id="game-container"
                        className="relative w-full h-80 bg-black rounded-lg mt-6"
                    ></div>
                )}

            {feedback && <p className="text-green-500 mt-4">{feedback}</p>}
        </div>
    );
}
