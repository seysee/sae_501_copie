import { useEffect, useState } from 'react';
import axios from 'axios';

export default function EndGame() {
    const [suspects, setSuspects] = useState(null);

    useEffect(() => {
        const fetchSuspects = async () => {
            try {
                const response = await axios.get('/api/suspect');
                if (response.data && response.data.name) {
                    setSuspects(response.data);
                } else {
                    console.error('Réponse invalide de l\'API:', response);
                }
            } catch (error) {
                console.error('Erreur lors de la récupération du tueur:', error);
            }
        };
        fetchSuspects();
    }, []);

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4">
            {suspects && suspects.name ? (
                <p className="text-4xl font-Amatic text-red-500 font-bold">
                    Le tueur était <span className="underline">{suspects.name}</span> ...
                </p>
            ) : (
                <p className="text-2xl text-gray-400 animate-pulse">Chargement...</p>
            )}
        </div>
    );
}
