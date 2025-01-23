import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import io from 'socket.io-client';
import axios from 'axios';
import { decryptParam } from '../lib/cryptoUtils';
import Hint from "../components/hint";
import FancyLoader from "../components/_loader";

let socket;
let alreadyVerifiedThisQuestion = false;

export default function Result() {
    const router = useRouter();
    const [showConfetti, setShowConfetti] = useState(false);
    const [correct, setCorrect] = useState(null);
    const [rightSolution, setRightSolution] = useState(null);
    const [feedback, setFeedback] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [amIActivePlayer, setAmIActivePlayer] = useState(false);
    const [checkedActivePlayer, setCheckedActivePlayer] = useState(false);
    const [showButton, setShowButton] = useState(false);
    const [latestUnlockedHint, setLatestUnlockedHint] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [accumulatedHints, setAccumulatedHints] = useState([]);

    const { questionId, answer } = router.query;


    const checkAlreadyAnsweredInMemory = () => {
        if (alreadyVerifiedThisQuestion) return true;
        alreadyVerifiedThisQuestion = true;
        return false;
    };

    const handleCorrectAnswer = () => {
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 2000); // Cache après 2 secondes
    };

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
        socket.on('redirectToEnigma', () => router.push('/enigma'));
        return () => {
            socket.off('redirectToEnigma', null);
        };
    }, [router]);


    useEffect(() => {
        if (socket) {
            // Quand la bonne ou mauvaise réponse est donnée par le joueur actif,
            // on récupère ces infos pour TOUS les joueurs (y compris non-actifs).
            socket.on('answerResult', async (data) => {
                setCorrect(data.correct);
                setFeedback(data.feedback);
                // On stocke pour tout le monde, et on associe à l'ID de la question
                // transmis dans "data.questionId"
                if (data.questionId) {
                    const store = { correct: data.correct, feedback: data.feedback };
                    sessionStorage.setItem(`answered_${data.questionId}`, JSON.stringify(store));
                }
                await loadAccumulatedHintsSoFar();
            });


            socket.on('refreshHints', () => {
                loadAccumulatedHintsSoFar();
            });
            return () => {
                socket.off('answerResult');
                socket.off('refreshHints');
            };
        }
    }, []);


    useEffect(() => {
        defineActivePlayer().then(() => {
            setCheckedActivePlayer(true);
        });
    }, [questionId, answer]);


    useEffect(() => {
        if (checkedActivePlayer) {
            processQuestion();
        }
    }, [checkedActivePlayer, questionId, answer]);

    useEffect(() => {
        if (socket) {
            socket.on('answerResultRightSolution', (data) => {
                // On stocke uniquement la première solution
                const firstSolution = data.rightSolution?.split(';')[0].trim();
                setRightSolution(firstSolution);
            });
        }
    }, []);


    useEffect(() => {
        defineButtonVisibility();
    }, [checkedActivePlayer]);


    const defineActivePlayer = async () => {
        try {
            const storedPlayerStr = sessionStorage.getItem('userData');
            if (!storedPlayerStr) return;
            const storedPlayer = JSON.parse(storedPlayerStr);
            const sessionId = storedPlayer.sessionId;
            const myId = storedPlayer.id;
            const sessionResp = await axios.get("/api/session", { params: { id: sessionId } });
            const serverSession = sessionResp.data;
            const playersResp = await axios.get("/api/player", { params: { sessionId: sessionId } });
            const players = playersResp.data;
            let isActive = false;
            if (players.length === 1) {
                isActive = true;
            } else {
                const aIndex = serverSession.activePlayerIndex;
                if (typeof aIndex === 'number' && Array.isArray(players)) {
                    isActive = parseInt(players[aIndex]?.id) === parseInt(myId);
                }
            }
            setAmIActivePlayer(isActive);
        } catch (err) {
            console.error("Erreur defineActivePlayer:", err);
        }
    };


    const processQuestion = async () => {
        try {
            if (!questionId) {
                setIsLoading(false);
                return;
            }
            setIsLoading(true);
            const answeredData = sessionStorage.getItem(`answered_${questionId}`);
            if (!answeredData) {
                // Seulement le joueur actif fait la vérification
                if (amIActivePlayer && !checkAlreadyAnsweredInMemory()) {
                    const decryptedQ = decryptParam(questionId);
                    const decryptedA = answer ? decryptParam(answer) : null;
                    const result = await verifyResponse(decryptedQ, decryptedA);
                    const store = { correct: result.correct, feedback: result.message };
                    sessionStorage.setItem(`answered_${questionId}`, JSON.stringify(store));
                    await rememberQuestion(decryptedQ);
                    const spStr = sessionStorage.getItem('userData');
                    if (spStr && socket) {
                        const sp = JSON.parse(spStr);
                        // On transmet "questionId" pour que TOUS les joueurs puissent
                        // lier la réponse bonne/mauvaise à la même question.
                        socket.emit('answerResult', {
                            sessionId: sp.sessionId,
                            correct: result.correct,
                            feedback: result.message,
                            questionId: decryptedQ,
                        });
                    }
                } else {
                    // Les autres joueurs patientent, mais on recharge quand même la liste d'indices
                    await loadAccumulatedHintsSoFar();
                }
            } else {
                // Si on a déjà quelque chose en local
                const parsed = JSON.parse(answeredData);
                setCorrect(parsed.correct);
                setFeedback(parsed.feedback);
                await loadAccumulatedHintsSoFar();
            }
        } catch (err) {
            console.error("Erreur processQuestion:", err);
        }
        await new Promise((r) => setTimeout(r, 1500));
        setIsLoading(false);
        defineButtonVisibility();
    };


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
            } catch {
                usedHints = [];
            }
            usedHints = [...new Set(usedHints)];
            if (sessionData.killerId) {
                const hintsResp = await axios.get("/api/suspect_hints", {
                    params: { suspectId: sessionData.killerId },
                });
                const suspectHints = hintsResp.data;
                const matched = usedHints
                    .map((id) => suspectHints.find((h) => h.id === id))
                    .filter(Boolean);
                setAccumulatedHints(matched);
                const newestHint = matched.length > 0 ? matched[matched.length - 1] : null;
                setLatestUnlockedHint(newestHint);
                const ad = sessionStorage.getItem(`answered_${questionId}`);
                if (ad) {
                    const parsedData = JSON.parse(ad);
                    parsedData.accumulatedHints = matched;
                    sessionStorage.setItem(`answered_${questionId}`, JSON.stringify(parsedData));
                }
            }
        } catch (err) {
            console.error("Erreur loadAccumulatedHintsSoFar:", err);
        }
    };


    const defineButtonVisibility = async () => {
        try {
            const storedPlayerStr = sessionStorage.getItem('userData');
            if (!storedPlayerStr) return;
            const storedPlayer = JSON.parse(storedPlayerStr);
            const sessionId = storedPlayer.sessionId;
            const myId = storedPlayer.id;
            const sessionResp = await axios.get("/api/session", { params: { id: sessionId } });
            const serverSession = sessionResp.data;
            const playersResp = await axios.get("/api/player", { params: { sessionId: sessionId } });
            const players = playersResp.data;
            if (players.length === 1) {
                setShowButton(true);
                return;
            }
            const aIndex = serverSession.activePlayerIndex;
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
        const spStr = sessionStorage.getItem('userData');
        if (!spStr) return;
        const sp = JSON.parse(spStr);
        socket.emit('nextQuestion', sp.sessionId);
    }, []);


    const rememberQuestion = async (qId) => {
        try {
            const spStr = sessionStorage.getItem('userData');
            if (!spStr) return;
            const sp = JSON.parse(spStr);
            const sessionId = sp.sessionId;
            const sessionResp = await axios.get("/api/session", { params: { id: sessionId } });
            const sessionData = sessionResp.data;
            if (!sessionData) return;
            let currentQ = [];
            if (sessionData.questions) {
                try {
                    currentQ = JSON.parse(sessionData.questions);
                    if (!Array.isArray(currentQ)) {
                        currentQ = [];
                    }
                } catch {
                    currentQ = [];
                }
            }
            if (!currentQ.includes(qId)) {
                currentQ.push(qId);
            }
            await axios.put("/api/session", {
                id: sessionId,
                questions: currentQ,
            });
        } catch (error) {
            console.error("Erreur rememberQuestion:", error);
        }
    };


    const addNewHint = async () => {
        try {
            const spStr = sessionStorage.getItem('userData');
            if (!spStr) return null;
            const sp = JSON.parse(spStr);
            const sessionId = sp.sessionId;
            const sessionResp = await axios.get("/api/session", { params: { id: sessionId } });
            const sessionData = sessionResp.data;
            if (!sessionData) return null;
            if (sessionData.answeredCount && sessionData.answeredCount > 0) {
                return null;
            }
            let usedHints = [];
            try {
                usedHints = JSON.parse(sessionData.hints);
                if (!Array.isArray(usedHints)) usedHints = [];
            } catch {
                usedHints = [];
            }
            usedHints = [...new Set(usedHints)];
            const killerId = sessionData.killerId;
            if (!killerId) return null;
            const hintsResp = await axios.get("/api/suspect_hints", { params: { suspectId: killerId } });
            const suspectHints = hintsResp.data;
            const availableHints = suspectHints.filter((h) => !usedHints.includes(h.id));
            if (availableHints.length === 0) return null;
            const randomIndex = Math.floor(Math.random() * availableHints.length);
            const chosenHint = availableHints[randomIndex];
            usedHints.push(chosenHint.id);
            usedHints = [...new Set(usedHints)];
            await axios.put("/api/session", {
                id: sessionData.id,
                hints: JSON.stringify(usedHints),
                answeredCount: 1
            });
            if (socket) {
                socket.emit('newHintAdded', sessionId);
            }
            return chosenHint;
        } catch (error) {
            console.error("Erreur addNewHint:", error);
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
            result.correct = response.data.correct;
            result.message = response.data.message;
            setCorrect(result.correct);
            setFeedback(result.message);
            if (result.correct) {
                await addNewHint();
            }
            if (!result.correct && response.data.solution && socket) {
                const spStr = sessionStorage.getItem('userData');
                if (spStr) {
                    const sp = JSON.parse(spStr);
                    socket.emit('answerResultRightSolution', {
                        sessionId: sp.sessionId,
                        questionId: qId,          // identifiant de la question
                        rightSolution: response.data.solution
                    });
                }
            }

        } catch (error) {
            setFeedback("Erreur lors de la vérification. Veuillez réessayer.");
            result.message = "Erreur de vérification.";
        } finally {
            await loadAccumulatedHintsSoFar();
        }
        return result;
    };


    const latestHint = accumulatedHints.length > 0 ? accumulatedHints[accumulatedHints.length - 1] : null;


    return (
        <div className="min-h-screen flex flex-col items-center justify-start text-white bg-black font-Amatic relative">
            {isLoading ? (
                <FancyLoader />
            ) : (
                <>
                {correct === null ? (
                    <h1 className="text-5xl mt-10 mb-4 text-yellow-400 font-Amatic">En attente du résultat...</h1>
                ) : correct ? (
                    <h1 className="text-5xl mt-10 mb-4 text-green-500 font-Amatic">Bonne Réponse !</h1>
                ) : (
                    <>
                        <h1 className="text-5xl mt-10 mb-4 text-red-500 font-Amatic">Mauvaise Réponse !</h1>
                        <p className="text-2xl mb-8 text-center font-Amatic">La bonne réponse était : {rightSolution}</p>
                    </>
                    )}
            <p className="text-2xl mb-8 text-center font-Amatic">{feedback}</p>
            {correct && latestHint && (
                <div className="text-3xl text-white font-bold font-Amatic mb-8">
                            <Hint hint={latestHint} />
                        </div>
                    )}

                    {showButton && (
                        <button
                            onClick={handleNextQuestion}
                            className="mt-8 py-4 px-16 text-3xl font-extrabold border-4 border-white text-white rounded-lg hover:bg-white hover:text-black transition-all duration-300 transform hover:scale-110 shadow-2xl font-Amatic"
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
                    <div className="absolute inset-0" onClick={() => setShowModal(false)} />
                    <div className="bg-gradient-to-t from-gray-900 to-gray-800 w-full max-w-md rounded-t-lg p-6 transform transition-transform duration-500 translate-y-0 animate-slide-up font-Amatic">
                        <h2 className="text-3xl font-bold mb-4 text-white">Indices accumulés</h2>
                        <ul className="space-y-2 max-h-60 overflow-auto p-2 border border-gray-600 rounded">
                            {accumulatedHints.length > 0 ? (
                                accumulatedHints.map((h) => (
                                    <li key={h.id} className="p-2 border-b border-gray-500 last:border-b-0 text-gray-300">
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

