import React, { useRef, useState, useEffect } from "react";

export default function TraceShape({ questionId, shape, onSuccess, socket, sessionId }) {
    const canvasRef = useRef(null);
    const [message, setMessage] = useState(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [userPath, setUserPath] = useState([]); // Coordonnées tracées par le joueur

    const marginOfError = 10; // Marge d'erreur pour valider le tracé
    const requiredAccuracy = 1; // Pourcentage minimum de points suivis correctement (80%)

    const startDrawing = (e) => {
        setIsDrawing(true);
        const rect = canvasRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left || e.touches[0].clientX - rect.left;
        const y = e.clientY - rect.top || e.touches[0].clientY - rect.top;

        setUserPath([{ x, y }]);

        const ctx = canvasRef.current.getContext("2d");
        ctx.strokeStyle = "red"; // Couleur du tracé utilisateur
        ctx.lineWidth = 8; // Épaisseur du tracé utilisateur
        ctx.beginPath();
        ctx.moveTo(x, y);
    };

    const continueDrawing = (e) => {
        if (!isDrawing) return;
        const rect = canvasRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left || e.touches[0].clientX - rect.left;
        const y = e.clientY - rect.top || e.touches[0].clientY - rect.top;

        setUserPath((prevPath) => [...prevPath, { x, y }]);

        const ctx = canvasRef.current.getContext("2d");
        ctx.lineTo(x, y);
        ctx.stroke();
    };

    const stopDrawing = () => {
        setIsDrawing(false);
    };

    const resamplePath = (path, numPoints) => {
        if (path.length < 2) return [];
        const resampled = [];
        let totalDistance = 0;

        // Calcul de la distance totale
        for (let i = 1; i < path.length; i++) {
            const dx = path[i].x - path[i - 1].x;
            const dy = path[i].y - path[i - 1].y;
            totalDistance += Math.sqrt(dx * dx + dy * dy);
        }

        const segmentLength = totalDistance / (numPoints - 1); // Longueur de chaque segment
        let currentDistance = 0;

        resampled.push(path[0]);

        for (let i = 1; i < path.length; i++) {
            const dx = path[i].x - path[i - 1].x;
            const dy = path[i].y - path[i - 1].y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            currentDistance += distance;

            while (currentDistance >= segmentLength) {
                const t = 1 - (currentDistance - segmentLength) / distance;
                const x = path[i - 1].x + t * dx;
                const y = path[i - 1].y + t * dy;
                resampled.push({ x, y });
                currentDistance -= segmentLength;
            }
        }

        // Ajoute le dernier point s'il manque
        if (resampled.length < numPoints) {
            resampled.push(path[path.length - 1]);
        }

        return resampled;
    };

    const drawShape = () => {
        const ctx = canvasRef.current.getContext("2d");
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

        // Dessine la forme
        ctx.strokeStyle = "grey"; // Couleur de la forme à suivre
        ctx.lineWidth = 10; // Épaisseur de la forme
        ctx.beginPath();
        shape.forEach((point, index) => {
            if (index === 0) {
                ctx.moveTo(point.x, point.y);
            } else {
                ctx.lineTo(point.x, point.y);
            }
        });
        ctx.closePath();
        ctx.stroke();

        // Dessine les points échantillonnés
        const resampledShape = resamplePath(shape, 50); // 50 points échantillonnés
        ctx.fillStyle = "grey"; // Couleur des points
        resampledShape.forEach((point) => {
            ctx.beginPath();
            ctx.arc(point.x, point.y, 5, 0, 2 * Math.PI); // Dessine un cercle pour chaque point
            ctx.fill();
        });
    };

    const validatePath = () => {
        const resampledShape = resamplePath(shape, 50); // Simplifie la forme originale
        const resampledUserPath = resamplePath(userPath, 50); // Simplifie le tracé utilisateur

        if (resampledUserPath.length < 10) { // S'assure que l'utilisateur a tracé suffisamment
            setMessage("Le tracé ne correspond pas à la forme");
            return;
        }

        let validatedUserPoints = 0;

        // Parcours des points utilisateur pour les valider
        resampledUserPath.forEach((userPoint) => {
            const isCloseToAnyShapePoint = resampledShape.some((shapePoint) => {
                const distance = Math.sqrt(
                    Math.pow(userPoint.x - shapePoint.x, 2) +
                    Math.pow(userPoint.y - shapePoint.y, 2)
                );
                return distance <= marginOfError; // Vérifie si le point utilisateur est proche de la forme
            });

            if (isCloseToAnyShapePoint) {
                validatedUserPoints++; // Le point utilisateur est validé
            }
        });

        const accuracy = validatedUserPoints / resampledUserPath.length; // Pourcentage de points utilisateur validés

        if (accuracy >= requiredAccuracy) {
            setMessage("Vous avez correctement tracé la forme !");
            handleSuccess();
        } else {
            setMessage("Le tracé ne correspond pas, essayez encore !");
        }
    };


    const handleSuccess = () => {
        sessionStorage.removeItem("selectedShape");
        if (socket && sessionId) {
            socket.emit("submitAnswer", { sessionId, questionId, answer: "trace_success" });
        }
    };

    useEffect(() => {
        drawShape();
    }, []); // Exécuté uniquement au premier rendu

    return (
        <div className="flex flex-col items-center text-white">
            <h1 className="text-2xl font-bold mb-4">Suivez le tracé de la forme avec votre doigt :</h1>
            <canvas
                ref={canvasRef}
                width={300}
                height={300}
                className="border border-white"
                onMouseDown={startDrawing}
                onMouseMove={continueDrawing}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={continueDrawing}
                onTouchEnd={stopDrawing}
            ></canvas>
            <button
                onClick={validatePath}
                className="bg-blue-500 text-white px-4 py-2 mt-4 rounded-lg hover:bg-blue-600"
            >
                Valider le tracé
            </button>
            <button
                onClick={drawShape}
                className="bg-gray-500 text-white px-4 py-2 mt-4 rounded-lg hover:bg-gray-600"
            >
                Réinitialiser la Forme
            </button>
            {message && <p className="text-green-500 mt-4">{message}</p>}
        </div>
    );
}
