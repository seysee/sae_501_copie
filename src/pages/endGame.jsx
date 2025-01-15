import { useEffect, useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/router';
import Button from "../components/_button";

export default function EndGame() {
    const [suspect, setSuspect] = useState(null);
    const [error, setError] = useState(null);
    const [isVisible, setIsVisible] = useState(false);
    const [showFooter, setShowFooter] = useState(false);
    const router = useRouter();

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
                    setTimeout(() => setShowFooter(true), 3000);
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

    const clearSession = () => {
        sessionStorage.removeItem("userData");
    };

    const handleReturnHome = () => {
        clearSession();
        router.push("/");
    };

    const playerName = getStoredUserData()?.name || "Joueur";

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 text-white">
            {error ? (
                <p className="text-2xl font-Amatic text-red-500">{error}</p>
            ) : suspect ? (
                <div className="text-center">
                    <p
                        className={`text-4xl font-Amatic font-bold transition-opacity mb-16 duration-[5000ms] ${
                            isVisible ? "opacity-100" : "opacity-0"
                        }`}
                    >
                        Le tueur était{" "}
                        <span className="text-red-500">{suspect.name}</span>
                        ...
                    </p>
                    <div
                        className={`transition-opacity duration-1000 ${
                            showFooter ? "opacity-100" : "opacity-0"
                        }`}
                    >
                        <p className="mt-4 mb-2 text-xl font-Amatic text-gray-300">
                            Merci d'avoir joué, <span className="font-bold">{playerName}</span> ! Nous espérons te
                            revoir bientôt.
                        </p>
                        <Button
                            onClick={handleReturnHome}
                            className="text-xl w-40 px-4 py-2 text-gray-300 border border-gray-300 rounded-lg shadow-md hover:border-gray-400 hover:text-gray-400 transition duration-300"
                            label={"Terminer la partie"}
                        />
                    </div>
                </div>
            ) : (
                <p className="text-2xl font-Amatic text-gray-400 animate-pulse">Chargement...</p>
            )}
        </div>
    );
}
