import {useState, useEffect} from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import Timer from '../components/_timer';

export default function Vote() {
    const [suspects, setSuspects] = useState(null); // State for storing suspects
    const [players, setPlayers] = useState(null); // State for storing players
    const [error, setError] = useState(null); // State for error handling
    const [socket, setSocket] = useState(null);
    const [votes, setVotes] = useState([]);

    const [voters, setVoters] = useState([]);
    const [disableVote, setDisableVote] = useState(false);
    const initialTime = 10;
    const [votedSuspectId, setVotedSuspectId] = useState(null);

    // Fetch data using useEffect
    useEffect(() => {
        const storedUserData = getStoredUserData();

        if (storedUserData?.sessionId) {
            fetchSuspects();
            fetchPlayersBySessionId(storedUserData.sessionId);
        }
    }, []);

    useEffect(() => {
        const socketConnection = io('http://localhost:3000', {
            path: '/api/socket',
        });
        setSocket(socketConnection);

        socketConnection.on('voteError', (errorMessage) => {
            console.error('Erreur de vote reçue :', errorMessage);
            alert(errorMessage);
        });

        const handleVotesUpdate = (votes) => {
            console.log('Mise à jour des votes reçue :', votes);
            setVotes(votes);

            const storedUserData = getStoredUserData();
            const userVote = votes.find(vote => vote.userId === storedUserData?.id);

            if (userVote) {
                setVotedSuspectId(userVote.suspectId);
                setDisableVote(true);
            }

            const votedPlayers = votes.map(vote => vote.userName || vote.userId);
            setVoters(votedPlayers);
        };

        // Gestionnaire pour l'événement "voteSuccess"
        socketConnection.on('voteSuccess', (votes) => {
            handleVotesUpdate(votes);
        });

        socketConnection.on('allVotes', (votes) => {
            console.log(votes)
            setVotes(votes)
        });
        console.log("sessionId de getStoreUserData dans le useEffect", getStoredUserData().sessionId)

        socketConnection.on('voteEndTime', () => {
            setDisableVote(true);
            console.log('Le temps est écoulé. Les votes sont désormais fermés.');
        });

        return () => {
            if (socketConnection) {
                socketConnection.disconnect();
            }
        };
    }, []);

    useEffect(() => {
        if (!socket) return;

        const sessionId = getStoredUserData()?.sessionId;

        if (!sessionId) {
            console.error("Session ID is missing or invalid.");
            return;
        }

        try {
            console.log("Emitting getSessionVote with sessionId:", sessionId);
            socket.emit('getSessionVote', sessionId);
        } catch (error) {
            console.error("Error emitting getSessionVote:", error);
        }
    }, [socket]); // Ajoutez socket comme dépendance pour que cet useEffect réagisse à son initialisation



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
                params: {sessionId: sessionId},
            });
            setPlayers(response.data);
        } catch (err) {
            console.error('Failed to fetch players:', err);
            setError('Failed to fetch players');
        }
    };

    const voteForSuspect = (suspectId) => {
        const storedUserData = getStoredUserData();
        const confirmVote = window.confirm("Valider votre vote ?");
        if (!confirmVote) return;

        if (confirmVote && socket && storedUserData) {
            console.log("StoredUserData", storedUserData.id);
            console.log("StoredUserData", storedUserData.sessionId);
            console.log("SUSPECT ID VOTÉ", suspectId);
            socket.emit('voteForSuspect', suspectId, storedUserData.id, storedUserData.sessionId);
            //setDisableVote(true);
        }
    };

    const handleTimeUp = () => {
        setDisableVote(true);
        console.log('Le temps est écoulé. Les votes sont désormais fermés.');
    };

    return (
        <div className="min-h-screen flex flex-col p-4 items-center justify-center">
            <h1 className="text-5xl font-Amatic mb-7">Place au vote</h1>

            {!disableVote && (
                <div>
                    <Timer initialTime={initialTime} onTimeUp={handleTimeUp} paused={false}/>
                </div>
            )}

            {disableVote && (
                <p className="text-red-500 font-Amatic text-2xl">Le vote est terminé</p>
            )}

            {error ? (
                <p className="text-red-500 text-2xl font-semibold text-center">{error}</p>
            ) : suspects ? (
                <div className="w-full max-w-6xl mx-auto">
                    <h1 className="font-Amatic text-3xl mb-4 mt-4">Suspects :</h1>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {suspects.map((suspect, index) => {
                            // Comptez les votes pour le suspect actuel
                            const votesForSuspect = votes.filter(vote => vote.suspectId === suspect.id).length;

                            return (
                                <div key={index} className="flex flex-col items-center">
                                    <button
                                        onClick={() => voteForSuspect(suspect.id)}
                                        disabled={disableVote || votedSuspectId === suspect.id}
                                        className={`relative border border-gray-600 bg-gray-800 flex justify-between items-center p-4 w-full rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 ${
                                            disableVote ? 'opacity-50 cursor-not-allowed' : ''
                                        }`}
                                    >
                                        <p className="font-Amatic text-2xl text-white font-medium truncate">
                                            {suspect.name}
                                        </p>
                                        {votesForSuspect > 0 && (
                                            <div className="absolute right-3 top-3 flex flex-wrap gap-1">
                                                {/* Générer un cercle rouge pour chaque vote */}
                                                {Array.from({length: votesForSuspect}).map((_, i) => (
                                                    <svg
                                                        key={i}
                                                        xmlns="http://www.w3.org/2000/svg"
                                                        className="w-6 h-6 text-red-500"
                                                        viewBox="0 0 24 24"
                                                        fill="currentColor"
                                                    >
                                                        <circle cx="12" cy="12" r="6"/>
                                                    </svg>
                                                ))}
                                            </div>
                                        )}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ) : (
                <p className="font-Amatic text-gray-400 text-2xl animate-pulse">Loading...</p>
            )}

            {players ? (
                <div className="w-full max-w-6xl mx-auto mt-10">
                    <h1 className="font-Amatic text-3xl mb-4">Joueurs :</h1>
                    <div className="flex flex-wrap gap-3">
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

            {voters.length > 0 && (
                <div className="w-full max-w-6xl mx-auto mt-10">
                    <h1 className="font-Amatic text-3xl mb-4">Joueurs ayant voté :</h1>
                    <div className="flex flex-wrap gap-3">
                        {voters.map((voter, index) => (
                            <div
                                key={index}
                                className="border border-gray-600 bg-gray-800 p-3 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200"
                            >
                                <p className="font-Amatic text-xl font-medium truncate">{voter}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

        </div>
    );
}

/* à faire :
- mettre une petite pastille "a voté" sur le suspect
- que quand quelqu'un vote ça mette en synchro pour tous les utilisateurs
- quand on appuie sur un suspect, ça doit nous demander "valider votre vote" avant
- mettre un timer pour la fin du vote, et après ça on peut pas plus voter
 */