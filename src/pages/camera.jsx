import { useEffect, useRef, useState } from "react";
import Timer from "../components/_timer";

export default function CameraPage() {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const [error, setError] = useState(null);
    const [facingMode, setFacingMode] = useState("environment");
    const [photoTaken, setPhotoTaken] = useState(false);
    const [containerHeight, setContainerHeight] = useState(0);
    const [targetColor, setTargetColor] = useState(""); // Couleur cible
    const [colorDetected, setColorDetected] = useState(null); // Résultat de la détection de couleur
    const [gameLost, setGameLost] = useState(false); // Indique si le joueur a perdu
    const [paused, setPaused] = useState(false); // Gestion du timer

    useEffect(() => {
        setRandomTargetColor();

        async function enableCamera() {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode },
                });

                if (videoRef.current) {
                    videoRef.current.srcObject = stream;

                    if (facingMode === "user") {
                        videoRef.current.style.transform = "scaleX(-1)";
                    } else {
                        videoRef.current.style.transform = "scaleX(1)";
                    }

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

    const setRandomTargetColor = () => {
        const colors = ["red", "green", "blue"]; // Liste des couleurs possibles
        const randomColor = colors[Math.floor(Math.random() * colors.length)];
        setTargetColor(randomColor);
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

    const resetPhoto = () => {
        if (colorDetected) {
            setRandomTargetColor();
        }

        setPhotoTaken(false);
        setColorDetected(null);
    };

    const switchCamera = () => {
        setFacingMode((prevMode) =>
            prevMode === "user" ? "environment" : "user"
        );
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
                blue: { rMin: 0, rMax: 120, gMin: 0, gMax: 150, bMin: 100, bMax: 255 }
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
            setColorDetected(percentage >= requiredPercentage);
        }
    };

    const handleTimeUp = () => {
        if (!colorDetected) {
            setGameLost(true);
            setPaused(true); // Arrête le timer après la perte
        }
    };

    return (
        <div className="text-center mt-5 relative">
            <h1 className="text-2xl font-bold mb-4">Caméra</h1>
            {error ? (
                <p className="text-red-500">{error}</p>
            ) : (
                <>
                    {gameLost ? (
                        <p className="text-red-500 text-xl font-bold">Temps écoulé : Vous avez perdu !</p>
                    ) : (
                        <>
                            <p className="mt-2 text-xl font-bold">
                                Trouve la couleur <span className="capitalize">{targetColor}</span> !
                            </p>
                            <Timer initialTime={30} onTimeUp={handleTimeUp} paused={paused} />
                            <div
                                ref={containerRef}
                                className="relative w-full max-w-md mx-auto"
                                style={{ height: `${containerHeight}px` }}
                            >
                                <video
                                    ref={videoRef}
                                    autoPlay
                                    playsInline
                                    className="w-full h-auto border border-gray-300 absolute top-0 left-0"
                                ></video>
                                <canvas
                                    ref={canvasRef}
                                    className={`w-full h-auto border border-gray-300 absolute top-0 left-0 ${
                                        photoTaken ? "block" : "hidden"
                                    }`}
                                ></canvas>
                                <div className="absolute top-0 left-0 w-full h-full flex flex-col justify-between items-center z-20">
                                    <button
                                        onClick={switchCamera}
                                        className="absolute top-4 right-4 bg-white text-gray-700 p-2 rounded-full shadow-md hover:bg-gray-200"
                                    >
                                        <i className="fa-solid fa-camera-rotate"></i>
                                    </button>
                                    <button
                                        onClick={photoTaken ? resetPhoto : takePhoto}
                                        className={`absolute bottom-2.5 w-16 h-16 border-4 rounded-full flex items-center justify-center ${
                                            photoTaken
                                                ? "border-white hover:border-gray-200"
                                                : "border-white hover:border-gray-200"
                                        }`}
                                    >
                                        {photoTaken ? (
                                            <span className="text-white text-2xl font-bold">×</span>
                                        ) : null}
                                    </button>
                                </div>
                            </div>
                            {photoTaken && colorDetected !== null && (
                                <p
                                    className={`mt-4 text-xl font-bold ${
                                        colorDetected ? "text-green-500" : "text-red-500"
                                    }`}
                                >
                                    {colorDetected
                                        ? `La couleur ${targetColor} a été détectée !`
                                        : `La couleur ${targetColor} n'a pas été détectée.`}
                                </p>
                            )}
                        </>
                    )}
                </>
            )}
        </div>
    );
}
