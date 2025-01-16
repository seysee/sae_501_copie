import React, { useEffect, useState } from 'react';
import Button from '../components/_button';
import axios from 'axios';
import io from 'socket.io-client';
import { useRouter } from 'next/router';

export default function Salon() {
    const [session, setSession] = useState(null);
    const [players, setPlayers] = useState([]);
    const [gameCreated, setGameCreated] = useState(false);
    const [isHost, setIsHost] = useState(false);
    const [socket, setSocket] = useState(null);
    const [copySuccess, setCopySuccess] = useState('');
    const router = useRouter();

    // Fonction utilitaire pour récupérer les données utilisateur stockées
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

    // Récupérer la session via l'ID dans les données utilisateur
    const fetchSessionBySessionId = async (sessionId) => {
        try {
            const response = await axios.get('/api/session', {
                params: { id: sessionId },
            });
            setSession(response.data);
        } catch (error) {
            console.error('Erreur lors de la récupération de la session :', error);
            alert('Une erreur est survenue lors de la récupération de la session.');
        }
    };

    // Récupérer la liste des joueurs de la session
    const fetchPlayersBySessionId = async (sessionId) => {
        try {
            const response = await axios.get('/api/player', {
                params: { sessionId: sessionId },
            });
            setPlayers(response.data);
        } catch (error) {
            if (error.response && error.response.status === 404) {
                console.error('La ressource demandée est introuvable');
                alert('Aucun joueur trouvé pour cette session.');
            } else {
                console.error('Erreur lors de la récupération des joueurs :', error);
            }
        }
    };

    // Initialisation de Socket.IO et des données de session
    useEffect(() => {
        const storedPlayer = getStoredUserData();
        if (storedPlayer) {
            fetchSessionBySessionId(storedPlayer.sessionId);
            fetchPlayersBySessionId(storedPlayer.sessionId);

            // Initialisation de la connexion Socket.IO
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

            // Mise à jour des joueurs
            socketConnection.on('updatePlayers', (updatedPlayers) => {
                setPlayers(updatedPlayers);
            });

            // Événement de démarrage du jeu
            socketConnection.on('gameStarted', (redirectUrl) => {
                console.log('Événement "gameStarted" reçu. Redirection vers :', redirectUrl);
                if (redirectUrl) {
                    router
                        .push(redirectUrl)
                        .then(() => {
                            console.log('Redirection réussie vers /role');
                        })
                        .catch((error) => {
                            console.error('Erreur lors de la redirection :', error);
                        });
                }
            });

            return () => {
                socketConnection.disconnect();
            };
        }
    }, []);

    // Vérification pour déterminer si l'utilisateur est l'hôte
    useEffect(() => {
        if (players.length > 0 && session) {
            const storedPlayer = getStoredUserData();
            if (storedPlayer) {
                setIsHost(storedPlayer.id === session.hostId);
            }
        }
    }, [players, session]);

    // Fonction de copie du code de session dans le presse-papiers
    const handleCopyCode = async () => {
        if (session?.code) {
            try {
                await navigator.clipboard.writeText(session.code);
                setCopySuccess('Code copié !');
                setTimeout(() => setCopySuccess(''), 2000);
            } catch (error) {
                setCopySuccess('Échec de la copie');
            }
        }
    };

    // Lancer la partie
    const startGame = async () => {
        const storedPlayer = getStoredUserData();
        if (!storedPlayer) {
            console.error('Aucune donnée utilisateur trouvée.');
            return;
        }

        try {
            // Récupération des questions
            const response = await axios.get('/api/question/question', {
                params: { limit: 10 },
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

            if (playerNumber <= 4) {
                roleCount = 1;
            } else if (playerNumber > 4) {
                roleCount = 2;
            }

            // Sélection aléatoire pour l'attribution de rôles
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
            socket.emit('startGame', storedPlayer.sessionId);
        } catch (error) {
            console.error(
                'Erreur lors de la mise à jour de la session ou de la récupération des questions :',
                error
            );
        }
    };

    // Quitter la partie
    const quitGame = async () => {
        const storedPlayer = getStoredUserData();
        if (!storedPlayer) {
            console.error("Impossible de récupérer les données utilisateur.");
            return;
        }

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
                await axios.delete('/api/session', { params: { id: session.id } });
            }
            await axios.put('/api/player', { id: storedPlayer.id, sessionId: null });
            sessionStorage.setItem('userData', JSON.stringify({ ...storedPlayer, sessionId: null }));
            await router.push('/');
        } else {
            await axios.put('/api/session', {
                id: session.id,
                playersNumber: session.playersNumber - 1,
                status: session.playersNumber === 6 ? 0 : undefined,
            });
            await axios.put('/api/player', { id: storedPlayer.id, sessionId: null });
            sessionStorage.setItem('userData', JSON.stringify({ ...storedPlayer, sessionId: null }));
            await router.push('/');
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center text-white">
            {session ? (
                <>
                    <h1 className="text-5xl font-Amatic mb-28">Créer une partie</h1>
                    <div className="w-full max-w-md">
                        <p className="text-2xl font-Amatic mb-12 flex items-center">
                            Code :{" "}
                            <span className="font-bold text-red-500 ml-2">
    {session.code || "Chargement..."}
  </span>
                            <button
                                onClick={handleCopyCode}
                                title="Copier le code"
                                className="relative ml-4 focus:outline-none"
                            >
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
                                    label="Lancer la partie"
                                    onClick={startGame}
                                    className="py-3 bg-black text-green-500 border-green-500 mt-12"
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
                    </div>
                </>
            ) : (
                <p>Chargement de la session...</p>
            )}
        </div>
    );
}
