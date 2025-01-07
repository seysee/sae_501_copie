import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import io from 'socket.io-client';
import RoleSlide from "../components/_roleSlide";
import Button from "../components/_button";
import ActionQuestion from "../components/ActionQuestion"; // Importer le composant ActionQuestion

export default function Game() {
    const [question, setQuestion] = useState(null);
    const [answer, setAnswer] = useState('');
    const [feedback, setFeedback] = useState('');
    const [socket, setSocket] = useState(null);
    const router = useRouter();

    useEffect(() => {
        // Initialiser la connexion Socket.IO
        const socketInstance = io({
            path: '/api/socket',
        });

        setSocket(socketInstance);

        socketInstance.emit('joinSession', 'sessionId', { name: 'Player 1' });
        socketInstance.emit('launchQuestions', 'sessionId');

        // Écouter l'événement 'nextQuestion' pour recevoir une nouvelle question
        socketInstance.on('nextQuestion', (newQuestions) => {
            console.log('Questions reçues :', newQuestions);

            if (Array.isArray(newQuestions) && newQuestions.length > 0) {
                const randomQuestion = newQuestions[Math.floor(Math.random() * newQuestions.length)];
                setQuestion(randomQuestion);
            } else if (newQuestions && typeof newQuestions === "object") {
                setQuestion(newQuestions);
            } else {
                console.error("Aucune question valide reçue.");
            }

            setAnswer('');
            setFeedback('');
        });

        // Écouter le feedback et rediriger vers la page de résultat
        socketInstance.on('answerSubmitted', ({ redirectUrl }) => {
            if (redirectUrl) {
                router.push(redirectUrl).then(r => console.log('Redirection effectuée'));
            }
        });


        return () => {
            socketInstance.off('nextQuestion');
            socketInstance.off('answerSubmitted');
            socketInstance.disconnect();
        };
    }, [router]);

    const handleAnswerChange = (e) => {
        setAnswer(e.target.value);
    };

    const handleSubmit = (event) => {
        event.preventDefault();
        if (answer === '') {
            console.log('Aucune réponse donnée');
            return;
        }

        console.log('Réponse envoyée:', answer, "questionID", question.id);

        // Émettre la réponse via WebSocket pour validation
        socket.emit('submitAnswer', { sessionId: 'sessionId', questionId: question.id, answer });
    };

    const handleActionSuccess = (message) => {
        console.log(message);
        setFeedback(message);
        socket.emit('submitAnswer', { sessionId: 'sessionId', questionId: question.id, answer: "action_success" });
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center text-white ">
            {/* <RoleSlide /> */}

            <div className="w-full max-w-lg flex flex-col items-center py-20 space-y-12">
                <h1 className="text-6xl font-Amatic text-yellow-400 mb-12">
                    Énigme
                </h1>
                {question ? (
                    <div className="w-full max-w-md text-center">
                        <h2 className="text-3xl font-Amatic mb-6">{question.question}</h2>
                        {question.type === "action" ? (
                            <ActionQuestion question={question} onSuccess={handleActionSuccess} />
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
                                    className={`py-3 ${answer ? 'bg-black text-green-500 border-green-500' : 'text-gray-300 border-gray-500 cursor-not-allowed'}`}
                                />
                            </form>
                        )}
                        {feedback && <p className="text-green-500 mt-4">{feedback}</p>}
                    </div>
                ) : (
                    <p className="text-xl text-gray-400">Chargement...</p>
                )}
            </div>
        </div>
    );
}
