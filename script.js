const GROUPS = {
    lower:   'abcdefghijklmnopqrstuvwxyz',
    upper:   'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    digit:   '0123456789',
    special: '!@#&()',
};
const CHARSET = GROUPS.lower + GROUPS.upper + GROUPS.digit + GROUPS.special;
const OUT_LEN  = 8;

// MurmurHash3-inspired 32-bit integer hash (fmix32 finalizer chain)
function hash32(str, seed = 0) {
    let h = seed >>> 0;
    for (let i = 0; i < str.length; i++) {
    let c = str.charCodeAt(i);
    h = Math.imul(h ^ c, 0x9e3779b9 | 0);
    h = ((h << 13) | (h >>> 19)) ^ (h >>> 7);
    }
    h ^= h >>> 16;
    h  = Math.imul(h, 0x85ebca6b | 0);
    h ^= h >>> 13;
    h  = Math.imul(h, 0xc2b2ae35 | 0);
    h ^= h >>> 16;
    return h >>> 0;
}

// Deterministic Fisher-Yates shuffle driven by a seed
function deterministicShuffle(arr, seed) {
    const a = arr.slice();
    let s = seed >>> 0;
    for (let i = a.length - 1; i > 0; i--) {
    // LCG step
    s = Math.imul(s, 0x6c62272e) + 0x38b4a4b3 >>> 0;
    const j = s % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function combineHash(a, b, c) {
    const h1 = hash32(a, 0x1a2b3c4d);
    const h2 = hash32(b, 0x5e6f7081);
    const h3 = hash32(c, 0x9a0b1c2d);

    // Generate 8 independent hash values
    const raw = [
    hash32(a + '\0' + b, h3),
    hash32(b + '\0' + c, h1),
    hash32(c + '\0' + a, h2),
    hash32(a + b + c,    h1 ^ h2 ^ h3),
    hash32(c + b + a,    h2 ^ h3),
    hash32(b + a + c,    h1 ^ h3),
    hash32(a + c,        h2),
    hash32(b + c + a,    h1),
    ];

    // Build the 8-char array: 4 guaranteed (one per group) + 4 free from full charset
    const guaranteed = [
    GROUPS.lower  [ raw[0] % GROUPS.lower.length ],
    GROUPS.upper  [ raw[1] % GROUPS.upper.length ],
    GROUPS.digit  [ raw[2] % GROUPS.digit.length ],
    GROUPS.special[ raw[3] % GROUPS.special.length ],
    ];
    const free = raw.slice(4).map(v => CHARSET[v % CHARSET.length]);

    // Shuffle the combined 8 chars deterministically (no randomness)
    const shuffled = deterministicShuffle([...guaranteed, ...free], h1 ^ h2 ^ h3);
    return shuffled.join('');
}

const s1 = document.getElementById('s1');
const s2 = document.getElementById('s2');
const s3 = document.getElementById('s3');
const out = document.getElementById('hashOut');
const copyBtn = document.getElementById('copyBtn');

function update() {
    const a = s1.value, b = s2.value, c = s3.value;
    if (!a && !b && !c) {
    out.textContent = '——————————';
    out.classList.add('empty');
    return;
    }
    out.classList.remove('empty');
    out.textContent = combineHash(a, b, c);
}

[s1, s2, s3].forEach(el => el.addEventListener('input', update));

copyBtn.addEventListener('click', () => {
    const hash = out.textContent;
    if (!hash || out.classList.contains('empty')) return;
    navigator.clipboard.writeText(hash).then(() => {
    copyBtn.textContent = 'Copied!';
    copyBtn.classList.add('copied');
    setTimeout(() => {
        copyBtn.textContent = 'Copy';
        copyBtn.classList.remove('copied');
    }, 1500);
    });
});