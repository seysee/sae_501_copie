// pages/api/session.js
import { PrismaClient } from '@prisma/client';
import { sessions } from '../../lib/store';

const prisma = new PrismaClient();

export default async function handler(req, res) {
    try {
        if (req.method === 'GET') {
            const { id, code } = req.query;
            if (id) {
                const sessionDb = await prisma.sessions.findUnique({
                    where: { id: parseInt(id) },
                });
                if (!sessionDb) {
                    return res.status(404).json({ message: 'Session not found' });
                }

                // Pour aider au debug, affichez les clés de l'objet sessions
                console.log("=== GET /api/session ===");
                console.log("id =", id, "(type:", typeof id, ")");
                console.log("sessions keys =", Object.keys(sessions));

                // Récupération de la session en mémoire en forçant la clé en string
                const memorySession = sessions[id.toString()];
                console.log("memorySession =", memorySession);
                if (memorySession) {
                    sessionDb.activePlayerIndex = memorySession.activePlayerIndex;
                    sessionDb.playersInMemory = memorySession.players;
                }

                res.status(200).json(sessionDb);
            } else if (code) {
                console.log("start");
                // Récupère la session par code
                const session = await prisma.sessions.findFirst({
                    where: { code: code },
                });
                console.log("had fetched");
                if (!session) {
                    return res.status(404).json({ message: 'Session not found' });
                }
                res.status(200).json(session);
                console.log("returned");
            } else {
                // Récupère toutes les sessions
                const sessionsList = await prisma.sessions.findMany();
                res.status(200).json(sessionsList);
            }
        } else if (req.method === 'POST') {
            // Création d'une session
            const { code, playersNumber, status, hostId } = req.body;
            const session = await prisma.sessions.create({
                data: {
                    code,
                    playersNumber,
                    status,
                    hostId,
                },
            });
            res.status(201).json(session);
        } else if (req.method === 'PUT') {
            // Mise à jour d'une session par ID
            let { id, code, playersNumber, status, hostId, questions, killerId, hints } = req.body;
            console.log("Requête PUT reçue avec :", req.body);

            const existingSession = await prisma.sessions.findUnique({
                where: { id },
            });

            if (!existingSession) {
                return res.status(404).json({ message: 'Session not found' });
            }

            if (questions) {
                questions = JSON.stringify(questions);
            }
            const cleanData = (data) =>
                Object.fromEntries(Object.entries(data).filter(([_, value]) => value !== undefined));

            try {
                const updatedSession = await prisma.sessions.update({
                    where: { id },
                    data: cleanData({
                        code,
                        playersNumber,
                        status,
                        hostId,
                        questions,
                        killerId,
                        hints,
                    }),
                });

                res.status(200).json(updatedSession);
            } catch (error) {
                console.error("Erreur lors de la mise à jour de la session :", error);
                res.status(500).json({ message: 'Erreur interne du serveur', error: error.message });
            }
        } else if (req.method === 'DELETE') {
            // Suppression d'une session par ID
            const { id } = req.query;

            const existingSession = await prisma.sessions.findUnique({
                where: { id: parseInt(id) },
            });

            if (!existingSession) {
                return res.status(404).json({ message: 'Session not found' });
            }

            await prisma.sessions.delete({
                where: { id: parseInt(id) },
            });

            res.status(200).json({ message: 'Session deleted successfully' });
        } else {
            res.status(405).json({ message: 'Method Not Allowed' });
        }
    } catch (error) {
        console.error('Erreur API /session:', error);
        res.status(500).json({ message: 'Erreur interne du serveur' });
    }
}
