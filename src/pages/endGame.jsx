import { useEffect, useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/router';
import Button from "../components/_button";

export default function EndGame() {
    const [suspect, setSuspect] = useState(null);
    const [error, setError] = useState(null);
    const [voteMessage, setVoteMessage] = useState(null);
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
                const { data: suspectData } = await axios.get(`/api/suspect?id=${sessionData.killerId}`);
                setSuspect(suspectData);

                const votedSuspectId = sessionStorage.getItem('votedSuspectId');
                const isCorrect = votedSuspectId === sessionData.killerId.toString();
                setVoteMessage(isCorrect ? "Bravo ! Vous avez trouvé le tueur !" : "Perdu ! Ce n'était pas le bon suspect.");

                setTimeout(() => setIsVisible(true), 300);
                setTimeout(() => setShowFooter(true), 3500);
            } catch (err) {
                console.error(err);
                setError("Erreur lors de la récupération des informations.");
            }
        };
        fetchKiller();
    }, []);

    /*const clearSession = () => {
        sessionStorage.removeItem("userData");
    };*/

    const handleReturnHome = () => {
        try {
            const userData = JSON.parse(sessionStorage.getItem("userData"));

            if (userData) {
                const { name, skin, id } = userData;
                const filteredUserData = { name, skin, id };

                sessionStorage.setItem("userData", JSON.stringify(filteredUserData));
            }

            sessionStorage.removeItem("votedSuspectId");

            router.push("/");
        } catch (error) {
            console.error("Erreur lors du nettoyage des données utilisateur :", error);
            router.push("/");
        }
    };

    const playerName = getStoredUserData()?.name || "Joueur";

    return (
        <div className="min-h-screen flex flex-col justify-center items-center p-4 text-white">
            {error ? (
                <p className="text-2xl font-Amatic text-red-500">{error}</p>
            ) : (
                suspect && (
                    <>
                        <div className="text-center">
                            <p className={`text-4xl font-Amatic font-bold transition-opacity mb-6 duration-[5000ms] ${isVisible ? "opacity-100" : "opacity-0"}`}>
                                {voteMessage}
                            </p>

                            <p className={`text-3xl font-Amatic font-bold transition-opacity mb-10 duration-[5000ms] ${isVisible ? "opacity-100" : "opacity-0"}`}>
                                Le tueur était <span className="text-red-500">{suspect.name}</span>.
                            </p>
                        </div>

                        <div className="mt-12">
                            <p className={`text-xl font-Amatic text-gray-300 transition-opacity duration-[5000ms] delay-500 ${showFooter ? "opacity-100" : "opacity-0"}`}>
                                Merci d'avoir joué, <span className="font-bold">{playerName}</span> ! Nous espérons te revoir bientôt.
                            </p>
                            <Button
                                onClick={handleReturnHome}
                                className={`mt-4 w-40 px-4 py-2 text-xl text-gray-300 border border-gray-300 rounded-lg shadow-md hover:border-gray-400 hover:text-gray-400 transition duration-[5000ms] delay-500 ${
                                    showFooter ? "opacity-100" : "opacity-0"
                                }`}
                                label={"Terminer la partie"}
                            />
                        </div>
                    </>
                )
            )}

            {!suspect && !error && <p className="text-2xl font-Amatic text-gray-400 animate-pulse">Chargement...</p>}
        </div>
    );


}
