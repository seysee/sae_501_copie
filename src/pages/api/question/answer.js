import Prisma from '@prisma/client';

const prisma = new Prisma.PrismaClient();

export default async function handler(req, res) {
    if (req.method === 'POST') {
        const { id, answer } = req.body;

        try {
            // Récupération de la question depuis la base de données
            const question = await prisma.questions.findUnique({
                where: { id: parseInt(id) }
            });

            if (!question) {
                return res.status(404).json({ message: "Question non trouvée." });
            }

            if (question.type === "action") {
                // Gestion des questions de type "action"
                if (answer === question.solution) {
                    return res.status(200).json({
                        correct: true,
                        message: JSON.parse(question.feedback)?.correct || "Action réussie !"
                    });
                } else {
                    return res.status(200).json({
                        correct: false,
                        message: JSON.parse(question.feedback)?.incorrect || "Action non réalisée, essayez encore."
                    });
                }
            }

            // Normalisation de la chaîne pour gérer les réponses
            const normalizeString = (str) =>
                str.toLowerCase()
                    .normalize("NFD")
                    .replace(/[\u0300-\u036f]/g, '')
                    .trim();

            const userAnswer = normalizeString(answer);
            const correctAnswer = Array.isArray(JSON.parse(question.solution))
                ? JSON.parse(question.solution).some(ans => normalizeString(ans) === userAnswer)
                : userAnswer === normalizeString(question.solution);

            if (correctAnswer) {
                return res.status(200).json({
                    correct: true,
                    message: JSON.parse(question.feedback)?.correct || "Bonne réponse !"
                });
            } else {
                return res.status(200).json({
                    correct: false,
                    message: JSON.parse(question.feedback)?.incorrect || "Mauvaise réponse, essayez encore."
                });
            }
        } catch (error) {
            console.error("Erreur lors du traitement de la réponse :", error);
            return res.status(500).json({ message: "Erreur interne du serveur." });
        }
    }

    res.setHeader('Allow', ['POST']);
    res.status(405).end('Méthode non autorisée.');
}
