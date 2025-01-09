import { useState, useEffect } from 'react';
import axios from 'axios';
import io from 'socket.io-client';

export default function Profile() {
    const [suspects, setSuspects] = useState(null); // State for storing suspects
    const [players, setPlayers] = useState(null); // State for storing players
    const [error, setError] = useState(null); // State for error handling
    const [socket, setSocket] = useState(null);

    // Fetch data using useEffect
    useEffect(() => {
        // Crée une connexion socket une seule fois lors du premier rendu
        const socketConnection = io('http://localhost:3000', {
            path: '/api/socket',
        });
        setSocket(socketConnection);

        // Assurez-vous que les appels API sont effectués après avoir récupéré les données de session
        const storedUserData = getStoredUserData();
        if (storedUserData?.sessionId) {
            fetchSuspects();
            fetchPlayersBySessionId(storedUserData.sessionId);
        }

        // Assurez-vous de gérer la déconnexion lorsque le composant est démonté
        return () => {
            if (socketConnection) {
                socketConnection.disconnect();
            }
        };
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
            setSuspects(response.data);
        } catch (err) {
            console.error('Failed to fetch suspects:', err);
            setError('Failed to fetch suspects');
        }
    };

    const fetchPlayersBySessionId = async (sessionId) => {
        try {
            const response = await axios.get("/api/player", {
                params: { sessionId: sessionId },
            });
            setPlayers(response.data);
        } catch (err) {
            console.error('Failed to fetch players:', err);
            setError('Failed to fetch players');
        }
    };

    const voteForSuspect = (suspectId) => {
        const storedUserData = getStoredUserData();
        if (socket && storedUserData) {
            console.log("SUSPECT ID VOTÉ", suspectId);
            console.log("StoredUserData", storedUserData.id);
            console.log("StoredUserData", storedUserData.sessionId);

            socket.emit('voteForSuspect', suspectId, storedUserData.id, storedUserData.sessionId);
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
                        <button onClick={() => voteForSuspect(suspect.id)} key={index}
                                className="border border-gray-600 bg-gray-800 flex justify-start p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200">
                            <p className="font-Amatic text-2xl text-white font-medium truncate">{suspect.name}</p>
                        </button>
                    ))}
                </div>
            ) : (
                <p className="font-Amatic text-gray-400 text-2xl animate-pulse">Loading...</p>
            )}

            {players ? (
                <div>
                    <h1 className="font-Amatic text-3xl mb-5">Joueurs :</h1>

                    <div className="flex flex-wrap gap-3 w-full max-w-6xl">
                        {players.map((player, index) => (
                            <div
                                key={index}
                                className="border border-gray-600 bg-gray-800 p-3 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200"
                            >
                                <p className="font-Amatic text-xl font-medium truncate">{player.name}</p>
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
