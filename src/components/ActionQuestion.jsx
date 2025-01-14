import React, { useEffect, useState } from "react";
import TiltDetected from "./actions/TiltDetected";
import ShakeDetected from "./actions/ShakeDetected";
import Camera from "./actions/Camera";
import BlowGame from "./actions/BlowGame";
import RepeatPhrase from "./actions/RepeatPhrase";
import TraceShape from "./actions/TraceShape";
import PuzzleGame from "./actions/PuzzleGame";

export default function ActionQuestion({ question, onSuccess, socket }) {
    const [targetColor, setTargetColor] = useState("red");
    const [selectedShape, setSelectedShape] = useState(null);
    const [selectedImage, setSelectedImage] = useState(null);
    const [sessionId, setSessionId] = useState(null);

    const generateArc = (centerX, centerY, radius, startAngle, endAngle, numPoints) => {
        const points = [];
        for (let i = 0; i <= numPoints; i++) {
            const angle = startAngle + (i / numPoints) * (endAngle - startAngle);
            points.push({
                x: centerX + radius * Math.cos(angle),
                y: centerY + radius * Math.sin(angle),
            });
        }
        return points;
    };

    const generateWaves = (startX, endX, baseY, waveHeight, numWaves, numPointsPerWave, stemHeight, stemWidthFactor = 0.5) => {
        const points = [];
        const waveWidth = (endX - startX) / numWaves;

        for (let i = 0; i < numWaves; i++) {
            if (i === Math.floor(numWaves / 2)) {
                // Générer la tige à la place de la vague centrale avec une largeur réduite
                const stemStartX = startX + i * waveWidth;
                const stemEndX = stemStartX + waveWidth;
                points.push(...generateStem(stemStartX, stemEndX, baseY, stemHeight, stemWidthFactor));
            } else {
                // Générer une vague normale
                for (let j = 0; j <= numPointsPerWave; j++) {
                    const t = j / numPointsPerWave; // Normalisation de 0 à 1
                    const x = startX + i * waveWidth + t * waveWidth; // Position horizontale
                    const y = baseY - waveHeight * Math.sin(t * Math.PI); // Sinus pour l'arrondi
                    points.push({ x, y });
                }
            }
        }

        return points;
    };




    const generateStem = (startX, endX, baseY, stemHeight, stemWidthFactor = 0.5) => {
        const waveWidth = endX - startX;
        const stemWidth = waveWidth * stemWidthFactor; // Réduction de la largeur de la tige
        const stemCenterX = (startX + endX) / 2; // Centre de la vague
        const leftX = stemCenterX - stemWidth / 2; // Bord gauche de la tige
        const rightX = stemCenterX + stemWidth / 2; // Bord droit de la tige
        const arcRadius = stemWidth / 2; // Rayon de l'arrondi (bas de la tige)

        const points = [
            // Barre descendante gauche
            { x: leftX, y: baseY },
            { x: leftX, y: baseY + stemHeight - arcRadius },

            // Arc arrondi bas de la tige
            ...generateArc(leftX + arcRadius, baseY + stemHeight - arcRadius, arcRadius, Math.PI, 2 * Math.PI, 20),

            // Barre montante droite
            { x: rightX, y: baseY + stemHeight - arcRadius },
            { x: rightX, y: baseY },
        ];

        return points;
    };


    const shapes = {
        triangle: [
            { x: 150, y: 50 },
            { x: 50, y: 250 },
            { x: 250, y: 250 },
            { x: 150, y: 50 },
        ],
        star: [
            { x: 150, y: 50 },  // Pointe supérieure
            { x: 173, y: 130 }, // Branche droite haut
            { x: 250, y: 130 }, // Branche droite bas
            { x: 190, y: 170 }, // Branche inférieure droite
            { x: 210, y: 250 }, // Bas central
            { x: 150, y: 200 }, // Centre bas
            { x: 90, y: 250 },  // Bas gauche
            { x: 110, y: 170 }, // Branche inférieure gauche
            { x: 50, y: 130 },  // Branche gauche bas
            { x: 127, y: 130 }, // Branche gauche haut
            { x: 150, y: 50 },  // Retour à la pointe supérieure
        ],
        circle: Array.from({ length: 100 }, (_, i) => {
            const angle = (i / 100) * 2 * Math.PI;
            return {
                x: 150 + 100 * Math.cos(angle),
                y: 150 + 100 * Math.sin(angle),
            };
        }),
        umbrella: [
            ...generateArc(150, 150, 100, Math.PI, 2 * Math.PI, 50), // Arc supérieur
            ...generateWaves(250, 50, 150, 10, 5, 20, 70, 0.7),                  // Vagues alignées
        ],
    };

    const handleShapeSelection = () => {
        const storedShapeKey = sessionStorage.getItem("selectedShape");
        if (storedShapeKey && shapes[storedShapeKey]) {
            setSelectedShape(shapes[storedShapeKey]);
        } else {
            const shapeKeys = Object.keys(shapes);
            const randomShapeKey = shapeKeys[Math.floor(Math.random() * shapeKeys.length)];
            setSelectedShape(shapes[randomShapeKey]);
            sessionStorage.setItem("selectedShape", randomShapeKey); // Sauvegarde la clé de la forme
        }
    };

    useEffect(() => {
        if (question.answer === "color_detected") {
            const colors = ["red", "green", "blue"];
            const randomColor = colors[Math.floor(Math.random() * colors.length)];
            setTargetColor(randomColor);
        }

        if (question.answer === "trace_success") {
            handleShapeSelection(); // Sélectionner ou charger la forme
        }

        if (question.answer === "puzzle_success") {
            selectImage(); // Sélectionne ou charge l'image
        }
    }, [question]);

    const puzzleImages = [
        "/puzzle/mamie.jpg",
        "/puzzle/enfant.jpeg",
    ]; // Ajoutez toutes les images disponibles dans le répertoire 'puzzle'

    const selectImage = () => {
        const storedImage = sessionStorage.getItem("selectedPuzzleImage");
        if (storedImage) {
            setSelectedImage(storedImage);
        } else {
            const randomImage = puzzleImages[Math.floor(Math.random() * puzzleImages.length)];
            setSelectedImage(randomImage);
            sessionStorage.setItem("selectedPuzzleImage", randomImage);
        }
    };

    const handleSuccess = (message) => {
        console.log(message); // Affiche un message de succès
        alert(message); // Optionnel : Affiche une alerte
        onSuccess(message); // Appelle la callback de validation
    };

    const getStoredUserData = () => {
        try {
            const storedPlayer = sessionStorage.getItem("userData");
            if (storedPlayer) {
                return JSON.parse(storedPlayer);
            }
        } catch (error) {
            console.error("Erreur lors de la récupération des données utilisateur:", error);
        }
        return null;
    };

    useEffect(() => {
        const storedPlayer = getStoredUserData();
        if (storedPlayer?.sessionId) {
            setSessionId(storedPlayer.sessionId);
        } else {
            console.error("Aucune sessionId trouvée dans les données utilisateur.");
        }
    }, []);

    return (
        <div>
            {question.assets && <img src={question.assets} alt="Instruction" className="mb-4" />}

            {question.answer === "tilt_detected" && (
                <TiltDetected
                    questionId={question.id}
                    onSuccess={handleSuccess}
                    socket={socket}
                    sessionId={sessionId}
                />
            )}

            {question.answer === "shake_detected" && (
                <ShakeDetected
                    questionId={question.id}
                    onSuccess={handleSuccess}
                    socket={socket}
                    sessionId={sessionId}
                />
            )}
            {question.answer === "hole_success" && (
                <BalanceGame
                    questionId={question.id}
                    onSuccess={handleSuccess}
                    socket={socket}
                    sessionId={sessionId}
                />
            )}

            {question.answer === "color_success" && (
                <>
                    <h1
                        className={`text-4xl font-Amatic mb-6 capitalize ${
                            targetColor === "red"
                                ? "text-red-500"
                                : targetColor === "green"
                                    ? "text-green-500"
                                    : targetColor === "blue"
                                        ? "text-blue-400"
                                        : "text-gray-500"
                        }`}
                    >
                        {targetColor}
                    </h1>
                    <Camera
                        questionId={question.id}
                        targetColor={targetColor}
                        onSuccess={handleSuccess}
                        socket={socket}
                        sessionId={sessionId}
                    />
                </>
            )}
            {question.answer === "blow_success" && (
                <BlowGame questionId={question.id} onSuccess={handleSuccess} socket={socket} sessionId={sessionId} />
            )}

            {question.answer === "repeat_success" && (
                <RepeatPhrase
                    questionId={question.id}
                    phrase="Noé le caca"
                    onSuccess={handleSuccess}
                    socket={socket}
                    sessionId={sessionId}
                />
            )}
            {question.answer === "trace_success" && selectedShape && (
                <TraceShape
                    questionId={question.id}
                    shape={selectedShape} // Passe la forme choisie
                    onSuccess={handleSuccess}
                    socket={socket}
                    sessionId={sessionId}
                />
            )}

            {question.answer === "puzzle_success" && (
                <PuzzleGame
                    questionId={question.id}
                    image={selectedImage}
                    onSuccess={handleSuccess}
                    socket={socket}
                    sessionId={sessionId}
                />
            )}
        </div>
    );
}
