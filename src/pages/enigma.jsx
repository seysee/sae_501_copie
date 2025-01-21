import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import io from 'socket.io-client';
import GenericQuestion from "../components/GenericQuestion";
import RoleSlide from "../components/_roleSlide";
import FancyLoader from "../components/_loader";

export default function Game() {
    const [question, setQuestion] = useState(null);
    const [socket, setSocket] = useState(null);
    const [activePlayer, setActivePlayer] = useState(null);
    const [storedPlayer, setStoredPlayer] = useState(null);
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(true);

    const getStoredUserData = () => {
        if (typeof window === "undefined") {
            return null;
        }
        try {
            const storedPlayer = sessionStorage.getItem("userData");
            return storedPlayer ? JSON.parse(storedPlayer) : null;
        } catch {
            return null;
        }
    };

    useEffect(() => {
        setStoredPlayer(getStoredUserData());
    }, []);

    useEffect(() => {
        const sPlayer = getStoredUserData();
        if (!sPlayer || !sPlayer.sessionId) {
            return;
        }
        const socketInstance = io({ path: '/api/socket' });
        setSocket(socketInstance);

        try {
            socketInstance.emit('joinSession', sPlayer.sessionId, {
                name: sPlayer.name,
                id: sPlayer.id
            });

            socketInstance.emit('launchQuestion', sPlayer.sessionId);

            socketInstance.on('nextQuestion', (data) => {
                setTimeout(() => {
                    setQuestion(data.question);
                    setActivePlayer(data.activePlayer);
                    setIsLoading(false);
                    }, 1000);
            });

            socketInstance.on('answerSubmitted', ({ redirectUrl }) => {
                if (redirectUrl) {
                    router.push(redirectUrl);
                }
            });

            socketInstance.on('redirectToVote', ({ redirectUrl }) => {
                if (redirectUrl) {
                    router.push(redirectUrl);
                }
            });
        } catch {}

        return () => {
            socketInstance.off('nextQuestion');
            socketInstance.off('answerSubmitted');
            socketInstance.off('redirectToVote');
            socketInstance.disconnect();
        };
    }, [router]);

    const handleSuccess = () => {
        console.log("Question réussie !");
    };

    const amIActive = activePlayer && storedPlayer && Number(activePlayer.id) === Number(storedPlayer.id);

    return (
        <div className="min-h-screen flex flex-col items-center justify-center text-white">
            <RoleSlide />
            <div className="w-full max-w-lg flex flex-col items-center py-20 space-y-8">
                {isLoading ? (
                    <FancyLoader />
                ) : (
                    <>
                        <h1 className="text-6xl font-Amatic text-yellow-400">Énigme</h1>
                        <div className="w-full max-w-md text-center">
                            <GenericQuestion
                                question={question}
                                onSuccess={handleSuccess}
                                socket={socket}
                                isActive={amIActive}
                                activePlayerName={activePlayer?.name}
                            />
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
