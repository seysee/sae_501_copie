import React, { useEffect, useState } from "react";
import Button from "./_button";
import axios from "axios";

export default function GenericQuestion({ question, onSuccess, socket }) {
    const [assetsLoaded, setAssetsLoaded] = useState([]);
    const [extraLogic, setExtraLogic] = useState(null);
    const [feedback, setFeedback] = useState('');
    const [answer, setAnswer] = useState('');
    const getStoredUserData = () => {
        try {
            const storedPlayer = sessionStorage.getItem("userData");
            if (storedPlayer) {
                return JSON.parse(storedPlayer);
            }
        } catch (error) {
            console.error("Erreur lors de la récupération des données utilisateur :", error);
        }
        return null;
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
            const loadAssets = async () => {
                try {
                    const assets = JSON.parse(question.assets || "[]");
                    const loadedAssets = assets.map((asset) => `/assets/${asset}`);
                    setAssetsLoaded(loadedAssets);
                } catch (error) {
                    console.error("Erreur lors du chargement des assets :", error);
                }
            };
            loadAssets();
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
            loadExtraLogic().then(r => r);
        }
    }, [question.extraData]);

    const handleAnswerChange = (e) => {
        setAnswer(e.target.value);
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        const storedUserData = getStoredUserData();
        const isCorrect = answer.trim() === question.solution;

        // Envoie via Socket.IO
        socket.emit("submitAnswer", {
            sessionId: storedUserData.sessionId,
            questionId: question.id,
            answer: isCorrect ? "success" : "failure",
        });

        // Feedback local
        setFeedback(isCorrect ? JSON.parse(question.feedback)?.correct || "Bonne réponse !" : JSON.parse(question.feedback)?.incorrect || "Mauvaise réponse.");

        if (isCorrect) {
            onSuccess();
        }
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
                        answer: result.correct ? "success" : "failure",
                    });

                    setFeedback(result.message || (result.correct ? "Bonne réponse !" : "Essayez encore."));
                    if (result.correct) onSuccess();
                },
            });
        }
    };

    return (
        <div className="flex flex-col items-center justify-center text-white">
            <h1 className="text-4xl mb-4 font-Amatic font-bold">{question.question}</h1>
            {assetsLoaded.map((asset, index) => (
                <img key={index} src={asset} alt={`asset-${index}`} className="mb-4" />
            ))}
            {question.type === "text" ? (
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
