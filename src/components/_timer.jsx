import { useState, useEffect } from "react";

export default function Timer({ initialTime, onTimeUp, paused }) {
    const [timeLeft, setTimeLeft] = useState(initialTime);

    useEffect(() => {
        if (paused || timeLeft <= 0) {
            if (timeLeft <= 0) onTimeUp(); // Déclenchement lorsque le temps est écoulé
            return;
        }

        const timer = setInterval(() => {
            setTimeLeft((prev) => prev - 1);
        }, 1000);

        return () => clearInterval(timer); // Nettoyage
    }, [timeLeft, onTimeUp, paused]);

    return (
        <div className="text-center font-Amatic text-2xl font-bold text-white">
            Temps restant : {timeLeft} s
        </div>
    );
}
