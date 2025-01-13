import React, { useEffect, useState } from "react";
import Button from "./_button";

export default function GenericQuestion({ question, onSuccess }) {
    const [assetsLoaded, setAssetsLoaded] = useState([]);
    const [extraLogic, setExtraLogic] = useState(null);
    const [feedback, setFeedback] = useState('');
    const [answer, setAnswer] = useState('');

    // Charger les assets (images, etc.)
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

    // Charger et exécuter la logique additionnelle
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

            loadExtraLogic();
        } else {
            console.warn("extraData est manquant ou invalide :", question.extraData);
        }
    }, [question.extraData]);


    // Gérer les réponses textuelles
    const handleAnswerChange = (e) => {
        setAnswer(e.target.value);
    };

    const handleSubmit = (event) => {
        event.preventDefault();
        if (answer.trim() === question.solution) {
            setFeedback(JSON.parse(question.feedback)?.correct || "Bonne réponse !");
            onSuccess && onSuccess("success");
        } else {
            setFeedback(JSON.parse(question.feedback)?.incorrect || "Mauvaise réponse.");
        }
    };

    // Gérer les interactions spéciales avec `extraLogic`
    const handleExtraLogic = async () => {
        if (extraLogic) {
            const containerId = "game-container";
            const result = await extraLogic({
                containerId,
                onComplete: (result) => {
                    if (result.success) {
                        setFeedback(question.feedback?.correct || "Bravo !");
                        onSuccess && onSuccess("success");
                    } else {
                        setFeedback(question.feedback?.incorrect || "Essayez encore.");
                    }
                },
            });
        }
    };

    return (
        <div className="flex flex-col items-center justify-center text-white">
            <h1 className="text-4xl mb-4 font-Amatic font-bold">{question.question}</h1>

            {/* Charger les assets */}
            {assetsLoaded.map((asset, index) => (
                <img key={index} src={asset} alt={`asset-${index}`} className="mb-4"/>
            ))}

            {/* Gestion des interactions */}
            {question.type === "code" || question.type === "calculation" || question.type === "text" || question.type === "logic" ? (
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
                        className={`py-3 px-6 ${
                            answer
                                ? 'bg-black text-green-500 border-green-500'
                                : 'text-gray-300 border-gray-500 cursor-not-allowed'
                        }`}
                    >
                        Envoyer
                    </button>
                </form>
            ) : (
                question.extraData && (
                    <Button
                        label={"Commencer l'interaction"}
                        onClick={handleExtraLogic}
                        className="py-3 px-6 bg-blue-500 text-white rounded-lg mt-4"
                    >
                    </Button>
                )
            )}
            <div id="game-container" className="relative w-full h-80 bg-black rounded-lg"></div>
            {/* Feedback */}
            {feedback && <p className="text-green-500 mt-4">{feedback}</p>}
        </div>
    );
}
