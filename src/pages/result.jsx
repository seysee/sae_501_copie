import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import io from 'socket.io-client';
import axios from 'axios';
import { decryptParam } from '../lib/cryptoUtils';
import Hint from "../components/hint";

let socket;

export default function Result() {
    const router = useRouter();
    const [feedback, setFeedback] = useState('');
    const [correct, setCorrect] = useState(false);
    const [showButton, setShowButton] = useState(false);
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
            } catch (error) {}
        }
    }, [questionId, answer]);

    useEffect(() => {
        defineButtonVisibility();
    }, []);

    const defineButtonVisibility = async () => {
        try {
            const storedPlayerStr = sessionStorage.getItem('userData');
            if (!storedPlayerStr) return;
            const storedPlayer = JSON.parse(storedPlayerStr);
            if (!storedPlayer.sessionId || !storedPlayer.id) return;

            const sessionId = storedPlayer.sessionId;
            const myId = storedPlayer.id;

            // Récupère la session (qui contient activePlayerIndex)
            const sessionResp = await axios.get("/api/session", { params: { id: sessionId } });
            const serverSession = sessionResp.data;
            const aIndex = serverSession.activePlayerIndex;

            // Récupère tous les joueurs de la session
            const playersResp = await axios.get("/api/player", { params: { sessionId: sessionId } });
            const players = playersResp.data;

            // Si un seul joueur, toujours afficher le bouton
            if (players.length === 1) {
                setShowButton(true);
                return;
            }

            // Sinon, logique du joueur actif
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

    const verifyResponse = async (qId, ans) => {
        try {
            const response = await axios.post("/api/question/answer", {
                id: qId,
                answer: ans
            });
            setFeedback(response.data.message);
            setCorrect(response.data.correct);
            setTimeout(() => {
                defineButtonVisibility();
            }, 500);
        } catch (error) {
            setFeedback("Erreur lors de la vérification. Veuillez réessayer.");
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center text-white">
            <h1 className="text-4xl mb-4">Résultat de la Réponse</h1>
            <p className="text-xl">{feedback}</p>
            {correct ? (
                <>
                    <p className="text-2xl text-green-500">Bonne Réponse!</p>
                    <Hint />
                </>
            ) : (
                <p className="text-2xl text-red-500">Mauvaise Réponse!</p>
            )}
            {showButton && (
                <button
                    onClick={handleReturnHome}
                    className="mt-4 py-2 px-6 bg-black text-white rounded-lg"
                >
                    Prochaine question
                </button>
            )}
        </div>
    );
}
