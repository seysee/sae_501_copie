export default async function blindtestGame({
                                                containerId,
                                                questionId,
                                                sessionId,
                                                onComplete,
                                                socket
                                            }) {
    const container = document.getElementById(containerId);
    if (!container) {
        console.error("Impossible de trouver le conteneur pour le jeu BlindTest.");
        return;
    }

    // 1) Toutes les musiques
    const allTracks = [
        { title: "Adele - Rolling in the deep", file: "rollingInTheDeep.mp3" },
        { title: "Britney Spears - Toxic", file: "toxic.mp3" },
        { title: "Carly Rae Jepsen - Call Me Maybe", file: "callMeMaybe.mp3" },
        { title: "Ed Sheeran - Shape Of You", file: "shapeOfYou.mp3" },
        { title: "GIMS - Bella", file: "bella.mp3" },
        { title: "Katy Perry - Roar", file: "roar.mp3" },
        { title: "Luis Fonsi ‒ Despacito", file: "despacito.mp3" },
        { title: "Major Lazer & DJ Snake - Lean On", file: "leanOn.mp3" },
        { title: "Mark Ronson - Uptown Funk", file: "uptownFunk.mp3" },
        { title: "Michael Jackson - Billie Jean", file: "billieJean.mp3" },
        { title: "Nirvana - Smells Like Teen Spirit", file: "smellsLikeTeenSpirit.mp3" },
        { title: "One Direction - What Makes You Beautiful", file: "whatMakesYouBeautiful.mp3" },
        { title: "Pharrell Williams - Happy", file: "happy.mp3" },
        { title: "Shakira - Waka Waka", file: "wakaWaka.mp3" },
        { title: "The Weeknd - Blinding Lights", file: "blindingLights.mp3" },
    ];

    // 2) Choisir 3 correctes
    const shuffled = [...allTracks].sort(() => Math.random() - 0.5);
    const correctTracks = shuffled.slice(0, 3);

    // 3) Ajouter un certain nb de leurres (ex. 5)
    const distractorCount = 5;
    const remainingAfter3 = shuffled.slice(3);
    const chosenDistractors = remainingAfter3.slice(0, distractorCount);

    // 4) On mélange (3 correctes + 5 leurres) pour afficher
    const finalPropositions = [...correctTracks, ...chosenDistractors]
        .sort(() => Math.random() - 0.5);

    // Log console
    console.log("Réponses attendues (Blind Test) :", correctTracks.map(t => t.title));

    // 5) HTML
    container.innerHTML = `
    <div class="flex flex-col items-center text-white">
      <h2 class="text-3xl font-bold mb-4">Blind Test : Trouvez les 3 titres !</h2>
      <p class="mb-4">Un seul lecteur contient un mix de 3 chansons correctes.</p>
      <div id="audioContainer" class="mb-6"></div>
      <p class="mb-2">Cliquez sur 3 titres parmi la liste ci-dessous :</p>
      <div id="choicesContainer"
           class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4 w-full px-4">
      </div>
      <button id="validateBtn"
              class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
        Valider
      </button>
    </div>
  `;

    const audioContainer = container.querySelector("#audioContainer");
    const choicesContainer = container.querySelector("#choicesContainer");
    const validateBtn = container.querySelector("#validateBtn");

    // 6) Combiner en un seul audio
    const combinedBlobURL = await combineAudioTracks(
        correctTracks.map(t => `/blindtest/${t.file}`)
    );

    const audioElem = document.createElement("audio");
    audioElem.src = combinedBlobURL;
    audioElem.controls = true;
    audioElem.autoplay = true;
    audioElem.loop = true;
    audioContainer.appendChild(audioElem);

    // 7) Générer des "cartes" cliquables
    finalPropositions.forEach((track) => {
        const card = document.createElement("div");
        card.className = `
      bg-gray-800
      rounded
      p-3
      cursor-pointer
      transition
      hover:bg-gray-700
      titleCard
    `.replace(/\s+/g, " ");
        card.dataset.title = track.title;
        card.innerText = track.title;

        card.addEventListener("click", () => toggleSelection(card));
        choicesContainer.appendChild(card);
    });

    // 8) Bouton Valider
    validateBtn.addEventListener("click", () => {
        const selected = choicesContainer.querySelectorAll(".selected");
        if (selected.length !== 3) {
            alert("Vous devez sélectionner exactement 3 titres !");
            return;
        }

        const chosenTitles = Array.from(selected).map(c => c.dataset.title).sort();
        const correctTitles = correctTracks.map(t => t.title).sort();

        const isCorrect = JSON.stringify(chosenTitles) === JSON.stringify(correctTitles);
        if (isCorrect) {
            audioElem.pause();

            if (onComplete) {
                onComplete({ correct: true, message: "Blind Test réussi !" });
            }
            if (socket) {
                socket.emit("submitAnswer", {
                    sessionId,
                    questionId,
                    answer: "blindtest_success",
                });
            }
        } else {
            alert("Mauvaise réponse, réessayez !");
        }
    });

    // -------------------------
    // Fonctions utilitaires
    // -------------------------
    function toggleSelection(card) {
        // est déjà sélectionnée ?
        if (card.classList.contains("selected")) {
            card.classList.remove("selected");
            card.style.backgroundColor = ""; // revert style
            enforceMaxThree();
            return;
        }
        // sinon on vérifie combien il y a
        const selectedCards = choicesContainer.querySelectorAll(".selected");
        if (selectedCards.length >= 3) {
            alert("Vous avez déjà sélectionné 3 titres.");
            return;
        }
        // on sélectionne
        card.classList.add("selected");
        card.style.backgroundColor = "green"; // ex. un highlight
        enforceMaxThree();
    }

    function enforceMaxThree() {
        const selectedCards = choicesContainer.querySelectorAll(".selected");
        const allCards = choicesContainer.querySelectorAll(".titleCard");

        if (selectedCards.length >= 3) {
            allCards.forEach((c) => {
                if (!c.classList.contains("selected")) {
                    c.style.opacity = "0.5";
                    c.style.pointerEvents = "none";
                }
            });
        } else {
            allCards.forEach((c) => {
                c.style.opacity = "1";
                c.style.pointerEvents = "auto";
            });
        }
    }

    async function combineAudioTracks(filePaths) {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const buffers = [];

        // Charger + décoder
        for (const path of filePaths) {
            const resp = await fetch(path);
            const arrayBuf = await resp.arrayBuffer();
            const decoded = await audioContext.decodeAudioData(arrayBuf);
            buffers.push(decoded);
        }

        let maxDur = 0;
        buffers.forEach(b => {
            if (b.duration > maxDur) maxDur = b.duration;
        });

        const sampleRate = audioContext.sampleRate;
        const length = Math.ceil(maxDur * sampleRate);

        const offlineCtx = new OfflineAudioContext(2, length, sampleRate);

        buffers.forEach(buf => {
            const src = offlineCtx.createBufferSource();
            src.buffer = buf;
            src.connect(offlineCtx.destination);
            src.start(0);
        });

        const rendered = await offlineCtx.startRendering();
        const blob = await audioBufferToWavBlob(rendered);
        return URL.createObjectURL(blob);
    }

    async function audioBufferToWavBlob(audioBuffer) {
        const numChannels = audioBuffer.numberOfChannels;
        const sampleRate = audioBuffer.sampleRate;
        const numFrames = audioBuffer.length;

        let interleaved;
        if (numChannels === 2) {
            const left = audioBuffer.getChannelData(0);
            const right = audioBuffer.getChannelData(1);
            interleaved = new Float32Array(numFrames * 2);
            for (let i = 0; i < numFrames; i++) {
                interleaved[i * 2] = left[i];
                interleaved[i * 2 + 1] = right[i];
            }
        } else {
            interleaved = audioBuffer.getChannelData(0);
        }

        const wavBytes = getWavBytes(interleaved, {
            isFloat: true,
            numChannels,
            sampleRate
        });
        return new Blob([wavBytes], { type: "audio/wav" });
    }

    function getWavBytes(interleaved, opts) {
        const numFrames = interleaved.length / opts.numChannels;
        const bytesPerSample = 4;
        const format = 3; // 3 = float
        const blockAlign = opts.numChannels * bytesPerSample;
        const byteRate = opts.sampleRate * blockAlign;
        const dataSize = interleaved.length * bytesPerSample;

        const buffer = new ArrayBuffer(44 + dataSize);
        const view = new DataView(buffer);

        writeString(view, 0, "RIFF");
        view.setUint32(4, 36 + dataSize, true);
        writeString(view, 8, "WAVE");
        writeString(view, 12, "fmt ");
        view.setUint32(16, 16, true);
        view.setUint16(20, format, true);
        view.setUint16(22, opts.numChannels, true);
        view.setUint32(24, opts.sampleRate, true);
        view.setUint32(28, byteRate, true);
        view.setUint16(32, blockAlign, true);
        view.setUint16(34, 8 * bytesPerSample, true);
        writeString(view, 36, "data");
        view.setUint32(40, dataSize, true);

        let offset = 44;
        for (let i = 0; i < interleaved.length; i++, offset += 4) {
            view.setFloat32(offset, interleaved[i], true);
        }
        return buffer;
    }

    function writeString(view, offset, str) {
        for (let i = 0; i < str.length; i++) {
            view.setUint8(offset + i, str.charCodeAt(i));
        }
    }
}
