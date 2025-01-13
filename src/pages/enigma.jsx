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
    const [activePlayer, setActivePlayer] = useState(null); // <-- NOUVEAU
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
            const socketInstance = io({ path: '/api/socket' });
            setSocket(socketInstance);

            try {
                // Récupère la session pour filtrer les questions déjà posées
                const responseGet = await axios.get("/api/session", {
                    params: { id: storedPlayer.sessionId },
                });
                const toFilterQuestion = responseGet.data.questions || [];
                console.log("Questions à filtrer :", toFilterQuestion);

                // Rejoindre la session
                socketInstance.emit('joinSession', storedPlayer.sessionId, {
                    name: storedPlayer.name,
                    id: storedPlayer.id  // <-- S’assurer qu’on identifie bien le player
                });

                // Lancer la première question
                socketInstance.emit('launchQuestions', storedPlayer.sessionId, toFilterQuestion);

                // Écouter la prochaine question
                socketInstance.on('nextQuestion', (data) => {
                    // data = { question, activePlayer }
                    console.log('Nouvelle question reçue :', data);
                    setQuestion(data.question);
                    setActivePlayer(data.activePlayer); // <-- NOUVEAU
                    setAnswer('');
                });

                // Écouter la soumission de réponse
                socketInstance.on('answerSubmitted', ({ redirectUrl }) => {
                    if (redirectUrl) {
                        router.push(redirectUrl).then(() => console.log('Redirection effectuée'));
                    }
                });
            } catch (error) {
                console.error("Erreur lors de l'initialisation du jeu :", error);
                setFeedback("Erreur lors du chargement de la session.");
            }

            // Nettoyage
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

    // enigma.jsx (exemple)
    const handleSubmit = (event) => {
        event.preventDefault();
        const storedPlayer = getStoredUserData();
        if (!answer) {
            console.log('Aucune réponse donnée');
            return;
        }

        console.log('Réponse envoyée:', answer, "questionID", question?.id);

        // Marquer CE joueur comme "dernier répondant" dans le sessionStorage
        sessionStorage.setItem('I_AM_LAST_ANSWERER', 'true');

        socket.emit('submitAnswer', {
            sessionId: storedPlayer.sessionId,
            questionId: question?.id,
            answer,
            playerId: storedPlayer.id,
        });

    };


    const handleActionSuccess = (message) => {
        console.log(message);
        setFeedback(message);
        const storedPlayer = getStoredUserData();
        socket.emit('submitAnswer', {
            sessionId: storedPlayer.sessionId,
            questionId: question?.id,
            answer: question.answer,
        });
    };

    // Ici, affichage conditionnel :
    // - Si c'est moi le joueur actif => afficher question + formulaire
    // - Sinon => afficher un message "Pseudo est en train de répondre"
    const storedPlayer = getStoredUserData();
    const amIActive = activePlayer && storedPlayer && activePlayer.id === storedPlayer.id;

    return (
        <div className="min-h-screen flex flex-col items-center justify-center text-white">
            <RoleSlide />

            <div className="w-full max-w-lg flex flex-col items-center py-20 space-y-8">
                <h1 className="text-6xl font-Amatic text-yellow-400">Énigme</h1>

                {question ? (
                    <div className="w-full max-w-md text-center">
                        {amIActive ? (
                            <>
                                <h2 className="text-3xl font-Amatic mb-6">{question.question}</h2>
                                {question.type === "action" ? (
                                    <ActionQuestion
                                        question={question}
                                        onSuccess={handleActionSuccess}
                                        socket={socket}
                                    />
                                ) : (
                                    <form
                                        className="flex flex-col items-center space-y-4"
                                        onSubmit={handleSubmit}
                                    >
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
                                            className={`py-3 ${
                                                answer
                                                    ? 'bg-black text-green-500 border-green-500'
                                                    : 'text-gray-300 border-gray-500 cursor-not-allowed'
                                            }`}
                                        />
                                    </form>
                                )}
                                {feedback && <p className="text-green-500 mt-4">{feedback}</p>}
                            </>
                        ) : (
                            <div>
                                <p className="text-2xl font-bold mb-4">
                                    {activePlayer?.name} est en train de répondre...
                                </p>
                                <p className="text-xl text-gray-300">
                                    Veuillez patienter jusqu’à ce que ce soit votre tour.
                                </p>
                            </div>
                        )}
                    </div>
                ) : (
                    <p className="text-xl text-gray-400">Chargement des questions...</p>
                )}
            </div>
        </div>
    );
}
