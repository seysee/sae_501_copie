import React, { useEffect, useState } from "react";

export default function TestGpsGyro() {
    const [gpsData, setGpsData] = useState({ latitude: null, longitude: null, accuracy: null, error: null });
    const [gyroData, setGyroData] = useState({ alpha: 0, beta: 0, gamma: 0 });
    const [accelData, setAccelData] = useState({ x: 0, y: 0, z: 0 });
    const [backgroundColor, setBackgroundColor] = useState("black"); // Couleur de l'écran
    const [lastAccel, setLastAccel] = useState({ x: 0, y: 0, z: 0 }); // Dernière valeur de l'accélération

    // useEffect(() => {
    //     if (typeof navigator !== "undefined" && navigator.geolocation) {
    //         navigator.geolocation.getCurrentPosition(
    //             (position) => {
    //                 setGpsData({
    //                     latitude: position.coords.latitude,
    //                     longitude: position.coords.longitude,
    //                     accuracy: position.coords.accuracy,
    //                     error: null,
    //                 });
    //             },
    //             (error) => {
    //                 setGpsData({ latitude: null, longitude: null, accuracy: null, error: error.message });
    //             }
    //         );
    //     } else {
    //         setGpsData({ latitude: null, longitude: null, accuracy: null, error: "Geolocation not available." });
    //     }
    // }, []);

    useEffect(() => {
        const handleOrientation = (event) => {
            const beta = event.beta || 0;

            setGyroData({
                alpha: event.alpha || 0, // Rotation autour de l'axe Z
                beta, // Rotation autour de l'axe X
                gamma: event.gamma || 0, // Rotation autour de l'axe Y
            });

            // Change la couleur de fond si beta < 0
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

    // useEffect(() => {
    //     const handleMotion = (event) => {
    //         const acceleration = {
    //             x: event.acceleration?.x || 0,
    //             y: event.acceleration?.y || 0,
    //             z: event.acceleration?.z || 0,
    //         };
    //
    //         setAccelData(acceleration);
    //
    //         // Calcul de la différence entre les valeurs actuelles et précédentes
    //         const deltaX = Math.abs(acceleration.x - lastAccel.x);
    //         const deltaY = Math.abs(acceleration.y - lastAccel.y);
    //         const deltaZ = Math.abs(acceleration.z - lastAccel.z);
    //
    //         // Seuil pour détecter un "shake"
    //         const shakeThreshold = 15;
    //
    //         if (deltaX > shakeThreshold || deltaY > shakeThreshold || deltaZ > shakeThreshold) {
    //             setBackgroundColor("blue"); // Change la couleur de fond en bleu si le téléphone est secoué
    //             setTimeout(() => setBackgroundColor("black"), 500); // Reviens au noir après 500ms
    //         }
    //
    //         setLastAccel(acceleration); // Mets à jour les valeurs précédentes
    //     };
    //
    //     if (typeof window !== "undefined" && window.DeviceMotionEvent) {
    //         window.addEventListener("devicemotion", handleMotion);
    //     } else {
    //         console.error("DeviceMotion non supporté sur cet appareil.");
    //     }
    //
    //     return () => {
    //         window.removeEventListener("devicemotion", handleMotion);
    //     };
    // }, [lastAccel]);

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
            {/*<h2>Gyroscope Data</h2>*/}
            {/*<p>Alpha (Z) : {gyroData.alpha.toFixed(2)}</p>*/}
            {/*<p>Beta (X) : {gyroData.beta.toFixed(2)}</p>*/}
            {/*<p>Gamma (Y) : {gyroData.gamma.toFixed(2)}</p>*/}
            {/*<h2>Accelerometer Data</h2>*/}
            {/*<p>Accélération X : {accelData.x.toFixed(2)}</p>*/}
            {/*<p>Accélération Y : {accelData.y.toFixed(2)}</p>*/}
            {/*<p>Accélération Z : {accelData.z.toFixed(2)}</p>*/}
        </div>
    );
}
