import GenericQuestion from "../components/GenericQuestion";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import axios from "axios";

export default function Game() {
    const [question, setQuestion] = useState(null);
    const [questionQueue, setQuestionQueue] = useState([]); // File d'attente pour les questions
    const router = useRouter();

    useEffect(() => {
        const fetchQuestions = async () => {
            try {
                // Appeler l'API pour récupérer et mélanger les questions
                const response = await axios.get('/api/question/question', { params: { limit: 10 } });
                setQuestionQueue(response.data); // Charger toutes les questions dans la file
                setQuestion(response.data[0]); // Charger la première question
            } catch (error) {
                console.error("Erreur lors de la récupération des questions :", error);
            }
        };

        fetchQuestions();
    }, []);

    const handleNextQuestion = () => {
        if (questionQueue.length > 1) {
            const remainingQuestions = questionQueue.slice(1);
            setQuestionQueue(remainingQuestions);
            setQuestion(remainingQuestions[0]);
        } else {
            console.log("Toutes les questions ont été posées.");
            router.push('/result'); // Rediriger vers une page de résultats
        }
    };

    const handleSuccess = () => {
        console.log("Question réussie !");
        handleNextQuestion();
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center text-white">
            {question ? (
                <GenericQuestion question={question} onSuccess={handleSuccess} />
            ) : (
                <p className="text-xl">Chargement de la question...</p>
            )}
        </div>
    );
}
