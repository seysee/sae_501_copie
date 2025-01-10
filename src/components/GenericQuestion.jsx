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
                    const assets = question.assets.split(',');
                    const loadedAssets = assets.map((asset) => {
                        return typeof asset === "string" ? `/assets/${asset}` : asset;
                    });
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
        if (question.extraData) {
            const loadExtraLogic = async () => {
                try {
                    const logic = await import(`/extras/${question.extraData}`);
                    setExtraLogic(() => logic.default || logic);
                } catch (error) {
                    console.error("Erreur lors du chargement de la logique extra :", error);
                }
            };

            loadExtraLogic();
        }
    }, [question.extraData]);

    // Gérer les réponses textuelles
    const handleAnswerChange = (e) => {
        setAnswer(e.target.value);
    };

    const handleSubmit = (event) => {
        event.preventDefault();
        if (answer.trim() === question.solution) {
            setFeedback(question.feedback?.correct || "Bonne réponse !");
            onSuccess && onSuccess("success");
        } else {
            setFeedback(question.feedback?.incorrect || "Mauvaise réponse.");
        }
    };

    // Gérer les interactions spéciales avec `extraLogic`
    const handleExtraLogic = async () => {
        if (extraLogic) {
            const result = await extraLogic();
            if (result.success) {
                setFeedback(question.feedback?.correct || "Bonne réponse !");
                onSuccess && onSuccess("success");
            } else {
                setFeedback(question.feedback?.incorrect || "Mauvaise réponse.");
            }
        }
    };

    return (
        <div className="flex flex-col items-center justify-center text-white">
            <h1 className="text-4xl mb-4">{question.question}</h1>

            {/* Charger les assets */}
            {assetsLoaded.map((asset, index) => (
                <img key={index} src={asset} alt={`asset-${index}`} className="mb-4" />
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

            {/* Feedback */}
            {feedback && <p className="text-green-500 mt-4">{feedback}</p>}
        </div>
    );
}
