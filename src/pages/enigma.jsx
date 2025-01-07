import {useState, useEffect} from 'react';
import {useRouter} from 'next/router';
import io from 'socket.io-client';
import RoleSlide from "../components/_roleSlide";
import Button from "../components/_button";
import axios from "axios";

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
        async function fetchData() {
            let storedPlayer = getStoredUserData();

            // Initialiser la connexion Socket.IO
            const socketInstance = io({
                path: '/api/socket',
            });

            setSocket(socketInstance);

            // Obtenir les questions depuis l'API
            const responseGet = await axios.get("/api/session", {
                params: {
                    id: storedPlayer.sessionId,
                }
            });
            const toFilterQuestion = responseGet.data.questions;
            console.log(toFilterQuestion);

            // Émettre les événements
            socketInstance.emit('joinSession', storedPlayer.sessionId, { name: storedPlayer.name });
            socketInstance.emit('launchQuestions', storedPlayer.sessionId, toFilterQuestion);

            // Écouter l'événement 'nextQuestion' pour recevoir une nouvelle question
            socketInstance.on('nextQuestion', (newQuestion) => {
                console.log('Question reçue :', newQuestion);
                setQuestion(newQuestion);
                setAnswer(''); // Réinitialiser la réponse
                setFeedback(''); // Réinitialiser le feedback
            });

            // Écouter le feedback et rediriger vers la page de résultat
            socketInstance.on('answerSubmitted', ({ redirectUrl }) => {
                if (redirectUrl) {
                    router.push(redirectUrl);
                }
            });

            // Fonction de nettoyage pour déconnecter le socket
            return () => {
                socketInstance.off('nextQuestion');
                socketInstance.off('answerSubmitted');
                socketInstance.disconnect(); // Déconnecter le socket
            };
        }

        // Appel immédiat de la fonction async
        fetchData();
    }, [router]);


    const handleAnswerChange = (e) => {
        setAnswer(e.target.value);
    };

    const handleSubmit = () => {
        let storedPlayer = getStoredUserData();
        if (answer === '') {
            console.log('Aucune réponse donnée');
            return;
        }

        console.log('Réponse envoyée:', answer, "questionID", question.id);

        // Émettre la réponse via WebSocket pour validation
        socket.emit('submitAnswer', {sessionId: storedPlayer.sessionId, questionId: question.id, answer});
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center text-white ">
            {/* <RoleSlide /> */}

            <div className="w-full max-w-lg flex flex-col items-center py-20 space-y-12">
                <h1 className="text-6xl font-Amatic text-yellow-400 mb-12">
                    Énigme
                </h1>
                {question ? (
                    <div className="w-full max-w-md text-center">
                        <h2 className="text-3xl font-Amatic mb-6">{question.question}</h2>
                        <form className="flex flex-col items-center space-y-4">
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
                    </div>
                ) : (
                    <p className="text-xl text-gray-400">Chargement...</p>
                )}
            </div>
        </div>
    );
}
