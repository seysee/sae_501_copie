import React from "react";
import Link from 'next/link';
import Button from '../components/_button';
import { useRouter } from 'next/router';

import '../styles/App.css';

export default function Rules() {
    const router = useRouter();

    return (
        <div className="box-area relative min-h-screen flex justify-center text-white"
             style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>

            <div className="w-full max-w-lg flex flex-col items-center py-20 h-screen overflow-y-auto space-y-12"
                 style={{ scrollbarWidth: 'none' }}>

                <button
                    onClick={() => router.back()}
                    className="absolute top-4 left-0 flex items-center justify-center w-10 h-10 bg-gray-800 rounded-full text-white hover:bg-gray-700"
                    title="Retour"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                        className="w-6 h-6"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M15.75 19.5L8.25 12l7.5-7.5"
                        />
                    </svg>
                </button>

                <h1 className="text-6xl font-Amatic text-yellow-400">Règles du Jeu</h1>

                <div className="text-center text-xl font-Amatic space-y-6">
                    <p>
                        <strong className="text-red-500">Bienvenue dans "Parmi Nous"</strong>, un escape game en ligne.
                        Dans ce jeu, chaque membre de l'équipe recevra un rôle dès le début. En tant qu'enquêteurs, vous devrez résoudre des énigmes pour démasquer le tueur… ou semer la confusion si vous êtes du côté des saboteurs.
                        <br/>
                        <strong className="text-red-500">Attention</strong>, votre rôle est secret&nbsp;: ne le révélez pas aux autres. Bonne chance&nbsp;!
                    </p>
                </div>

                <div className="text-center text-xl font-Amatic space-y-6">
                    <h2 className="text-4xl text-yellow-400">Les Rôles</h2>
                    <ul className="list-disc list-inside text-left space-y-2">
                        <li>
                            <strong className="text-red-500">Enquêteurs :</strong> Résolvez les énigmes et découvrez le tueur.
                        </li>
                        <li>
                            <strong className="text-yellow-300">Saboteurs :</strong> Détournez l'attention pour induire l'équipe en erreur.
                        </li>
                    </ul>
                </div>

                <div className="text-center text-xl font-Amatic space-y-6">
                    <h2 className="text-3xl text-yellow-400">Comment Jouer</h2>
                    <ol className="list-decimal list-inside text-left space-y-2">
                        <li>Les enquêteurs doivent résoudre des énigmes dans un temps imparti.</li>
                        <li>
                            Si une énigme est résolue, un indice est donné pour identifier le tueur.
                            Attention, ces indices sont souvent ambigus&nbsp;!
                        </li>
                        <li>
                            Si une énigme n’est pas résolue à temps, aucun indice ne sera donné, mais l’équipe pourra passer à l’énigme suivante.
                        </li>
                        <li>
                            Les saboteurs doivent manipuler l’équipe pour interpréter les indices de travers.
                        </li>
                    </ol>
                </div>

                <div className="text-center text-xl font-Amatic space-y-6">
                    <h2 className="text-3xl text-yellow-400">Victoire</h2>
                    <ul className="list-disc list-inside text-left space-y-2">
                        <li>
                            <strong className="text-green-500">Équipe gagne :</strong> Si le tueur est identifié correctement après avoir résolu toutes les énigmes.
                        </li>
                        <li>
                            <strong className="text-red-500">Imposteur et saboteurs gagnent :</strong> Si les enquêteurs échouent à identifier le tueur.
                        </li>
                    </ul>
                </div>

                <div className="text-center text-xl font-Amatic space-y-6">
                    <p className="mt-6">
                        <strong className="text-yellow-300">Bonne chance&nbsp;!</strong> Et méfiez-vous des intentions des autres...
                    </p>
                </div>

                <div className="mt-12">
                    <Link href="/" passHref>
                        <Button label="Retour" className="bg-black text-yellow-400 border-yellow-400 hover:text-yellow-500 hover:border-yellow-500" />
                    </Link>
                </div>
            </div>
        </div>
    );
}
