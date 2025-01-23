export default async function traceShapeGame({ containerId, questionId, sessionId, onComplete, socket }) {
    const container = document.getElementById(containerId);

    if (!container) {
        console.error("Impossible de trouver le conteneur pour le jeu de tracé.");
        return;
    }

    const style = document.createElement("style");
    style.innerHTML = `
        body {
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
            overflow: hidden;
        }

        #${containerId} {
            display: flex;
            flex-direction: column;
            align-items: center;
        }

        canvas {
            border: 1px solid white;
        }
        
        .button-container {
            display: flex;
            margin-top: 10px;
        }

        button {
            margin-top: 10px;
        }
        
        button:last-child {
            margin-right: 0;
        }
    `;
    document.head.appendChild(style);

    const canvas = document.createElement("canvas");
    canvas.width = 300;
    canvas.height = 300;
    canvas.className = "border border-white mx-auto";
    container.appendChild(canvas);

    const ctx = canvas.getContext("2d");

    let isDrawing = false;
    let userPath = [];
    const marginOfError = 10; // Tolérance pour valider le tracé
    const requiredAccuracy = 0.8; // Pourcentage de correspondance requis

    // Définition des formes disponibles
    const shapes = {
        triangle: [
            { x: 150, y: 50 },
            { x: 50, y: 250 },
            { x: 250, y: 250 },
            { x: 150, y: 50 },
        ],
        star: [
            { x: 150, y: 50 },
            { x: 173, y: 130 },
            { x: 250, y: 130 },
            { x: 190, y: 170 },
            { x: 210, y: 250 },
            { x: 150, y: 200 },
            { x: 90, y: 250 },
            { x: 110, y: 170 },
            { x: 50, y: 130 },
            { x: 127, y: 130 },
            { x: 150, y: 50 },
        ],
        circle: Array.from({ length: 100 }, (_, i) => {
            const angle = (i / 100) * 2 * Math.PI;
            return {
                x: 150 + 100 * Math.cos(angle),
                y: 150 + 100 * Math.sin(angle),
            };
        }),
        umbrella: [
            ...generateArc(150, 150, 100, Math.PI, 2 * Math.PI, 50),
            ...generateWaves(250, 50, 150, 10, 5, 20, 70, 0.7),
        ],
    };

    // Fonction pour générer des arcs
    function generateArc(centerX, centerY, radius, startAngle, endAngle, numPoints) {
        const points = [];
        for (let i = 0; i <= numPoints; i++) {
            const angle = startAngle + (i / numPoints) * (endAngle - startAngle);
            points.push({
                x: centerX + radius * Math.cos(angle),
                y: centerY + radius * Math.sin(angle),
            });
        }
        return points;
    }

    // Fonction pour générer des vagues
    function generateWaves(startX, endX, baseY, waveHeight, numWaves, numPointsPerWave, stemHeight, stemWidthFactor = 0.5) {
        const points = [];
        const waveWidth = (endX - startX) / numWaves;

        for (let i = 0; i < numWaves; i++) {
            if (i === Math.floor(numWaves / 2)) {
                const stemStartX = startX + i * waveWidth;
                const stemEndX = stemStartX + waveWidth;
                points.push(...generateStem(stemStartX, stemEndX, baseY, stemHeight, stemWidthFactor));
            } else {
                for (let j = 0; j <= numPointsPerWave; j++) {
                    const t = j / numPointsPerWave;
                    const x = startX + i * waveWidth + t * waveWidth;
                    const y = baseY - waveHeight * Math.sin(t * Math.PI);
                    points.push({ x, y });
                }
            }
        }
        return points;
    }

    // Fonction pour générer la tige
    function generateStem(startX, endX, baseY, stemHeight, stemWidthFactor = 0.5) {
        const waveWidth = endX - startX;
        const stemWidth = waveWidth * stemWidthFactor;
        const stemCenterX = (startX + endX) / 2;
        const leftX = stemCenterX - stemWidth / 2;
        const rightX = stemCenterX + stemWidth / 2;
        const arcRadius = stemWidth / 2;

        return [
            { x: leftX, y: baseY },
            { x: leftX, y: baseY + stemHeight - arcRadius },
            ...generateArc(leftX + arcRadius, baseY + stemHeight - arcRadius, arcRadius, Math.PI, 2 * Math.PI, 20),
            { x: rightX, y: baseY + stemHeight - arcRadius },
            { x: rightX, y: baseY },
        ];
    }

    // Sélection de la forme via sessionStorage
    const storedShapeKey = sessionStorage.getItem("selectedShape");
    const shapeKeys = Object.keys(shapes);
    const selectedShapeKey = storedShapeKey || shapeKeys[Math.floor(Math.random() * shapeKeys.length)];
    const shape = shapes[selectedShapeKey];

    if (!storedShapeKey) {
        sessionStorage.setItem("selectedShape", selectedShapeKey);
    }

    function drawShape() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Dessine la forme de référence
        ctx.strokeStyle = "grey";
        ctx.lineWidth = 10;
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
    }

    function resetDrawing() {
        userPath = [];
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawShape();
    }

    function startDrawing(e) {
        isDrawing = true;
        const { x, y } = getEventPosition(e);
        userPath = [{ x, y }];
        ctx.strokeStyle = "red";
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.moveTo(x, y);
    }

    function continueDrawing(e) {
        if (!isDrawing) return;

        const { x, y } = getEventPosition(e);
        userPath.push({ x, y });
        ctx.lineTo(x, y);
        ctx.stroke();
    }

    function stopDrawing() {
        isDrawing = false;
    }

    function validatePath() {
        const resampledShape = resamplePath(shape, 50);
        const resampledUserPath = resamplePath(userPath, 50);

        if (resampledUserPath.length < 10) {
            onComplete({ correct: false, message: "Le tracé est insuffisant." });
            return;
        }

        let validatedUserPoints = 0;

        resampledUserPath.forEach((userPoint) => {
            const isCloseToAnyShapePoint = resampledShape.some((shapePoint) => {
                const distance = Math.sqrt(
                    Math.pow(userPoint.x - shapePoint.x, 2) +
                    Math.pow(userPoint.y - shapePoint.y, 2)
                );
                return distance <= marginOfError;
            });

            if (isCloseToAnyShapePoint) {
                validatedUserPoints++;
            }
        });

        const accuracy = validatedUserPoints / resampledUserPath.length;

        if (accuracy >= requiredAccuracy) {
            sessionStorage.removeItem("selectedShape");
            if (socket) {
                socket.emit("submitAnswer", { sessionId, questionId, answer: "trace_success" });
            }
            onComplete({ correct: true, message: "Vous avez correctement tracé la forme !" });
        } else {
            onComplete({ correct: false, message: "Le tracé ne correspond pas, réessaie encore." });
        }
    }

    function resamplePath(path, numPoints) {
        if (path.length < 2) return [];
        const resampled = [];
        let totalDistance = 0;

        for (let i = 1; i < path.length; i++) {
            const dx = path[i].x - path[i - 1].x;
            const dy = path[i].y - path[i - 1].y;
            totalDistance += Math.sqrt(dx * dx + dy * dy);
        }

        const segmentLength = totalDistance / (numPoints - 1);
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

        if (resampled.length < numPoints) {
            resampled.push(path[path.length - 1]);
        }

        return resampled;
    }

    function getEventPosition(e) {
        const rect = canvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;

        return {
            x: clientX - rect.left,
            y: clientY - rect.top,
        };
    }

    drawShape();

    canvas.addEventListener("mousedown", startDrawing);
    canvas.addEventListener("mousemove", continueDrawing);
    canvas.addEventListener("mouseup", stopDrawing);

    canvas.addEventListener("touchstart", startDrawing);
    canvas.addEventListener("touchmove", continueDrawing);
    canvas.addEventListener("touchend", stopDrawing);

    const buttonContainer = document.createElement("div");
    buttonContainer.className = "button-container";

    const validateButton = document.createElement("button");
    validateButton.textContent = "Valider le tracé";
    validateButton.className = "bg-blue-500 text-white px-4 py-2 mt-4 rounded-lg hover:bg-blue-600";
    validateButton.onclick = validatePath;

    const resetButton = document.createElement("button");
    resetButton.textContent = "Réinitialiser le tracé";
    resetButton.className = "bg-gray-500 text-white px-4 py-2 mt-4 rounded-lg hover:bg-gray-600 ml-2";
    resetButton.onclick = resetDrawing;

    buttonContainer.appendChild(validateButton);
    buttonContainer.appendChild(resetButton);

    container.appendChild(buttonContainer);

}
