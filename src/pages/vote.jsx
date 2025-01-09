import {useState, useEffect} from 'react';
import axios from 'axios';

export default function Profile() {
    const [suspects, setSuspects] = useState(null); // State for storing suspects
    const [players, setPlayers] = useState(null); // State for storing suspects
    const [sessionId, setSessionId] = useState(null); // State for storing suspects
    const [error, setError] = useState(null); // State for error handling

    // Fetch data using useEffect
    useEffect(() => {
        const storedUserData = getStoredUserData();
        fetchSuspects();
        fetchPlayersBySessionId(storedUserData.sessionId);
    }, []);

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

    const fetchSuspects = async () => {
        try {
            const response = await axios.get("/api/suspect");
            console.log(response);
            setSuspects(response.data);
        } catch (err) {
            console.error('Failed to fetch suspects:', err);
            setError('Failed to fetch suspects');
        }
    };

    const fetchPlayersBySessionId = async (sessionId) => {
        try {
            console.log(sessionId)
            const response = await axios.get("/api/player", {
                params: {sessionId: sessionId},
            });
            console.log(response);
            setPlayers(response.data);
        } catch (err) {
            console.error('Failed to fetch players:', err);
            setError('Failed to fetch players');
        }
    };


    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-1">
            <h1 className="text-5xl font-Amatic mb-10">Place au vote</h1>
            {error ? (
                <p className="text-red-500 text-2xl font-semibold">{error}</p>
            ) : suspects ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full max-w-6xl mb-10">
                    <h1 className="font-Amatic text-3xl">Suspects :</h1>

                    {suspects.map((suspect, index) => (
                        <div
                            key={index}
                            className="border border-gray-600 bg-gray-800 p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200"
                        >
                            <p className="font-Amatic text-2xl font-medium truncate">{suspect.name}</p>
                        </div>
                    ))}
                </div>
            ) : (
                <p className="font-Amatic text-gray-400 text-2xl animate-pulse">Loading...</p>
            )}
            {players ? (
                <div>
                    <h1 className="font-Amatic text-3xl mb-5">Joueurs :</h1>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 w-full max-w-6xl">
                        {players.map((player, index) => (
                            <div
                                key={index}
                                className="border border-gray-600 bg-gray-800 p-5 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200"
                            >
                                <p className="font-Amatic text-2xl font-medium truncate">{player.name}</p>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <p className="text-gray-400 font-Amatic text-2xl animate-pulse">Loading...</p>
            )}
        </div>

    );
}
