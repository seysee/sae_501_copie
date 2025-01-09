import React, { useEffect, useState } from "react";

export default function TestGpsGyro() {
    const [gpsData, setGpsData] = useState({ latitude: null, longitude: null, accuracy: null, error: null });
    const [gyroData, setGyroData] = useState({ alpha: 0, beta: 0, gamma: 0 });
    const [backgroundColor, setBackgroundColor] = useState("black");
    const [flashEnabled, setFlashEnabled] = useState(false); // État du flash

    useEffect(() => {
        const handleOrientation = (event) => {
            const beta = event.beta || 0;

            setGyroData({
                alpha: event.alpha || 0, // Rotation autour de l'axe Z
                beta, // Rotation autour de l'axe X
                gamma: event.gamma || 0, // Rotation autour de l'axe Y
            });

            if (beta < 0) {
                setBackgroundColor("red");
            } else {
                setBackgroundColor("black");
            }
        };

        if (typeof window !== "undefined" && window.DeviceOrientationEvent) {
            window.addEventListener("deviceorientation", handleOrientation);
        } else {
            console.error("DeviceOrientation non supporté sur cet appareil.");
        }

        return () => {
            window.removeEventListener("deviceorientation", handleOrientation);
        };
    }, []);

    const handleVibrate = () => {
        if (navigator.vibrate) {
            const pattern = [
                200, 100, 200, 100, 200, 300, // S (3 courtes vibrations)
                500, 100, 500, 100, 500, 300, // O (3 longues vibrations)
                200, 100, 200, 100, 200        // S (3 courtes vibrations)
            ];

            navigator.vibrate(pattern);
        } else {
            alert("L'API de vibration n'est pas supportée sur cet appareil.");
        }
    };

    const toggleFlash = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: "environment" }
            });

            const track = stream.getVideoTracks()[0];
            const capabilities = track.getCapabilities();

            if (capabilities.torch) {
                track.applyConstraints({
                    advanced: [{ torch: !flashEnabled }]
                });
                setFlashEnabled(!flashEnabled);
            } else {
                alert("Le flash n'est pas supporté sur cet appareil.");
            }
        } catch (error) {
            console.error("Erreur lors de l'accès au flash :", error);
        }
    };

    const flashPattern = async (pattern) => {
        for (let i = 0; i < pattern.length; i++) {
            await toggleFlash(); // Activer le flash
            await new Promise((resolve) => setTimeout(resolve, pattern[i]));
            await toggleFlash(); // Désactiver le flash
            await new Promise((resolve) => setTimeout(resolve, pattern[i]));
        }
    };

    const handleFlashPattern = () => {
        const pattern = [300, 300, 900, 300, 300]; // S (3 courtes), O (1 longue), S (3 courtes)
        flashPattern(pattern);
    };

    return (
        <div style={{ backgroundColor, height: "100vh", padding: "20px", color: "white" }}>
            <h1>Test GPS, Gyro, and Accelerometer</h1>
            <h2>GPS Data</h2>
            {gpsData.error ? (
                <p>Erreur : {gpsData.error}</p>
            ) : (
                <>
                    <p>Latitude : {gpsData.latitude}</p>
                    <p>Longitude : {gpsData.longitude}</p>
                    <p>Précision : {gpsData.accuracy} mètres</p>
                </>
            )}
            <h2>Gyroscope Data</h2>
            <p>Alpha (Z) : {gyroData.alpha.toFixed(2)}</p>
            <p>Beta (X) : {gyroData.beta.toFixed(2)}</p>
            <p>Gamma (Y) : {gyroData.gamma.toFixed(2)}</p>
            <div style={{ marginTop: "20px" }}>
                <button
                    onClick={handleVibrate}
                    style={{
                        marginRight: "10px",
                        padding: "10px 20px",
                        backgroundColor: "blue",
                        color: "white",
                        border: "none",
                        borderRadius: "5px",
                        cursor: "pointer",
                    }}
                >
                    Test Vibration
                </button>
                <button
                    onClick={toggleFlash}
                    style={{
                        marginRight: "10px",
                        padding: "10px 20px",
                        backgroundColor: "green",
                        color: "white",
                        border: "none",
                        borderRadius: "5px",
                        cursor: "pointer",
                    }}
                >
                    {flashEnabled ? "Éteindre le Flash" : "Allumer le Flash"}
                </button>
                <button
                    onClick={handleFlashPattern}
                    style={{
                        padding: "10px 20px",
                        backgroundColor: "orange",
                        color: "white",
                        border: "none",
                        borderRadius: "5px",
                        cursor: "pointer",
                    }}
                >
                    Tester le Flash (Pattern SOS)
                </button>
            </div>
        </div>
    );
}
