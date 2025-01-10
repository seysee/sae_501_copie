import { Server } from 'socket.io';
import questions from '../../data/questions.json';
import { encryptParam } from '../../lib/cryptoUtils';
import axios from "axios"; // Chemin vers votre fichier d'utilitaires

const sessions = {}; // Stock temporaire pour les sessions et leurs joueurs

export default function handler(req, res) {
    if (!res.socket.server.io) {
        const io = new Server(res.socket.server, {
            path: '/api/socket',
            cors: {
                origin: '*',
                methods: ['GET', 'POST'],
            },
        });

        io.on('connection', (socket) => {

            // Rejoindre une session
            socket.on('joinSession', (sessionId, player) => {

                // Initialiser la session si elle n'existe pas
                if (!sessions[sessionId]) {
                    sessions[sessionId] = {
                        players: [],
                        questions: shuffle([...questions]),
                        answered: false
                    };
                }

                // Vérifier si le joueur est déjà dans la session
                const existingPlayer = sessions[sessionId].players.find(p => p.id === player.id);
                if (!existingPlayer) {
                    sessions[sessionId].players.push(player);
                } else {
                }

                socket.join(sessionId);
                io.to(sessionId).emit('updatePlayers', sessions[sessionId].players);
            });


            // Démarrer une partie
            socket.on('startGame', (sessionId) => {
                io.to(sessionId).emit('gameStarted', '/role');
            });


            function shuffle(array) {
                for (let i = array.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [array[i], array[j]] = [array[j], array[i]];
                }
                return array;
            }

            socket.on('launchQuestions', async (sessionId, toFilterQuestion) => {
                console.log(`${sessionId} est en train de lancer les questions.`);

                if (sessions[sessionId]) {
                    // Récupérer des questions si nécessaire
                    if (sessions[sessionId].questions.length === 0) {
                        try {
                            const response = await axios.get('/api/question/question', { params: { limit: 10 } });
                            sessions[sessionId].questions = response.data;
                        } catch (error) {
                            console.error("Erreur lors de la récupération des questions :", error);
                            return;
                        }
                    }

                    // Exclure les questions déjà répondues
                    const availableQuestions = sessions[sessionId].questions.filter(q => !toFilterQuestion.includes(q.id));

                    if (availableQuestions.length > 0) {
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



            socket.on('submitAnswer', ({ sessionId, questionId, answer }) => {
                console.log(`Réponse reçue pour la question ${questionId} :`, answer);
                if (sessions[sessionId]) {
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


        });

        res.socket.server.io = io;
    }
    res.end();
}
