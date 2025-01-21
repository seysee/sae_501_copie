import { useState, useEffect } from 'react';
import axios from 'axios';
import { useRouter } from 'next/router';

export default function Role() {
    const [isVisible, setIsVisible] = useState(false);
    const [role, setRole] = useState(null);
    const router = useRouter();
    const [suspect, setSuspect] = useState(null);
    const [suspects, setSuspects] = useState(null);
    const [showPhoneMessage, setShowPhoneMessage] = useState(true);
    const [fadeOut, setFadeOut] = useState(false); // État pour déclencher le fondu

    const getStoredUserData = () => {
        try {
            const storedPlayer = sessionStorage.getItem('userData');
            if (storedPlayer) {
                return JSON.parse(storedPlayer);
            }
        } catch (error) {
            console.error('Erreur lors de la récupération des données utilisateur:', error);
        }
        return null;
    };

    useEffect(() => {
        async function fetchPlayerRole() {
            const storedPlayer = getStoredUserData();
            if (!storedPlayer) return;
            try {
                const playerResponse = await axios.get('/api/player', {
                    params: { id: storedPlayer.id },
                });
                const updatedUserData = {
                    ...playerResponse.data,
                    role: playerResponse.data.role,
                };
                sessionStorage.setItem('userData', JSON.stringify(updatedUserData));
                setRole(playerResponse.data.role);
            } catch (error) {
                console.error('Erreur lors de la récupération des joueurs :', error);
            }
        }
        fetchPlayerRole();
    }, []);

    useEffect(() => {
        async function fetchSuspectForSaboteur() {
            const storedPlayer = getStoredUserData();
            if (!storedPlayer) return;

            try {
                const sessionResponse = await axios.get('/api/session', {
                    params: { id: storedPlayer.sessionId },
                });
                const suspectResponse = await axios.get('/api/suspect', {
                    params: { id: sessionResponse.data.killerId },
                });
                const suspectsResponse = await axios.get('/api/suspect', {
                    params: { killerType: sessionResponse.data.killerType },
                });
                setSuspects(suspectsResponse.data);
                setSuspect(suspectResponse.data.name);
            } catch (error) {
                console.error('Erreur lors de la récupération du suspect :', error);
            }
        }
        fetchSuspectForSaboteur();
    }, []);

    useEffect(() => {
        const fadeTimer = setTimeout(() => setFadeOut(true), 2500);
        const phoneMessageTimer = setTimeout(() => setShowPhoneMessage(false), 3000);
        return () => {
            clearTimeout(fadeTimer);
            clearTimeout(phoneMessageTimer);
        };
    }, []);

    useEffect(() => {
        if (!showPhoneMessage) {
            const timer = setTimeout(() => setIsVisible(true), 100);
            return () => clearTimeout(timer);
        }
    }, [showPhoneMessage]);

    useEffect(() => {
        if (!showPhoneMessage) {
            const timerRouterPush = setTimeout(() => {
                router.push('/enigma');
            }, 8000);
            return () => clearTimeout(timerRouterPush);
        }
    }, [showPhoneMessage]);

    return (
        <div className="flex flex-col items-center justify-center min-h-screen">
            {showPhoneMessage ? (
                <h1
                    className={`font-Amatic text-4xl font-bold text-yellow-500 transition-opacity duration-1000 ${
                        fadeOut ? 'opacity-0' : 'opacity-100'
                    }`}
                >
                    Cachez vos téléphones !
                </h1>
            ) : (
                <>
                    <h2 className="font-Amatic text-xl mb-4">TON ROLE EST :</h2>
                    {role === 0 ? (
                        <>
                            <h1
                                className={`font-Amatic text-4xl font-bold text-green-500 transition-opacity duration-[5000ms] ${
                                    isVisible ? 'opacity-100' : 'opacity-0'
                                }`}
                            >
                                ENQUÊTEUR
                            </h1>
                            <p
                                className={`text-center font-Amatic text-2xl text-green-500 mt-2 transition-opacity duration-[5000ms] ${
                                    isVisible ? 'opacity-100' : 'opacity-0'
                                }`}
                            >
                                Résolvez des énigmes pour obtenir des indices et identifier le tueur parmi ces suspects :{' '}
                                <span className="font-bold">
                                    {Array.isArray(suspects) && suspects.length > 0
                                        ? suspects.map((sus) => sus.name).join(', ')
                                        : 'aucun suspect disponible'}
                                    .
                                </span>
                            </p>
                        </>
                    ) : role === 1 ? (
                        <>
                            <h1
                                className={`text-center font-Amatic text-4xl font-bold text-red-500 transition-opacity duration-[5000ms] ${
                                    isVisible ? 'opacity-100' : 'opacity-0'
                                }`}
                            >
                                SABOTEUR
                            </h1>
                            {suspect ? (
                                <p
                                    className={`font-Amatic text-center text-2xl text-red-500 mt-2 transition-opacity duration-[5000ms] ${
                                        isVisible ? 'opacity-100' : 'opacity-0'
                                    }`}
                                >
                                    Le tueur est <span className="font-bold">{suspect}</span>. Détournez l'attention pour
                                    induire l'équipe en erreur.
                                </p>
                            ) : (
                                <p
                                    className={`font-Amatic text-2xl text-red-500 mt-2 transition-opacity duration-[5000ms] ${
                                        isVisible ? 'opacity-100' : 'opacity-0'
                                    }`}
                                >
                                    Chargement...
                                </p>
                            )}
                        </>
                    ) : (
                        <h1
                            className={`font-Amatic text-4xl font-bold text-gray-500 transition-opacity duration-[5000ms] ${
                                isVisible ? 'opacity-100' : 'opacity-0'
                            }`}
                        >
                            Problème de rôle
                        </h1>
                    )}
                </>
            )}
        </div>
    );
}
