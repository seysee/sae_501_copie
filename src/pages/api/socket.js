import { Server } from 'socket.io';
import questions from '../../data/questions.json';
import {encryptParam} from '../../lib/cryptoUtils';
import {sessions} from '../../lib/store';

const sessionVote = {}; // sessionVote[sessionId] = [ ...
import {PrismaClient} from '@prisma/client';

const prisma = new PrismaClient();
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

        // Fonction shuffle si nécessaire
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
            socket.on('joinSession', (sessionId, player) => {
                console.log(`${player.name} a rejoint la session ${sessionId}`);

                // Initialiser la session si elle n'existe pas
                if (!sessions[sessionId]) {
                    sessions[sessionId] = {
                        players: [],
                        questions: shuffle([...questions]),
                        answered: false,
                        answeredBy: {},
                        lastPlayerId: null,
                    };
                }


                sessions[sessionId].players.push(player);
                socket.join(sessionId);

                console.log("(socket.js) Sessions:", sessions);
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
                let sessionDb;
                try {
                    sessionDb = await prisma.sessions.findUnique({
                        where: {id: parseInt(sessionId)},
                    });
                } catch (e) {
                    console.error("Erreur findUnique sessions :", e);
                    return;
                }
                if (!sessionDb) {
                    console.error(`Session BDD ${sessionId} introuvable.`);
                    return;
                }

                // On prend l’index BDD
                const aIndex = sessionDb.activePlayerIndex || 0;

                // Récupère tes joueurs (depuis la BDD ou le store en mémoire)
                let players;
                try {
                    players = await prisma.players.findMany({
                        where: {sessionId: parseInt(sessionId)},
                        orderBy: {id: 'asc'},
                    });
                } catch (e) {
                    console.error("Erreur findMany players :", e);
                    return;
                }

                // On suppose que sessions[sessionId].questions contient les questions
                // (Tu peux conserver le store en mémoire pour ça, ou tout stocker en BDD)
                const sessionData = sessions[sessionId];
                if (!sessionData) {
                    console.error(`Session en mémoire ${sessionId} introuvable.`);
                    return;
                }

                // Filtrer les questions déjà posées
                if (sessionData.questions.length === 0) {
                    sessionData.questions = shuffle([...questions]);
                }
                const availableQuestions = sessionData.questions.filter(
                    (q) => !toFilterQuestion.includes(q.id)
                );

                if (availableQuestions.length > 0) {
                    const firstQuestion = availableQuestions[0];
                    sessionData.answered = false;
                    sessionData.answeredBy = {};

                    // Le joueur actif actuel
                    const activePlayer = players[aIndex];

                    io.to(sessionId).emit('nextQuestion', {
                        question: firstQuestion,
                        activePlayer: activePlayer,
                    });
                } else {
                    console.log("Aucune question disponible pour cette session.");
                }
            });

            // Lorsque le joueur actif soumet une réponse
            // socket.js

            socket.on('submitAnswer', async ({sessionId, questionId, answer, playerId}) => {
                // Récupère la session dans la BDD
                let sessionDb;
                try {
                    sessionDb = await prisma.sessions.findUnique({
                        where: {id: parseInt(sessionId)},
                    });
                } catch (e) {
                    console.error("Erreur findUnique sessions :", e);
                    return;
                }
                if (!sessionDb) {
                    console.error(`Session BDD ${sessionId} introuvable.`);
                    return;
                }

                // Récupère la liste des joueurs (de la session *en BDD*, ou de ton store)
                // Si tu as déjà une table Players, c’est mieux de la lire depuis la BDD :
                let players;
                try {
                    players = await prisma.players.findMany({
                        where: {sessionId: parseInt(sessionId)},
                        orderBy: {id: 'asc'}, // ou tout autre critère
                    });
                } catch (e) {
                    console.error("Erreur findMany players :", e);
                    return;
                }

                // L’index actuel (depuis la BDD)
                const currentIndex = sessionDb.activePlayerIndex || 0;
                const nbPlayers = players.length;
                // Prochain index
                const newIndex = (currentIndex + 1) % nbPlayers;

                // Met à jour la base de données
                try {
                    await prisma.sessions.update({
                        where: {id: parseInt(sessionId)},
                        data: {activePlayerIndex: newIndex},
                    });
                    console.log(`Prochain joueur actif (BDD) : index = ${newIndex}`);
                } catch (e) {
                    console.error("Erreur lors de la mise à jour de l'activePlayerIndex :", e);
                }

                // (Facultatif) on stocke lastPlayerId dans le store mémoire, ou dans la BDD
                if (sessions[sessionId]) {
                    sessions[sessionId].lastPlayerId = playerId;
                    sessions[sessionId].answered = true;
                }

                // Rediriger vers result
                const encryptedQuestionId = encryptParam(questionId);
                const encryptedAnswer = encryptParam(answer);
                socket.join(sessionId);

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

                /* quand tous les users votent, on peut plus voter
                const totalVotes = sessionVote[sessionId].length;
                const totalPlayers = sessions[sessionId].players.length;
                if (totalVotes === totalPlayers) {
                    console.log('Tous les joueurs ont voté.');
                    io.to(sessionId).emit('voteEndTime');
                }*/

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
