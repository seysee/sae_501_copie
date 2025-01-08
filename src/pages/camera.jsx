import { useEffect, useState } from "react";
import Timer from "../components/_timer";
import Camera from "../components/actions/Camera";

export default function CameraPage() {
    const [targetColor, setTargetColor] = useState("red");
    const [gameLost, setGameLost] = useState(false);
    const [gameWon, setGameWon] = useState(false); // Ajout pour gérer la victoire

    useEffect(() => {
        const colors = ["red", "green", "blue"];
        const randomColor = colors[Math.floor(Math.random() * colors.length)];
        setTargetColor(randomColor);
    }, []);

    const handleTimeUp = () => {
        if (!gameWon) setGameLost(true); // Si la couleur n'est pas trouvée, le joueur perd
    };

    const handleColorDetected = () => {
        setGameWon(true); // Indique que le joueur a trouvé la bonne couleur
    };

    return (
        <div className="text-center mt-5">
            <h1 className="text-2xl font-bold mb-4">Défi de Couleur</h1>
            <p className="text-xl font-bold">
                Trouve la couleur <span className="capitalize">{targetColor}</span> !
            </p>
            <Timer initialTime={30} onTimeUp={handleTimeUp} />
            {!gameLost && !gameWon ? (
                <Camera targetColor={targetColor} onColorDetected={handleColorDetected} />
            ) : gameWon ? (
                <p className="text-green-500 text-xl font-bold">Bravo ! La couleur a été trouvée !</p>
            ) : (
                <p className="text-red-500 text-xl font-bold">Temps écoulé : Vous avez perdu !</p>
            )}
        </div>
    );
}
