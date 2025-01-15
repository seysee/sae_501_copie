// src/components/hint.jsx
import React from 'react';

export default function Hint({ hint }) {
    if (!hint) return null;

    return (
        <div className="mt-4 p-4 bg-black text-yellow-400 rounded-lg shadow-lg font-amatic">
            <h3 className="text-2xl font-bold mb-2">Nouvel Indice :</h3>
            <p>{hint.hintText}</p>
        </div>
    );
}
