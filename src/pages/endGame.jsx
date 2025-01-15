import { useEffect, useState } from 'react';
import axios from 'axios';

export default function EndGame() {
    const [suspect, setSuspect] = useState(null);
    const [error, setError] = useState(null);
    const [isVisible, setIsVisible] = useState(false);

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
        const sessionId = getStoredUserData()?.sessionId;

        if (!sessionId) {
            setError("Session ID manquant ou invalide.");
            return;
        }

        const fetchKiller = async () => {
            try {
                const { data: sessionData } = await axios.get(`/api/session?id=${sessionId}`);
                if (sessionData.killerId) {
                    const { data: suspectData } = await axios.get(`/api/suspect?id=${sessionData.killerId}`);
                    setSuspect(suspectData);
                    setTimeout(() => setIsVisible(true), 100);
                } else {
                    setError("Aucun tueur assigné pour cette session.");
                }
            } catch (err) {
                console.error(err);
                setError("Erreur lors de la récupération des informations.");
            }
        };
        fetchKiller();
    }, []);

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4">
            {error ? (
                <p className="text-2xl font-Amatic text-red-500">{error}</p>
            ) : suspect ? (
                <div className="text-center">
                    <p
                        className={`text-4xl font-Amatic font-bold transition-opacity duration-[5000ms] ${
                            isVisible ? "opacity-100" : "opacity-0"
                        }`}
                    >
                        Le tueur était{" "}
                        <span className="text-red-500">{suspect.name}</span>
                        ...
                    </p>
                </div>
            ) : (
                <p className="text-2xl font-Amatic text-gray-400 animate-pulse">Chargement...</p>
            )}
        </div>
    );
}
