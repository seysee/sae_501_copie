// src/pages/result.jsx
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import io from 'socket.io-client';
import axios from 'axios';
import { decryptParam } from '../lib/cryptoUtils';
import Hint from "../components/hint";

let socket;

export default function Result() {
    const router = useRouter();

    const [isLoading, setIsLoading] = useState(true);
    const [feedback, setFeedback] = useState('');
    const [correct, setCorrect] = useState(false);
    const [showButton, setShowButton] = useState(false);
    const [latestUnlockedHint, setLatestUnlockedHint] = useState(null);

    // États pour gérer la modal des indices
    const [showModal, setShowModal] = useState(false);
    const [accumulatedHints, setAccumulatedHints] = useState([]);

    const { questionId, answer } = router.query;

    useEffect(() => {
        if (!socket) {
            socket = io({ path: '/api/socket' });
            const storedPlayerStr = sessionStorage.getItem('userData');
            if (storedPlayerStr) {
                const storedPlayer = JSON.parse(storedPlayerStr);
                if (storedPlayer.sessionId) {
                    socket.emit('joinSession', storedPlayer.sessionId, {
                        name: storedPlayer.name,
                        id: storedPlayer.id,
                    });
                }
            }
        }
        const redirectHandler = () => {
            window.location.href = '/enigma';
        };
        socket.on('redirectToEnigma', redirectHandler);
        return () => {
            socket.off('redirectToEnigma', redirectHandler);
        };
    }, []);

    useEffect(() => {
          if (socket) {
                  socket.on('refreshHints', () => {
                           loadAccumulatedHintsSoFar();
                       });

                       return () => {
                           socket.off('refreshHints');
                      };
              }
    }, []);

    useEffect(() => {
        const processQuestion = async () => {
            if (questionId && answer) {
                const answeredData = sessionStorage.getItem(`answered_${questionId}`);
                if (!answeredData) {
                    try {
                        const decryptedQuestionId = decryptParam(questionId);
                        const decryptedAnswer = decryptParam(answer);
                        const result = await verifyResponse(decryptedQuestionId, decryptedAnswer);
                        await rememberQuestion(decryptedQuestionId);
                        // Sauvegarde dans sessionStorage pour éviter de retraiter la même question
                        sessionStorage.setItem(
                            `answered_${questionId}`,
                            JSON.stringify({
                                correct: result.correct,
                                feedback: result.message
                            })
                        );
                    } catch (error) {
                        console.error("Erreur de décryptage ou de vérification :", error);
                        setIsLoading(false);
                    }
                } else {
                    const parsedData = JSON.parse(answeredData);
                    setCorrect(parsedData.correct);
                    setFeedback(parsedData.feedback);
                    // Récupère les indices depuis la BDD pour être à jour
                    loadAccumulatedHintsSoFar();
                    setIsLoading(false);
                }
            } else {
                setIsLoading(false);
            }
        };

        processQuestion();
    }, [questionId, answer]);






    useEffect(() => {
        defineButtonVisibility();
    }, []);

    // Fonction pour charger tous les hints accumulés
    const loadAccumulatedHintsSoFar = async () => {
        try {
            const storedPlayerStr = sessionStorage.getItem('userData');
            if (!storedPlayerStr) return;
            const storedPlayer = JSON.parse(storedPlayerStr);
            const sessionId = storedPlayer.sessionId;

            const sessionResp = await axios.get("/api/session", { params: { id: sessionId } });
            const sessionData = sessionResp.data;

            let usedHints = [];
            try {
                usedHints = JSON.parse(sessionData.hints);
                if (!Array.isArray(usedHints)) usedHints = [];
            } catch (e) {
                usedHints = [];
            }

            if (sessionData.killerId) {
                const allHintsResp = await axios.get("/api/suspect_hints", {
                    params: { suspectId: sessionData.killerId },
                });
                const suspectHints = allHintsResp.data;

                const matched = suspectHints.filter((h) => usedHints.includes(h.id));
                matched.sort((a, b) => b.id - a.id);
                setLatestUnlockedHint(matched[0] || null);
                setAccumulatedHints(matched);

                // Sauvegarder les indices dans sessionStorage
                const answeredData = sessionStorage.getItem(`answered_${questionId}`);
                if (answeredData) {
                    const parsedData = JSON.parse(answeredData);
                    parsedData.accumulatedHints = matched;
                    sessionStorage.setItem(`answered_${questionId}`, JSON.stringify(parsedData));
                }
            }
        } catch (err) {
            console.error("Erreur loadAccumulatedHintsSoFar :", err);
        }
    };


    const defineButtonVisibility = async () => {
        try {
            const storedPlayerStr = sessionStorage.getItem('userData');
            if (!storedPlayerStr) return;
            const storedPlayer = JSON.parse(storedPlayerStr);
            if (!storedPlayer.sessionId || !storedPlayer.id) return;

            const sessionId = storedPlayer.sessionId;
            const myId = storedPlayer.id;

            const sessionResp = await axios.get("/api/session", { params: { id: sessionId } });
            const serverSession = sessionResp.data;
            const aIndex = serverSession.activePlayerIndex;

            const playersResp = await axios.get("/api/player", { params: { sessionId: sessionId } });
            const players = playersResp.data;

            if (players.length === 1) {
                setShowButton(true);
                return;
            }

            if (typeof aIndex === 'number' && Array.isArray(players)) {
                if (parseInt(players[aIndex]?.id) === parseInt(myId)) {
                    setShowButton(true);
                } else {
                    setShowButton(false);
                }
            }
        } catch (err) {}
    };

    const handleReturnHome = useCallback(() => {
        const storedPlayerStr = sessionStorage.getItem('userData');
        if (!storedPlayerStr) return;
        const storedPlayer = JSON.parse(storedPlayerStr);
        if (storedPlayer.sessionId) {
            socket.emit('returnHome', storedPlayer.sessionId);
        }
    }, []);

    const rememberQuestion = async (qid) => {
        try {
            await axios.post("/api/question/remember", { questionId: qid });
        } catch (error) {}
    };

    // Fonction qui enregistre un nouveau hint si des hints sont disponibles
    const addNewHint = async () => {
        try {
            const storedPlayerStr = sessionStorage.getItem('userData');
            if (!storedPlayerStr) return null;
            const storedPlayer = JSON.parse(storedPlayerStr);
            const sessionId = storedPlayer.sessionId;

            const sessionResp = await axios.get("/api/session", { params: { id: sessionId } });
            const sessionData = sessionResp.data;
            if (!sessionData) return null;

            let usedHints = [];
            try {
                usedHints = JSON.parse(sessionData.hints);
                if (!Array.isArray(usedHints)) usedHints = [];
            } catch (e) {
                usedHints = [];
            }

            const killerId = sessionData.killerId;
            if (!killerId) return null;

            // Récupérer les hints non encore utilisés
            const hintsResp = await axios.get("/api/suspect_hints", { params: { suspectId: killerId } });
            const suspectHints = hintsResp.data;
            const availableHints = suspectHints.filter(h => !usedHints.includes(h.id));

            if (availableHints.length === 0) {
                console.log("Tous les indices ont déjà été découverts.");
                return null;
            }

            // Choisir un nouvel indice au hasard
            const randomIndex = Math.floor(Math.random() * availableHints.length);
            const chosenHint = availableHints[randomIndex];

            // Mettre à jour la liste des indices utilisés
            usedHints.push(chosenHint.id);

            // Mettre à jour la BDD
            await axios.put("/api/session", {
                id: sessionData.id,
                hints: JSON.stringify(usedHints)
            });
            if(socket) {
                          socket.emit('newHintAdded', sessionId);
                       }

            // Stocker et afficher directement le nouvel indice
            setLatestUnlockedHint(chosenHint);

            console.log("Nouvel indice débloqué:", chosenHint.id);

            return chosenHint; // Retourner le nouvel indice débloqué
        } catch (error) {
            console.error("Erreur lors de l'ajout d'un nouvel indice:", error);
            return null;
        }
    };




    const verifyResponse = async (qId, ans) => {
        let result = { correct: false, message: "" };
        try {
            const response = await axios.post("/api/question/answer", {
                id: qId,
                answer: ans
            });
            setFeedback(response.data.message);
            setCorrect(response.data.correct);
            result.correct = response.data.correct;
            result.message = response.data.message;

            if (response.data.correct) {
                // Débloquer un indice (celui‑ci déclenchera une synchro via socket)
                await addNewHint();
            }
        } catch (error) {
            setFeedback("Erreur lors de la vérification. Veuillez réessayer.");
            result.message = "Erreur lors de la vérification.";
        } finally {
            setIsLoading(false);
            setTimeout(() => {
                defineButtonVisibility();
            }, 500);
            // Recharge la liste des indices depuis la BDD
            loadAccumulatedHintsSoFar();
        }
        return result;
    };









    // Détermine le dernier indice ajouté (premier élément du tableau trié décroissant)
    const latestHint = accumulatedHints.length > 0 ? accumulatedHints[0] : null;

    return (
        <div className="min-h-screen flex flex-col items-center justify-start text-white bg-black font-Amatic relative">
            {/* Titre de la réponse */}
            {isLoading ? (
                <h1 className="text-5xl mt-10 mb-6 text-yellow-400 animate-pulse font-Amatic">Chargement...</h1>
            ) : correct ? (
                <h1 className="text-5xl mt-10 mb-4 text-green-500 font-Amatic">Bonne Réponse !</h1>
            ) : (
                <h1 className="text-5xl mt-10 mb-4 text-red-500 font-Amatic">Mauvaise Réponse !</h1>
            )}

            {/* Feedback plus haut */}
            {!isLoading && <p className="text-2xl mb-8 text-center font-Amatic">{feedback}</p>}

            {/* Indice sans background */}
            {!isLoading && correct && accumulatedHints.length > 0 && (
                     <div className="text-3xl text-white font-bold font-Amatic mb-8">
                             <Hint hint={accumulatedHints[0]} />
                         </div>
                 )}

            {/* Bouton pour passer à la prochaine question */}
            {showButton && !isLoading && (
                <button
                    onClick={handleReturnHome}
                    className="mt-8 py-4 px-16 text-3xl font-extrabold border-4 border-white text-white rounded-lg hover:bg-white hover:text-black transition-all duration-300 transform hover:scale-110 shadow-2xl font-Amatic"
                >
                    Passer à la prochaine question
                </button>
            )}

            {/* Barre Fixe pour Ouvrir la Modal */}
            <div
                onClick={() => setShowModal(true)}
                className="cursor-pointer fixed bottom-0 left-0 w-full bg-gray-700 text-gray-400 py-3 text-center font-Amatic hover:bg-gray-600 transition-colors duration-300 border-t border-gray-800"
            >
                Voir mes indices découverts
            </div>

            {/* Modal avec Animation */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end justify-center z-50 font-Amatic">
                    {/* Overlay pour Fermer la Modal */}
                    <div
                        className="absolute inset-0"
                        onClick={() => setShowModal(false)}
                    ></div>

                    {/* Contenu de la Modal */}
                    <div
                        className="bg-gradient-to-t from-gray-900 to-gray-800 w-full max-w-md rounded-t-lg p-6 transform transition-transform duration-500 translate-y-0 animate-slide-up font-Amatic"
                    >
                        <h2 className="text-3xl font-bold mb-4 text-white font-Amatic">Indices accumulés</h2>
                        <ul className="space-y-2 max-h-60 overflow-auto p-2 border border-gray-600 rounded font-Amatic">
                            {accumulatedHints.length > 0 ? (
                                accumulatedHints.map((h) => (
                                    <li key={h.id}
                                        className="p-2 border-b border-gray-500 last:border-b-0 text-gray-300 font-Amatic">
                                        {h.hintText}
                                    </li>
                                ))
                            ) : (
                                <li className="text-gray-400 font-Amatic">Aucun indice trouvé jusqu'à présent.</li>
                            )}
                        </ul>

                        {/* Bouton pour Fermer la Modal */}
                        <button
                            onClick={() => setShowModal(false)}
                            className="mt-4 w-full py-2 px-4 bg-white text-gray-800 rounded-lg hover:bg-gray-200 transition-colors duration-300 font-Amatic"
                        >
                            Fermer
                        </button>
                    </div>
                </div>
            )}

            {/* Styles Additionnels pour l'Animation de la Modal */}
            <style jsx>{`
                @keyframes slide-up {
                    from {
                        transform: translateY(100%);
                    }
                    to {
                        transform: translateY(0);
                    }
                }

                .animate-slide-up {
                    animation: slide-up 0.5s ease-out forwards;
                }
            `}</style>
        </div>
    );


}
