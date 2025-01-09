import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import io from 'socket.io-client';
import RoleSlide from "../components/_roleSlide";
import Button from "../components/_button";
import axios from "axios";
import ActionQuestion from "../components/ActionQuestion";

export default function Game() {
    const [question, setQuestion] = useState(null);
    const [answer, setAnswer] = useState('');
    const [feedback, setFeedback] = useState('');
    const [socket, setSocket] = useState(null);
    const router = useRouter();

    const getStoredUserData = () => {
        try {
            const storedPlayer = sessionStorage.getItem('userData');
            if (storedPlayer) {
                return JSON.parse(storedPlayer);
            }
        } catch (error) {
            console.error('Erreur lors de la récupération des données utilisateur:', error);
        }
        return null;
    };

    useEffect(() => {
        const initializeGame = async () => {
            const storedPlayer = getStoredUserData();

            if (!storedPlayer || !storedPlayer.sessionId) {
                console.error("Aucune session utilisateur trouvée.");
                return;
            }

            // Initialiser la connexion Socket.IO
            const socketInstance = io({
                path: '/api/socket',
            });
            setSocket(socketInstance);

            try {
                const responseGet = await axios.get("/api/session", {
                    params: { id: storedPlayer.sessionId },
                });

                const toFilterQuestion = responseGet.data.questions || [];
                console.log("Questions à filtrer :", toFilterQuestion);

                socketInstance.emit('joinSession', storedPlayer.sessionId, { name: storedPlayer.name });
                socketInstance.emit('launchQuestions', storedPlayer.sessionId, toFilterQuestion);

                // Écouter l'événement 'nextQuestion' pour recevoir une nouvelle question
                socketInstance.on('nextQuestion', (newQuestions) => {
                    console.log('Questions reçues :', newQuestions);

                    if (Array.isArray(newQuestions) && newQuestions.length > 0) {
                        const randomQuestion = newQuestions[Math.floor(Math.random() * newQuestions.length)];
                        setQuestion(randomQuestion);
                    } else if (newQuestions && typeof newQuestions === "object") {
                        setQuestion(newQuestions);
                    } else {
                        console.error("Aucune question valide reçue.");
                        setFeedback("Aucune question disponible.");
                    }

                    setAnswer('');
                });

                // Écouter le feedback et rediriger vers la page de résultat
                socketInstance.on('answerSubmitted', ({ redirectUrl }) => {
                    if (redirectUrl) {
                        router.push(redirectUrl).then(() => console.log('Redirection effectuée'));
                    }
                });
            } catch (error) {
                console.error("Erreur lors de l'initialisation du jeu :", error);
                setFeedback("Erreur lors du chargement de la session.");
            }

            // Nettoyage lors du démontage
            return () => {
                socketInstance.off('nextQuestion');
                socketInstance.off('answerSubmitted');
                socketInstance.disconnect();
            };
        };

        initializeGame();
    }, [router]);

    const handleAnswerChange = (e) => {
        setAnswer(e.target.value);
    };

    const handleSubmit = (event) => {
        event.preventDefault();
        const storedPlayer = getStoredUserData();
        if (!answer) {
            console.log('Aucune réponse donnée');
            return;
        }

        console.log('Réponse envoyée:', answer, "questionID", question?.id);

        socket.emit('submitAnswer', {
            sessionId: storedPlayer.sessionId,
            questionId: question?.id,
            answer,
        });
    };

    const handleActionSuccess = (message) => {
        console.log(message);
        setFeedback(message);
        const storedPlayer = getStoredUserData();
        socket.emit('submitAnswer', {
            sessionId: storedPlayer.sessionId,
            questionId: question?.id,
            answer: "action_success",
        });
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center text-white">
            <RoleSlide />


            <div className="w-full max-w-lg flex flex-col items-center py-20 space-y-8">
                <h1 className="text-6xl font-Amatic text-yellow-400">
                    Énigme
                </h1>

                {question ? (
                    <div className="w-full max-w-md text-center">
                        <h2 className="text-3xl font-Amatic mb-6">{question.question}</h2>
                        {question.type === "action" ? (
                            <ActionQuestion question={question} onSuccess={handleActionSuccess} socket={socket}/>
                        ) : (
                            <form className="flex flex-col items-center space-y-4" onSubmit={handleSubmit}>
                                <input
                                    type="text"
                                    name="answer"
                                    placeholder="Votre réponse"
                                    value={answer}
                                    onChange={handleAnswerChange}
                                    className="w-full p-3 bg-black text-white border border-gray-500 rounded-lg mb-6"
                                />
                                <Button
                                    label="Envoyer"
                                    onClick={handleSubmit}
                                    className={`py-3 ${answer ? 'bg-black text-green-500 border-green-500' : 'text-gray-300 border-gray-500 cursor-not-allowed'}`}
                                />
                            </form>
                        )}
                        {feedback && <p className="text-green-500 mt-4">{feedback}</p>}
                    </div>
                ) : (
                    <p className="text-xl text-gray-400">Chargement des questions...</p>
                )}
            </div>
        </div>
    );
}
