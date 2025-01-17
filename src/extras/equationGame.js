export default async function equationGame({
                                               containerId,
                                               questionId,
                                               sessionId,
                                               onComplete,
                                               socket
                                           }) {
    const container = document.getElementById(containerId);
    if (!container) {
        console.error("Impossible de trouver le conteneur pour le jeu equationGame.");
        return;
    }

    // --- 1) Préparation des cibles possibles ---
    const possibleTargets = [9, 5, 12, 10, 15, 7];

    // --- 2) Cartes en fonction du nombre cible ---
    // Ici, tu peux personnaliser en fonction de chaque cible
    const cardsForTarget = {
        9:  ["1", "0", "-", "1", "+", "7", "2"], // Exemple : "10 - 1"
        5:  ["7", "-", "1", "+", "2", "0", "÷"], // Exemple : "10 ÷ 2"
        12: ["1", "1", "+", "1", "-", "0", "×"], // Exemple : "11 + 1"
        10: ["1", "2", "-", "2", "+", "0", "÷"], // Exemple : "20 ÷ 2"
        15: ["1", "5", "+", "0", "-", "1", "÷"], // Exemple : "15 + 0"
        7:  ["8", "-", "1", "+", "0", "÷", "2"], // Exemple : "08 - 1"
    };

    // Récupération ou choix aléatoire du target
    let storedTarget = sessionStorage.getItem("mathGameTarget");
    let targetNumber;
    if (storedTarget) {
        targetNumber = parseFloat(storedTarget);
    } else {
        targetNumber = possibleTargets[Math.floor(Math.random() * possibleTargets.length)];
        sessionStorage.setItem("mathGameTarget", targetNumber.toString());
    }

    // On récupère le tableau de cartes adapté à la cible
    const allCards = cardsForTarget[targetNumber] || ["0", "1", "2", "+", "-", "3", "÷", "5"];

    // Nombre d’emplacements (slots)
    const slotCount = 4;

    // Limites et dimensions
    const MAX_WIDTH = 400;
    const HEIGHT = 300;
    const cardW = 50;
    const cardH = 50;

    // État interne
    let cards = [];
    let slots = [];

    // État drag
    let draggingCardId = null;
    let dragOffset = { x: 0, y: 0 };

    // -----------------------------
    // 3) Initialisation du jeu
    // -----------------------------
    initGame();

    function initGame() {
        container.innerHTML = "";

        // Centrage horizontal du container
        container.style.display = "flex";
        container.style.justifyContent = "center";
        container.style.width = "100%";
        container.style.boxSizing = "border-box";

        // Création du wrapper qui ne dépasse pas MAX_WIDTH
        const wrapper = document.createElement("div");
        wrapper.className = "relative";
        wrapper.style.margin = "0 auto";
        wrapper.style.width = "100%";
        wrapper.style.maxWidth = MAX_WIDTH + "px";
        wrapper.style.height = HEIGHT + "px";
        wrapper.style.position = "relative";

        container.appendChild(wrapper);

        // Récupère la largeur réelle (peut être < 400 sur mobile)
        const wrapperWidth = wrapper.offsetWidth;

        // 3.1) Position des slots + label "= targetNumber"
        const spaceBetweenSlots = 10;
        // On estime un peu de place pour le label
        const labelExtraSpace = 50;
        const slotsTotalWidth =
            slotCount * cardW + (slotCount - 1) * spaceBetweenSlots + labelExtraSpace;

        // Centre le bloc (slots + label)
        let baseX = (wrapperWidth - slotsTotalWidth) / 2;
        if (baseX < 0) baseX = 0;

        // On crée les slots
        slots = [];
        const offsetY = 20; // position Y des slots
        for (let i = 0; i < slotCount; i++) {
            const slotDiv = document.createElement("div");
            slotDiv.style.position = "absolute";
            slotDiv.style.left = (baseX + i * (cardW + spaceBetweenSlots)) + "px";
            slotDiv.style.top = offsetY + "px";
            slotDiv.style.width = cardW + "px";
            slotDiv.style.height = cardH + "px";
            slotDiv.style.border = "2px dashed white";

            slotDiv.dataset.slotIndex = i;
            wrapper.appendChild(slotDiv);

            slots.push({
                id: i,
                x: baseX + i * (cardW + spaceBetweenSlots),
                y: offsetY,
                w: cardW,
                h: cardH,
                cardId: null
            });
        }

        // Label sur la même ligne (whiteSpace=nowrap)
        const labelDiv = document.createElement("div");
        labelDiv.innerText = `= ${targetNumber}`;
        labelDiv.style.position = "absolute";
        const labelX = baseX + slotCount * (cardW + spaceBetweenSlots) + 5;
        labelDiv.style.left = labelX + "px";
        labelDiv.style.top = offsetY + "px";
        labelDiv.style.fontSize = "24px";
        labelDiv.style.lineHeight = cardH + "px";
        labelDiv.style.whiteSpace = "nowrap"; // force la même ligne
        labelDiv.style.color = "#fff";
        wrapper.appendChild(labelDiv);

        // 3.2) Placement des cartes en bas
        const minY = 120;
        const maxY = HEIGHT - cardH;
        cards = allCards.map((text, idx) => {
            const randomX = Math.random() * (wrapperWidth - cardW);
            const randomY = minY + Math.random() * (maxY - minY);
            return {
                id: idx,
                text,
                x: randomX,
                y: randomY,
                w: cardW,
                h: cardH,
                slotId: null
            };
        });

        // Rendu initial
        render(wrapper);
    }

    // -----------------------------
    // 4) Rendu
    // -----------------------------
    function render(wrapper) {
        // Supprimer anciennes cartes
        const oldCards = wrapper.querySelectorAll(".mathcard");
        oldCards.forEach(el => el.remove());

        // Recrée un div par carte
        cards.forEach(card => {
            const cardDiv = document.createElement("div");
            cardDiv.className = `
        mathcard
        absolute
        flex
        items-center
        justify-center
        bg-blue-200
        text-black
        font-bold
        rounded
        shadow
        cursor-grab
      `.replace(/\s+/g, " ");

            cardDiv.style.position = "absolute";
            cardDiv.style.left = card.x + "px";
            cardDiv.style.top = card.y + "px";
            cardDiv.style.width = card.w + "px";
            cardDiv.style.height = card.h + "px";

            cardDiv.innerText = card.text;

            // Drag events
            cardDiv.addEventListener("mousedown", e => startDrag(e, card.id));
            cardDiv.addEventListener("touchstart", e => startDrag(e, card.id));
            cardDiv.addEventListener("mousemove", onDragMove);
            cardDiv.addEventListener("touchmove", onDragMove);
            cardDiv.addEventListener("mouseup", endDrag);
            cardDiv.addEventListener("touchend", endDrag);

            wrapper.appendChild(cardDiv);
        });
    }

    // -----------------------------
    // 5) Drag & Drop
    // -----------------------------
    function startDrag(e, cardId) {
        e.preventDefault();
        const isTouch = (e.type === "touchstart");
        const clientX = isTouch ? e.touches[0].clientX : e.clientX;
        const clientY = isTouch ? e.touches[0].clientY : e.clientY;

        const card = cards.find(c => c.id === cardId);
        if (!card) return;

        draggingCardId = cardId;
        dragOffset.x = clientX - card.x;
        dragOffset.y = clientY - card.y;
    }

    function onDragMove(e) {
        if (draggingCardId === null) return;
        e.preventDefault();

        const isTouch = (e.type === "touchmove");
        const clientX = isTouch ? e.touches[0].clientX : e.clientX;
        const clientY = isTouch ? e.touches[0].clientY : e.clientY;

        const card = cards.find(c => c.id === draggingCardId);
        if (!card) return;

        // Mise à jour
        card.x = clientX - dragOffset.x;
        card.y = clientY - dragOffset.y;

        // Empêcher de sortir du wrapper
        const wrapper = container.querySelector(".relative");
        if (wrapper) {
            const wrapperWidth = wrapper.offsetWidth;
            if (card.x < 0) card.x = 0;
            if (card.x > wrapperWidth - cardW) card.x = wrapperWidth - cardW;
            if (card.y < 0) card.y = 0;
            if (card.y > HEIGHT - cardH) card.y = HEIGHT - cardH;

            render(wrapper);
        }
    }

    function endDrag(e) {
        if (draggingCardId === null) return;
        const card = cards.find(c => c.id === draggingCardId);
        draggingCardId = null;

        if (card) {
            // Vérifier s'il y a un slot dessous
            const slot = findSlotUnderCard(card);
            if (slot) {
                // slot déjà occupé ?
                if (slot.cardId !== null && slot.cardId !== card.id) {
                    const occupant = cards.find(cc => cc.id === slot.cardId);
                    if (occupant) occupant.slotId = null;
                }
                card.x = slot.x;
                card.y = slot.y;
                card.slotId = slot.id;
                slot.cardId = card.id;
            } else {
                // Libérer l'ancien slot
                if (card.slotId !== null) {
                    const oldSlot = slots.find(s => s.id === card.slotId);
                    if (oldSlot) oldSlot.cardId = null;
                }
                card.slotId = null;
            }
        }

        const wrapper = container.querySelector(".relative");
        if (wrapper) render(wrapper);

        checkIfSolved();
    }

    function findSlotUnderCard(card) {
        const cx = card.x + card.w / 2;
        const cy = card.y + card.h / 2;
        return slots.find(slot => {
            return (
                cx >= slot.x &&
                cx <= slot.x + slot.w &&
                cy >= slot.y &&
                cy <= slot.y + slot.h
            );
        });
    }

    // -----------------------------
    // 6) Vérifier victoire
    // -----------------------------
    function checkIfSolved() {
        // Tous les slots occupés ?
        const filled = slots.filter(s => s.cardId !== null).length;
        if (filled < slotCount) return;

        // Construire l'expression
        let expr = "";
        for (let i = 0; i < slotCount; i++) {
            const slot = slots[i];
            if (slot.cardId === null) return;
            const c = cards.find(cd => cd.id === slot.cardId);
            if (!c) return;
            expr += c.text;
        }

        // Normaliser
        const safeExpr = normalizeExpression(expr);

        let result;
        try {
            result = eval(safeExpr);
        } catch (err) {
            console.log("Erreur eval:", err);
            return;
        }

        // Comparaison
        if (Math.abs(result - targetNumber) < 1e-9) {
            console.log(`Bonne réponse: ${expr} = ${result}`);
            sessionStorage.removeItem("mathGameTarget");

            onComplete({ correct: true, message: `Bravo, vous avez obtenu ${targetNumber} !` });
            if (socket) {
                socket.emit("submitAnswer", {
                    sessionId,
                    questionId,
                    answer: "equation_success"
                });
            }
        } else {
            console.log(`Mauvaise réponse: ${expr} = ${result}, cible=${targetNumber}`);
        }
    }

    // Retire zéros initiaux, remplace ÷ par /
    function normalizeExpression(expr) {
        let safe = expr.replace(/÷/g, "/");
        const tokens = safe.match(/[0-9.]+|[+\-*/]/g);
        if (!tokens) return "";

        const cleaned = tokens.map(tok => {
            if (/^[0-9.]+$/.test(tok)) {
                if (!tok.includes(".")) {
                    while (tok.length > 1 && tok[0] === "0") {
                        tok = tok.slice(1);
                    }
                    if (tok === "") tok = "0";
                }
            }
            return tok;
        });
        return cleaned.join("");
    }
}
