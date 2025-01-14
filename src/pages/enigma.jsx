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
    const [activePlayer, setActivePlayer] = useState(null);
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

            // Initialisation du socket
            const socketInstance = io({ path: '/api/socket' });
            setSocket(socketInstance);
            console.log("Socket initialisé, socket.id =", socketInstance.id);

            try {
                // Récupérer la session pour filtrer les questions déjà posées
                const responseGet = await axios.get("/api/session", {
                    params: { id: storedPlayer.sessionId },
                });
                const toFilterQuestion = responseGet.data.questions || [];
                console.log("Questions à filtrer :", toFilterQuestion);

                // Émission de joinSession
                console.log("Envoi de joinSession", storedPlayer.sessionId, {
                    name: storedPlayer.name,
                    id: storedPlayer.id,
                });
                socketInstance.emit('joinSession', storedPlayer.sessionId, {
                    name: storedPlayer.name,
                    id: storedPlayer.id,
                });

                // Lancer la première question
                console.log("Envoi de launchQuestions", storedPlayer.sessionId, toFilterQuestion);
                socketInstance.emit('launchQuestions', storedPlayer.sessionId, toFilterQuestion);

                // Écouter l'événement nextQuestion
                socketInstance.on('nextQuestion', (data) => {
                    console.log('Nouvelle question reçue :', data);
                    setQuestion(data.question);
                    setActivePlayer(data.activePlayer);
                    setAnswer('');
                });

                // Écouter l'événement answerSubmitted qui doit contenir redirectUrl
                socketInstance.on('answerSubmitted', ({ redirectUrl }) => {
                    console.log("Événement answerSubmitted reçu, redirectUrl =", redirectUrl);
                    if (redirectUrl) {
                        router.push(redirectUrl).then(() => console.log('Redirection effectuée vers', redirectUrl));
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

    // Lors de la soumission de la réponse
    const handleSubmit = (event) => {
        event.preventDefault();
        const storedPlayer = getStoredUserData();
        if (!answer) {
            console.log('Aucune réponse donnée');
            return;
        }
        if (!question?.id) {
            console.log("ID de la question non défini");
            return;
        }
        console.log('Réponse envoyée:', answer, "pour la question ID", question.id);

        // (Optionnel) marquer le joueur dans le sessionStorage
        sessionStorage.setItem('I_AM_LAST_ANSWERER', 'true');

        // Vérifier que le socket est bien initialisé
        if (!socket) {
            console.error("Socket non initialisé");
            return;
        }

        // Émission de l'événement submitAnswer
        socket.emit('submitAnswer', {
            sessionId: storedPlayer.sessionId,
            questionId: question.id,
            answer,
            playerId: storedPlayer.id,
        });
        console.log("ICI MAYBEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEE",storedPlayer.id)
        console.log("Événement submitAnswer émis");
    };

    const handleActionSuccess = () => {
        const storedPlayer = getStoredUserData();
        console.log("ICI NONONONONONONONONONON", storedPlayer.id)
        socket.emit('submitAnswer', {
            sessionId: storedPlayer.sessionId,
            questionId: question?.id,
            answer: question.answer,
            playerId: storedPlayer.id,
        });
        console.log("Événement submitAnswer (action) émis");
    };

    // Affichage conditionnel : si c'est le joueur actif, on affiche le formulaire pour répondre
    const storedPlayer = getStoredUserData();
    const amIActive = activePlayer && storedPlayer && Number(activePlayer.id) === Number(storedPlayer.id);

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
