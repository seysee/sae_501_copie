import React, {useState} from 'react';
import "/src/styles/switchBtn.css"

const SwitchRedGreen = ({arg1, arg2, onSelect}) => {
    const [isGreen, setIsGreen] = useState(false);

    const toggleSwitch = () => {
        setIsGreen(!isGreen);
        onSelect(!isGreen ? arg2 : arg1);
    };

    return (
        <div className="flex flex-row items-center gap-6 font-Amatic text-2xl">
            {arg1}
            <div className="toggle dark" onClick={toggleSwitch}>
                <div className={`switch ${isGreen ? 'on-green-dark' : 'off-red-dark'}`}></div>
            </div>
            {arg2}
        </div>
    );
};

export default SwitchRedGreen;
