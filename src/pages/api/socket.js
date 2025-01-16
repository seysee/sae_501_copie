import { Server } from 'socket.io';
import { encryptParam } from '../../lib/cryptoUtils';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const sessions = {}; // Store en mémoire pour les sessions
const sessionVote = {}; // Store en mémoire pour les votes par session

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
                            where: { id: { notIn: toFilterQuestion }, active: true },
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
                console.log(`Réponse reçue pour la question ${questionId} :`, answer);

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

            // Gestion des votes pour les suspects
            socket.on('voteForSuspect', (suspectId, userId, sessionId) => {
                if (!sessions[sessionId]) {
                    io.to(socket.id).emit('voteError', 'Session introuvable.');
                    return;
                }

                if (!sessionVote[sessionId]) {
                    sessionVote[sessionId] = [];
                }

                const voteIndex = sessionVote[sessionId].findIndex((vote) => vote.userId === userId);

                if (voteIndex !== -1) {
                    sessionVote[sessionId][voteIndex].suspectId = suspectId;
                } else {
                    sessionVote[sessionId].push({ userId, suspectId });
                }

                io.to(sessionId).emit('voteSuccess', sessionVote[sessionId]);
            });

            socket.on("returnHome", (sessionId) => {
                io.to(sessionId).emit('redirectToEnigma');
            })


        });



        res.socket.server.io = io;
    }
    res.end();
}
