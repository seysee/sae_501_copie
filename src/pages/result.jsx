import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import io from 'socket.io-client';
import axios from 'axios';
import { decryptParam } from '../lib/cryptoUtils';
import Hint from "../components/hint";

let socket;
let alreadyVerifiedThisQuestion = false;

function FancyLoader() {
    return (
        <div className="flex flex-col items-center justify-center mt-12">
            <h1 className="text-3xl text-yellow-400 font-Amatic mb-4">Chargement...</h1>
            <div className="flex flex-row items-center justify-center space-x-6">
                <div className="loader">
                    <svg viewBox="0 0 80 80">
                        <circle r="32" cy="40" cx="40" />
                    </svg>
                </div>
                <div className="loader triangle">
                    <svg viewBox="0 0 86 80">
                        <polygon points="43 8 79 72 7 72" />
                    </svg>
                </div>
                <div className="loader">
                    <svg viewBox="0 0 80 80">
                        <rect height="64" width="64" y="8" x="8" />
                    </svg>
                </div>
            </div>
        </div>
    );
}

export default function Result() {
    const router = useRouter();
    const [correct, setCorrect] = useState(null);
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
                        <h1 className="text-5xl mt-10 mb-4 text-red-500 font-Amatic">Mauvaise Réponse !</h1>
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
            <style jsx global>{`
                .loader {
                    --path: yellow;
                    --dot: green;
                    --duration: 3s;
                    width: 44px;
                    height: 44px;
                    position: relative;
                    display: inline-block;
                    margin: 0 8px;
                }
                .loader:before {
                    content: "";
                    width: 6px;
                    height: 6px;
                    border-radius: 50%;
                    position: absolute;
                    display: block;
                    background: var(--dot);
                    top: 37px;
                    left: 19px;
                    transform: translate(-18px, -18px);
                    animation: dotRect var(--duration) cubic-bezier(0.785, 0.135, 0.15, 0.86) infinite;
                }
                .loader svg {
                    display: block;
                    width: 100%;
                    height: 100%;
                }
                .loader svg rect,
                .loader svg polygon,
                .loader svg circle {
                    fill: none;
                    stroke: var(--path);
                    stroke-width: 10px;
                    stroke-linejoin: round;
                    stroke-linecap: round;
                }
                .loader svg polygon {
                    stroke-dasharray: 145 76 145 76;
                    stroke-dashoffset: 0;
                    animation: pathTriangle var(--duration) cubic-bezier(0.785, 0.135, 0.15, 0.86) infinite;
                }
                .loader svg rect {
                    stroke-dasharray: 192 64 192 64;
                    stroke-dashoffset: 0;
                    animation: pathRect var(--duration) cubic-bezier(0.785, 0.135, 0.15, 0.86) infinite;
                }
                .loader svg circle {
                    stroke-dasharray: 150 50 150 50;
                    stroke-dashoffset: 75;
                    animation: pathCircle var(--duration) cubic-bezier(0.785, 0.135, 0.15, 0.86) infinite;
                }
                .loader.triangle {
                    width: 48px;
                }
                .loader.triangle:before {
                    left: 21px;
                    transform: translate(-10px, -18px);
                    animation: dotTriangle var(--duration) cubic-bezier(0.785, 0.135, 0.15, 0.86) infinite;
                }
                @keyframes pathTriangle {
                    33% {
                        stroke-dashoffset: 74;
                    }
                    66% {
                        stroke-dashoffset: 147;
                    }
                    100% {
                        stroke-dashoffset: 221;
                    }
                }
                @keyframes dotTriangle {
                    33% {
                        transform: translate(0, 0);
                    }
                    66% {
                        transform: translate(10px, -18px);
                    }
                    100% {
                        transform: translate(-10px, -18px);
                    }
                }
                @keyframes pathRect {
                    25% {
                        stroke-dashoffset: 64;
                    }
                    50% {
                        stroke-dashoffset: 128;
                    }
                    75% {
                        stroke-dashoffset: 192;
                    }
                    100% {
                        stroke-dashoffset: 256;
                    }
                }
                @keyframes dotRect {
                    25% {
                        transform: translate(0, 0);
                    }
                    50% {
                        transform: translate(18px, -18px);
                    }
                    75% {
                        transform: translate(0, -36px);
                    }
                    100% {
                        transform: translate(-18px, -18px);
                    }
                }
                @keyframes pathCircle {
                    25% {
                        stroke-dashoffset: 125;
                    }
                    50% {
                        stroke-dashoffset: 175;
                    }
                    75% {
                        stroke-dashoffset: 225;
                    }
                    100% {
                        stroke-dashoffset: 275;
                    }
                }
            `}</style>
        </div>
    );
}
