import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import io from 'socket.io-client';
import GenericQuestion from "../components/GenericQuestion";
import RoleSlide from "../components/_roleSlide";

export default function Game() {
    const [question, setQuestion] = useState(null);
    const [socket, setSocket] = useState(null);
    const [activePlayer, setActivePlayer] = useState(null);
    const router = useRouter();

    const getStoredUserData = () => {
        try {
            const storedPlayer = sessionStorage.getItem('userData');
            return storedPlayer ? JSON.parse(storedPlayer) : null;
        } catch (error) {
            console.error('Erreur lors de la récupération des données utilisateur:', error);
            return null;
        }
    };

    useEffect(() => {
        const initializeGame = async () => {
            const storedPlayer = getStoredUserData();
            if (!storedPlayer || !storedPlayer.sessionId) {
                console.error("Aucune session utilisateur trouvée.");
                return;
            }

            const socketInstance = io({ path: '/api/socket' });
            setSocket(socketInstance);

            try {
                socketInstance.emit('joinSession', storedPlayer.sessionId, {
                    name: storedPlayer.name,
                    id: storedPlayer.id,
                });

                socketInstance.emit('launchQuestions', storedPlayer.sessionId, []);

                socketInstance.on('nextQuestion', (data) => {
                    setQuestion(data.question);
                    setActivePlayer(data.activePlayer);
                });

                socketInstance.on('answerSubmitted', ({ redirectUrl }) => {
                    if (redirectUrl) {
                        router.push(redirectUrl);
                    }
                });
            } catch (error) {
                console.error("Erreur lors de l'initialisation du jeu :", error);
            }

            return () => {
                socketInstance.off('nextQuestion');
                socketInstance.off('answerSubmitted');
                socketInstance.disconnect();
            };
        };

        initializeGame();
    }, [router]);

    const handleSuccess = () => {
        console.log("Question réussie !");
        const storedPlayer = getStoredUserData();
        if (!storedPlayer || !socket) return;

        socket.emit('submitAnswer', {
            sessionId: storedPlayer.sessionId,
            questionId: question?.id,
            answer: "success",
        });
    };

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
                            <GenericQuestion question={question} onSuccess={handleSuccess} socket={socket} />
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
