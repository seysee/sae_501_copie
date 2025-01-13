import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import io from 'socket.io-client';
import Hint from "../components/hint";
import axios from "axios";
import { decryptParam } from '../lib/cryptoUtils';

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
        }

        socket.on('redirectToEnigma', () => {
            console.log('redirectToEnigma reçu -> on push("/enigma")');
            router.push('/enigma');
        });

        return () => {
            socket.off('redirectToEnigma');
        };
    }, [router]);


    // Vérifier la réponse (comme avant)
    useEffect(() => {
        if (questionId && answer) {
            try {
                const decryptedQuestionId = decryptParam(questionId);
                const decryptedAnswer = decryptParam(answer);
                verifyResponse(decryptedQuestionId, decryptedAnswer);
                rememberQuestion(decryptedQuestionId);
            } catch (error) {
                console.error("Erreur de déchiffrement :", error);
            }
        }
    }, [questionId, answer]);

    // Au montage, on va récupérer la session + lastPlayerId,
    // déterminer si c'est moi
    useEffect(() => {
        defineButtonVisibility();
    }, []);

    const defineButtonVisibility = async () => {
        try {
            const storedPlayer = sessionStorage.getItem('userData');
            const playerData = JSON.parse(storedPlayer || '{}');
            if (!playerData.sessionId || !playerData.id) return;

            const sessionId = playerData.sessionId;
            const myId = playerData.id;

            // 1) Récupérer la session (qui contient .lastPlayerId)
            const responseSession = await axios.get("/api/session", {
                params: { id: sessionId }
            });
            const serverSession = responseSession.data;

            if (serverSession.lastPlayerId) {
                // si lastPlayerId est défini, je compare à mon ID
                if (serverSession.lastPlayerId === myId) {
                    setShowButton(true);
                } else {
                    setShowButton(false);
                }
            } else {
                // lastPlayerId est null ou undefined
                // => fallback : je récupère la liste des joueurs
                const responsePlayers = await axios.get("/api/player", {
                    params: { sessionId }
                });
                const players = responsePlayers.data;  // tableau d'objets {id, name, ...}
                if (!players || players.length === 0) return;

                const lastPlayer = players[players.length - 1];
                if (lastPlayer.id === myId) {
                    setShowButton(true);
                } else {
                    setShowButton(false);
                }
            }
        } catch (error) {
            console.error("Erreur defineButtonVisibility:", error);
        }
    };

    const rememberQuestion = async (questionId) => {
        // ... identique à avant ...
    };

    const verifyResponse = async (questionId, answer) => {
        try {
            const response = await axios.post("/api/question/answer", { id: questionId, answer });
            setFeedback(response.data.message);
            setCorrect(response.data.correct);
        } catch (error) {
            console.error("Erreur lors de la vérification :", error);
            setFeedback("Erreur lors de la vérification. Veuillez réessayer.");
        }
    };

    const handleReturnHome = () => {
        const storedPlayer = sessionStorage.getItem('userData');
        const playerData = JSON.parse(storedPlayer || '{}');
        if (!playerData.sessionId) return;
        socket.emit('returnHome', playerData.sessionId);
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
                    Retour à l'accueil
                </button>
            )}
        </div>
    );
}
