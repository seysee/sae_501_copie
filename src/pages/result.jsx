import {useEffect, useState, useCallback} from 'react';
import {useRouter} from 'next/router';
import io from 'socket.io-client';
import axios from 'axios';
import {decryptParam} from '../lib/cryptoUtils';
import Hint from "../components/hint";
import FancyLoader from "../components/_loader";
import {applyNextWorkerFixture} from "next/dist/experimental/testmode/playwright/next-worker-fixture";

let socket;

export default function Result() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(true);
    const [feedback, setFeedback] = useState('');
    const [correct, setCorrect] = useState(false);
    const [showButton, setShowButton] = useState(false);
    const [latestUnlockedHint, setLatestUnlockedHint] = useState(null);

    const [showModal, setShowModal] = useState(false);
    const [accumulatedHints, setAccumulatedHints] = useState([]);

    const {questionId, answer} = router.query;
    const [solution, setSolution] = useState("")

    useEffect(() => {
        if (!socket) {
            socket = io({path: '/api/socket'});
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

        socket.on('redirectToEnigma', () => router.push('/enigma').then(() => null));
        return () => {
            socket.off('redirectToEnigma', null);
        };
    }, [router]);

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
            try {
                if (questionId && answer) {
                    const answeredData = sessionStorage.getItem(`answered_${questionId}`);
                    if (!answeredData) {
                        // 1er traitement de la question
                        try {
                            const decryptedQuestionId = decryptParam(questionId);
                            const decryptedAnswer = decryptParam(answer);
                            await verifyResponse(decryptedQuestionId, decryptedAnswer);
                            await rememberQuestion(decryptedQuestionId);
                        } catch (error) {
                            console.error("Erreur de décryptage/vérification :", error);
                        }
                    } else {
                        // Déjà traité
                        const parsedData = JSON.parse(answeredData);
                        setCorrect(parsedData.correct);
                        setFeedback(parsedData.feedback);

                        // Récupère les indices depuis la BDD pour être à jour
                        await loadAccumulatedHintsSoFar();
                    }
                } else {
                    // Pas de question ni de réponse => pas de verification
                }
            } catch (err) {
                console.error("processQuestion error:", err);
            }

            // FORÇONS 2 secondes de loader avant de l’enlever
            await new Promise((r) => setTimeout(r, 2000));
            setIsLoading(false);
            // Ensuite on vérifie qui a le droit de cliquer sur "Prochaine question"
            defineButtonVisibility();
        };

        processQuestion();
    }, [questionId, answer]);

    useEffect(() => {
        defineButtonVisibility();
    }, []);

    useEffect(() => {
        const fetchQuestionDetails = async () => {
            const decryptedQuestionId = decryptParam(questionId);

            console.log("QUESTION ID", decryptedQuestionId)
            if (decryptedQuestionId) {

                try {
                    const responseQuestion = await axios.get("/api/question/question", {
                        params: {id: decryptedQuestionId},
                    });
                    console.log("RESPONSE DE QUESTION", responseQuestion.data);
                    if (responseQuestion.data.type !== "action") {
                        setSolution(responseQuestion.data.solution);
                    }

                } catch (error) {
                    console.error("Erreur lors de la récupération de la question :", error);
                }
            }
        };

        fetchQuestionDetails();
    }, [questionId]); // Déclenché uniquement lorsque questionId change


    const loadAccumulatedHintsSoFar = async () => {
        try {
            const storedPlayerStr = sessionStorage.getItem('userData');
            if (!storedPlayerStr) return;
            const storedPlayer = JSON.parse(storedPlayerStr);
            const sessionId = storedPlayer.sessionId;

            const sessionResp = await axios.get("/api/session", {params: {id: sessionId}});
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
                    params: {suspectId: sessionData.killerId},
                });
                const suspectHints = allHintsResp.data;

                // Construire le tableau des indices dans l'ordre d'ajout
                const matched = usedHints
                    .map(id => suspectHints.find(h => h.id === id))
                    .filter(h => h !== undefined);

                const newestHint = matched.length > 0 ? matched[matched.length - 1] : null;
                setLatestUnlockedHint(newestHint);
                setAccumulatedHints(matched);
                console.log("LATEST HINT", latestUnlockedHint)

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

            const sessionResp = await axios.get("/api/session", {params: {id: sessionId}});
            const serverSession = sessionResp.data;
            const aIndex = serverSession.activePlayerIndex;

            const playersResp = await axios.get("/api/player", {params: {sessionId: sessionId}});
            const players = playersResp.data;

            // Session solo ?
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
        } catch (err) {
            console.error("Erreur defineButtonVisibility:", err);
        }
    };

    const handleNextQuestion = useCallback(() => {
        const storedPlayer = JSON.parse(sessionStorage.getItem('userData'));
        socket.emit('nextQuestion', storedPlayer.sessionId);
    }, []);

    const rememberQuestion = async (qId) => {
        try {
            const storedPlayerStr = sessionStorage.getItem('userData');
            if (!storedPlayerStr) return;
            const storedPlayer = JSON.parse(storedPlayerStr);
            const sessionId = storedPlayer.sessionId;

            const sessionResp = await axios.get("/api/session", {params: {id: sessionId}});
            const sessionData = sessionResp.data;
            if (!sessionData) return;

            let currentQuestions = [];
            if (sessionData.questions) {
                try {
                    currentQuestions = JSON.parse(sessionData.questions);
                    if (!Array.isArray(currentQuestions)) {
                        currentQuestions = [];
                    }
                } catch (e) {
                    currentQuestions = [];
                }
            }

            if (!currentQuestions.includes(qId)) {
                currentQuestions.push(qId);
            }

            await axios.put("/api/session", {
                id: sessionId,
                questions: currentQuestions,
            });

            console.log(`Question ${qId} ajoutée à la session ${sessionId}`);
        } catch (error) {
            console.error("Erreur ajout question session:", error);
        }
    };

    // Ajoute un nouvel indice (si la réponse est correcte, etc.)
    const addNewHint = async () => {
        try {
            const storedPlayerStr = sessionStorage.getItem('userData');
            if (!storedPlayerStr) return null;
            const storedPlayer = JSON.parse(storedPlayerStr);
            const sessionId = storedPlayer.sessionId;

            const sessionResp = await axios.get("/api/session", {params: {id: sessionId}});
            const sessionData = sessionResp.data;
            if (!sessionData) return null;

            if (sessionData.answeredCount && sessionData.answeredCount > 0) {
                console.log("Un indice a déjà été débloqué pour cette question.");
                return null;
            }

            let usedHints = [];
            try {
                usedHints = JSON.parse(sessionData.hints);
                if (!Array.isArray(usedHints)) usedHints = [];
            } catch (e) {
                usedHints = [];
            }

            const killerId = sessionData.killerId;
            if (!killerId) return null;

            const hintsResp = await axios.get("/api/suspect_hints", {params: {suspectId: killerId}});
            const suspectHints = hintsResp.data;
            const availableHints = suspectHints.filter(h => !usedHints.includes(h.id));

            if (availableHints.length === 0) {
                console.log("Tous les indices sont déjà découverts.");
                return null;
            }

            const randomIndex = Math.floor(Math.random() * availableHints.length);
            const chosenHint = availableHints[randomIndex];
            usedHints.push(chosenHint.id);

            await axios.put("/api/session", {
                id: sessionData.id,
                hints: JSON.stringify(usedHints),
                answeredCount: 1
            });

            if (socket) {
                socket.emit('newHintAdded', sessionId);
            }

            setLatestUnlockedHint(chosenHint);
            console.log("Nouvel indice débloqué:", chosenHint.id);
            return chosenHint;
        } catch (error) {
            console.error("Erreur ajout nouvel indice:", error);
            return null;
        }
    };

    const verifyResponse = async (qId, ans) => {
        let result = {correct: false, message: ""};
        try {
            const response = await axios.post("/api/question/answer", {
                id: qId,
                answer: ans
            });
            setFeedback(response.data.message);
            setCorrect(response.data.correct);

            result.correct = response.data.correct;
            result.message = response.data.message;

            // Si c'est correct, on débloque un indice
            if (response.data.correct) {
                await addNewHint();
            }
        } catch (error) {
            setFeedback("Erreur lors de la vérification. Veuillez réessayer.");
            result.message = "Erreur de vérification.";
        } finally {
            // Recharge la liste des indices
            await loadAccumulatedHintsSoFar();
        }
        return result;
    };

    const latestHint = accumulatedHints.length > 0 ? accumulatedHints[accumulatedHints.length - 1] : null;

    return (
        <div className="min-h-screen flex flex-col items-center justify-start text-white bg-black font-Amatic relative">
            {isLoading ? (
                <FancyLoader/>
            ) : (

                <>
                    {correct ? (
                        <h1 className="text-5xl mt-10 mb-4 text-green-500 font-Amatic">Bonne Réponse !</h1>
                    ) : (
                        <h1 className="text-5xl mt-10 mb-4 text-red-500 font-Amatic">Mauvaise Réponse !</h1>
                    )}

                    <p className="text-2xl mb-8 text-center font-Amatic">{feedback}</p>

                    {correct && latestHint && (
                        <div className="text-3xl text-white font-bold font-Amatic mb-8">
                            <Hint hint={latestHint}/>
                        </div>
                    )}

                    {!correct && solution && (
                        <p className="text-xl text-white font-Amatic mb-8">
                            La réponse était <span className="font-bold font-Amatic">"{solution}"</span>
                        </p>
                    )}

                    {showButton && (
                        <button
                            onClick={handleNextQuestion}
                            className="mt-8 py-4 px-16 text-2xl font-extrabold border-4 border-white text-white rounded-lg hover:bg-white hover:text-black transition-all duration-300 transform hover:scale-110 shadow-2xl font-Amatic"
                        >
                            Passer à la prochaine question
                        </button>
                    )}
                </>

            )}

            <div
                onClick={() => setShowModal(true)}
                className="cursor-pointer fixed bottom-0 left-0 w-full bg-gray-700 text-gray-400 py-3 text-center font-Amatic hover:bg-gray-600 transition-colors duration-300 border-t border-gray-800"
            >
                Voir mes indices découverts
            </div>


            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end justify-center z-50 font-Amatic">
                    {/* Overlay pour fermer */}
                    <div
                        className="absolute inset-0"
                        onClick={() => setShowModal(false)}
                    ></div>

                    <div
                        className="bg-gradient-to-t from-gray-900 to-gray-800 w-full max-w-md rounded-t-lg p-6 transform transition-transform duration-500 translate-y-0 animate-slide-up font-Amatic"
                    >
                        <h2 className="text-3xl font-bold mb-4 text-white">Indices accumulés</h2>
                        <ul className="space-y-2 max-h-60 overflow-auto p-2 border border-gray-600 rounded">
                            {accumulatedHints.length > 0 ? (
                                accumulatedHints.map((h) => (
                                    <li
                                        key={h.id}
                                        className="p-2 border-b border-gray-500 last:border-b-0 text-gray-300"
                                    >
                                        {h.hintText}
                                    </li>
                                ))
                            ) : (
                                <li className="text-gray-400">Aucun indice trouvé pour l'instant.</li>
                            )}
                        </ul>

                        <button
                            onClick={() => setShowModal(false)}
                            className="mt-4 w-full py-2 px-4 bg-white text-gray-800 rounded-lg hover:bg-gray-200 transition-colors duration-300"
                        >
                            Fermer
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
