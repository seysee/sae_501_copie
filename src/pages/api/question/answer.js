import questions from '/src/data/questions.json';

export default function handler(req, res) {
    if (req.method === 'POST') {
        const { id, answer } = req.body;
        const question = questions.find(q => q.id === parseInt(id));

        if (!question) {
            return res.status(404).json({ message: "Question non trouvée." });
        }

        if (question.type === "action") {
            if (answer === question.answer) {
                return res.status(200).json({ correct: true, message: "Action réussie !" });
            } else {
                return res.status(200).json({ correct: false, message: "Action non réalisée, essayez encore." });
            }
        }

        // Gestion des questions normales (texte ou nombre)
        const normalizeString = (str) =>
            str.toLowerCase()
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, '')
                .trim();

        const userAnswer = normalizeString(answer);
        const correctAnswer = Array.isArray(question.answer)
            ? question.answer.some(ans => normalizeString(ans) === userAnswer)
            : userAnswer === normalizeString(question.answer);

        if (correctAnswer) {
            return res.status(200).json({ correct: true, message: "Bonne réponse !" });
        } else {
            return res.status(200).json({ correct: false, message: "Mauvaise réponse, essayez encore." });
        }
    }

    res.setHeader('Allow', ['POST']);
    res.status(405).end('Méthode non autorisée.');
}
