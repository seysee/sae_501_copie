export default async function colorGame({
                                            containerId,
                                            questionId,
                                            sessionId,
                                            onComplete,
                                            socket
                                        }) {
    // 1) Récupérer le conteneur
    const container = document.getElementById(containerId);
    if (!container) {
        console.error("Impossible de trouver le conteneur pour colorGame.");
        return;
    }

    // Couleurs possibles
    const possibleColors = ["red", "green", "blue"];
    // Couleur cible, choisie au hasard
    let targetColor = sessionStorage.getItem("colorGameTargetColor");

    // Si aucune couleur n'est stockée, générer une nouvelle couleur
    if (!targetColor) {
        targetColor = possibleColors[Math.floor(Math.random() * possibleColors.length)];
        sessionStorage.setItem("colorGameTargetColor", targetColor);
    }

    let isCompleted = false;
    let photoTaken = false;
    let stream = null;
    let facingMode = "environment";

    // Petite map color -> tailwind text classes
    const colorClassMap = {
        red: "text-red-400",
        green: "text-green-400",
        blue: "text-blue-400"
    };
    const colorClass = colorClassMap[targetColor] || "text-white";

    // 2) Injection HTML
    // Ajout d’un id sur la div container pour manipuler sa hauteur ("cameraContainer")
    container.innerHTML = `
    <!-- Titre (couleur à trouver) -->
    <p 
      id="colorGameTitle"
      class="text-center text-3xl font-bold font-Amatic mb-2 ${colorClass}"
    >
      ${targetColor.toUpperCase()}
    </p>

    <!-- Div conteneur principal, qu’on va redimensionner dynamiquement -->
    <div 
      id="cameraContainer"
      class="relative w-full max-w-md mx-auto"
      style="position: relative; background: #000;"
    >
      <!-- Vidéo -->
      <video
        id="colorGameVideo"
        autoplay
        playsinline
        class="border border-gray-300 absolute top-0 left-0"
        style="z-index:1; width: 100%; height: auto;"
      ></video>

      <!-- Canvas (caché initialement) -->
      <canvas
        id="colorGameCanvas"
        class="border border-gray-300 absolute top-0 left-0 hidden"
        style="z-index:1; width: 100%; height: auto;"
      ></canvas>

      <!-- Bouton switch camera (en haut à droite) -->
      <button
        id="switchCamBtn"
        class="bg-white text-gray-700 p-2 rounded-full shadow-md hover:bg-gray-200"
        style="
          position: absolute; 
          top: 10px; 
          right: 10px;
          z-index: 10;
        "
      >
        <i class="fa-solid fa-camera-rotate"></i>
      </button>

      <!-- Bouton prendre photo (ou reset) en bas, centré -->
      <button
        id="takePhotoBtn"
        class="border-4 border-white rounded-full hover:border-gray-300"
        style="
          position: absolute; 
          bottom: 10px; 
          left: 50%; 
          transform: translateX(-50%);
          width: 60px;
          height: 60px;
          display: flex;
          align-items: center;
          justify-content: center;
          background-color: rgba(255,255,255,0.3);
          z-index: 10;
        "
      >
      </button>
    </div>

    <!-- Message de feedback -->
    <p 
      id="colorGameMessage"
      class="text-center mt-4"
    ></p>
  `;

    // 3) Sélecteurs
    const cameraContainer = container.querySelector("#cameraContainer");
    const videoEl = container.querySelector("#colorGameVideo");
    const canvasEl = container.querySelector("#colorGameCanvas");
    const switchCamBtn = container.querySelector("#switchCamBtn");
    const takePhotoBtn = container.querySelector("#takePhotoBtn");
    const messageEl = container.querySelector("#colorGameMessage");

    // 4) Gestion de la caméra
    async function enableCamera() {
        try {
            stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode }
            });
            if (videoEl) {
                videoEl.srcObject = stream;
                videoEl.style.transform = (facingMode === "user") ? "scaleX(-1)" : "scaleX(1)";

                // Quand la vidéo est prête, on calcule l’aspect ratio
                videoEl.onloadedmetadata = () => {
                    videoEl.play();

                    const vw = videoEl.videoWidth;
                    const vh = videoEl.videoHeight;
                    const aspectRatio = vw / vh;
                    // On a la largeur du container => on calcule la hauteur
                    const containerWidth = cameraContainer.offsetWidth;
                    const computedHeight = containerWidth / aspectRatio;

                    // Appliquer cette hauteur au container
                    cameraContainer.style.height = `${computedHeight}px`;
                };
            }
        } catch (err) {
            showMessage("Impossible d’accéder à la caméra. Vérifiez les permissions.", true);
            console.error(err);
        }
    }

    function switchCamera() {
        facingMode = (facingMode === "user") ? "environment" : "user";
        stopStream();
        enableCamera();
    }

    function stopStream() {
        if (stream) {
            const tracks = stream.getTracks();
            tracks.forEach((track) => track.stop());
        }
    }

    // 5) Prendre une photo
    function takePhoto() {
        if (!videoEl || !canvasEl) return;
        const context = canvasEl.getContext("2d");

        canvasEl.width = videoEl.videoWidth;
        canvasEl.height = videoEl.videoHeight;

        if (facingMode === "user") {
            context.translate(canvasEl.width, 0);
            context.scale(-1, 1);
        }

        // Dessiner la frame
        context.drawImage(videoEl, 0, 0, canvasEl.width, canvasEl.height);

        // Adapter le canvas à la taille du container
        // => on le rend visible sur 100% de la largeur
        canvasEl.classList.remove("hidden");
        videoEl.classList.add("hidden");

        // Ajuster la hauteur du container en fonction du canvas
        // (même aspect ratio)
        const cw = canvasEl.width;
        const ch = canvasEl.height;
        const aspect = cw / ch;
        const containerWidth = cameraContainer.offsetWidth;
        cameraContainer.style.height = `${containerWidth / aspect}px`;

        photoTaken = true;
        // Le bouton devient une croix
        takePhotoBtn.innerHTML = '<span class="text-white text-2xl font-bold">×</span>';

        // Analyser la couleur
        detectColor(targetColor, 5);
    }

    // 6) Détecter la couleur
    function detectColor(tColor, requiredPercentage) {
        const context = canvasEl.getContext("2d");
        const imageData = context.getImageData(0, 0, canvasEl.width, canvasEl.height);
        const data = imageData.data;

        let matchingPixels = 0;
        const totalPixels = data.length / 4;

        const colorRanges = {
            red:   { rMin: 150, rMax: 255, gMin: 0,   gMax: 100, bMin: 0,   bMax: 100 },
            green: { rMin: 0,   rMax: 120, gMin: 80,  gMax: 255, bMin: 0,   bMax: 120 },
            blue:  { rMin: 0,   rMax: 120, gMin: 0,   gMax: 150, bMin: 100, bMax: 255 }
        };

        const range = colorRanges[tColor] || colorRanges.red;

        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i+1];
            const b = data[i+2];

            if (
                r >= range.rMin && r <= range.rMax &&
                g >= range.gMin && g <= range.gMax &&
                b >= range.bMin && b <= range.bMax
            ) {
                matchingPixels++;
            }
        }

        const percentage = (matchingPixels / totalPixels) * 100;
        const detected = (percentage >= requiredPercentage);
        if (detected) {
            handleSuccess();
        } else {
            showMessage("La couleur détectée n'est pas la bonne.", true);
        }
    }

    // 7) Reset
    function resetPhoto() {
        videoEl.classList.remove("hidden");
        canvasEl.classList.add("hidden");
        takePhotoBtn.innerHTML = ""; // enlève la croix
        photoTaken = false;
        showMessage("", false);

        // Réinitialiser la taille du container à la taille du flux vidéo
        if (videoEl.videoWidth && videoEl.videoHeight) {
            const aspectRatio = videoEl.videoWidth / videoEl.videoHeight;
            const cw = cameraContainer.offsetWidth;
            cameraContainer.style.height = `${cw / aspectRatio}px`;
        }

        // Réinitialisation de l'état de completion
        isCompleted = false;
    }


    // 8) Succès
    function handleSuccess() {
        if (isCompleted) return;
        isCompleted = true;
        sessionStorage.removeItem("colorGameTargetColor");
        showMessage("Couleur correcte détectée !", false);
        submitAnswer("color_success");
        if (onComplete) {
            onComplete({ correct: true, message: "Couleur détectée avec succès !" });
        }
    }

    function submitAnswer(answer) {
        if (socket) {
            socket.emit("submitAnswer", {
                sessionId,
                questionId,
                answer
            });
        }
    }

    // 9) showMessage
    function showMessage(msg, isError) {
        messageEl.textContent = msg;
        if (!msg) {
            messageEl.className = "text-center mt-4";
        } else {
            messageEl.className = "text-center mt-4 " + (isError ? "text-red-500" : "text-green-500");
        }
    }

    // 10) Écouteurs
    switchCamBtn.addEventListener("click", switchCamera);
    takePhotoBtn.addEventListener("click", () => {
        if (!photoTaken) {
            takePhoto();
        } else {
            resetPhoto();
        }
    });

    // 11) Initialisation
    enableCamera();

    // Nettoyage quand on quitte
    return () => {
        stopStream();
        switchCamBtn.removeEventListener("click", switchCamera);
        takePhotoBtn.removeEventListener("click", takePhotoBtn);
    };
}
