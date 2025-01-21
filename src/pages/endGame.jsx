import {useEffect, useState} from 'react';
import axios from 'axios';
import {useRouter} from 'next/router';
import Button from "../components/_button";
import {decryptParam} from '../lib/cryptoUtils';

export default function EndGame() {
    const [suspect, setSuspect] = useState(null);
    const [error, setError] = useState(null);
    const [voteMessage, setVoteMessage] = useState("");
    const [isVisible, setIsVisible] = useState(false);
    const [showFooter, setShowFooter] = useState(false);
    const [majority, setMajority] = useState(null);
    const [suspectFound, setSuspectFound] = useState(false);
    const [playerStorage, setPlayerStorage] = useState(null);
    const router = useRouter();
    const {votes} = router.query;

    const getStoredUserData = () => {
        try {
            const storedPlayer = sessionStorage.getItem('userData');
            return storedPlayer ? JSON.parse(storedPlayer) : null;
        } catch (err) {
            console.error("Erreur lors de la récupération des données utilisateur :", err);
            return null;
        }
    };

    useEffect(() => {
        const userData = getStoredUserData();
        console.log(userData)
        setPlayerStorage(userData);
        const sessionId = userData?.sessionId;

        if (!sessionId) {
            setError("Session ID manquant ou invalide.");
            return;
        }

        const fetchKiller = async () => {
            try {
                const {data: sessionData} = await axios.get(`/api/session?id=${sessionId}`);
                const {data: suspectData} = await axios.get(`/api/suspect?id=${sessionData.killerId}`);
                setSuspect(suspectData);

                setTimeout(() => setIsVisible(true), 300);
                setTimeout(() => setShowFooter(true), 2000);
            } catch (err) {
                console.error(err);
                setError("Erreur lors de la récupération des informations.");
            }
        };

        fetchKiller();
    }, []);

    useEffect(() => {
        if (!votes) return;
        console.log(playerStorage)

        try {
            const allVotesString = decryptParam(votes);
            console.log("Votes décryptés :", allVotesString);

            const allVotesArray = allVotesString.split(',').map(Number);
            const majorityVote = getMajority(allVotesArray);

            setMajority(majorityVote);

            if (suspect && suspect.id === majorityVote) {
                setSuspectFound(true);
            } else {
                setSuspectFound(false);
            }
        } catch (err) {
            console.error("Erreur lors du décryptage des votes :", err);
        }
    }, [votes, suspect]);

    const getMajority = (votesArray) => {
        const voteCount = {};
        votesArray.forEach(vote => {
            voteCount[vote] = (voteCount[vote] || 0) + 1;
        });
        const majority = Object.keys(voteCount).reduce((a, b) =>
            voteCount[a] > voteCount[b] ? a : b
        );
        return parseInt(majority, 10);
    };

    const handleReturnHome = () => {
        router.push("/");
    };

    const suspectVideos = {
        1: '/videos/mussolini.mp4',
        2: '/videos/hitler.mp4',
        3: '/videos/staline.mp4',
        4: '/videos/petain.mp4',
        5: '/videos/kimjongil.mp4',
    };


    return (
        <div className="min-h-screen flex flex-col justify-center items-center p-4 text-white">
            {error ? (
                <p className="text-2xl font-Amatic text-red-500">{error}</p>
            ) : (
                suspect && (
                    <>
                        <div className="text-center">
                            <p className={`text-4xl font-Amatic font-bold transition-opacity mb-6 duration-5000 ${isVisible ? "opacity-100" : "opacity-0"}`}>
                                {suspectFound
                                    ? playerStorage?.role === 0
                                        ? "Bravo ! Vous avez trouvé le tueur, les enquêteurs ont gagné !"
                                        : "Perdu ! Les enquêteurs ont gagné !"
                                    : playerStorage?.role === 0
                                        ? "Perdu ! Les enquêteurs ont perdu !"
                                        : "Bravo ! Les enquêteurs ont perdu !"}
                            </p>

                            <p className={`text-3xl font-Amatic font-bold transition-opacity mb-10 duration-5000 ${isVisible ? "opacity-100" : "opacity-0"}`}>
                                Le tueur était <span className="text-red-500">{suspect.name}</span>...
                            </p>
                            {suspectVideos[suspect.id] && (
                                <video
                                    className={`w-96 h-56 mx-auto mt-4 transition-opacity duration-5000 ${isVisible ? "opacity-100" : "opacity-0"}`}
                                    src={suspectVideos[suspect.id]}
                                    autoPlay
                                    loop
                                    muted
                                />
                            )}
                        </div>
                        <div className="mt-12">
                            <p className={`text-xl font-Amatic text-gray-300 transition-opacity duration-5000 delay-500 ${showFooter ? "opacity-100" : "opacity-0"}`}>
                                Merci d'avoir joué, <span className="font-bold">{playerStorage.name}</span> !
                            </p>
                            <Button
                                onClick={handleReturnHome}
                                className={`mt-4 w-40 px-4 py-2 text-xl text-gray-300 border border-gray-300 rounded-lg shadow-md hover:border-gray-400 hover:text-gray-400 transition duration-5000 delay-500 ${
                                    showFooter ? "opacity-100" : "opacity-0"
                                }`}
                                label={"Terminer la partie"}
                            />
                        </div>
                    </>
                )
            )}
            {!suspect && !error && (
                <p className="text-2xl font-Amatic text-gray-400 animate-pulse">Chargement...</p>
            )}
        </div>
    );
}
