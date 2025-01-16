import { useState } from "react";

export default function _skin({ onSkinSelect }) {
    const [selectedSkinId, setSelectedSkinId] = useState(null);

    const skins = [
        { id: 1, name: "Pretty cat", skin: "/skins/players/catSkin.png" },
        { id: 2, name: "Lava robot", skin: "/skins/players/lavaSkin.png" },
        { id: 3, name: "Puppy leaf", skin: "/skins/players/leafSkin.png" },
        { id: 4, name: "Ski man", skin: "/skins/players/rockSkin.png" },
        { id: 5, name: "Big rock", skin: "/skins/players/skiSkin.png" }
    ];

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
