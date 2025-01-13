import { useEffect, useState } from 'react';
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
        }

        // Redirection
        socket.on('redirectToEnigma', () => {
            console.log('redirectToEnigma => router.push("/enigma")');
            router.push('/enigma');
        });
        return () => {
            socket.off('redirectToEnigma');
        };
    }, [router]);

    // Au montage, on vérifie la réponse
    useEffect(() => {
        if (questionId && answer) {
            try {
                const decryptedQuestionId = decryptParam(questionId);
                const decryptedAnswer = decryptParam(answer);
                verifyResponse(decryptedQuestionId, decryptedAnswer);
                rememberQuestion(decryptedQuestionId);
            } catch (error) {
                console.error('Erreur de déchiffrement :', error);
            }
        }
    }, [questionId, answer]);

    // Après avoir validé la réponse, on va décider si on affiche le bouton
    // => On compare mon ID au "activePlayer" (celui qui va jouer la prochaine question)
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

            // Appel API pour récupérer session + activePlayerIndex + playersInMemory
            const resp = await axios.get("/api/session", { params: { id: sessionId } });
            const serverSession = resp.data;
            console.log('serverSession =', serverSession);

            const aIndex = serverSession.activePlayerIndex;  // index du prochain joueur
            const players = serverSession.playersInMemory;   // liste des joueurs en mémoire

            console.log('aIndex = ', aIndex);
            console.log('playersInMemory = ', players);

            if (typeof aIndex === 'number' && Array.isArray(players)) {
                if (Number(players[aIndex]?.id) === Number(myId)) {
                    console.log("C'est moi le joueur actif prochain => j'affiche le bouton");
                    setShowButton(true);
                } else {
                    console.log("Ce n'est pas moi => pas de bouton");
                    setShowButton(false);
                }
            }
        } catch (err) {
            console.error("Erreur defineButtonVisibility:", err);
        }
    };



    const handleReturnHome = () => {
        const storedPlayerStr = sessionStorage.getItem('userData');
        if (!storedPlayerStr) return;
        const storedPlayer = JSON.parse(storedPlayerStr);

        if (storedPlayer.sessionId) {
            // j'émets "returnHome" => tout le monde fait redirectToEnigma => /enigma
            socket.emit('returnHome', storedPlayer.sessionId);
        }
    };

    const rememberQuestion = async (questionId) => {
        // ... (ton code existant pour ne plus re-poser la question) ...
    };

    const verifyResponse = async (qId, ans) => {
        try {
            const response = await axios.post("/api/question/answer", {
                id: qId, answer: ans
            });
            setFeedback(response.data.message);
            setCorrect(response.data.correct);
        } catch (error) {
            console.error("Erreur lors de la vérification :", error);
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
