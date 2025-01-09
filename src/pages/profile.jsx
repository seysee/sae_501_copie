import { useState } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import Button from '../components/_button';

export default function Profile() {
    const [pseudo, setPseudo] = useState('');
    const [error, setError] = useState(null);
    const router = useRouter();
    const bannedWords = [
        "con", "conne", "abruti", "imbécile", "crétin", "débile", "connard", "connasse", "trouduc",
        "enfoiré", "bâtard", "merde", "emmerdeur", "chieur", "salope", "saligaud", "pute", "putain",
        "bordel", "pédé", "tapette", "batarde", "enculé", "fdp", "filsdepute", "crevard",
        "nègre", "negro", "bougnoule", "chinetoque", "sale arabe", "juif", "chintok", "sale noir",
        "pédé", "tafiole", "tapette", "féminazi", "misogyne", "pute", "viol", "violeur", "raciste",
        "xénophobe", "haineux", "sataniste", "démon", "tortionnaire", "tueur", "assassin",
        "meurtrier", "massacre", "génocide", "torture", "terroriste", "kamikaze", "jihadiste",
        "esclavage", "nazi", "fasciste", "salopard", "sac à merde",
        "fuck", "f*ck", "fu*k", "fuc*",  "shit", "bitch", "asshole", "bastard", "motherfucker", "slut", "whore", "jerk",
        "nigga", "nigger", "fucker", "dick", "damn", "pussy", "wanker", "prick", "twat",
        "bollocks", "scumbag", "arsehole", "harlot", "racist", "bigot",
        "queer", "fag", "dyke", "cock", "bollocks", "f***", "arse", "idiot", "cretin",
        "scumbag", "jerkoff", "sodomite", "rapist", "paedophile", "peckerhead", "nazi",
        "c0nnard", "fdp", "n4z1", "b1tch", "sh1t", "m0therf***er", "f**k", "n*gger",
        "wtf", "omg", "mthrfkr", "p3de", "v1ol", "v10leur", "s4lope", "r4ciste",
        "h4ineux", "t4pette", "t4fiole", "ch1nque", "sale_blanc", "fils_de_p***",
        "kkk", "supremaciste", "lynchage", "colonisateur", "nazisme", "séparatiste",
        "white_power", "esclavagiste", "homophobe", "xénophobe", "antisémitisme",
        "racisme", "supremacy", "hate_crime", "genocide", "segregation", "apartheid",
        "antisémite", "bougnoul", "arrogant_blanc", "sale_juif", "dirty_black",
        "sale_arabe", "chintok", "chinetoque", "negre", "monkey", "ape",
        "yellow_skin", "darkie", "slave", "massa", "master_race",
        "sodomie", "éjaculation", "gangbang", "hardcore", "porno", "porn",
        "chatte", "cul", "vagin", "bite", "couille",
        "dildo", "fellation", "pédophile","pedophile", "masturbateur", "prostituée", "escort",
        "gode", "hardcore_sex", "bareback", "cumshot", "pegging", "bdsm", "kink", "sex_addict",
        "pervers", "idiot", "stupide", "débile", "taré", "mongolien", "trisomique",
        "esclave", "babouin", "chimpanzé", "clochard", "negr0", "boche", "chicano", "enculeur",
        "femmelette", "gogol", "goudou", "gouine", "lope", "lopette", "nabot",
        "négresse", "négrillon", "pédé", "pouffiasse", "romano", "schleu", "sidaïque",
        "tafiole", "tantouse", "tantouze", "tarlouse", "tarlouze", "travelo", "caca", "pipi",
        "c4c4", "c4ca", "cac4", "p1p1", "p1pi", "pip1"
    ];


    const containsBannedWord = (text) => {
        const lowerText = text.toLowerCase();
        return bannedWords.some((word) => lowerText.includes(word));
    };

    const handleSavePseudo = async () => {
        if (!pseudo.trim()) {
            setError('Le pseudo ne peut pas être vide.');
            return;
        }
        if (containsBannedWord(pseudo)) {
            setError('Le pseudo contient des mots inappropriés. Veuillez en choisir un autre.');
            return;
        }

        try {
            const response = await axios.post('/api/player', { name: pseudo });
            if (response.status === 201) {
                sessionStorage.setItem('userData', JSON.stringify(response.data));
                router.push('/');
            }
        } catch (err) {
            console.error('Erreur lors de la création du profil :', err);
            setError('Une erreur est survenue. Veuillez réessayer.');
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center text-white">
            <h1 className="text-5xl font-Amatic mb-8">Profil</h1>
            <div className="w-full max-w-md">
                <label htmlFor="pseudo" className="block text-lg mb-4">
                    Entrez votre pseudo :
                </label>
                <input
                    type="text"
                    id="pseudo"
                    value={pseudo}
                    onChange={(e) => setPseudo(e.target.value)}
                    className="w-full p-3 bg-black text-white border border-gray-500 rounded-lg mb-6"
                />
                {error && <p className="text-red-500 mb-4 text-center">{error}</p>}
                <Button
                    label="Enregistrer"
                    onClick={handleSavePseudo}
                    className="w-full bg-black text-green-500 border-green-500"
                />
            </div>
        </div>
    );
}
