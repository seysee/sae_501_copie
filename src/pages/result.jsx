import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Hint from "../components/hint";
import axios from "axios";
import { decryptParam } from '../lib/cryptoUtils'; // Chemin vers votre fichier d'utilitaires

const Result = () => {
    const router = useRouter();
    const [feedback, setFeedback] = useState('');
    const [correct, setCorrect] = useState(false);
    let {questionId, answer} = router.query;

    useEffect(() => {
        if (questionId && answer) {
            try {
                console.log('Question ID avant décryptage :', questionId);
                console.log('Réponse avant décryptage :', answer);

                const decryptedQuestionId = decryptParam(questionId);
                const decryptedAnswer = decryptParam(answer);

                console.log('Question ID déchiffré :', decryptedQuestionId);
                console.log('Réponse déchiffrée :', decryptedAnswer);

                verifyResponse(decryptedQuestionId, decryptedAnswer);
                rememberQuestion(decryptedQuestionId);
            } catch (error) {
                console.error("Erreur de déchiffrement :", error);
            }
        } else {
            console.log("Les paramètres questionId ou answer ne sont pas encore disponibles.");
        }
    }, [questionId, answer]);

    const rememberQuestion = async (questionId) => {
        const storedPlayer = sessionStorage.getItem('userData');
        const playerData = JSON.parse(storedPlayer);
        const sessionId = playerData?.sessionId;

        if (!sessionId) {
            console.error("Aucune session ID trouvée.");
            return;
        }

        try {
            console.log("Session ID :", sessionId);

            // Récupérer les données de la session
            const responseGet = await axios.get("/api/session", {
                params: {
                    id: sessionId,
                },
            });

            console.log("(result.jsx:40) Données récupérées :", responseGet.data);

            // Convertir les questions existantes en tableau si elles sont une chaîne JSON
            let existingQuestions = [];
            if (typeof responseGet.data.questions === "string") {
                try {
                    existingQuestions = JSON.parse(responseGet.data.questions); // Assure qu'on travaille avec un tableau
                } catch (error) {
                    console.error("Erreur lors du parsing des questions existantes :", error);
                }
            }

            console.log("Questions existantes (après parsing) :", existingQuestions);

            // Ajouter la nouvelle question si elle n'existe pas déjà
            const updatedQuestions = [...new Set([...existingQuestions, parseInt(questionId)])]; // Évite les doublons

            console.log("Questions mises à jour :", updatedQuestions);

            // Mettre à jour la session avec les nouvelles questions
            const responsePut = await axios.put("/api/session", {
                id: sessionId,
                questions: updatedQuestions, // Stocker sous forme de chaîne JSON dans la BDD
            });

            console.log("Réponse de l'API PUT :", responsePut.data);
        } catch (error) {
            console.error("Erreur lors de la mise à jour de la session :", error);
        }
    };

    const verifyResponse = async (questionId, answer) => {
        try {
            const response = await axios.post("/api/question/answer", {
                id: questionId, // Correspondance correcte avec l'API
                answer,
            });
            console.log('Réponse API :', response.data);
            setFeedback(response.data.message);
            setCorrect(response.data.correct);
        } catch (error) {
            console.error("Erreur lors de la vérification :", error);
            setFeedback("Erreur lors de la vérification. Veuillez réessayer.");
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center text-white">
            <h1 className="text-4xl mb-4">Résultat de la Réponse</h1>
            <p className="text-xl">{feedback}</p>
            {correct ? (
                <>
                    <p className="text-2xl text-green-500">
                        Bonne Réponse!
                    </p>
                    <Hint />
                </>
            ) : (
                <p className="text-2xl text-red-500">
                    Mauvaise Réponse!
                </p>
            )}
            <button
                onClick={() => router.push('/enigma')}
                className="mt-4 py-2 px-6 bg-black text-white rounded-lg"
            >
                Question suivante
            </button>
        </div>
    );
};

export default Result;
