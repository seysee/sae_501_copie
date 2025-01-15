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

    // Ancien state coulissant — on le commente (sans le supprimer)
    // const [showAllHints, setShowAllHints] = useState(false);

    // On garde le state pour la liste des hints
    const [accumulatedHints, setAccumulatedHints] = useState([]);

    // AJOUT : un nouveau state pour gérer l’ouverture de la modal
    const [showModal, setShowModal] = useState(false);

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
        if (questionId && answer) {
            try {
                const decryptedQuestionId = decryptParam(questionId);
                const decryptedAnswer = decryptParam(answer);
                verifyResponse(decryptedQuestionId, decryptedAnswer);
                rememberQuestion(decryptedQuestionId);
            } catch (error) {
                setIsLoading(false);
            }
        } else {
            setIsLoading(false);
        }
    }, [questionId, answer]);

    useEffect(() => {
        defineButtonVisibility();
    }, []);

    // Ancienne fonction coulissante
    // const [showAllHints, setShowAllHints] = useState(false);
    // On la laisse commentée :
    /*
    <div className={`transition-all duration-500 overflow-hidden w-full
        ${showAllHints ? 'max-h-96' : 'max-h-0'}`}>
        ...
    </div>
    */

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
                // Garde seulement ceux qui sont déjà découverts
                const matched = suspectHints.filter((h) => usedHints.includes(h.id));

                setAccumulatedHints(matched);
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

    // AJOUT: Fonction qui enregistre UN SEUL hint si la colonne "hints" est encore vide.
    const addOneHintIfNone = async () => {
        try {
            const storedPlayerStr = sessionStorage.getItem('userData');
            if (!storedPlayerStr) return;
            const storedPlayer = JSON.parse(storedPlayerStr);
            const sessionId = storedPlayer.sessionId;

            const sessionResp = await axios.get("/api/session", { params: { id: sessionId } });
            const sessionData = sessionResp.data;
            if (!sessionData) return;

            let usedHints;
            try {
                usedHints = JSON.parse(sessionData.hints);
                if (!Array.isArray(usedHints)) usedHints = [];
            } catch (e) {
                usedHints = [];
            }

            if (usedHints.length > 0) {
                return;
            }

            const killerId = sessionData.killerId;
            if (!killerId) return;

            const hintsResp = await axios.get("/api/suspect_hints", {
                params: { suspectId: killerId },
            });
            const suspectHints = hintsResp.data;
            if (!Array.isArray(suspectHints) || suspectHints.length === 0) {
                return;
            }

            const chosenHint = suspectHints[0];
            usedHints.push(chosenHint.id);

            await axios.put("/api/session", {
                id: sessionData.id,
                hints: JSON.stringify(usedHints)
            });
        } catch (error) {
            console.error("Erreur addOneHintIfNone:", error);
        }
    };

    const verifyResponse = async (qId, ans) => {
        try {
            const response = await axios.post("/api/question/answer", {
                id: qId,
                answer: ans
            });
            setFeedback(response.data.message);
            setCorrect(response.data.correct);

            if (response.data.correct) {
                await addOneHintIfNone();
            }
        } catch (error) {
            setFeedback("Erreur lors de la vérification. Veuillez réessayer.");
        } finally {
            setIsLoading(false);
            setTimeout(() => {
                defineButtonVisibility();
            }, 500);

            // On recharge la liste des hints accumulés
            loadAccumulatedHintsSoFar();
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center text-white relative">
            {/* On commente l'ancien titre (sans le supprimer) */}
            {/* <h1 className="text-4xl mb-4">Résultat de la Réponse</h1> */}

            {isLoading ? (
                <h1 className="text-4xl mb-4 text-yellow-400">Chargement...</h1>
            ) : correct ? (
                <h1 className="text-4xl mb-4 text-green-500">Bonne Réponse !</h1>
            ) : (
                <h1 className="text-4xl mb-4 text-red-500">Mauvaise Réponse !</h1>
            )}

            {!isLoading && <p className="text-xl">{feedback}</p>}

            {!isLoading && correct && <Hint />}

            {showButton && !isLoading && (
                // On change le style pour un simple border blanche
                <button
                    onClick={handleReturnHome}
                    className="mt-4 py-2 px-6
                               border border-white
                               text-white
                               rounded-lg
                               hover:bg-white hover:text-black
                               transition-all duration-300
                               transform hover:scale-105"
                >
                    Passer à la prochaine question
                </button>
            )}

            {/* AJOUT : Barrette en bas de l'écran (fixée) qui ouvre la modal */}
            <div
                onClick={() => setShowModal(true)}
                className="cursor-pointer fixed bottom-4 left-1/2 transform -translate-x-1/2
                           w-64 bg-black bg-opacity-70 border border-white
                           text-white p-2 text-center rounded-lg
                           hover:bg-opacity-90 transition-all duration-300"
            >
                Voir mes indices découverts
            </div>

            {/* AJOUT : Modal centrée qui affiche la liste accumulatedHints */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50">
                    <div className="bg-white text-black p-4 rounded w-[90%] max-w-lg relative">
                        <h2 className="text-xl font-bold mb-4">Indices accumulés</h2>
                        <ul className="space-y-2 max-h-60 overflow-auto p-2 border border-gray-300 rounded">
                            {accumulatedHints.map((h) => (
                                <li key={h.id} className="p-2 border-b border-gray-200 last:border-b-0">
                                    {h.hintText}
                                </li>
                            ))}
                        </ul>

                        {/* Bouton pour fermer la modal */}
                        <button
                            onClick={() => setShowModal(false)}
                            className="border border-gray-600 px-4 py-2 mt-4 rounded hover:bg-gray-600 hover:text-white"
                        >
                            Fermer
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
