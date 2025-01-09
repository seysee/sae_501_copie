import React, { useState, useEffect, useRef } from "react";

export default function BlowGame({ questionId, socket, sessionId, onSuccess }) {
    const [error, setError] = useState(null);
    const [message, setMessage] = useState(null);

    // Taille initiale du ballon
    const [balloonSize, setBalloonSize] = useState(50);

    // Détecte la fin de la partie côté BlowGame
    const [isCompleted, setIsCompleted] = useState(false);

    // Refs audio
    const audioContextRef = useRef(null);
    const analyserRef = useRef(null);
    const dataArrayRef = useRef(null);

    useEffect(() => {
        // Création du contexte audio et AnalyserNode
        async function getMicrophoneAccess() {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
                analyserRef.current = audioContextRef.current.createAnalyser();
                analyserRef.current.fftSize = 512;

                const source = audioContextRef.current.createMediaStreamSource(stream);
                source.connect(analyserRef.current);

                dataArrayRef.current = new Uint8Array(analyserRef.current.frequencyBinCount);

                // Lancement de la boucle d'analyse
                analyzeVolume();
            } catch (err) {
                setError(
                    "Impossible d’accéder au microphone. Vérifiez les permissions dans votre navigateur ou sur votre appareil."
                );
            }
        }

        getMicrophoneAccess();

        // Nettoyage
        return () => {
            if (audioContextRef.current) {
                audioContextRef.current.close();
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // -> 1) On met juste le isCompleted à true dans l’animation, sans appeler onSuccess ici
    const analyzeVolume = () => {
        if (!analyserRef.current || !dataArrayRef.current) return;

        analyserRef.current.getByteFrequencyData(dataArrayRef.current);

        let maxVolume = 0;
        for (let i = 0; i < dataArrayRef.current.length; i++) {
            if (dataArrayRef.current[i] > maxVolume) {
                maxVolume = dataArrayRef.current[i];
            }
        }

        if (!isCompleted) {
            setBalloonSize((prevSize) => {
                const volumeRatio = maxVolume / 255;
                const inflationSpeed = 0.5 * (volumeRatio ** 3);

                let newSize = prevSize + inflationSpeed;
                if (newSize > 300) {
                    newSize = 300;
                    // On se contente de passer isCompleted à true
                    setIsCompleted(true);
                }
                return newSize;
            });
        }

        requestAnimationFrame(analyzeVolume);
    };

    // -> 2) useEffect qui détecte le changement de isCompleted = true
    useEffect(() => {
        if (isCompleted) {
            setMessage("Ballon gonflé avec succès !");

            // On soumet la réponse (socket) + on déclenche onSuccess
            submitAnswer("blow_success");

            if (onSuccess) {
                onSuccess("Ballon gonflé avec succès !");
            }
        }
    }, [isCompleted]); // Se déclenche seulement quand isCompleted passe à true

    // Logique d'envoi socket
    function submitAnswer(answer) {
        if (socket) {
            socket.emit("submitAnswer", { sessionId, questionId, answer });
        }
    }

    return (
        <div className="flex flex-col items-center justify-center">
            <h2 className="mb-4 text-xl font-bold text-center">
                Soufflez dans le micro pour gonfler le ballon
            </h2>

            <div className="relative flex items-end justify-center">
                <div
                    className="bg-red-500 rounded-full transition-all duration-300 ease-linear relative"
                    style={{
                        width: `${balloonSize}px`,
                        height: `${balloonSize}px`,
                    }}
                >
                    <div
                        className="bg-red-500 absolute rounded-full"
                        style={{
                            width: "12px",
                            height: "8px",
                            bottom: "-4px",
                            left: "50%",
                            transform: "translateX(-50%)",
                        }}
                    />
                </div>
            </div>

            {error && <p className="mt-4 text-red-500">{error}</p>}
            {message && <p className="mt-4 text-green-600 font-semibold">{message}</p>}

            {/* Bouton Skip (optionnel) */}
            <button
                onClick={() => {
                    setIsCompleted(true);
                }}
                className="mt-4 px-6 py-3 bg-blue-500 hover:bg-blue-700 text-white font-bold rounded-lg"
            >
                Skip
            </button>
        </div>
    );
}
