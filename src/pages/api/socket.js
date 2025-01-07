import { Server } from 'socket.io';
import questions from '../../data/questions.json';

const sessions = {}; // Stock temporaire pour les sessions et leurs joueurs

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
                if (!sessions[sessionId]) sessions[sessionId] = { players: [], questions: [], answered: false };

                sessions[sessionId].players.push(player);
                socket.join(sessionId);

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

            socket.on('launchQuestions', (sessionId) => {
                if (sessions[sessionId]) {
                    if (sessions[sessionId].questions.length === 0) {
                        sessions[sessionId].questions = shuffle([...questions]);
                    }
                    const firstQuestion = sessions[sessionId].questions.shift();
                    if (firstQuestion) {
                        sessions[sessionId].answered = false;
                        sessions[sessionId].answeredBy = {};
                        io.to(sessionId).emit('nextQuestion', firstQuestion);
                    }
                }
            });


            socket.on('submitAnswer', ({ sessionId, questionId, answer }) => {
                console.log(`Réponse reçue pour la question ${questionId} :`, answer);
                if (sessions[sessionId]) {
                    sessions[sessionId].answered = true;
                    io.to(sessionId).emit('answerSubmitted', {
                        redirectUrl: `/result?questionId=${questionId}&answer=${encodeURIComponent(answer)}`,
                        questionId,
                        answer
                    });
                }
            });


        });

        res.socket.server.io = io;
    }
    res.end();
}
