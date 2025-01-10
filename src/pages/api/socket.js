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

                if (sessions[sessionId]) {
                    console.log("(socket.js:84) here");

                    // Vérifier si le joueur a déjà voté dans cette session
                    if (!sessionVote[sessionId]) {
                        sessionVote[sessionId] = [];
                    }

                    const voteIndex = sessionVote[sessionId].findIndex(vote => vote.userId === userId);

                    if (voteIndex !== -1) {
                        // Si un vote existe déjà, mettre à jour le vote avec le nouveau suspectId
                        if (sessionVote[sessionId][voteIndex].suspectId === suspectId) {
                            console.log(`Le joueur ${userId} a déjà voté pour ${suspectId}`);
                            console.log(sessionVote[sessionId]);

                            io.to(socket.id).emit('voteError', 'Vous avez déjà voté pour ce suspect.');
                        } else {
                            sessionVote[sessionId][voteIndex].suspectId = suspectId;
                            console.log(`Le joueur ${userId} a changé son vote pour ${suspectId} dans la session ${sessionId}.`);
                            console.log(sessionVote[sessionId]);

                            io.to(socket.id).emit('voteUpdated', 'Votre vote a été mis à jour.');
                        }
                    } else {
                        // Si aucun vote précédent, enregistrer un nouveau vote
                        sessionVote[sessionId].push({
                            userId: userId,
                            suspectId: suspectId,
                        });
                        console.log(`Le joueur ${userId} a voté pour le suspect ${suspectId} dans la session ${sessionId}.`);
                        console.log(sessionVote[sessionId]);
                        io.to(socket.id).emit('voteSuccess', 'Vote enregistré avec succès.');
                    }

                    // Notifier les autres joueurs
                    io.to(sessionId).emit('updateVotes', sessionVote[sessionId]);
                    console.log(`Votes mis à jour envoyés pour la session ${sessionId} :`, sessionVote[sessionId]);

                } else {
                    console.error(`Session ${sessionId} introuvable.`);
                }
            });

            // ce que j'ai ajouté
            socket.on('getVoteEndTime', (sessionId) => {
                const sessionEndTime = sessions[sessionId]?.endTime;
                io.to(socket.id).emit('voteEndTime', sessionEndTime);
            });

        });

        res.socket.server.io = io;
    }
    res.end();
}
