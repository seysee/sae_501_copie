import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req, res) {
    if (req.method === 'GET') {
        try {
            const { id } = req.query;

            if (!id || isNaN(parseInt(id))) {
                return res.status(400).json({ message: "ID invalide. Veuillez fournir un ID numérique." });
            }
            // Requête Prisma
            const suspect = await prisma.suspects.findUnique({
                where: { id: parseInt(id) },
            });

            if (!suspect) {
                return res.status(404).json({ message: "Aucun suspect trouvé avec cet ID." });
            }

            return res.status(200).json(suspect);
        } catch (error) {
            return res.status(500).json({ message: "Erreur interne du serveur." });
        }
    } else if (req.method === 'POST') {
        // -----------------------------------------------------CRÉE UN SUSPECT (pas pour les joueurs mais je laisse quand meme pour l'instant)---------------------------------------------------------//

        const { name, description, hints } = req.body;
        const suspect = await prisma.suspects.create({
            data: {
                name,
                description,
                hints,
            },
        });
        res.status(201).json(suspect);
    } else if (req.method === 'PUT') {
        // -----------------------------------------------------MODIFIE UN SUSPECT (pas pour les joueurs mais je laisse quand meme pour l'instant)---------------------------------------------------------//

        // Mettre à jour un suspect
        const { id, name, description, hints } = req.body;

        // Vérifier si le suspect existe
        const existingSuspect = await prisma.suspects.findUnique({
            where: { id },
        });

        if (!existingSuspect) {
            return res.status(404).json({ message: 'Suspect not found' });
        }

        // Mettre à jour les informations du suspect
        const updatedSuspect = await prisma.suspects.update({
            where: { id },
            data: {
                name,
                description,
                hints,
            },
        });

        res.status(200).json(updatedSuspect);
    } else if (req.method === 'DELETE') {
        // -----------------------------------------------------DELETE UN SUSPECT (A SUPPRIMER POUR EVITER LES PB A LA FIN)---------------------------------------------------------//

        // Supprimer un suspect par ID
        const { id } = req.query;

        // Vérifier si le suspect existe
        const existingSuspect = await prisma.suspects.findUnique({
            where: { id: parseInt(id) },
        });

        if (!existingSuspect) {
            return res.status(404).json({ message: 'Suspect not found' });
        }

        // Supprimer le suspect
        await prisma.suspects.delete({
            where: { id: parseInt(id) },
        });

        res.status(200).json({ message: 'Suspect deleted successfully' });
    } else {
        res.status(405).json({ message: 'Method Not Allowed' });
    }
}
