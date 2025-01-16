import {useEffect, useState} from "react";
import {useRouter} from "next/router";
import axios from "axios";

export default function AllHints({ onClose }) {
    const router = useRouter();
    const [hint, setHint] = useState(null);

    const getStoredUserData = () => {
        try {
            const storedPlayer = sessionStorage.getItem("userData");
            if (storedPlayer) {
                return JSON.parse(storedPlayer);
            }
        } catch (error) {
            console.error("Erreur lors de la récupération des données utilisateur :", error);
        }
        return null;
    };

    const fetchSessionBySessionId = async (sessionId) => {
        try {
            const response = await axios.get("/api/session", {
                params: {id: parseInt(sessionId)},
            });
            return response.data;
        } catch (error) {
            console.error("Erreur lors de la récupération de la session :", error);
            throw error;
        }
    };

    const fetchHintsById = async (killerId, ids) => {
        try {
            console.log("killerId", killerId)
            const response = await axios.get("/api/suspect_hints", {
                params: {suspectId: killerId},
            });

            const allHintsFromSuspect = response.data; // L'API retourne directement les indices
            if (!Array.isArray(allHintsFromSuspect)) {
                console.error("'hints' n'est pas un tableau valide :", allHintsFromSuspect);
                return [];
            }
            console.log("all hints", allHintsFromSuspect)
            const hintsTab = allHintsFromSuspect.filter((hint) => ids.includes(hint.id));
            console.log("filtered hint Tab", hintsTab)
            return hintsTab; // Retourne directement le tableau d'indices
        } catch (error) {
            console.error("Erreur lors de la récupération des indices :", error);
            throw error;
        }
    };


    useEffect(() => {
        const loadHints = async () => {
            const storedPlayer = getStoredUserData();

            if (!storedPlayer) {
                router.push("/profile");
                return;
            }

            try {
                console.log("Données utilisateur récupérées :", storedPlayer);

                const session = await fetchSessionBySessionId(storedPlayer.sessionId);
                console.log("Session récupérée :", session);

                const hints = await fetchHintsById(session.killerId, session.hints);
                console.log("Indices récupérés :", hints);

                setHint(hints);
            } catch (error) {
                console.error("Erreur lors du chargement des données :", error);
            }
        };

        loadHints();
    }, []);
    return (
        <div className="bg-black border-white border rounded relative p-4">
            <div className="absolute top-2 right-2 cursor-pointer" onClick={onClose}>
                <svg
                    height="30px"
                    width="30px"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 512 512"
                >
                    <path
                        fill="#ffffff"
                        d="M256 48a208 208 0 1 1 0 416 208 208 0 1 1 0-416zm0 464A256 256 0 1 0 256 0a256 256 0 1 0 0 512zM175 175c-9.4 9.4-9.4 24.6 0 33.9l47 47-47 47c-9.4 9.4-9.4 24.6 0 33.9s24.6 9.4 33.9 0l47-47 47 47c9.4 9.4 24.6 9.4 33.9 0s9.4-24.6 0-33.9l-47-47 47-47c9.4-9.4 9.4-24.6 0-33.9s-24.6-9.4-33.9 0l-47 47-47-47c-9.4-9.4-24.6-9.4-33.9 0z"
                    />
                </svg>
            </div>

            {hint ? (
                hint > 0 ? (
                hint.map((hintItem, index) => (
                    <p
                        key={index}
                        className="font-Amatic text-center m-6 text-[20px]"
                    >
                        {hintItem.hintText}
                    </p>
                ))
                ) : (
                    <p className="font-Amatic text-center m-6 text-[20px]">
                        Vous n'avez pas d'indice, tentez votre chance
                    </p>
                )
            ) : (
                <p className="font-Amatic text-center m-6">
                    Chargement de l'indice...
                </p>
            )}
        </div>
    );
}


