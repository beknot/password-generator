/* ─────────────────────────────────────────────────────────────────────────────
   Shared hash utilities
───────────────────────────────────────────────────────────────────────────── */

const GROUPS = {
  lower:   'abcdefghijkmnopqrstuvwxyz',
  upper:   'ABCDEFGHJKLMNPQRSTUVWXYZ',
  digit:   '123456789',
  special: '!@$#&',
};
const CHARSET = GROUPS.lower + GROUPS.upper + GROUPS.digit + GROUPS.special;

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

function deterministicShuffle(arr, seed) {
  const a = arr.slice();
  let s = seed >>> 0;
  for (let i = a.length - 1; i > 0; i--) {
    s = Math.imul(s, 0x6c62272e) + 0x38b4a4b3 >>> 0;
    const j = s % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ─────────────────────────────────────────────────────────────────────────────
   Password tab — 8-char hash
───────────────────────────────────────────────────────────────────────────── */

function combineHash(a, b, c) {
  const h1 = hash32(a, 0x1a2b3c4d);
  const h2 = hash32(b, 0x5e6f7081);
  const h3 = hash32(c, 0x9a0b1c2d);
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
  const guaranteed = [
    GROUPS.lower  [ raw[0] % GROUPS.lower.length ],
    GROUPS.upper  [ raw[1] % GROUPS.upper.length ],
    GROUPS.digit  [ raw[2] % GROUPS.digit.length ],
    GROUPS.special[ raw[3] % GROUPS.special.length ],
  ];
  const free = raw.slice(4).map(v => CHARSET[v % CHARSET.length]);
  return deterministicShuffle([...guaranteed, ...free], h1 ^ h2 ^ h3).join('');
}

/* ─────────────────────────────────────────────────────────────────────────────
   Code tab — 4-digit numeric code
───────────────────────────────────────────────────────────────────────────── */

function combineCode(a, b, c) {
  const h1 = hash32(a, 0xdeadbeef);
  const h2 = hash32(b, 0xcafebabe);
  const h3 = hash32(c, 0xf00dbabe);

  // Four independent hashes, each gives one digit 0–9
  const d0 = hash32(a + '\0' + b + '\0' + c, h1 ^ h2 ^ h3) % 10;
  const d1 = hash32(b + '\0' + c + '\0' + a, h2 ^ h3)       % 10;
  const d2 = hash32(c + '\0' + a + '\0' + b, h1 ^ h3)       % 10;
  const d3 = hash32(a + b + c + a,           h1 ^ h2)        % 10;

  return `${d0}${d1}${d2}${d3}`;
}

/* ─────────────────────────────────────────────────────────────────────────────
   DOM refs
───────────────────────────────────────────────────────────────────────────── */

// Tabs
const tabs      = document.querySelectorAll('.tab');
const panels    = document.querySelectorAll('.panel');
const mainTitle = document.getElementById('mainTitle');
const mainSub   = document.getElementById('mainSubtitle');

// Password panel
const s1          = document.getElementById('s1');
const s2          = document.getElementById('s2');
const s3          = document.getElementById('s3');
const hashOut     = document.getElementById('hashOut');
const copyBtn     = document.getElementById('copyBtn');
const toggleCheck = document.getElementById('toggleCheck');

// Code panel
const c1              = document.getElementById('c1');
const c2              = document.getElementById('c2');
const c3              = document.getElementById('c3');
const codeOut         = document.getElementById('codeOut');
const codeCopyBtn     = document.getElementById('codeCopyBtn');
const codeToggleCheck = document.getElementById('codeToggleCheck');

/* ─────────────────────────────────────────────────────────────────────────────
   Tab switching
───────────────────────────────────────────────────────────────────────────── */

const META = {
  password: { title: 'Password Generator', sub: 'Combines three strings into an 8-character hash' },
  code:     { title: 'Code Generator',     sub: 'Combines three strings into a 4-digit code'      },
};

tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    const target = tab.dataset.tab;

    tabs.forEach(t => t.classList.toggle('active', t === tab));
    panels.forEach(p => p.classList.toggle('hidden', p.id !== `panel-${target}`));

    mainTitle.textContent = META[target].title;
    mainSub.textContent   = META[target].sub;
  });
});

/* ─────────────────────────────────────────────────────────────────────────────
   Password panel logic
───────────────────────────────────────────────────────────────────────────── */

function updatePassword() {
  const a = s1.value, b = s2.value, c = s3.value;
  if (!a && !b && !c) {
    hashOut.textContent = '——————————';
    hashOut.classList.add('empty');
    hashOut.classList.remove('blurred');
    return;
  }
  hashOut.classList.remove('empty');
  hashOut.textContent = combineHash(a, b, c);
  hashOut.classList.toggle('blurred', !toggleCheck.checked);
}

[s1, s2, s3].forEach(el => el.addEventListener('input', updatePassword));

toggleCheck.addEventListener('change', () => {
  if (hashOut.classList.contains('empty')) return;
  hashOut.classList.toggle('blurred', !toggleCheck.checked);
});

copyBtn.addEventListener('click', () => {
  if (hashOut.classList.contains('empty')) return;
  navigator.clipboard.writeText(hashOut.textContent).then(() => {
    copyBtn.textContent = 'Copied!';
    copyBtn.classList.add('copied');
    setTimeout(() => { copyBtn.textContent = 'Copy'; copyBtn.classList.remove('copied'); }, 1500);
  });
});

/* ─────────────────────────────────────────────────────────────────────────────
   Code panel logic
───────────────────────────────────────────────────────────────────────────── */

function updateCode() {
  const a = c1.value, b = c2.value, c = c3.value;
  if (!a && !b && !c) {
    codeOut.textContent = '————';
    codeOut.classList.add('empty');
    codeOut.classList.remove('blurred');
    return;
  }
  codeOut.classList.remove('empty');
  codeOut.textContent = combineCode(a, b, c);
  codeOut.classList.toggle('blurred', !codeToggleCheck.checked);
}

[c1, c2, c3].forEach(el => el.addEventListener('input', updateCode));

codeToggleCheck.addEventListener('change', () => {
  if (codeOut.classList.contains('empty')) return;
  codeOut.classList.toggle('blurred', !codeToggleCheck.checked);
});

codeCopyBtn.addEventListener('click', () => {
  if (codeOut.classList.contains('empty')) return;
  navigator.clipboard.writeText(codeOut.textContent).then(() => {
    codeCopyBtn.textContent = 'Copied!';
    codeCopyBtn.classList.add('copied');
    setTimeout(() => { codeCopyBtn.textContent = 'Copy'; codeCopyBtn.classList.remove('copied'); }, 1500);
  });
});

/* ─────────────────────────────────────────────────────────────────────────────
   Init — both outputs start hidden
───────────────────────────────────────────────────────────────────────────── */

toggleCheck.checked     = false;
codeToggleCheck.checked = false;