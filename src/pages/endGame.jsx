import { useEffect, useState } from 'react';
import axios from 'axios';

export default function EndGame() {
    const [suspects, setSuspects] = useState(null);
    const [error, setError] = useState(null);

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
        const fetchSuspects = async () => {
            const storedPlayer = getStoredUserData();
            if (!storedPlayer) return;

            try {
                const response = await axios.get("/api/suspect");
                console.log("response.data:", response.data);

                const suspect = response.data.find(s => s.id === storedPlayer.sessionId);
                if (suspect) {
                    console.log("Suspect trouvé:", suspect);
                    setSuspects(suspect);
                } else {
                    setError("Aucun suspect trouvé pour cette session.");
                }
            } catch (err) {
                console.error('Erreur lors de la récupération des suspects:', err);
                setError('Erreur lors de la récupération des suspects.');
            }
        };

        fetchSuspects();
    }, []);

    /*
    useEffect(() => {
        const storedPlayer = getStoredUserData();
        console.log("storedPlayer:", storedPlayer);

        if (storedPlayer && storedPlayer.sessionId) {
            const fetchSuspects = async () => {
                try {
                    const response = await axios.get("/api/suspect");
                    console.log("response.data:", response.data);

                    const suspect = response.data.find(s => s.sessionId === storedPlayer.sessionId);
                    if (suspect) {
                        console.log("Suspect trouvé:", suspect);
                        setSuspects(suspect);
                    } else {
                        setError("Aucun suspect trouvé pour cette session.");
                    }
                } catch (err) {
                    console.error('Erreur lors de la récupération des suspects:', err);
                    setError('Erreur lors de la récupération des suspects.');
                }
            };
            fetchSuspects();
        } else {
            setError('Aucune session active.');
        }
    }, []);
    */

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4">
            {error ? (
                <p className="text-2xl font-Amatic text-red-500">{error}</p>
            ) : suspects ? (
                <p className="text-4xl font-Amatic text-red-500 font-bold">
                    Le tueur était <span className="underline">{suspects.name}</span> ...
                </p>
            ) : (
                <p className="text-2xl font-Amatic text-gray-400 animate-pulse">Chargement...</p>
            )}
        </div>
    );
}
