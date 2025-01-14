import {PrismaClient} from '@prisma/client';
const prisma = new PrismaClient();

export default async function handler(req, res) {
    if (req.method === 'GET') {
        try {
            const { limit = 10 } = req.query;

            // Récupérer les questions depuis la base
            const questions = await prisma.questions.findMany({
                where : {active : true}
            });
            if (!questions || questions.length === 0) {
                return res.status(404).json({ error: "Aucune question disponible." });
            }

            // Mélanger les questions
            const shuffledQuestions = questions.sort(() => Math.random() - 0.5).slice(0, parseInt(limit));

            res.status(200).json(shuffledQuestions);
        } catch (error) {
            console.error('Erreur lors de la récupération des questions :', error);
            res.status(500).json({ error: "Erreur interne du serveur." });
        }
    } else {
        res.setHeader('Allow', ['GET']);
        res.status(405).end(`Méthode ${req.method} non autorisée`);
    }
}
