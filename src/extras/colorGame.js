export default async function colorGame({ containerId, questionId, sessionId, onComplete, socket }) {
    const container = document.getElementById(containerId);

    if (!container) {
        console.error("Impossible de trouver le conteneur pour le jeu de détection de couleur.");
        return;
    }

    // Sélection de la couleur cible
    const targetColors = ["red", "green", "blue"];
    const storedColor = sessionStorage.getItem("selectedTargetColor");
    const targetColor = storedColor || targetColors[Math.floor(Math.random() * targetColors.length)];

    if (!storedColor) {
        sessionStorage.setItem("selectedTargetColor", targetColor);
    }

    // Création des éléments
    const video = document.createElement("video");
    video.setAttribute("autoplay", true);
    video.setAttribute("playsinline", true);
    video.className = `w-full h-auto border border-gray-300 absolute top-0 left-0`;

    const canvas = document.createElement("canvas");
    canvas.className = `w-full h-auto border border-gray-300 absolute top-0 left-0 hidden`;

    const containerRef = document.createElement("div");
    containerRef.className = "relative w-full max-w-md mx-auto";
    container.appendChild(containerRef);

    const switchCameraButton = document.createElement("button");
    switchCameraButton.textContent = "Switch Camera";
    switchCameraButton.className =
        "absolute top-4 right-4 bg-white text-gray-700 p-2 rounded-full shadow-md hover:bg-gray-200";

    const takePhotoButton = document.createElement("button");
    takePhotoButton.className =
        "absolute bottom-2.5 w-16 h-16 border-4 border-white rounded-full hover:border-gray-300";

    const resetPhotoButton = document.createElement("button");
    resetPhotoButton.className =
        "absolute bottom-2.5 w-16 h-16 border-4 border-white rounded-full flex items-center justify-center hover:border-gray-300 hidden";
    resetPhotoButton.textContent = "×";

    const messageElement = document.createElement("p");
    messageElement.className = "text-green-500 mt-4 text-center";

    let facingMode = "environment";
    let isCompleted = false;

    // Ajout des éléments au conteneur
    containerRef.appendChild(video);
    containerRef.appendChild(canvas);
    containerRef.appendChild(switchCameraButton);
    containerRef.appendChild(takePhotoButton);
    containerRef.appendChild(resetPhotoButton);
    container.appendChild(messageElement);

    // Activation de la caméra
    async function enableCamera() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode },
            });

            video.srcObject = stream;

            video.onloadedmetadata = () => {
                video.play();
                adjustContainerHeight();
            };

            switchCameraButton.addEventListener("click", switchCamera);
        } catch (err) {
            messageElement.textContent = "Impossible d’accéder à la caméra. Vérifiez les permissions.";
            console.error(err);
        }
    }

    function adjustContainerHeight() {
        const videoAspectRatio = video.videoWidth / video.videoHeight;
        const containerWidth = video.offsetWidth;
        const calculatedHeight = containerWidth / videoAspectRatio;
        containerRef.style.height = `${calculatedHeight}px`;
    }

    // Bascule entre caméra frontale et arrière
    function switchCamera() {
        facingMode = facingMode === "user" ? "environment" : "user";
        enableCamera();
    }

    // Capture d'une photo
    function takePhoto() {
        const context = canvas.getContext("2d");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        if (facingMode === "user") {
            context.translate(canvas.width, 0);
            context.scale(-1, 1);
        }

        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.classList.remove("hidden");
        video.classList.add("hidden");
        takePhotoButton.classList.add("hidden");
        resetPhotoButton.classList.remove("hidden");

        detectColor();
    }

    // Détection de la couleur cible
    function detectColor(requiredPercentage = 5) {
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

        if (percentage >= requiredPercentage) {
            handleSuccess();
        } else {
            messageElement.textContent = "La couleur détectée n'est pas la bonne.";
        }
    }

    // Réinitialisation
    function resetPhoto() {
        canvas.classList.add("hidden");
        video.classList.remove("hidden");
        takePhotoButton.classList.remove("hidden");
        resetPhotoButton.classList.add("hidden");
        messageElement.textContent = "";
    }

    // Gestion du succès
    function handleSuccess() {
        if (isCompleted) return;

        isCompleted = true;
        messageElement.textContent = "Couleur correcte détectée !";

        sessionStorage.removeItem("selectedTargetColor");

        // Soumission de la réponse
        if (socket && sessionId) {
            socket.emit("submitAnswer", { sessionId, questionId, answer: "color_success" });
        }

        if (onComplete) {
            onComplete({ correct: true, message: "Couleur détectée avec succès !" });
        }
    }

    takePhotoButton.addEventListener("click", takePhoto);
    resetPhotoButton.addEventListener("click", resetPhoto);

    await enableCamera();
}
