import React, {useEffect, useState} from 'react';
import Button from '../components/_button';
import axios from 'axios';
import io from 'socket.io-client';
import {useRouter} from 'next/router'; // Import correct de useRouter

export default function Salon() {
    const [session, setSession] = useState(null);
    const [players, setPlayers] = useState([]);
    const [gameCreated, setGameCreated] = useState(false);
    const [isHost, setIsHost] = useState(false);
    const [socket, setSocket] = useState(null);
    const router = useRouter(); // Correctement utiliser useRouter

    useEffect(() => {
        const storedPlayer = getStoredUserData();
        if (storedPlayer) {
            fetchSessionBySessionId(storedPlayer.sessionId);
            fetchPlayersBySessionId(storedPlayer.sessionId);

            // Initialisation de la connexion Socket.IO
            const socketConnection = io('http://localhost:3000', {
            // const socketConnection = io('https://469b-195-220-84-41.ngrok-free.app', {
                path: '/api/socket',
            });
            setSocket(socketConnection);

            // Événement de connexion Socket.IO
            socketConnection.on('connect', () => {
                console.log('Socket.IO connecté avec succès.');
                setSocket(socketConnection);
                socketConnection.emit('joinSession', storedPlayer.sessionId, storedPlayer, () => {
                    console.log('Événement joinSession émis.');
                });
            });

            // Mise à jour des joueurs
            socketConnection.on('updatePlayers', (updatedPlayers) => {
                setPlayers(updatedPlayers);
            });

            // Événement de démarrage du jeu
            socketConnection.on('gameStarted', (redirectUrl) => {
                console.log('Événement "gameStarted" reçu. Redirection vers :', redirectUrl);
                if (redirectUrl) {
                    router.push(redirectUrl).then(() => {
                        console.log('Redirection réussie vers /role');
                    }).catch((error) => {
                        console.error('Erreur lors de la redirection :', error);
                    });
                }
            });

            return () => {
                socketConnection.disconnect();
            };
        }
    }, []);

    useEffect(() => {
        if (players.length > 0 && session) {
            const storedPlayer = getStoredUserData();
            if (storedPlayer) {
                setIsHost(storedPlayer.id === session.hostId);
            }
        }
    }, [players, session]);
    const getStoredUserData = () => {
        try {
            const storedPlayer = sessionStorage.getItem('userData');
            if (storedPlayer) {
                return JSON.parse(storedPlayer);
            }
        }
        catch (error) {
            console.error('Erreur lors de la récupération des données utilisateur:', error);
        }
        return null;
    };

    const fetchSessionBySessionId = async (sessionId) => {
        try {
            const response = await axios.get('/api/session', {
                params: {id: sessionId},
            });
            setSession(response.data);
        }
        catch (error) {
            console.error('Erreur lors de la récupération de la session :', error);
            alert('Une erreur est survenue lors de la récupération de la session.');
        }
    };

    const fetchPlayersBySessionId = async (sessionId) => {
        try {
            const response = await axios.get('/api/player', {
                params: {sessionId: sessionId},
            });
            setPlayers(response.data);
        }
        catch (error) {
            if (error.response && error.response.status === 404) {
                console.error('La ressource demandée est introuvable');
                alert('Aucun joueur trouvé pour cette session.');
            } else {
                console.error('Erreur lors de la récupération des joueurs :', error);
            }
        }
    };

    const startGame = async () => {
        const storedPlayer = getStoredUserData();
        if (!storedPlayer) {
            console.error('Aucune donnée utilisateur trouvée.');
            return;
        }

        try {
            // Étape 1 : Récupérer 10 questions depuis l'API
            const response = await axios.get('/api/question/question', {
                params: { limit: 10 }, // Exemple avec un filtre de difficulté
            });
            const questions = response.data;

            await axios.put('/api/session', {
                id: session.id,
                status: 1,
                killerId: 1,
            });

            setGameCreated(true);

            const playerNumber = players.length;
            let roleCount = 0;

            // Déterminer combien de joueurs auront le rôle '1'
            if (playerNumber <= 4) {
                roleCount = 1;
            } else if (playerNumber > 4) {
                roleCount = 2;
            }

            // Sélectionner les rôles
            const selectedIndices = [];
            while (selectedIndices.length < roleCount) {
                const randomIndex = Math.floor(Math.random() * playerNumber);
                if (!selectedIndices.includes(randomIndex)) {
                    selectedIndices.push(randomIndex);
                }
            }

            for (let i = 0; i < playerNumber; i++) {
                const role = selectedIndices.includes(i) ? 1 : 0;
                await axios.put("/api/player", {
                    id: players[i].id,
                    role: role,
                });
            }
            socket.emit('startGame', storedPlayer.sessionId); // Informer tous les utilisateurs que la partie démarre
        } catch (error) {
            console.error('Erreur lors de la mise à jour de la session ou de la récupération des questions :', error);
        }
    };

    const quitGame = async () => {
        const storedPlayer = getStoredUserData();
        if (!storedPlayer) {
            console.error("Impossible de récupérer les données utilisateur.");
            return;
        }

        if (isHost) {
            if (players.length > 1) {
                const newHostId = players.find(player => player.id !== storedPlayer.id)?.id;
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
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center text-white">
            {session ? (
                <>
                    <h1 className="text-5xl font-Amatic mb-28">Créer une partie</h1>
                    <div className="w-full max-w-md">
                        <p className="text-2xl font-Amatic mb-12">
                            Code : <span className="font-bold text-red-500">{session.code || 'Chargement...'}</span>
                        </p>
                        {players.length > 0 ? (
                            <div>
                                <p className="text-xl font-Amatic mb-4">Utilisateurs :</p>
                                <div className="bg-gray-800 p-4 rounded-lg">
                                    <ul className="list-disc list-inside space-y-2">
                                        {players.map((player, index) => (
                                            <li key={index} className="text-yellow-400 font-bold">
                                                {player.name}
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
                                    label="Créer la partie"
                                    onClick={startGame}
                                    className="py-3 bg-black text-green-500 border-green-500 mt-12"
                                />
                            ) : (
                                <p className="text-center text-lg font-Amatic text-green-500 mt-12">
                                    {isHost
                                        ? 'Vous n\'êtes pas assez pour débuter une partie.'
                                        : 'Attendez que l\'hôte lance la partie.'}
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
                    </div>
                </>
            ) : (
                <p>Chargement de la session...</p>
            )}
        </div>
    );
}
