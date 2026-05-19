import type { Question } from '@/lib/types';
import { makeMcq } from '@/lib/competitive-exam/question-factory';
import type { PlacementDepartment } from '@/lib/placement/types';

type CuratedMcq = {
  q: string;
  options: [string, string, string, string];
  correct: 'A' | 'B' | 'C' | 'D';
  difficulty?: 'easy' | 'medium' | 'hard';
  explanation?: string;
};

function toQuestions(idPrefix: string, topicSlug: string, items: CuratedMcq[]): Question[] {
  return items.map((it, i) =>
    makeMcq({
      id: `${idPrefix}-${i + 1}`,
      topicSlug,
      difficulty: it.difficulty ?? 'medium',
      question_text: it.q,
      options: it.options,
      correctLetter: it.correct,
      explanation: it.explanation ?? null,
    }),
  );
}

const CSE: CuratedMcq[] = [
  {
    q: 'What is the worst-case time complexity of binary search on a sorted array of N elements?',
    options: ['O(N)', 'O(log N)', 'O(N log N)', 'O(1)'],
    correct: 'B',
  },
  {
    q: 'Which data structure follows LIFO order?',
    options: ['Queue', 'Stack', 'Heap', 'Linked list'],
    correct: 'B',
  },
  {
    q: 'In SQL, which keyword removes duplicate rows from a result set?',
    options: ['UNIQUE', 'DISTINCT', 'DEDUPE', 'FILTER'],
    correct: 'B',
  },
  {
    q: 'TCP belongs to which layer of the OSI model?',
    options: ['Network', 'Transport', 'Session', 'Data link'],
    correct: 'B',
  },
  {
    q: 'A page fault in an OS occurs when:',
    options: [
      'A program writes to read-only memory',
      'A referenced page is not in main memory',
      'The CPU is interrupted by I/O',
      'The scheduler swaps processes',
    ],
    correct: 'B',
  },
  {
    q: 'Which of the following is NOT a NoSQL database?',
    options: ['MongoDB', 'Cassandra', 'Redis', 'PostgreSQL'],
    correct: 'D',
  },
  {
    q: 'Scenario: A REST API returns 401. The client should usually:',
    options: [
      'Retry indefinitely',
      'Refresh credentials and try again',
      'Switch protocols',
      'Cache the response',
    ],
    correct: 'B',
  },
  {
    q: 'Which sorting algorithm is stable and has O(N log N) worst case?',
    options: ['Quick sort', 'Heap sort', 'Merge sort', 'Selection sort'],
    correct: 'C',
  },
  {
    q: 'In Git, which command stages all modified files?',
    options: ['git status', 'git stash', 'git add -A', 'git push -A'],
    correct: 'C',
  },
  {
    q: 'A balanced BST with N nodes has height of approximately:',
    options: ['O(N)', 'O(N/2)', 'O(log N)', 'O(N²)'],
    correct: 'C',
  },
  {
    q: 'Which HTTP method should be used to create a new resource?',
    options: ['GET', 'PUT', 'POST', 'OPTIONS'],
    correct: 'C',
  },
  {
    q: 'Deadlock requires which set of conditions to hold simultaneously?',
    options: [
      'Mutex, paging, swapping, segmentation',
      'Mutual exclusion, hold and wait, no preemption, circular wait',
      'Locking, polling, caching, retries',
      'TCP, UDP, IP, ICMP',
    ],
    correct: 'B',
  },
  {
    q: 'Which is true about TCP and UDP?',
    options: [
      'TCP is connectionless, UDP is connection-oriented',
      'TCP guarantees ordering, UDP does not',
      'UDP has flow control, TCP does not',
      'Both use the same handshake',
    ],
    correct: 'B',
  },
  {
    q: 'A hash table with N keys and load factor α has expected lookup time:',
    options: ['O(N)', 'O(log N)', 'O(1 + α)', 'O(N²)'],
    correct: 'C',
  },
  {
    q: 'Which design pattern keeps a single instance of a class?',
    options: ['Factory', 'Singleton', 'Decorator', 'Observer'],
    correct: 'B',
  },
];

const ECE: CuratedMcq[] = [
  {
    q: 'The unit of electric current is:',
    options: ['Volt', 'Ohm', 'Ampere', 'Watt'],
    correct: 'C',
  },
  {
    q: 'A diode primarily allows current to flow in:',
    options: ['Both directions', 'One direction only', 'Pulsed mode only', 'AC only'],
    correct: 'B',
  },
  {
    q: 'Operational amplifier in inverting mode gives voltage gain of:',
    options: ['1 + Rf/Rin', '-Rf/Rin', 'Rin/Rf', '1'],
    correct: 'B',
  },
  {
    q: 'In an N-channel MOSFET, conduction is by:',
    options: ['Holes', 'Electrons', 'Both equally', 'Photons'],
    correct: 'B',
  },
  {
    q: 'Bandwidth of an AM signal with modulating frequency fm is:',
    options: ['fm', '2 × fm', 'fm/2', '4 × fm'],
    correct: 'B',
  },
  {
    q: 'Which gate output is HIGH only when both inputs are HIGH?',
    options: ['OR', 'AND', 'XOR', 'NAND'],
    correct: 'B',
  },
  {
    q: 'A Schottky diode is preferred over a normal silicon diode because:',
    options: [
      'Higher forward drop',
      'Lower forward drop, faster switching',
      'Higher reverse leakage',
      'It blocks AC',
    ],
    correct: 'B',
  },
  {
    q: 'Which modulation is most robust against amplitude noise?',
    options: ['AM', 'FM', 'DSB-SC', 'SSB'],
    correct: 'B',
  },
  {
    q: 'The 2’s complement of binary 0110 (4-bit) is:',
    options: ['1001', '1010', '1100', '0101'],
    correct: 'B',
  },
  {
    q: 'A microcontroller differs from a microprocessor mainly because it:',
    options: [
      'Has higher clock speed',
      'Integrates CPU, memory, and I/O on a single chip',
      'Only runs Linux',
      'Requires no power',
    ],
    correct: 'B',
  },
  {
    q: 'Which filter passes only signals above a chosen cutoff frequency?',
    options: ['Low-pass', 'High-pass', 'Band-stop', 'Notch'],
    correct: 'B',
  },
  {
    q: 'Resolution of an N-bit ADC over range V is:',
    options: ['V × N', 'V / N', 'V / 2^N', '2^N / V'],
    correct: 'C',
  },
];

const CYBER: CuratedMcq[] = [
  {
    q: 'SQL injection primarily targets:',
    options: [
      'Network routers',
      'Database queries built from untrusted input',
      'CSS files',
      'Compiler optimisations',
    ],
    correct: 'B',
  },
  {
    q: 'Which cryptographic property guarantees that ciphertext cannot reveal anything about plaintext beyond its length?',
    options: ['Authentication', 'Confidentiality', 'Integrity', 'Non-repudiation'],
    correct: 'B',
  },
  {
    q: 'A man-in-the-middle attack is best mitigated by:',
    options: [
      'Stronger passwords',
      'Mutual TLS / certificate pinning',
      'Hashing the URL',
      'Larger packet sizes',
    ],
    correct: 'B',
  },
  {
    q: 'OWASP A01:2021 is:',
    options: ['Broken access control', 'XSS', 'Insecure design', 'Path traversal'],
    correct: 'A',
  },
  {
    q: 'A salt is used in password storage to:',
    options: [
      'Slow down legitimate users',
      'Defeat precomputed rainbow tables',
      'Encrypt the database',
      'Replace bcrypt',
    ],
    correct: 'B',
  },
  {
    q: 'CSRF protects against:',
    options: [
      'Insecure direct object references',
      'Unintended state-changing requests on a logged-in user',
      'Network sniffing',
      'Buffer overflows',
    ],
    correct: 'B',
  },
  {
    q: 'Which of the following is a symmetric cipher?',
    options: ['RSA', 'ECC', 'AES', 'Diffie-Hellman'],
    correct: 'C',
  },
  {
    q: 'A SIEM is primarily used for:',
    options: ['Encrypting backups', 'Centralised log analytics & alerting', 'Frontend testing', 'Hardware monitoring'],
    correct: 'B',
  },
  {
    q: 'A zero-day vulnerability means:',
    options: [
      'A bug fixed within zero days',
      'A vulnerability with no available patch at disclosure time',
      'A vulnerability in zero-trust networks',
      'A configuration error',
    ],
    correct: 'B',
  },
  {
    q: 'Two-factor authentication is strongest when factors come from:',
    options: [
      'Two passwords',
      'Different categories (something you know, have, are)',
      'Two devices with the same OTP',
      'Two browsers',
    ],
    correct: 'B',
  },
  {
    q: 'Scenario: A user reports their session "follows" them across origins. Most likely:',
    options: [
      'Browser cache',
      'Improperly scoped cookies (no SameSite)',
      'CDN compression',
      'Hardware fault',
    ],
    correct: 'B',
  },
  {
    q: 'Hashing differs from encryption because:',
    options: [
      'Hashing is reversible',
      'Encryption is irreversible',
      'Hashing is one-way; encryption is reversible with a key',
      'Both are reversible',
    ],
    correct: 'C',
  },
];

const AIML: CuratedMcq[] = [
  {
    q: 'Overfitting in a machine-learning model means the model:',
    options: [
      'Generalises well to unseen data',
      'Memorises training data but performs poorly on test data',
      'Has too few parameters',
      'Cannot learn nonlinear patterns',
    ],
    correct: 'B',
  },
  {
    q: 'Which loss is typical for binary classification with logits?',
    options: ['MSE', 'Hinge', 'Binary cross-entropy', 'KL divergence'],
    correct: 'C',
  },
  {
    q: 'A high-bias model usually has:',
    options: ['High variance', 'Underfit predictions', 'Perfect training accuracy', 'Random outputs'],
    correct: 'B',
  },
  {
    q: 'In gradient descent, the learning rate controls:',
    options: ['Number of features', 'Step size per update', 'Number of epochs', 'Output dimension'],
    correct: 'B',
  },
  {
    q: 'Which technique reduces overfitting in neural networks?',
    options: ['Larger learning rate', 'Dropout', 'Removing batch norm', 'Disabling shuffling'],
    correct: 'B',
  },
  {
    q: 'PCA is most useful for:',
    options: ['Classification', 'Dimensionality reduction', 'Generation', 'Reinforcement learning'],
    correct: 'B',
  },
  {
    q: 'A confusion matrix\'s precision is defined as:',
    options: ['TP / (TP + FN)', 'TP / (TP + FP)', 'TN / (TN + FP)', '(TP + TN) / Total'],
    correct: 'B',
  },
  {
    q: 'Scenario: Training loss keeps falling but validation loss starts rising. You should:',
    options: ['Reduce regularisation', 'Train longer', 'Apply early stopping / regularisation', 'Lower batch size to 1'],
    correct: 'C',
  },
  {
    q: 'Which activation function is most commonly used in hidden layers of modern CNNs?',
    options: ['Sigmoid', 'Tanh', 'ReLU', 'Softmax'],
    correct: 'C',
  },
  {
    q: 'The softmax function is typically used to:',
    options: ['Normalise inputs', 'Convert logits to a probability distribution', 'Clip gradients', 'Speed up training'],
    correct: 'B',
  },
  {
    q: 'In NLP, a transformer\'s self-attention computes attention over:',
    options: ['Only the previous token', 'Only the next token', 'All tokens in the sequence', 'Random tokens'],
    correct: 'C',
  },
  {
    q: 'k-means is sensitive to:',
    options: ['Centroid initialisation', 'Number of GPUs', 'Activation function', 'Optimiser choice'],
    correct: 'A',
  },
];

const MECH: CuratedMcq[] = [
  {
    q: 'The first law of thermodynamics states:',
    options: [
      'Heat flows from cold to hot spontaneously',
      'Energy cannot be created or destroyed, only transformed',
      'Entropy always decreases',
      'Pressure equals force per area',
    ],
    correct: 'B',
  },
  {
    q: 'In a Carnot cycle, efficiency depends only on:',
    options: ['Working fluid', 'Compression ratio', 'Source and sink temperatures', 'Mass of fluid'],
    correct: 'C',
  },
  {
    q: 'Stress is defined as:',
    options: ['Force / area', 'Mass × acceleration', 'Strain × modulus²', 'Work / time'],
    correct: 'A',
  },
  {
    q: 'A four-stroke petrol engine fires the spark plug during:',
    options: ['Intake stroke', 'Compression stroke (near TDC)', 'Power stroke (mid)', 'Exhaust stroke'],
    correct: 'B',
  },
  {
    q: 'Which welding process uses a consumable wire shielded by inert gas?',
    options: ['TIG', 'MIG/MAG', 'Stick (SMAW)', 'Resistance spot'],
    correct: 'B',
  },
  {
    q: 'Reynolds number is the ratio of:',
    options: ['Pressure to density', 'Inertial to viscous forces', 'Heat to mass', 'Speed to sound'],
    correct: 'B',
  },
  {
    q: 'Hardness of steel is best measured by:',
    options: ['Charpy test', 'Brinell / Rockwell', 'Fatigue test', 'Creep test'],
    correct: 'B',
  },
  {
    q: 'Module of a spur gear is:',
    options: ['π × diameter', 'Pitch circle diameter / number of teeth', 'Number of teeth × pitch', 'Diameter × pitch'],
    correct: 'B',
  },
  {
    q: 'A truss is best for carrying:',
    options: ['Bending moments', 'Axial forces in its members', 'Hydraulic pressure', 'Shear loads'],
    correct: 'B',
  },
  {
    q: 'Which is NOT a non-destructive test?',
    options: ['Ultrasonic', 'Dye penetrant', 'Radiography', 'Tensile test'],
    correct: 'D',
  },
  {
    q: 'Refrigeration effect of an air-conditioner is measured in:',
    options: ['Pascals', 'kW or tons of refrigeration', 'Joules per kelvin', 'kg/m³'],
    correct: 'B',
  },
];

const CIVIL: CuratedMcq[] = [
  {
    q: 'The minimum grade of concrete recommended for RCC by IS 456 is:',
    options: ['M10', 'M15', 'M20', 'M30'],
    correct: 'C',
  },
  {
    q: 'A simply supported beam carries a UDL. Maximum bending moment is at:',
    options: ['Supports', 'Mid-span', 'Quarter points', 'Free end'],
    correct: 'B',
  },
  {
    q: 'Plasticity index of a soil =',
    options: [
      'Liquid limit + plastic limit',
      'Liquid limit − plastic limit',
      'Plastic limit / liquid limit',
      'Shrinkage limit × 2',
    ],
    correct: 'B',
  },
  {
    q: 'The unit of bending stress is:',
    options: ['kN', 'N/mm²', 'mm³', 'm/s²'],
    correct: 'B',
  },
  {
    q: 'Slump cone test measures:',
    options: ['Compressive strength', 'Workability of fresh concrete', 'Curing time', 'Tensile strength'],
    correct: 'B',
  },
  {
    q: 'For a beam, shear force diagram changes sign where:',
    options: ['Beam ends', 'Bending moment is maximum', 'Reaction equals applied load below it', 'Always at supports'],
    correct: 'B',
  },
  {
    q: 'Bearing capacity of soil is highest for:',
    options: ['Loose sand', 'Saturated clay', 'Dense gravel / hard rock', 'Peat'],
    correct: 'C',
  },
  {
    q: 'A retaining wall fails primarily by:',
    options: ['Wind suction', 'Sliding, overturning, or bearing failure', 'Earthquake only', 'Material shrinkage'],
    correct: 'B',
  },
  {
    q: 'Setting time of OPC is checked using:',
    options: ['Slump cone', 'Le Chatelier', 'Vicat apparatus', 'Marsh cone'],
    correct: 'C',
  },
  {
    q: 'Chain surveying is suitable for:',
    options: ['Hilly large terrain', 'Small, fairly level areas', 'Underwater', 'Wind-loaded structures'],
    correct: 'B',
  },
  {
    q: 'Permissible BoD of treated sewage discharged to inland surface waters (Indian norms) is typically:',
    options: ['≤ 30 mg/L', '≤ 5 mg/L', '≤ 100 mg/L', '≤ 250 mg/L'],
    correct: 'A',
  },
];

const GENERIC: CuratedMcq[] = [
  {
    q: 'A spreadsheet formula starting with "=" usually represents:',
    options: ['Text', 'A computed value', 'A comment', 'Encryption'],
    correct: 'B',
  },
  {
    q: 'Which is the binary representation of decimal 10?',
    options: ['1100', '1010', '1110', '1001'],
    correct: 'B',
  },
  {
    q: 'In a project meeting, who is best placed to flag a scope risk?',
    options: ['Anyone closest to the risk', 'Only the manager', 'Only the client', 'Only the QA team'],
    correct: 'A',
  },
  {
    q: 'Which is a renewable source of energy?',
    options: ['Coal', 'Solar', 'Diesel', 'Natural gas'],
    correct: 'B',
  },
  {
    q: 'In SI units, force is measured in:',
    options: ['Pascals', 'Newtons', 'Joules', 'Watts'],
    correct: 'B',
  },
  {
    q: 'You receive an email asking you to "verify" your bank password via a link. You should:',
    options: ['Click and verify', 'Forward it to colleagues', 'Verify only on the official app/site', 'Reply with the OTP'],
    correct: 'C',
  },
  {
    q: 'Real-world: a team disagrees on a design. Best first step is to:',
    options: [
      'Vote and move on',
      'Surface the underlying constraints and trade-offs',
      'Escalate immediately',
      'Pick the senior person\'s view',
    ],
    correct: 'B',
  },
  {
    q: 'Which is the best representation of "x is more than 10"?',
    options: ['x ≥ 10', 'x > 10', 'x < 10', 'x ≤ 10'],
    correct: 'B',
  },
  {
    q: 'Which is the fastest in CPU memory hierarchy?',
    options: ['HDD', 'Main memory', 'L1 cache', 'Tape'],
    correct: 'C',
  },
  {
    q: 'A standard PDF can be:',
    options: ['Edited only by Adobe', 'Read on any modern device', 'Run as executable code', 'Encrypted only with passwords longer than 12 characters'],
    correct: 'B',
  },
];

export function technicalBankForDepartment(dept: PlacementDepartment): Question[] {
  switch (dept.technicalCategory) {
    case 'cse':
      return [
        ...toQuestions('cse', 'placement-tech-cse', CSE),
        ...toQuestions('csex', 'placement-tech-cse-mix', GENERIC.slice(0, 5)),
      ];
    case 'ece':
      return [
        ...toQuestions('ece', 'placement-tech-ece', ECE),
        ...toQuestions('ecex', 'placement-tech-ece-mix', GENERIC.slice(0, 5)),
      ];
    case 'cyber':
      return [
        ...toQuestions('cyber', 'placement-tech-cyber', CYBER),
        ...toQuestions('cyberx', 'placement-tech-cyber-mix', CSE.slice(0, 5)),
      ];
    case 'aiml':
      return [
        ...toQuestions('aiml', 'placement-tech-aiml', AIML),
        ...toQuestions('aimlx', 'placement-tech-aiml-mix', CSE.slice(0, 5)),
      ];
    case 'mechanical':
      return [
        ...toQuestions('mech', 'placement-tech-mech', MECH),
        ...toQuestions('mechx', 'placement-tech-mech-mix', GENERIC.slice(0, 5)),
      ];
    case 'civil':
      return [
        ...toQuestions('civil', 'placement-tech-civil', CIVIL),
        ...toQuestions('civilx', 'placement-tech-civil-mix', GENERIC.slice(0, 5)),
      ];
    default:
      return toQuestions('gen', 'placement-tech-generic', [...GENERIC, ...CSE.slice(0, 5)]);
  }
}
