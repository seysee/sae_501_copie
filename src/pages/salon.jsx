import React, {useEffect, useState} from 'react';
import Button from '../components/_button';
import axios from 'axios';
import io from 'socket.io-client';
import {useRouter} from 'next/router';
import skinsData from "/src/data/skins";
import _switchBtn from "../components/_switchBtn";
import FancyLoader from "../components/_loader";

export default function Salon() {
    const [session, setSession] = useState(null);
    const [players, setPlayers] = useState([]);
    const [gameCreated, setGameCreated] = useState(false);
    const [isHost, setIsHost] = useState(false);
    const [socket, setSocket] = useState(null);
    const [copySuccess, setCopySuccess] = useState('');
    const [killerType, setKillerType] = useState(0);

    // État pour stocker et afficher des messages d'erreur
    const [errorMessage, setErrorMessage] = useState('');

    const router = useRouter();
    const skins = skinsData.skins;
    const [isLoading, setIsLoading] = useState(true);

    const getPlayerSkin = (playerSkinId) => {
        const playerSkin = skins.find((skin) => skin.id === playerSkinId);
        return playerSkin.skin;
    };

    const getStoredUserData = () => {
        try {
            const storedPlayer = sessionStorage.getItem('userData');
            if (storedPlayer) {
                return JSON.parse(storedPlayer);
            }
        } catch (error) {
            console.error('Erreur lors de la récupération des données utilisateur:', error);
            setErrorMessage('Impossible de récupérer les données utilisateur.');
        }
        return null;
    };

    const fetchSessionBySessionId = async (sessionId) => {
        try {
            const response = await axios.get('/api/session', {
                params: {id: sessionId},
            });
            setSession(response.data);
        } catch (error) {
            console.error('Erreur lors de la récupération de la session :', error);
            setErrorMessage('Une erreur est survenue lors de la récupération de la session.');
            alert('Une erreur est survenue lors de la récupération de la session.');
        }
    };

    const fetchPlayersBySessionId = async (sessionId) => {
        try {
            const response = await axios.get('/api/player', {
                params: {sessionId: sessionId},
            });
            setPlayers(response.data);
        } catch (error) {
            if (error.response && error.response.status === 404) {
                console.error('La ressource demandée est introuvable');
                alert('Aucun joueur trouvé pour cette session.');
                setErrorMessage('Aucun joueur trouvé pour cette session.');
            } else {
                console.error('Erreur lors de la récupération des joueurs :', error);
                setErrorMessage('Erreur lors de la récupération des joueurs.');
            }
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsLoading(false);
        }, 2000);

        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        const storedPlayer = getStoredUserData();
        if (!storedPlayer) {
            setErrorMessage('Aucune donnée utilisateur trouvée en sessionStorage.');
            return;
        }
        fetchSessionBySessionId(storedPlayer.sessionId);
        fetchPlayersBySessionId(storedPlayer.sessionId);

        const socketConnection = io('http://localhost:3000', {
            path: '/api/socket',
        });
        setSocket(socketConnection);

        socketConnection.on('connect', () => {
            console.log('Socket.IO connecté avec succès.');
            setSocket(socketConnection);

            socketConnection.emit('joinSession', storedPlayer.sessionId, storedPlayer, () => {
                console.log('Événement joinSession émis.');
            });
        });

        socketConnection.on('updatePlayers', (updatedPlayers) => {
            setPlayers(updatedPlayers);
        });

        socketConnection.on('gameStarted', (redirectUrl) => {
            console.log('Événement "gameStarted" reçu. Redirection vers :', redirectUrl);
            if (redirectUrl) {
                router.push(redirectUrl)
                    .then(() => console.log('Redirection réussie vers /role'))
                    .catch((error) => {
                        console.error('Erreur lors de la redirection :', error);
                        setErrorMessage('Erreur lors de la redirection.');
                    });
            }
        });

        return () => {
            socketConnection.disconnect();
        };
    }, []);

    useEffect(() => {
        if (players.length > 0 && session) {
            const storedPlayer = getStoredUserData();
            if (storedPlayer) {
                setIsHost(storedPlayer.id === session.hostId);
            }
        }
    }, [players, session]);

    const handleCopyCode = async () => {
        if (session?.code) {
            try {
                await navigator.clipboard.writeText(session.code);
                setCopySuccess('Code copié !');
                setTimeout(() => setCopySuccess(''), 2000);
            } catch (error) {
                setCopySuccess('Échec de la copie');
                setErrorMessage('Impossible de copier le code.');
            }
        }
    };

    const startGame = async () => {
        try {
            setIsLoading(true);

            setTimeout(async () => {
                const storedPlayer = getStoredUserData();
                if (!storedPlayer) {
                    console.error('Aucune donnée utilisateur trouvée.');
                    setErrorMessage('Impossible de lancer la partie : aucune donnée utilisateur trouvée.');
                    return;
                }

                const sessionTemp = await fetchSessionBySessionId(storedPlayer.sessionId);
                // 'sessionTemp' sera undefined car fetchSessionBySessionId fait un setSession
                // On peut vérifier si 'session' local est null
                if (!session) {
                    console.error('Session introuvable (ou non chargée).');
                    setErrorMessage('Impossible de lancer la partie : session introuvable.');
                    return;
                }
                console.log("avant suspect");

                const suspectsResponse = await axios.get("/api/suspect", {
                    params: { killerType: killerType },
                });
                const suspects = suspectsResponse.data;
                if (!suspects || suspects.length === 0) {
                    setErrorMessage('Impossible de récupérer des suspects pour ce type de killer.');
                    return;
                }

                const randomIndex = Math.floor(Math.random() * suspects.length);
                console.log("ID aléatoire sélectionné :", suspects[randomIndex].id);
                const killerRandom = suspects[randomIndex].id;

                const responseSession = await axios.put('/api/session', {
                    id: storedPlayer.sessionId,
                    status: 1,
                    killerId: killerRandom,
                    killerType: killerType,
                });

                console.log(responseSession)

                setGameCreated(true);

                const playerNumber = players.length;
                let roleCount = playerNumber <= 4 ? 1 : 2;
                const selectedIndices = [];
                while (selectedIndices.length < roleCount) {
                    const randomIndex = Math.floor(Math.random() * playerNumber);
                    if (!selectedIndices.includes(randomIndex)) {
                        selectedIndices.push(randomIndex);
                    }
                }

                for (let i = 0; i < playerNumber; i++) {
                    const role = selectedIndices.includes(i) ? 1 : 0;
                    await axios.put('/api/player', {
                        id: players[i].id,
                        role: role,
                    });
                }
                await socket.emit('startGame', storedPlayer.sessionId);
                setIsLoading(false);
            }, 2000);
        } catch (error) {
            console.error('Erreur lors de la mise à jour de la session ou de la récupération des questions :', error);
            setErrorMessage('Erreur lors de la configuration de la partie.');
            setIsLoading(false);
        }
    };

    const quitGame = async () => {
        const storedPlayer = getStoredUserData();
        if (!storedPlayer) {
            console.error("Impossible de récupérer les données utilisateur.");
            setErrorMessage('Impossible de quitter la partie : pas de données utilisateur.');
            return;
        }

        if (!session) {
            setErrorMessage('Impossible de quitter : session introuvable.');
            return;
        }

        try {
            if (isHost) {
                if (players.length > 1) {
                    const newHostId = players.find((player) => player.id !== storedPlayer.id)?.id;
                    await axios.put('/api/session', {
                        id: session.id,
                        hostId: newHostId,
                        playersNumber: session.playersNumber - 1,
                        status: session.playersNumber === 6 ? 0 : undefined,
                    });
                } else {
                    await axios.delete('/api/session', {params: {id: session.id}});
                }
                await axios.put('/api/player', {id: storedPlayer.id, sessionId: null});
                sessionStorage.setItem('userData', JSON.stringify({...storedPlayer, sessionId: null}));
                await router.push('/');
            } else {
                await axios.put('/api/session', {
                    id: session.id,
                    playersNumber: session.playersNumber - 1,
                    status: session.playersNumber === 6 ? 0 : undefined,
                });
                await axios.put('/api/player', {id: storedPlayer.id, sessionId: null});
                sessionStorage.setItem('userData', JSON.stringify({...storedPlayer, sessionId: null}));
                await router.push('/');
            }
        } catch (error) {
            console.error('Erreur lors de la procédure de quitGame :', error);
            setErrorMessage('Impossible de quitter la partie (erreur serveur).');
        }
    };

    const handleTypeOfGame = (selectedValue) => {
        console.log(selectedValue);
        setKillerType(selectedValue === "dictateur" ? 0 : 1);
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center text-white">
            {(
                <button
                    onClick={() => router.back()}
                    className="absolute top-4 left-0 flex items-center justify-center w-10 h-10 bg-gray-800 rounded-full text-white hover:bg-gray-700"
                    title="Retour"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                        className="w-6 h-6"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M15.75 19.5L8.25 12l7.5-7.5"
                        />
                    </svg>
                </button>
            )}
            {session ? (
                <>
                    <h1 className="text-5xl font-Amatic mb-12">Créer une partie</h1>
                    <div className="mb-5">
                        <h1 className="text-3xl text-center font-Amatic mb-3">Choisi un thème :</h1>
                        <_switchBtn arg1="Dictateur" arg2="Vilain de film" onSelect={handleTypeOfGame}/>
                    </div>
                    <div className="w-full max-w-md">
                        <p className="text-2xl mb-5 font-Roboto flex items-center">
                            Code :{" "}
                            <span className="font-bold text-red-500 ml-2"> {session.code || <FancyLoader/>} </span>
                            <button
                                onClick={handleCopyCode}
                                title="Copier le code"
                                className="relative ml-4 focus:outline-none" >
                                {/* Icône composée de 2 carrés superposés */}
                                <svg
                                    className="w-6 h-6 text-white hover:text-gray-300"
                                    fill="currentColor"
                                    viewBox="0 0 20 20"
                                >
                                    <rect x="3" y="3" width="10" height="10" rx="1" ry="1"/>
                                    <rect
                                        x="7"
                                        y="7"
                                        width="10"
                                        height="10"
                                        rx="1"
                                        ry="1"
                                        fillOpacity="0.6"
                                    />
                                </svg>
                                {/* Message de confirmation positionné en absolute en haut à droite */}
                                {copySuccess && (
                                    <span
                                        className="absolute top-0 right-10 bg-green-500 text-white text-xs px-3 py-1 rounded transform translate-x-1/2 -translate-y-1/2 whitespace-nowrap">
                                        {copySuccess}
                                    </span>
                                )}
                            </button>
                        </p>


                        {players.length > 0 ? (
                            <div>
                                <p className="text-xl font-Amatic mb-4">Utilisateurs :</p>
                                <div className="bg-gray-800 p-4 rounded-lg">
                                    <ul className="list-disc list-inside space-y-2">
                                        {players.map((player, index) => (
                                            <li key={index}
                                                className="text-yellow-400 font-bold flex flex-row items-center">
                                                {player.name} <img width="30px" src={getPlayerSkin(player.skin)}/>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        ) : (
                            <p className="text-gray-400">Aucun utilisateur pour le moment...</p>
                        )}

                        {session.status === 0 ? (
                            isHost && players.length >= 0 ? (
                                <Button
                                    label="Lancer la partie"
                                    onClick={startGame}
                                    className="py-3 bg-black text-green-500 border-green-500 mt-5"
                                />
                            ) : (
                                <p className="text-center text-lg font-Amatic text-green-500 mt-12">
                                    {isHost
                                        ? "Vous n'êtes pas assez pour débuter une partie."
                                        : "Attendez que l'hôte lance la partie."}
                                </p>
                            )
                        ) : (
                            <p className="text-center text-lg font-Amatic text-green-500 mt-12">
                                La session a été créée. Aucun autre utilisateur ne peut la rejoindre.
                            </p>
                        )}

                        <div className="mt-2">
                            <Button
                                label="Annuler"
                                onClick={quitGame}
                                className="py-3 bg-black text-red-500 border-red-500"
                            />
                        </div>

                        {/* Affichage d'un message d'erreur global si nécessaire */}
                        {errorMessage && (
                            <p className="text-red-500 text-xl font-Amatic mt-4 text-center">
                                {errorMessage}
                            </p>
                        )}
                    </div>
                </>
            ) : (
                <FancyLoader/>
            )}
        </div>
    );
}
