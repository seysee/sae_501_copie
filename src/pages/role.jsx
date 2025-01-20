import { useState, useEffect } from 'react';
import axios from 'axios';
import { useRouter } from 'next/router';

export default function Role() {
    const [isVisible, setIsVisible] = useState(false);
    const [role, setRole] = useState(null);
    const router = useRouter();
    const [suspect, setSuspect] = useState(null);

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
            if (!storedPlayer) return; // Si aucune donnée n'est stockée, on sort de la fonction.
            try {
                console.log(storedPlayer.id);

                const playerResponse = await axios.get('/api/player', {
                    params: { id: storedPlayer.id },
                });
                console.log(playerResponse.data);
                const updatedUserData = {
                    ...playerResponse.data,
                    role: playerResponse.data.role,
                };
                // Mettre à jour la session du joueur
                sessionStorage.setItem('userData', JSON.stringify(updatedUserData));
                setRole(playerResponse.data.role);
            } catch (error) {
                console.error('Erreur lors de la récupération des joueurs :', error);
            }
        }

        fetchPlayerRole(); // Appel de la fonction
    }, []);
    useEffect(() => {
        async function fetchSuspectForSaboteur() {
            const storedPlayer = getStoredUserData();
            if (!storedPlayer) return;

            try {
                console.log('Session ID:', storedPlayer.sessionId);
                const sessionResponse = await axios.get('/api/session', {
                    params: { id: storedPlayer.sessionId },
                });

                console.log('Session Response:', sessionResponse.data);
                const suspectResponse = await axios.get('/api/suspect', {
                    params: { id: sessionResponse.data.killerId },
                });

                console.log('Suspect Response:', suspectResponse.data);
                setSuspect(suspectResponse.data.name); // Mettre à jour le suspect
            } catch (error) {
                console.error('Erreur lors de la récupération du suspect :', error);
            }
        }

        fetchSuspectForSaboteur(); // Appel de la fonction
    }, []); // Assurez-vous que ce useEffect ne se réexécute pas inutilement


    useEffect(() => {
        const timer = setTimeout(() => setIsVisible(true), 100); // Ajoute un délai avant l'apparition.
        return () => clearTimeout(timer); // Nettoie le timer si le composant est démonté.
    }, []);

    useEffect(() => {
        const timerRouterPush = setTimeout(() => {
            router.push('/enigma');
        }, 8000);

        return () => clearTimeout(timerRouterPush); // Nettoie le timer si le composant est démonté.
    }, []);

    return (
        <div className="flex flex-col items-center justify-center min-h-screen">
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
                        className={`font-Amatic text-2xl text-green-500 mt-2 transition-opacity duration-[5000ms] ${
                            isVisible ? 'opacity-100' : 'opacity-0'
                        }`}
                    >
                        Résolvez les énigmes et découvrez le tueur.
                    </p>
                </>
            ) : role === 1 ? (
                <>
                    <h1
                        className={`font-Amatic text-4xl font-bold text-red-500 transition-opacity duration-[5000ms] ${
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
                            Le tueur est <span className="font-bold">{suspect}</span> détournez l'attention pour induire l'équipe en erreur.
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
        </div>
    );
}
