import { useEffect, useRef, useState } from "react";
import axios from "axios";

export default function Camera({ questionId, targetColor, onSuccess, socket }) {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const containerRef = useRef(null);

    const [containerHeight, setContainerHeight] = useState(0);
    const [error, setError] = useState(null);
    const [photoTaken, setPhotoTaken] = useState(false);
    const [colorDetected, setColorDetected] = useState(null);
    const [facingMode, setFacingMode] = useState("environment");
    const [isCompleted, setIsCompleted] = useState(false);
    const [message, setMessage] = useState(null);

    useEffect(() => {
        async function enableCamera() {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode },
                });

                if (videoRef.current) {
                    videoRef.current.srcObject = stream;

                    // Inverse la vidéo pour la caméra frontale
                    videoRef.current.style.transform = facingMode === "user" ? "scaleX(-1)" : "scaleX(1)";

                    // Ajuste la hauteur du conteneur
                    videoRef.current.onloadedmetadata = () => {
                        const videoAspectRatio =
                            videoRef.current.videoWidth / videoRef.current.videoHeight;
                        const containerWidth = videoRef.current.offsetWidth;
                        const calculatedHeight = containerWidth / videoAspectRatio;
                        setContainerHeight(calculatedHeight);
                    };
                }

                if (containerRef.current) {
                    containerRef.current.addEventListener("dblclick", switchCamera);
                }
            } catch (err) {
                setError("Impossible d’accéder à la caméra. Vérifiez les permissions.");
                console.error(err);
            }
        }

        enableCamera();

        return () => {
            if (videoRef.current && videoRef.current.srcObject) {
                const tracks = videoRef.current.srcObject.getTracks();
                tracks.forEach((track) => track.stop());
            }

            if (containerRef.current) {
                containerRef.current.removeEventListener("dblclick", switchCamera);
            }
        };
    }, [facingMode]);

    const switchCamera = () => {
        setFacingMode((prevMode) => (prevMode === "user" ? "environment" : "user"));
    };

    const takePhoto = () => {
        if (canvasRef.current && videoRef.current) {
            const canvas = canvasRef.current;
            const video = videoRef.current;
            const context = canvas.getContext("2d");

            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;

            if (facingMode === "user") {
                context.translate(canvas.width, 0);
                context.scale(-1, 1);
            }

            context.drawImage(video, 0, 0, canvas.width, canvas.height);
            setPhotoTaken(true);

            detectColor(targetColor, 5);
        }
    };

    const detectColor = (targetColor, requiredPercentage) => {
        if (canvasRef.current) {
            const canvas = canvasRef.current;
            const context = canvas.getContext("2d");
            const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;

            let matchingPixels = 0;
            const totalPixels = data.length / 4;

            const colorRanges = {
                red: { rMin: 150, rMax: 255, gMin: 0, gMax: 100, bMin: 0, bMax: 100 },
                green: { rMin: 0, rMax: 120, gMin: 80, gMax: 255, bMin: 0, bMax: 120 },
                blue: { rMin: 0, rMax: 120, gMin: 0, gMax: 150, bMin: 100, bMax: 255 },
            };

            const range = colorRanges[targetColor];

            for (let i = 0; i < data.length; i += 4) {
                const red = data[i];
                const green = data[i + 1];
                const blue = data[i + 2];

                if (
                    red >= range.rMin &&
                    red <= range.rMax &&
                    green >= range.gMin &&
                    green <= range.gMax &&
                    blue >= range.bMin &&
                    blue <= range.bMax
                ) {
                    matchingPixels++;
                }
            }

            const percentage = (matchingPixels / totalPixels) * 100;
            const detected = percentage >= requiredPercentage;
            setColorDetected(detected);

            if (detected) {
                handleSuccess();
            } else {
                setMessage("La couleur détectée n'est pas la bonne.");
            }
        }
    };

    const handleSuccess = () => {
        if (isCompleted) return;

        setMessage("Couleur correcte détectée !");
        setIsCompleted(true);

        // Soumettre la réponse au serveur
        submitAnswer("color_success");

        // Appeler la fonction onSuccess si définie
        if (onSuccess) {
            onSuccess("Couleur détectée avec succès !");
        }
    };

    const submitAnswer = (answer) => {
        socket.emit("submitAnswer", { sessionId: "sessionId", questionId, answer });
    };

    const resetPhoto = () => {
        setPhotoTaken(false);
        setColorDetected(null);
        setMessage(null);
        setIsCompleted(false);
    };

    return (
        <>
            <div
                ref={containerRef}
                className="relative w-full max-w-md mx-auto"
                style={{ height: `${containerHeight}px` }}
            >
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className={`w-full h-auto border border-gray-300 absolute top-0 left-0 ${
                        photoTaken ? "hidden" : "block"
                    }`}
                ></video>
                <canvas
                    ref={canvasRef}
                    className={`w-full h-auto border border-gray-300 absolute top-0 left-0 ${
                        photoTaken ? "block" : "hidden"
                    }`}
                ></canvas>

                {/* Boutons */}
                <div className="absolute top-0 left-0 w-full h-full flex flex-col justify-between items-center z-20">
                    <button
                        onClick={switchCamera}
                        className="absolute top-4 right-4 bg-white text-gray-700 p-2 rounded-full shadow-md hover:bg-gray-200"
                    >
                        <i className="fa-solid fa-camera-rotate"></i>
                    </button>
                    {!photoTaken && (
                        <button
                            onClick={takePhoto}
                            className="absolute bottom-2.5 w-16 h-16 border-4 border-white rounded-full hover:border-gray-300"
                        ></button>
                    )}
                    {photoTaken && (
                        <button
                            onClick={resetPhoto}
                            className="absolute bottom-2.5 w-16 h-16 border-4 border-white rounded-full flex items-center justify-center hover:border-gray-300"
                        >
                            <span className="text-white text-2xl font-bold">×</span>
                        </button>
                    )}
                </div>
            </div>

            {error && <p className="text-red-500 mt-4">{error}</p>}
            {message && <p className="text-green-500 mt-4">{message}</p>}
        </>
    );
}
