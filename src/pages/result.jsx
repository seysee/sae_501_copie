import {useEffect, useState} from 'react';
import {useRouter} from 'next/router';
import Hint from "./hint";
import axios from "axios";

const Result = () => {
    const router = useRouter();
    const [feedback, setFeedback] = useState('');
    const [correct, setCorrect] = useState(false);
    const {questionId, answer} = router.query;

    useEffect(() => {
        console.log('Question ID:', questionId);
        console.log('Réponse:', answer);
        if (questionId && answer) {
            verifyResponse(questionId, answer);
            rememberQuestion(questionId);
        }
    }, [router.query]);

    const rememberQuestion = async (questionId) => {
        const storedPlayer = sessionStorage.getItem('userData');
        const playerData = JSON.parse(storedPlayer);
        const sessionId = playerData.sessionId;
        try {
            console.log("sessionid", sessionId)
            const responseGet = await axios.get("/api/session", {
                params: {
                    id: sessionId,
                }
            });

            const data = responseGet.data.questions || []

            if (!data.includes(parseInt(questionId))){
                data.push(parseInt(questionId));
            }

            console.log("Données envoyées :", { id: sessionId, questions: data });

            const responsePut = await axios.put("/api/session", {
                id: sessionId,
                questions: data
            });

            console.log("response de sessions/question", responsePut.data)
        } catch (error) {
            console.error("Erreur lors de la mise à jour de la session :", error);
        }
    }

    const verifyResponse = async (questionId, answer) => {
        try {
            const response = await axios.post("/api/question/answer", {
                id: questionId,  // Correspondance correcte avec l'API
                answer
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
                    <Hint/>
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
                Retour à l'accueil
            </button>
        </div>
    )
};

export default Result;
