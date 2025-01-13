import GenericQuestion from "../components/GenericQuestion";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import io from "socket.io-client";
import axios from "axios";

export default function Game() {
    const [question, setQuestion] = useState(null);
    const [questionQueue, setQuestionQueue] = useState([]);
    const [socket, setSocket] = useState(null);
    const router = useRouter();

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

    useEffect(() => {
        const storedUserData = getStoredUserData();
        if (!storedUserData?.sessionId) {
            console.error("Session ID introuvable.");
            router.push("/"); // Redirige si aucune session ID
            return;
        }

        // Initialiser le socket et gérer les événements
        const socketInstance = io({
            path: '/api/socket',
        });
        setSocket(socketInstance);

        // Rejoindre la session
        socketInstance.emit("joinSession", storedUserData.sessionId, storedUserData);

        // Recevoir la question suivante
        socketInstance.on("nextQuestion", (newQuestion) => {
            setQuestion(newQuestion);
        });

        // Nettoyage lors de la déconnexion
        return () => {
            socketInstance.disconnect();
        };
    }, [router]);

    useEffect(() => {
        const fetchQuestions = async () => {
            const storedUserData = getStoredUserData();
            if (!storedUserData) return;

            try {
                const response = await axios.get('/api/question/question', { params: { limit: 10 } });
                const questions = response.data;
                setQuestionQueue(questions);
                setQuestion(questions[0]);

                // Attendez que le socket soit défini avant d'émettre les questions
                if (socket) {
                    socket.emit("initializeQuestions", { sessionId: storedUserData.sessionId, questions });
                }
            } catch (error) {
                console.error("Erreur lors de la récupération des questions :", error);
            }
        };

        fetchQuestions();
    }, [socket]);

    const handleSuccess = () => {
        const storedUserData = getStoredUserData();
        socket.emit("submitAnswer", { sessionId: storedUserData.sessionId, questionId: question.id, answer: "success" });
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center text-white">
            {question ? (
                <GenericQuestion question={question} onSuccess={handleSuccess} socket={socket} />
            ) : (
                <p className="text-xl">Chargement de la question...</p>
            )}
        </div>
    );
}
