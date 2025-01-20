import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Button from '../components/_button';
import Link from "next/link";
import TextInput from "../components/_textInput";
import axios from "axios";

export default function JoinGame() {
    const [sessionCodeInput, setSessionCodeInput] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [cannotJoin, setCannotJoin] = useState('');
    const router = useRouter();

    const getStoredUserData = () => {
        try {
            const storedPlayer = sessionStorage.getItem('userData');
            if (storedPlayer) {
                return JSON.parse(storedPlayer);
            }
        } catch (error) {
            console.error('Erreur lors de la récupération des données utilisateur:', error);
        }
        return null;
    };

    useEffect(() => {
        const storedPlayer = sessionStorage.getItem('userData');
        if (!storedPlayer) {
            router.push('/profile');
        }
    }, [router]);

    const handleJoinGame = async () => {
        if (!sessionCodeInput) {
            setErrorMessage('Veuillez entrer un code de session valide.');
            return;
        }
        try {
            const codeInput = sessionCodeInput.toLowerCase();
            const sessionData = await fetchSessions(codeInput);
            isJoinable(sessionData);
        } catch (error) {
            console.error('Erreur lors de la récupération de la session :', error);
        }
    };

    const isJoinable = (session) => {
        if (session.status === 0) {
            joinGame(session);
        } else {
            if (session.playersNumber >= 6) {
                setCannotJoin("Plus de place dans la partie");
            } else {
                setCannotJoin("La partie a déjà commencée");
            }
        }
    };

    const joinGame = async (session) => {
        const storedPlayer = getStoredUserData();
        const playerResponse = await axios.put('/api/player', {
            id: storedPlayer.id,
            sessionId: session.id,
        });
        const sessionResponse = await axios.put('/api/session', {
            id: session.id,
            playersNumber: session.playersNumber + 1,
            status: session.playersNumber === 5 ? 1 : undefined,
        });
        const updatedUserData = { ...playerResponse.data, sessionId: session.id };
        sessionStorage.setItem('userData', JSON.stringify(updatedUserData));
        router.push('/salon');
    };

    const fetchSessions = async (code) => {
        try {
            const response = await axios.get('/api/session', {
                params: { code },
            });
            return response.data;
        } catch (error) {
            console.error('Erreur lors de la récupération de la session :', error);
            throw error;
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center text-white">
            <button
                onClick={() => router.back()}
                className="absolute top-4 left-10 flex items-center justify-center w-10 h-10 bg-gray-800 rounded-full text-white hover:bg-gray-700"
                title="Retour"
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="w-6 h-6"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15.75 19.5L8.25 12l7.5-7.5"
                    />
                </svg>
            </button>
            <h1 className="text-5xl font-Amatic mb-16">Rejoindre une partie</h1>
            <div className="w-full max-w-md">
                <div className="mb-6">
                    <TextInput
                        type="text"
                        placeholder="Entrez le code de session"
                        value={sessionCodeInput}
                        onChange={(e) => setSessionCodeInput(e.target.value)}
                        className="w-full text-white bg-black border-white rounded-lg mt-16 mb-16"
                    />
                </div>
                {errorMessage && (
                    <p className="text-red-500 text-center mb-4">{errorMessage}</p>
                )}
                {cannotJoin && (
                    <p className="text-red-500 text-center mb-4">{cannotJoin}</p>
                )}
                <Button
                    label="Rejoindre la partie"
                    onClick={handleJoinGame}
                    className="py-3 bg-black text-green-500 border-green-500"
                />
                <Link href="/">
                    <Button
                        label="Annuler"
                        className="py-3 bg-black text-red-500 border-red-500 mt-2"
                    />
                </Link>
            </div>
        </div>
    );
}
