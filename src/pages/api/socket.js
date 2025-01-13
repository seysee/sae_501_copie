import {Server} from 'socket.io';
import questions from '../../data/questions.json';
import {encryptParam} from '../../lib/cryptoUtils'; // Chemin vers votre fichier d'utilitaires

const sessions = {}; // Stock temporaire pour les sessions et leurs joueurs
const sessionVote = {}; //STOCKER LES VOTES

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
                        answered: false
                    };
                }

                sessions[sessionId].players.push(player);
                socket.join(sessionId);
                console.log("(socket.js:36) ", sessions);
                io.to(sessionId).emit('updatePlayers', sessions[sessionId].players);
            });


            // Démarrer une partie
            socket.on('startGame', (sessionId) => {
                console.log(`La partie dans la session ${sessionId} commence.`);
                io.to(sessionId).emit('gameStarted', '/role');
            });


            function shuffle(array) {
                for (let i = array.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [array[i], array[j]] = [array[j], array[i]];
                }
                return array;
            }

            socket.on('launchQuestions', (sessionId, toFilterQuestion) => {
                console.log(`${sessionId} est en train de lancer les questions.`);

                if (sessions[sessionId]) {
                    if (sessions[sessionId].questions.length === 0) {
                        sessions[sessionId].questions = shuffle([...questions]);
                    }
                    const availableQuestions = sessions[sessionId].questions
                        .filter(q => !toFilterQuestion.includes(q.id));

                    console.log("Questions disponibles après filtrage :", availableQuestions);

                    if (availableQuestions.length > 0) { // Vérifier si des questions sont disponibles
                        const firstQuestion = availableQuestions[0]; // Utiliser [0] pour obtenir la première question
                        sessions[sessionId].answered = false;
                        sessions[sessionId].answeredBy = {};
                        io.to(sessionId).emit('nextQuestion', firstQuestion);
                    } else {
                        console.log("Aucune question disponible pour cette session.");
                    }
                } else {
                    console.error(`Session ${sessionId} introuvable.`);
                }
            });


            socket.on('submitAnswer', ({sessionId, questionId, answer}) => {
                console.log(`Réponse reçue pour la question ${questionId} :`, answer);
                if (sessions[sessionId]) {
                    console.log("(socket.js:84) here");
                    sessions[sessionId].answered = true;

                    const encryptedQuestionId = encryptParam(questionId);
                    const encryptedAnswer = encryptParam(answer);

                    io.to(sessionId).emit('answerSubmitted', {
                        redirectUrl: `/result?questionId=${encodeURIComponent(encryptedQuestionId)}&answer=${encodeURIComponent(encryptedAnswer)}`,
                    });
                } else {
                    console.error(`Session ${sessionId} introuvable.`);
                }
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
                        io.to(socket.id).emit('voteUpdated', 'Votre vote a été mis à jour.');
                    }
                } else {
                    sessionVote[sessionId].push({ userId, suspectId });
                    console.log(`Le joueur ${userId} a voté pour le suspect ${suspectId}.`);
                    io.to(socket.id).emit('voteSuccess', 'Vote enregistré avec succès.');
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


            socket.on('startVote', (sessionId, durationInSeconds) => {
                const now = new Date();
                const endTime = new Date(now.getTime() + durationInSeconds * 1000);
                if (!sessions[sessionId]) {
                    sessions[sessionId] = {};
                }
                sessions[sessionId].endTime = endTime;
                io.to(sessionId).emit('voteStart', { endTime });
            });


            socket.on('getVoteEndTime', (sessionId, callback) => {
                if (sessions[sessionId]?.endTime) {
                    callback({ endTime: sessions[sessionId].endTime });
                } else {
                    callback({ error: 'Session introuvable ou pas de vote en cours.' });
                }
            });


        });

        res.socket.server.io = io;
    }
    res.end();
}
