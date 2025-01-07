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


            // Lancer les questions
            socket.on('launchQuestions', (sessionId, toFilterQuestion) => {
                console.log(`Lancement des questions pour la session : ${sessionId}`);
                console.log("toFilterQuestion", toFilterQuestion);
                console.log("ici test session[sessionId]:", sessions[sessionId] , sessions[sessionId].questions);
                if (sessions[sessionId]) {
                    const availableQuestions = sessions[sessionId].questions
                        .filter(q => !toFilterQuestion.includes(q.id));  // Garde uniquement les questions dont l'ID n'est PAS dans toFilterQuestion

                    if (availableQuestions.length > 0) {
                        const randomIndex = Math.floor(Math.random() * availableQuestions.length);  // Sélectionne un index aléatoire
                        const firstQuestion = availableQuestions[randomIndex];  // Récupère la question aléatoire

                        // Retire cette question de la liste pour éviter qu'elle ne soit posée à nouveau
                        sessions[sessionId].questions = sessions[sessionId].questions.filter(q => q.id !== firstQuestion.id);

                        io.to(sessionId).emit('nextQuestion', firstQuestion);  // Envoie la question
                    }
                }
            });


            socket.on('submitAnswer', ({ sessionId, questionId, answer }) => {
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
