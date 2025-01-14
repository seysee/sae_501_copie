// pages/api/question/remember.js
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export default async function handler(req, res) {
    if (req.method === 'POST') {
        const { sessionId, questionId } = req.body;
        if (!sessionId || !questionId) {
            return res.status(400).json({ message: "SessionID ou questionId manquant." });
        }

        try {
            const session = await prisma.sessions.findUnique({
                where: { id: parseInt(sessionId) },
            });
            if (!session) {
                return res.status(404).json({ message: 'Session not found' });
            }

            // On récupère la colonne questions, qui est un tableau JSON
            let storedQuestions = [];
            if (session.questions) {
                try {
                    storedQuestions = JSON.parse(session.questions);
                    if (!Array.isArray(storedQuestions)) {
                        storedQuestions = [];
                    }
                } catch (e) {
                    // Si le JSON est mal formé, on réinitialise
                    storedQuestions = [];
                }
            }

            // On ajoute la question si elle n'existe pas déjà
            if (!storedQuestions.includes(questionId)) {
                storedQuestions.push(questionId);
            }

            // Mise à jour en BDD
            await prisma.sessions.update({
                where: { id: parseInt(sessionId) },
                data: {
                    questions: JSON.stringify(storedQuestions),
                },
            });

            return res.status(200).json({ message: 'Question marquée comme répondue.' });
        } catch (error) {
            console.error("Erreur lors de la mise à jour de la session :", error);
            return res.status(500).json({ message: "Erreur interne du serveur." });
        }
    }

    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ message: 'Méthode non autorisée.' });
}
