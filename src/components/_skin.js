import { useState } from "react";
import skinsData from "/src/data/skins";

export default function _skin({ onSkinSelect }) {
    const [selectedSkinId, setSelectedSkinId] = useState(null);

    // Utilisation de skinsData.skins pour accéder au tableau des skins
    const skins = skinsData.skins;

    const handleSkinClick = (id) => {
        setSelectedSkinId(id);
        if (onSkinSelect) {
            onSkinSelect(id);
        }
    };

    return (
        <div>
            <div className="flex flex-row flex-wrap gap-2 justify-center mb-5">
                {skins.map((skin) => (
                    <div
                        key={skin.id}
                        className={`flex flex-col-reverse flex-wrap border rounded cursor-pointer ${
                            selectedSkinId === skin.id ? "border-4 border-blue-500" : "border-white"
                        }`}
                        id={skin.id}
                        onClick={() => handleSkinClick(skin.id)}
                    >
                        <p className="text-center">{skin.name}</p>
                        <img width="80px" src={skin.skin} alt={skin.name} />
                    </div>
                ))}
            </div>
        </div>
    );
}
