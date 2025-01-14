import {useState, useEffect} from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import Timer from '../components/_timer';
import Modal from '../components/_modal';
import AllHints from '../components/_allHints';
import _button from "../components/_button";
import skinsData from "/src/data/skins";
import { useRouter } from 'next/router';

export default function Profile() {
    const [suspects, setSuspects] = useState(null);
    const [players, setPlayers] = useState(null);
    const [error, setError] = useState(null);
    const [socket, setSocket] = useState(null);
    const [votes, setVotes] = useState([]);
    const [voters, setVoters] = useState([]);
    const [disableVote, setDisableVote] = useState(false);
    const [initialTime, setInitialTime] = useState(60);
    const [votedSuspectId, setVotedSuspectId] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [selectedSuspect, setSelectedSuspect] = useState(null);
    const router = useRouter();
    const [showHints, setShowHints] = useState(false);
    const skins = skinsData.skins;

    const getPlayerSkin = (playerSkinId) => {
        const playerSkin = skins.find((skin) => skin.id === playerSkinId )
        return playerSkin.skin
    }

    useEffect(() => {
        const storedUserData = getStoredUserData();

        if (storedUserData?.sessionId) {
            fetchSuspects();
            fetchPlayersBySessionId(storedUserData.sessionId);

            if (socket && storedUserData?.sessionId) {
                socket.emit('getVoteEndTime', storedUserData.sessionId, (response) => {
                    if (response?.endTime) {
                        const timeLeft = synchronizeTimer(response.endTime);
                        setInitialTime(timeLeft);
                        if (timeLeft === 0) setDisableVote(true);
                    }
                });
            }
        }
    }, [socket]);

    useEffect(() => {
        const socketConnection = io('http://localhost:3000', {
            path: '/api/socket',
        });
        setSocket(socketConnection);

        socketConnection.on('voteError', (errorMessage) => {
            console.error('Erreur de vote reçue :', errorMessage);
            alert(errorMessage);
        });
        startVote(initialTime)
        const handleVotesUpdate = (votes) => {
            console.log('Mise à jour des votes reçue :', votes);
            setVotes(votes);

            const storedUserData = getStoredUserData();
            const userVote = votes.find(vote => vote.userId === storedUserData?.id);

            if (userVote) {
                setVotedSuspectId(userVote.suspectId);
                setDisableVote(true);
            }
        };

        // Gestionnaire pour l'événement "voteSuccess"
        socketConnection.on('voteSuccess', (votes) => {
            handleVotesUpdate(votes);
        });

        socketConnection.on('allVotes', (votes) => {
            console.log(votes)
            if (votes) {
                setVotes(votes)
                const storedUserData = getStoredUserData();
                const userVote = votes.find(vote => vote.userId === storedUserData?.id) || null;

                if (userVote) {
                    setVotedSuspectId(userVote.suspectId);
                    setDisableVote(true);
                }
            }
        });
        console.log("sessionId de getStoreUserData dans le useEffect", getStoredUserData().sessionId)

        socketConnection.on('voteStart', ({ endTime }) => {
            const timeLeft = synchronizeTimer(endTime);
            setInitialTime(timeLeft);
            setDisableVote(false);
        });

        socketConnection.on('VoteTime', ({returnTimer}) => {
            setInitialTime(returnTimer);
        });

        socketConnection.on('endVote', (message) => {
            setDisableVote(true);
            console.log('Le temps est écoulé. Les votes sont désormais fermés.');
        });

        socketConnection.on('gameEnded', (redirectUrl) => {
            console.log('Événement "gameEnded" reçu. Redirection vers :', redirectUrl);
            if (redirectUrl) {
                router.push(redirectUrl).then(() => {
                    console.log('Redirection réussie vers /endGame');
                }).catch((error) => {
                    console.error('Erreur lors de la redirection :', error);
                });
            }
        });

        return () => {
            if (socketConnection) { socketConnection.disconnect()
            ;}
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
    }, [socket]);

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

    const startVote = (durationInSeconds) => {
        const storedUserData = getStoredUserData();
        const sessionId = storedUserData?.sessionId;

        if (socket && sessionId) {
            socket.emit('startVote', sessionId, durationInSeconds);
        }
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

    const confirmVote = () => {
        const storedUserData = getStoredUserData();

        if (selectedSuspect && socket && storedUserData) {
            console.log('StoredUserData', storedUserData.id);
            console.log('StoredUserData', storedUserData.sessionId);
            console.log('SUSPECT ID VOTÉ', selectedSuspect.id);

            socket.emit('voteForSuspect', selectedSuspect.id, storedUserData.id, storedUserData.sessionId);
        }

        setShowModal(false);
    };

    const voteForSuspect = (suspect) => {
        setSelectedSuspect(suspect);
        setShowModal(true);
    };

    const handleTimeUp = () => {
        setDisableVote(true);
        console.log('Le temps est écoulé. Les votes sont désormais fermés.');

        setTimeout(() => {
            router.push('/endGame');
        }, 3000);
    };

    const synchronizeTimer = (endTime) => {
        const endTimestamp = new Date(endTime).getTime();
        const nowTimestamp = Date.now();
        return Math.max(Math.floor((endTimestamp - nowTimestamp) / 1000), 0);
    };

    const toggleHints = () => {
        setShowHints((prev) => !prev);
    };

    return (
        <div className="min-h-screen flex flex-col p-4 items-center justify-center">
            <h1 className="text-5xl font-Amatic mb-7">Place au vote</h1>

            <div>
                {disableVote ? (
                    <p className="text-red-500 font-Amatic text-2xl">Le vote est terminé</p>
                ) : (
                    <Timer initialTime={initialTime} onTimeUp={handleTimeUp} paused={false}/>
                )}
            </div>

            {error ? (
                <p className="text-red-500 text-2xl font-semibold text-center">{error}</p>
            ) : suspects ? (
                <div className="w-full max-w-6xl mx-auto">
                    <div className="flex flex-row justify-between items-center">
                        <h1 className="font-Amatic text-3xl mb-4 mt-4">Suspects :</h1>
                        <_button label="indices" className="max-w-24 text-white h-12 text-lg flex justify-center items-center" onClick={toggleHints}/>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {suspects.map((suspect, index) => {
                            const votesForSuspect = votes ? votes.filter(vote => vote.suspectId === suspect.id).length : 0;

                            return (
                                <div key={index} className="flex flex-col items-center">
                                    <button
                                        onClick={() => voteForSuspect(suspect)}
                                        disabled={disableVote || votedSuspectId === suspect.id}
                                        className={`relative border border-gray-600 bg-gray-800 flex justify-between items-center p-4 w-full rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 ${
                                            disableVote ? 'opacity-50 cursor-not-allowed' : ''
                                        }`}
                                    >
                                        <p className="font-Amatic text-2xl text-white font-medium truncate">
                                            {suspect.name}
                                        </p>
                                        {votesForSuspect > 0 && (
                                            <div className="absolute right-3 top-3 flex flex-wrap gap-0.5">
                                                {/* Générer un cercle rouge pour chaque vote */}
                                                {Array.from({length: votesForSuspect}).map((_, i) => (

                                                    <img className="w-6 h-6" src="/amonUsPastille.png"/>
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
                                className="border border-gray-600 bg-gray-800 p-3 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 flex items-center"
                            >
                                <img width="30px" src={getPlayerSkin(player.skin)} />
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

            <div
                className={`absolute ${showHints ? "block" : "hidden"}`}
            >
                <AllHints onClose={() => setShowHints(false)}/>
            </div>

            <Modal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                onConfirm={confirmVote}
                suspectName={selectedSuspect?.name}
            />

        </div>
    );
}