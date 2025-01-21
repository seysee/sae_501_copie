import { useState, useEffect } from "react";

export default function Timer({ questionId, initialTime, onTimeUp, paused }) {
    const [timeLeft, setTimeLeft] = useState(null);

    useEffect(() => {
        // On construit la clé : timerEndTime:<questionId>
        const storageKey = `timerEndTime:${questionId}`;
        let storedEndTime = sessionStorage.getItem(storageKey);

        if (!storedEndTime) {
            // Pas encore de timer enregistré pour cette question
            const endTime = Date.now() + initialTime * 1000; // (ms)
            sessionStorage.setItem(storageKey, endTime);
            storedEndTime = endTime.toString();
        }

        const endTimeNumber = parseInt(storedEndTime, 10);
        const secsLeft = Math.round((endTimeNumber - Date.now()) / 1000);

        setTimeLeft(secsLeft > 0 ? secsLeft : 0);
    }, [questionId, initialTime]);

    useEffect(() => {
        // Si timeLeft est null (pas encore défini) ou <= 0 => onTimeUp
        if (timeLeft === null) return;
        if (timeLeft <= 0) {
            onTimeUp();
            sessionStorage.removeItem(`timerEndTime:${questionId}`);
            return;
        }

        if (paused) return;

        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                const newVal = prev - 1;
                if (newVal <= 0) {
                    clearInterval(timer);
                    onTimeUp();
                    return 0;
                }
                return newVal;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [timeLeft, onTimeUp, paused]);

    return (
        <div className="text-center font-Amatic text-2xl font-bold text-white">
            Temps restant : {timeLeft !== null ? timeLeft : "..."} s
        </div>
    );
}
