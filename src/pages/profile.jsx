import {useState, useEffect} from 'react';
import {useRouter} from 'next/router';
import axios from 'axios';
import Button from '../components/_button';
import _skin from "../components/_skin";

export default function Profile() {
    const [pseudo, setPseudo] = useState('');
    const [skin, setSkin] = useState(null);
    const [error, setError] = useState(null);
    const [isConnected, setIsConnected] = useState(false);

    const router = useRouter();

    const bannedWords = [
        "bâtard", "merde", "salope", "pute", "putain","pédé", "tapette", "enculé", "fdp",
        "nègre", "negro", "bougnoule", "chinetoque", "arabe", "juif", "chintok", "sale",
        "tafiole", "féminazi", "misogyne", "viol", "raciste", "connard", "connasse",
        "xénophobe", "torture", "tueur", "meurtre", "mort", "tuer", "tué", "génocide",
        "torture", "terroriste", "jihadiste", "daesh","esclavage", "nazi", "fasciste", "salopard", "fuck",
        "f*ck", "fu*k", "fuc*", "shit", "bitch", "asshole", "slut", "whore", "jerk",
        "nigga","nigger", "nig*er","ni*ger","nigg*r","n*gger", "n!gger","n!gga", "n!gg@r", "n!gg*r", "n1gga", "n1gg3r",
        "n!gger", "n!ggr", "n1ggr","n|gga", "n|gger", "n|gg*r", "n|gg@r","nigg@r", "n!ggar", "ni**er",
        "ni**a", "n!gg@","ni gger","ni gga","nig ger", "nig ga","n1g@a", "n1gg@", "n!g@","n1gg@", "ngg@", "n1g@",
        "n igga", "n i gger", "ni gg a", "n ig g er","n_igga", "n__igger", "n_ig_er",
        "n.i.g.g.a", "n.i.g.g.e.r","n i g g a", "n i gg er", "ni g g er","n-igga", "n-igger", "ni-gger",
        "n1gga", "n1gg3r", "ni66a", "ni663r","n!66a", "ni99er", "n1gg3r","nigg4", "n1gg@", "nigg3r",
        "n¡gga", "n¡gger", "ni99@", "reggin", "aggin",
        "nìgga", "nìggér", "nígga", "nígger","nīggā", "nîgga", "nîgger", "nìggа", "nιgga",
        "nïgga", "nïgger", "nıgga", "nıgger", "nіgga","n🅸gga", "n🅸gg🅰", "n🅽igg🅰","n🅽🅸🅶ga", "n🅸g🅶er", "n🅶🅶a",
        "dick", "pussy", "wanker", "prick", "racist", "fag", "dyke", "cock", "sodomite", "rapist", "paedophile", "nazi",
        "fdp", "n4z1", "b1tch", "sh1t", "m0therf***er", "f**k", "n*gger", "p3de", "v1ol", "v10leur", "r4ciste",
        "t4pette", "t4fiole", "kkk", "klux", "supremaciste", "nazisme", "esclavagiste", "homophobe", "xénophobe",
        "antisémitisme", "genocide", "segregation","antisémite", "bougnoul","sale_juif", "chinetoque", "negre","slave", "massa",
        "vagin", "bite", "couille", "zeub", "chibre","fellation", "pédophile", "pedophile", "prostituée","gode","cumshot", "pegging",
        "bdsm", "kink","pervers", "mongolien", "trisomique","esclave", "babouin", "chimpanzé", "negr0",
        "goudou", "gouine", "négresse", "négrillon", "pédé", "sidaique", "travelo", "caca", "pipi", "prout",
        "c4c4", "c4ca", "cac4", "p1p1", "p1pi", "pip1", "Al Chabaab",
        "Al-Jamaa al-islamiya","Al-Mourabitoune","el-Mouakine bi dima","Al-Qaïda",
        "Ansar al-Islam (AI)","Ansar Dine","Ansarallah","Aryan Strikeforce",
        "Asbat Al-Ansar","Association mondiale tamoule","Aum Shinrikyo","Babbar Khalsa International",
        "Boko Haram","Blood & Honour","al-Qods","Abdullah Azzam",
        "al-Ashtar","Combat 18","Division Atomwaffen","Division Fatemiyoun",
        "Ejército de Liberación Nacional","Émirat du Caucase","État islamique","Province du Sinaï",
        "État islamique","Euskadi Ta Askatasuna","Hezb-e Islami","Macina",
        "Palestine","Fuerzas Armadas Revolucionarias","Gardiens de la révolution islamique","Abou Sayyaf",
        "Gulbuddin Hekmatyar","Hamas","Harakat al-Sabireen","Harakat ul-Mudjahidin",
        "HASAM","Hay'at Tahrir al-Sham","Hezbollah","Hizbul Mujahideen",
        "International Relief Fund for the Afflicted and Needy","Jaish-e-Mohammed",
        "Jamaat Nosrat Al-Islam Wal-Mouslimine","James Mason","Jaysh Al-Muhajirin Wal-Ansar","Jemaah Islamiyyah",
        "Jihad islamique palestinien","Kahane Chai","La Brigade des martyrs d'Al-Aqsa","La Fédération internationale de la jeunesse sikh",
        "Lashkar-e-Jhangvi","Lashkar-e-Tayyiba","Les talibans","Les Tigres libérateurs de l'Eelam tamoul",
        "Moudjahidines indiens","Mouvement impérial russe","Mouvement islamique d'Ouzbékistan","Mouvement pour l'unicité et le jihad en Afrique de l'Ouest",
        "Organisation Abou Nidal (OAN)","Parti des travailleurs du Kurdistan","Proud Boys","Réseau Haqqani",
        "Samidoun","Sendero Luminoso","Tehrik-e-Taliban Pakistan","The Base","Three Percenters",
    ];

    const containsBannedWord = (text) => {
        const lowerText = text.toLowerCase();
        return bannedWords.some((word) => lowerText.includes(word));
    };

    useEffect(() => {
        const storedUserData = sessionStorage.getItem('userData');
        if (storedUserData) {
            const userData = JSON.parse(storedUserData);
            if (userData && userData.name) {
                setPseudo(userData.name);
                setIsConnected(true);
            }
        }
    }, []);

    const handleSavePseudo = async () => {
        if (!pseudo.trim()) {
            setError('Le pseudo ne peut pas être vide.');
            return;
        }
        if (pseudo.length > 16) {
            setError('Le pseudo est trop long.');
            return;
        }
        if (!skin) {
            setError('Veuillez choisir un skin.');
            return;
        }
        if (containsBannedWord(pseudo)) {
            setError('Le pseudo contient des mots inappropriés. Veuillez en choisir un autre.');
            return;
        }
        console.log(skin)
        try {
            const response = await axios.post('/api/player', {
                name: pseudo,
                skin
            });
            if (response.status === 201) {
                sessionStorage.setItem('userData', JSON.stringify(response.data));
                router.push('/');
            }
        } catch (err) {
            console.error('Erreur lors de la création du profil :', err);
            setError('Une erreur est survenue. Veuillez réessayer.');
        }
    };

    const handleSkinSelect = (id) => {
        console.log("Skin sélectionné :", id);
        setSkin(id)
    };


    return (
        <div className="min-h-screen flex flex-col items-center justify-center text-white relative">
            {(
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
            )}

            <h1 className="text-5xl font-Amatic mb-8">Profil</h1>
            <div className="w-full max-w-md">
                <label htmlFor="pseudo" className="block text-lg mb-4">
                    {isConnected ? 'Modifiez votre pseudo :' : 'Entrez votre pseudo : '}
                    <span className={pseudo.length > 16 ? "text-red-500" : "text-green-500"}>{" "+pseudo.length}</span>/16
                </label>
                <input
                    type="text"
                    id="pseudo"
                    value={pseudo}
                    onChange={(e) => setPseudo(e.target.value)}
                    className="w-full p-3 bg-black text-white border border-gray-500 rounded-lg mb-6"
                />
                {error && <p className="text-red-500 mb-4 text-center">{error}</p>}

                <_skin onSkinSelect={handleSkinSelect}/>

                <Button
                    label="Enregistrer"
                    onClick={handleSavePseudo}
                    className="w-full bg-black text-green-500 border-green-500"
                />
            </div>
            {pseudo === "Pâris est le plus beau, le plus fort, et le plus intelligent !!!" && (
            <div className="absolute w-full h-full flex justify-center items-center" >
                <img src="trollFace.png" onClick={() => setPseudo("Easter Egg")} />
            </div>
            )}
        </div>
    );
}