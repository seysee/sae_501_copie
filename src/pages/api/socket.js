import { Server } from 'socket.io';

import { encryptParam } from '../../lib/cryptoUtils';

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const sessions = {}; // Store en mémoire pour les sessions
const sessionVote = {}; // Store en mémoire pour les votes par session
const sessionTimerVote = {};
const timerAlreadyEnd = {};

export default function handler(req, res) {
    if (!res.socket.server.io) {
        console.log('Initialisation du serveur Socket.IO...');
        const io = new Server(res.socket.server, {
            path: '/api/socket',
            cors: {
                origin: '*',
                methods: ['GET', 'POST'],
            },
        });

        // Fonction pour mélanger les tableaux
        function shuffle(array) {
            for (let i = array.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [array[i], array[j]] = [array[j], array[i]];
            }
            return array;
        }

        io.on('connection', (socket) => {
            console.log('Nouvelle connexion établie :', socket.id);

            // Rejoindre une session
            socket.on('joinSession', async (sessionId, player) => {
                console.log(`${player.name} a rejoint la session ${sessionId}`);

                if (!sessions[sessionId]) {
                    sessions[sessionId] = {
                        players: [],
                        questions: [],
                        answered: false,
                        activePlayerIndex: 0,
                    };
                }

const existingPlayer = sessions[sessionId].players.find((p) => p.id === player.id);
                if (!existingPlayer) {
                    sessions[sessionId].players.push(player);
                }
                socket.join(sessionId);
                io.to(sessionId).emit('updatePlayers', sessions[sessionId].players);
            });

            // Démarrer une partie
            socket.on('startGame', (sessionId) => {
                console.log(`La partie dans la session ${sessionId} commence.`);
                io.to(sessionId).emit('gameStarted', '/role');
            });

            socket.on('newHintAdded', async (sessionId) => {
                try {
                    // On peut éventuellement récupérer la session mise à jour depuis la BDD
                    const sessionData = await prisma.sessions.findUnique({
                        where: { id: parseInt(sessionId) },
                    });
                    // Diffuse l’événement aux autres clients de la session.
                    socket.to(sessionId).emit('refreshHints');
                } catch (error) {
                    console.error("Erreur lors de l'émission de refreshHints :", error);
                }
            });
            // Lancer les questions
            socket.on('launchQuestions', async (sessionId, toFilterQuestion) => {
                console.log(`${sessionId} est en train de lancer les questions.`);

                if (!sessions[sessionId]) {
                    console.error(`Session ${sessionId} introuvable.`);
                    return;
                }

                // Charger les questions depuis la base de données si nécessaire
                if (sessions[sessionId].questions.length === 0) {
                    try {
                        const dbQuestions = await prisma.questions.findMany({
                        where: {  id: { notIn: toFilterQuestion }, active: true },
                        });
                        sessions[sessionId].questions = shuffle(dbQuestions);
                    } catch (error) {
                        console.error('Erreur lors de la récupération des questions depuis la base de données :', error);
                        return;
                    }
                }

                const availableQuestions = sessions[sessionId].questions.filter(
                    (q) => !toFilterQuestion.includes(q.id)
                );

                if (availableQuestions.length > 0) {
                    const firstQuestion = availableQuestions[0];
                    const activePlayerIndex = sessions[sessionId].activePlayerIndex || 0;
                    const activePlayer = sessions[sessionId].players[activePlayerIndex];

                    io.to(sessionId).emit('nextQuestion', {
                        question: firstQuestion,
                        activePlayer,
                    });
                } else {
                    console.log('Aucune question disponible pour cette session.');
                }
            });

            // Soumission de la réponse

            socket.on('submitAnswer', async ({ sessionId, questionId, answer, playerId }) => {

                console.log(`Réponse reçue pour la question ${questionId} :, answer`);

                const sessionData = sessions[sessionId];
                if (!sessionData) {
                    console.error(`Session ${sessionId} introuvable.`);
                    return;
                }

                // Mettre à jour l'index du joueur actif
                const currentIndex = sessionData.activePlayerIndex || 0;
                const newIndex = (currentIndex + 1) % sessionData.players.length;
                try {
                    await prisma.sessions.update({
                        where: { id: parseInt(sessionId) },
                        data: { activePlayerIndex: newIndex },
                    });
                    sessionData.activePlayerIndex = newIndex;
                } catch (error) {
                    console.error('Erreur lors de la mise à jour de l’index du joueur actif :', error);
                }

                sessionData.answered = true;

                const encryptedQuestionId = encryptParam(questionId);
                const encryptedAnswer = encryptParam(answer);

                io.to(sessionId).emit('answerSubmitted', {
                    redirectUrl: `/result?questionId=${encodeURIComponent(encryptedQuestionId)}&answer=${encodeURIComponent(encryptedAnswer)}`,
                });
            });

            socket.on('returnHome', (sessionId) => {
                console.log(`Le joueur de la session ${sessionId} demande le retour à l'accueil.`);
                // On émet un événement commun pour TOUS les joueurs de la session
                io.to(sessionId).emit('redirectToEnigma');
            });
            // Exemple : si tu veux passer au joueur suivant **après** la bonne réponse
            // tu peux écouter un event du type "setNextPlayer" déclenché depuis result.jsx
            // ou bien l'appeler directement en fin de "submitAnswer", c'est au choix.
            socket.on('setNextPlayer', (sessionId) => {
                const sessionData = sessions[sessionId];
                if (!sessionData) return;

                const nbPlayers = sessionData.players.length;
                sessionData.activePlayerIndex = (sessionData.activePlayerIndex + 1) % nbPlayers;
                console.log(`Prochain joueur: index = ${sessionData.activePlayerIndex}`);
            });


            socket.on('voteForSuspect', (suspectId, userId, sessionId) => {
                console.log(`suspectId ${suspectId} :`, `userId = ${userId}`, `sessionId = ${sessionId}`);

                if (!suspectId || !userId || !sessionId) {
                    console.error("Données invalides reçues : suspectId, userId ou sessionId manquant.");
                    io.to(socket.id).emit('voteError', 'Données invalides pour le vote.');
                    return;
                } // vérifie s'il y a les données

                if (!sessions[sessionId]) {
                    console.error(`Session ${sessionId} introuvable.`);
                    io.to(socket.id).emit('voteError', 'Session introuvable.');
                    return;
                } // vérifie sur la session existe

                if (!sessionVote[sessionId]) {
                    sessionVote[sessionId] = [];
                } // vérifie si le vote de la session id existe, et si non initialiser a []

                // vérification du tps de vote
                const now = new Date();
                const sessionEndTime = sessions[sessionId]?.endTime;
                if (sessionEndTime && new Date(sessionEndTime) <= now) {
                    io.to(socket.id).emit('voteError', 'Le temps de vote est écoulé.');
                    return;
                }

                const voteIndex = sessionVote[sessionId].findIndex(vote => vote.userId === userId);

                if (voteIndex !== -1) {
                    if (sessionVote[sessionId][voteIndex].suspectId === suspectId) {
                        console.log(`Le joueur ${userId} a déjà voté pour ${suspectId}`);
                        io.to(socket.id).emit('voteError', 'Vous avez déjà voté pour ce suspect.');
                    } else {
                        sessionVote[sessionId][voteIndex].suspectId = suspectId;
                        console.log(`Le joueur ${userId} a changé son vote pour ${suspectId}.`);
                    }
                } else {
                    sessionVote[sessionId].push({userId, suspectId});
                    console.log(`Le joueur ${userId} a voté pour le suspect ${suspectId}.`);
                }


                console.log(`Mise à jour des votes pour la session ${sessionId} :`, sessionVote[sessionId]);
                socket.join(sessionId);
                io.to(sessionId).emit('voteSuccess', sessionVote[sessionId]);
            });


            socket.on('getSessionVote', (sessionId) => {
                console.log(`Envoyer ${sessionVote[sessionId]} à sessionId = ${sessionId}`);
                socket.join(sessionId);
                io.to(sessionId).emit('allVotes', sessionVote[sessionId]);
            });

            socket.on('getVoteEndTime', (sessionId, timer ) => {
                socket.join(sessionId);

                if (!sessionTimerVote[sessionId]) {
                    sessionTimerVote[sessionId] = timer; // Initialiser le timer pour la session
                }
                if (timerAlreadyEnd[sessionId] === true){
                    const message = "vote fini"
                    io.to(sessionId).emit('endVote', { message });
                    return
                }
                let returnTimer = sessionTimerVote[sessionId];

                if (!sessions[sessionId]?.intervalId) {
                    const intervalId = setInterval(() => {
                        if (returnTimer > 0) {
                            returnTimer -= 1;
                            sessionTimerVote[sessionId] = returnTimer; // Mettre à jour le timer
                            io.to(sessionId).emit('VoteTime', { returnTimer }); // Émettre le temps restant
                        } else {
                            clearInterval(intervalId); // Stopper l'intervalle
                            timerAlreadyEnd[sessionId] = true;
                            io.to(sessionId).emit('endVote', { returnTimer: 0 }); // Notifier la fin du vote
                            if (sessions[sessionId]) {
                                delete sessions[sessionId].intervalId; // Supprimer la référence de l'intervalle
                            }
                        }
                    }, 1000);

                    // Stocker l'intervalle pour éviter des doublons
                    if (!sessions[sessionId]) {
                        sessions[sessionId] = {};
                    }
                    sessions[sessionId].intervalId = intervalId;
                }
            });


            socket.on('startVote', (sessionId, durationInSeconds) => {
                const now = new Date();
                const endTime = new Date(now.getTime() + durationInSeconds * 1000);
                if (!sessions[sessionId]) {
                    sessions[sessionId] = {};
                }
                sessions[sessionId].endTime = endTime; // Stocker la fin du vote
                io.to(sessionId).emit('voteStart', { endTime }); // Émettre l'événement de début de vote
            });


        });



        res.socket.server.io = io;
    }
    res.end();
}