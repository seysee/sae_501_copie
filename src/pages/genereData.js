import React from "react";
import axios from "axios";

function FillSuspectHintsForId5() {
    const hints = [
        "A dirigé un pays avec une idéologie communiste.",
        "Son père était également un leader influent.",
        "Son pays a connu une famine dévastatrice durant son règne.",
        "A été un ardent défenseur du culte de la personnalité.",
        "A souvent été décrit comme un dirigeant excentrique.",
        "Son pays est connu pour son programme nucléaire.",
        "A été le premier à être surnommé 'L'ami du peuple'.",
        "A eu un rôle central dans la guerre froide en Asie.",
        "Son régime a souvent été comparé à un État policier.",
        "Il a pris le pouvoir après la mort de son père.",
        "A dirigé un pays isolé sur la scène internationale.",
        "Son régime a été marqué par une forte propagande.",
        "A utilisé le cinéma comme outil de propagande.",
        "Son pays a été impliqué dans des conflits régionaux.",
        "A été souvent photographié avec des leaders étrangers.",
        "Son nom est associé à des violations des droits de l'homme.",
        "A renforcé l'armée comme institution centrale.",
        "Son pays a connu des tensions militaires avec un voisin du sud.",
        "A été éduqué à l'étranger, mais est revenu pour diriger.",
        "Son régime a utilisé des camps de travail pour réprimer l'opposition.",
        "A été un amateur de cigares et de luxe.",
        "Son pays est souvent décrit comme une dictature.",
        "A été impliqué dans des affaires de kidnapping à l'étranger.",
        "Son règne a duré plusieurs décennies.",
        "A été l'héritier d'un projet de 'juche' ou d'autosuffisance.",
        "Son visage était omniprésent dans les espaces publics.",
        "A connu des querelles de pouvoir internes au sein de son régime.",
        "A investi massivement dans des programmes militaires.",
        "Son pays a été le théâtre de sanctions internationales.",
        "A utilisé des célébrations grandioses pour affirmer son pouvoir.",
        "A promu une idéologie anti-occidentale.",
        "Son régime a eu des relations tendues avec les États-Unis.",
        "A mené des purges au sein de son propre parti.",
        "A été un fervent défenseur de la dynastie familiale.",
        "A souvent été représenté dans les médias comme un héros.",
        "Son pays a été soumis à des crises économiques répétées.",
        "A interdit l'accès à Internet pour la plupart des citoyens.",
        "A été reconnu pour sa passion pour les arts.",
        "Son régime a provoqué une grande souffrance parmi la population.",
        "A formé des alliances avec d'autres régimes autoritaires.",
        "A été un personnage clé dans la diplomatie en Asie.",
        "A souvent utilisé des visites officielles pour promouvoir son image.",
        "Son pays est isolé et très peu fréquenté par les étrangers.",
        "A fait l'objet de nombreux mythes et légendes au sein de son pays.",
        "Son régime a été marqué par une grande militarisation.",
        "A longtemps été en désaccord avec les autorités sud-coréennes.",
        "A mis en place des lois strictes sur l'immigration.",
        "A souvent été critiqué par des organisations internationales.",
        "Son pays est célèbre pour ses défilés militaires.",
        "A été un chef qui a vécu dans un climat de méfiance constante."
    ];

    const sendHints = async () => {
        for (let i = 0; i < hints.length; i++) {
            try {
                const response = await axios.post('/api/suspect_hints', {
                    suspectId: 5,
                    hintText: hints[i],
                });
                console.log(`Succès : Indice ajouté (ID: ${response.data.id}, Texte: "${hints[i]}")`);
            } catch (error) {
                console.error(`Erreur lors de l'ajout de l'indice "${hints[i]}":`, error);
            }
        }
    };

    return (
        <div style={{ padding: "20px", fontFamily: "Arial, sans-serif" }}>
            <h1>Ajouter les Indices pour le Suspect (ID: 5)</h1>
            <button
                type="button"
                onClick={sendHints}
                style={{
                    backgroundColor: "#4CAF50",
                    color: "white",
                    border: "none",
                    padding: "10px 20px",
                    cursor: "pointer",
                    borderRadius: "5px",
                }}
            >
                Envoyer les Indices
            </button>
        </div>
    );
}

export default FillSuspectHintsForId5;
