import { User, Achievement, Deck, LeaderboardEntry, Card } from './types';

export const MOCK_USER: User = {
  id: 'u1',
  name: 'Ion Marinescu',
  level: 5,
  currentXP: 2340,
  nextLevelXP: 3000,
  totalXP: 2340,
  streak: 12,
  longestStreak: 15,
  totalTimeSpent: 510, // 8.5 hours
  totalCardsLearned: 247,
  totalDecksCompleted: 3,
  totalCorrectAnswers: 195,
  totalAnswers: 247,
};

export const MOCK_ACHIEVEMENTS: Achievement[] = [
  {
    id: 'a1',
    title: 'Primul Pas',
    description: 'Completat primul deck',
    icon: 'target',
    xpReward: 50,
    unlocked: true,
    color: 'bg-yellow-100 text-yellow-600',
  },
  {
    id: 'a2',
    title: 'Stea Strălucitoare',
    description: '5 zile consecutive',
    icon: 'star',
    xpReward: 100,
    unlocked: true,
    color: 'bg-blue-100 text-blue-600',
  },
  {
    id: 'a3',
    title: 'Rapid ca Fulgerul',
    description: '10 carduri în 1 minut',
    icon: 'zap',
    xpReward: 75,
    unlocked: true,
    color: 'bg-purple-100 text-purple-600',
  },
  {
    id: 'a4',
    title: 'Bibliotecar',
    description: 'Creat 3 deck-uri',
    icon: 'library',
    xpReward: 60,
    unlocked: true,
    color: 'bg-green-100 text-green-600',
  },
  {
    id: 'a5',
    title: 'Flacără Vie',
    description: 'Streak de 7 zile',
    icon: 'flame',
    xpReward: 150,
    unlocked: false,
    color: 'bg-orange-100 text-orange-600',
  },
  {
    id: 'a6',
    title: 'Diamant',
    description: '100 carduri memorate',
    icon: 'diamond',
    xpReward: 200,
    unlocked: false,
    color: 'bg-indigo-100 text-indigo-600',
  },
];

// Helper to create standard cards easily (Updated to accept context)
const createCards = (items: { front: string; back: string; context: string }[]): Card[] => {
  return items.map((item, index) => ({
    id: `c-${index}`,
    front: item.front,
    back: item.back,
    context: item.context,
    type: 'standard',
    status: 'new',
  }));
};

// Data structure: Front, Back, Context Sentence
const sinonimeData = [
  {
    front: 'Abilitate',
    back: 'Pricepere, iscusință, îndemânare',
    context: 'Ionel a demonstrat o abilitate rară în rezolvarea problemelor de matematică.',
  },
  {
    front: 'A aboli',
    back: 'A desființa, a anula',
    context: 'Guvernul a decis să abolească legea veche din cauza protestelor.',
  },
  {
    front: 'Aborigen',
    back: 'Băștinaș, autohton, indigen',
    context: 'Populația aborigenă din Australia are o cultură fascinantă.',
  },
  {
    front: 'Absurd',
    back: 'Ilogic, aberant, irațional',
    context: 'Este complet absurd să crezi că poți zbura fără echipament.',
  },
  {
    front: 'Abundență',
    back: 'Belșug, bogăție, prisos',
    context: 'În piață am găsit o abundență de fructe și legume proaspete.',
  },
  {
    front: 'Acesibil',
    back: 'La îndemână, abordabil',
    context: 'Prețul biletului a fost accesibil pentru toți studenții.',
  },
  {
    front: 'A aclama',
    back: 'A ovaționa, a aplauda',
    context: 'Mulțimea a început să aclame câștigătorul maratonului.',
  },
  {
    front: 'Acuzație',
    back: 'Învinovățire, incriminare',
    context: 'Avocatul a respins orice acuzație adusă clientului său.',
  },
  {
    front: 'Adversar',
    back: 'Rival, oponent, dușman',
    context: 'Pe terenul de fotbal, el este un adversar redutabil.',
  },
  {
    front: 'Afabil',
    back: 'Primitor, binevoitor, cordial',
    context: 'Gazda noastră a fost extrem de afabilă și ne-a făcut să ne simțim ca acasă.',
  },
  {
    front: 'Aferim',
    back: 'Bravo, excelent (arhaism)',
    context: 'Aferim, boierule, ai judecat drept!',
  },
  {
    front: 'Agale',
    back: 'Încet, lent, domol',
    context: 'Bătrânul mergea agale pe aleea parcului.',
  },
  {
    front: 'Agerime',
    back: 'Iscusință, vioiciune, perspicacitate',
    context: 'Vulturul este cunoscut pentru agerimea privirii sale.',
  },
  {
    front: 'Agasant',
    back: 'Supărător, enervant, plictisitor',
    context: 'Uneori poți fi foarte agasant cu solicitările tale repetate.',
  },
  {
    front: 'Aliterație',
    back: 'Repetiție a unui sunet (figură de stil)',
    context: 'Versul "Vâjâind ca vijelia" conține o aliterație expresivă.',
  },
  {
    front: 'A amâna',
    back: 'A păsui, a temporiza, a prelungi',
    context: 'Din cauza ploii, arbitrul a decis să amâne meciul.',
  },
  {
    front: 'Amurg',
    back: 'Înserare, crepuscul',
    context: 'Cerul s-a colorat în nuanțe roșiatice la amurg.',
  },
  {
    front: 'Anost',
    back: 'Plictisitor, searbăd, monoton',
    context: 'Filmul a fost atât de anost încât mulți spectatori au adormit.',
  },
  {
    front: 'Apogeu',
    back: 'Culme, vârf, punct maxim',
    context: 'Cariera sa a atins apogeul odată cu câștigarea premiului Nobel.',
  },
  {
    front: 'Arbitrar',
    back: 'După bunul plac, subiectiv, întâmplător',
    context: 'Decizia judecătorului a părut arbitrară și nejustificată.',
  },
  {
    front: 'Arșiță',
    back: 'Căldură mare, caniculă, zăpușeală',
    context: 'Florile s-au ofilit din cauza arșiței cumplite din timpul verii.',
  },
  {
    front: 'A asupri',
    back: 'A oprima, a chinui, a prigoni',
    context: 'Dictatorul a încercat să asuprească poporul prin legi dure.',
  },
  {
    front: 'Audacitate',
    back: 'Îndrăzneală, curaj, temeraritate',
    context: 'Planul său a fost de o audacitate rar întâlnită.',
  },
  {
    front: 'Autentic',
    back: 'Veritabil, genuin, original',
    context: 'Tabloul descoperit în pod s-a dovedit a fi un Rembrandt autentic.',
  },
  {
    front: 'Avar',
    back: 'Zgârcit, calic',
    context: 'Personajul Hagi Tudose este tipologia omului avar.',
  },
  {
    front: 'Axa',
    back: 'Linie, direcție, pivot',
    context: 'Pământul se rotește în jurul propriei sale axe.',
  },
  {
    front: 'Bahic',
    back: 'Referitor la vin/petrecere (dionisiac)',
    context: 'Atmosfera bahică de la petrecere a durat până în zori.',
  },
  {
    front: 'Banal',
    back: 'Obișnuit, comun, trivial',
    context: 'A făcut o greșeală banală de calcul.',
  },
  {
    front: 'Beatitudine',
    back: 'Fericire deplină, extaz',
    context: 'O stare de beatitudine l-a cuprins când a văzut marea.',
  },
  {
    front: 'Belicos',
    back: 'Războinic, agresiv',
    context: 'Atitudinea sa belicoasă a stârnit un conflict.',
  },
  {
    front: 'Blamabil',
    back: 'Condamnabil, rușinos',
    context: 'Fapta sa este blamabilă și nu poate fi scuzată.',
  },
  {
    front: 'Bonitate',
    back: 'Solvabilitate, cinste',
    context: 'Banca a verificat bonitatea clientului înainte de a acorda creditul.',
  },
  {
    front: 'Candoare',
    back: 'Nevinovăție, puritate, ingenuitate',
    context: 'Răspunsul copilului a fost plin de o candoare dezarmantă.',
  },
  {
    front: 'Caznă',
    back: 'Chinuială, trudă, muncă grea',
    context: 'Rezolvarea problemei a fost o adevărată caznă pentru elevi.',
  },
  {
    front: 'Celebru',
    back: 'Faimos, renumit, ilustru',
    context: 'Actorul a devenit celebru după primul său film.',
  },
  {
    front: 'Cerbicie',
    back: 'Încăpățânare, îndărătnicie',
    context: 'Și-a susținut punctul de vedere cu o cerbicie de neînțeles.',
  },
  {
    front: 'Chibzuință',
    back: 'Înțelepciune, prudență, socoteală',
    context: 'Trebuie să acționezi cu chibzuință în situații dificile.',
  },
  {
    front: 'Clement',
    back: 'Iertător, milos, indulgent',
    context: 'Judecătorul a fost clement având în vedere vârsta inculpatului.',
  },
  {
    front: 'Colosal',
    back: 'Uriaș, imens, grandios',
    context: 'Efortul depus pentru construcția piramidelor a fost colosal.',
  },
  {
    front: 'Concis',
    back: 'Scurt, succint, rezumativ',
    context: 'Te rog să fii concis și să treci direct la subiect.',
  },
  {
    front: 'Dârz',
    back: 'Curajos, hotărât, neînfricat',
    context: 'Soldatul a rămas dârz în fața inamicului.',
  },
  {
    front: 'Defăimare',
    back: 'Bârfă, calomnie, denigrare',
    context: 'Campania de defăimare i-a afectat reputația.',
  },
  {
    front: 'Deliciu',
    back: 'Plăcere, desfătare',
    context: 'Prăjitura pregătită de bunica a fost un deliciu.',
  },
  {
    front: 'Desuet',
    back: 'Învechit, demodat',
    context: 'Expresia folosită este considerată desuetă în limba modernă.',
  },
  {
    front: 'Destoinic',
    back: 'Vrednic, capabil, priceput',
    context: 'El este un meșter destoinic, repară orice.',
  },
  {
    front: 'Diurn',
    back: 'De zi (opusul lui nocturn)',
    context: 'Bufnița nu este o pasăre diurnă, ci nocturnă.',
  },
  {
    front: 'Divagație',
    back: 'Abatere, îndepărtare de la subiect',
    context: 'Discursul său a fost plin de divagații inutile.',
  },
  {
    front: 'Eocen',
    back: 'Vechi (geologic), timpuriu',
    context: 'Fosilele descoperite datează din perioada Eocen.',
  },
  {
    front: 'Elocvent',
    back: 'Grăitor, expresiv, convingător',
    context: 'Tăcerea lui a fost mai elocventă decât orice cuvânt.',
  },
  {
    front: 'Eterogen',
    back: 'Variat, amestecat, neomogen',
    context: 'Grupul de turiști era foarte eterogen, venind din toate colțurile lumii.',
  },
];

export const MOCK_DECKS: (Deck & {
  ownerId: string;
  isPublic: boolean;
  tags: string[];
  createdAt: string;
  updatedAt: string;
})[] = [
  {
    id: 'd1',
    title: 'Sinonime Esențiale',
    subject: 'Limba Română',
    topic: 'Vocabular',
    difficulty: 'B2',
    totalCards: 50,
    masteredCards: 12,
    lastStudied: '2023-10-27T10:00:00Z',
    cards: createCards(sinonimeData),
    ownerId: 'guest',
    isPublic: false,
    tags: [],
    createdAt: '2023-10-01T10:00:00Z',
    updatedAt: '2023-10-27T10:00:00Z',
  },
  {
    id: 'd2',
    title: 'Ecuații de gradul 2',
    subject: 'Matematică',
    topic: 'Algebră',
    difficulty: 'C1',
    totalCards: 0,
    masteredCards: 0,
    cards: [],
    ownerId: 'guest',
    isPublic: false,
    tags: [],
    createdAt: '2023-10-01T10:00:00Z',
    updatedAt: '2023-10-01T10:00:00Z',
  },
  {
    id: 'd3',
    title: 'Revoluția de la 1848',
    subject: 'Istorie',
    topic: 'Epoca Modernă',
    difficulty: 'B2',
    totalCards: 0,
    masteredCards: 0,
    cards: [],
    ownerId: 'guest',
    isPublic: false,
    tags: [],
    createdAt: '2023-10-01T10:00:00Z',
    updatedAt: '2023-10-01T10:00:00Z',
  },
];

// Demo deck for visitors (only Sinonime)
export const DEMO_DECK = MOCK_DECKS[0]; // Sinonime Esențiale
export const VISITOR_DECKS = [DEMO_DECK];

// Visitor achievements (all locked for demo purposes)
export const VISITOR_ACHIEVEMENTS: Achievement[] = MOCK_ACHIEVEMENTS.map(achievement => ({
  ...achievement,
  unlocked: false,
}));

export const LEADERBOARD_DATA: LeaderboardEntry[] = [
  {
    id: 'l1',
    position: 1,
    name: 'Ana Mihăilescu',
    level: 12,
    xpTotal: 8945,
    streak: 45,
    isCurrentUser: false,
  },
  {
    id: 'l2',
    position: 2,
    name: 'Dan Costache',
    level: 11,
    xpTotal: 8120,
    streak: 32,
    isCurrentUser: false,
  },
  {
    id: 'l3',
    position: 3,
    name: 'Elena Popescu',
    level: 10,
    xpTotal: 7850,
    streak: 28,
    isCurrentUser: false,
  },
  {
    id: 'l4',
    position: 4,
    name: 'Mihai Georgescu',
    level: 9,
    xpTotal: 6920,
    streak: 21,
    isCurrentUser: false,
  },
  {
    id: 'l5',
    position: 5,
    name: 'Sofia Constantin',
    level: 9,
    xpTotal: 6540,
    streak: 15,
    isCurrentUser: false,
  },
  {
    id: 'l6',
    position: 247,
    name: 'Ion Marinescu',
    level: 5,
    xpTotal: 2340,
    streak: 12,
    isCurrentUser: true,
  },
];

export const WEEKLY_DATA = [
  { name: 'L', cards: 25, time: 30 },
  { name: 'M', cards: 32, time: 45 },
  { name: 'M', cards: 28, time: 40 },
  { name: 'J', cards: 45, time: 60 },
  { name: 'V', cards: 40, time: 55 },
  { name: 'S', cards: 55, time: 80 },
  { name: 'D', cards: 50, time: 75 },
];
