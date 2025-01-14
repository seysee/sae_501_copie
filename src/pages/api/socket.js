// socket.js
import { Server } from 'socket.io';
import questions from '../../data/questions.json';
import { encryptParam } from '../../lib/cryptoUtils';
import { sessions } from '../../lib/store';
const sessionVote = {}; // sessionVote[sessionId] = [ ...
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

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
                        activePlayerIndex: 0,
                        lastPlayerId: null, // <-- on initialise
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

            // Lancer la question suivante
            socket.on('launchQuestions', (sessionId, toFilterQuestion) => {
                console.log(`${sessionId} est en train de lancer les questions.`);

                const sessionData = sessions[sessionId];
                if (!sessionData) {
                    console.error(`Session ${sessionId} introuvable.`);
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

                    // Qui est le joueur actif ?
                    const { activePlayerIndex, players } = sessionData;
                    const activePlayer = players[activePlayerIndex];

                    // Envoyer la question + l'info du joueur actif
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

            socket.on('submitAnswer', async ({ sessionId, questionId, answer, playerId }) => {
                const sessionData = sessions[sessionId];
                if (!sessionData) {
                    console.error(`Session ${sessionId} introuvable.`);
                    return;
                }

                sessionData.answered = true;
                sessionData.lastPlayerId = playerId;
                const nbPlayers = sessionData.players.length;

                // Incrémente de 1 (une seule fois) l'index du joueur actif
                sessionData.activePlayerIndex = (sessionData.activePlayerIndex + 1) % nbPlayers;
                console.log("Le prochain joueur actif est index:", sessionData.activePlayerIndex);

                // Mise à jour dans la base de données pour persister l'index actif
                try {
                    await prisma.sessions.update({
                        where: { id: parseInt(sessionId) },
                        data: { activePlayerIndex: sessionData.activePlayerIndex }
                    });
                } catch (e) {
                    console.error("Erreur lors de la mise à jour de l'activePlayerIndex :", e);
                }

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
                console.log(`Vote reçu : suspectId = ${suspectId}, userId = ${userId}, sessionId = ${sessionId}`);

                if (!suspectId || !userId || !sessionId) {
                    console.error("Données invalides reçues : suspectId, userId ou sessionId manquant.");
                    io.to(socket.id).emit('voteError', 'Données invalides pour le vote.');
                    return;
                } //verifie si il y a les données

                if (!sessions[sessionId]) {
                    console.error(`Session ${sessionId} introuvable.`);
                    io.to(socket.id).emit('voteError', 'Session introuvable.');
                    return;
                } //vérifie sur la session existe

                if (!sessionVote[sessionId]) {
                    sessionVote[sessionId] = [];
                } //verifie si le vote de la session id existe, et si non initialiser a []

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

                // Vérifiez les votes mis à jour avant de les envoyer
                console.log(`Mise à jour des votes pour la session ${sessionId} :`, sessionVote[sessionId]);
                socket.join(sessionId);
                io.to(sessionId).emit('voteSuccess', sessionVote[sessionId]);
            });

            socket.on('getSessionVote', (sessionId) => {
                console.log(`Envoyer ${sessionVote[sessionId]} à sessionId = ${sessionId}`);
                socket.join(sessionId);
                io.to(sessionId).emit('allVotes', sessionVote[sessionId]);
            });

                // temps de vote
            socket.on('getVoteEndTime', (sessionId) => {
                const sessionEndTime = sessions[sessionId]?.endTime;
                if (sessionEndTime) {
                    io.to(socket.id).emit('voteEndTime', sessionEndTime);
                } else {
                    io.to(socket.id).emit('voteError', 'Temps de fin non défini pour cette session.');
                }
            });

        });

        res.socket.server.io = io;
    }
    res.end();
}
