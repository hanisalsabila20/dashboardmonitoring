/* ==========================================================================
   Dashboard KPI DSE – MC Mujabeast
   Membutuhkan: data.js (konstanta global D) dimuat lebih dulu
   ========================================================================== */

/* ---------- Helper ---------- */
const $ = s => document.querySelector(s);

// Escape karakter HTML
const E = s =>
  String(s).replace(/[&<>"]/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
  }[c]));

// Format angka (locale Indonesia)
const N = (n, d = 0) =>
  n.toLocaleString('id-ID', { maximumFractionDigits: d, minimumFractionDigits: d });

// Persen
const P = (n, d = 0) => N(n * 100, d) + '%';

// Rupiah dalam juta
const R = n => (n < 0 ? '−' : '') + 'Rp' + N(Math.abs(n) / 1e6, 1) + ' M';

// Juta tanpa "Rp"
const jt = n => N(n / 1e6, 1) + ' M';

// Warna pill berdasarkan ambang 85% dan 50%
const tone = v => (v >= 0.85 ? 'good' : v >= 0.5 ? 'mid' : 'bad');

const pill = (v, d = 0) =>
  v === 0 ? '-' : `<span class="pill ${tone(v)}">${P(v, d)}</span>`;

// Pill berisi angka (teks bebas); warnanya mengikuti persentase pencapaian v
const pillNum = (v, text) =>
  v === 0 ? '-' : `<span class="pill ${tone(v)}">${text}</span>`;

// Jumlah nilai pada key k dari array a
const sum = (a, k) => a.reduce((s, x) => s + (+x[k] || 0), 0);

// Kelas status untuk bar/ring/teks (warnanya diatur di style.css):
// hijau jika >= 50%, merah di bawahnya, teal jika tidak ada data
const fc = v => (v == null ? 'is-teal' : v >= 0.5 ? 'is-good' : 'is-bad');

/* ---------- Tanggal ---------- */
$('#date').textContent =
  'Data per ' +
  new Date(D.date).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });

/* ---------- Tabs ---------- */
const TABS = [
  ['t1', 'p1'],
  ['t2', 'p2'],
];

TABS.forEach(([t, p]) => {
  $('#' + t).onclick = () => {
    TABS.forEach(([a, b]) => {
      $('#' + a).setAttribute('aria-selected', a === t);
      $('#' + b).hidden = b !== p;
    });
  };
});

/* ==========================================================================
   TAB 1 – KPI DSE
   ========================================================================== */
const S = [...D.dse].sort((a, b) => b.kpi - a.kpi); // urut KPI tertinggi
let sel = 'all';

// Kolom tabel peringkat: [label, key pencapaian (untuk warna), fungsi angka yang ditampilkan]
// Kolom KPI tetap persen (di Excel memang berformat %), kolom lain menampilkan angka realisasi (MTD) dari Excel.
const SC = [
  ['KPI', 'kpi', d => P(d.kpi)],
  ['OSA', 'osaPct', d => N(d.osa)],
  ['Sellin SP', 'spPct', d => N(d.sp)],
  ['EC', 'ecAch', d => N(d.ec, 1)],
  ['Outlet produktif', 'pAch', d => N(d.p)],
  ['OSA 300K', 'o3Ach', d => N(d.o3)],
  ['Retail tagging', 'tgAch', d => N(d.tg)],
];

/* Dropdown "Tampilkan" */
const ds = $('#ds');
ds.add(new Option('Seluruh tim (5 DSE)', 'all'));
S.forEach((d, i) => ds.add(new Option(d.id, i)));
ds.onchange = () => {
  sel = ds.value === 'all' ? 'all' : +ds.value;
  draw();
};

/* ---------- Komponen visual ---------- */

// Ring (donut) SVG
const ring = (v, sz) => `
  <svg viewBox="0 0 100 100" width="${sz}" height="${sz}" role="img" aria-label="${v == null ? 'tidak ada data' : P(v, 1)}">
    <circle class="ring-track" cx="50" cy="50" r="40"/>
    <circle class="ring-fill ${fc(v)}" cx="50" cy="50" r="40" pathLength="100" stroke-dasharray="${v == null ? 0 : Math.min(v, 1) * 100} 100" transform="rotate(-90 50 50)"/>
    <text class="ring-text ${v == null ? 'is-empty' : ''}" x="50" y="50" text-anchor="middle" dominant-baseline="central">${v == null ? '–' : P(v, 1)}</text>
  </svg>`.trim();

// Kelas warna untuk gap (negatif = merah, positif = hijau)
const cl = v => (v < 0 ? 't-bad' : v > 0 ? 't-good' : '');

// Kartu besar (OSA / Sellin SP) dengan progress bar dan baris gap
const big = (label, value, ach, gapLabel, gap) => `
  <h3>${label}</h3>
  <div class="v">${value}</div>
  <div class="pb"><i class="${fc(ach)}" style="width:${Math.min(ach, 1) * 100}%"></i></div>
  <div class="ok ${fc(ach)}">${P(ach, 1)} tercapai</div>
  <div class="gap-row"><span>${gapLabel}</span><b class="${cl(gap)}">${gapLabel === 'Gap OSA' ? R(gap) : N(gap)}</b></div>`.trim();

// Kartu mini metrik pendukung
const mini = (label, value, unit = '') => `
  <div class="c"><small>${label}</small><b>${value}</b>${unit ? `<small>${unit}</small>` : ''}</div>`.trim();

// Kartu ring pada bagian "Outlet dan kualitas"
const ringCard = (label, v, unit) => `
  <div class="c"><h3>${label}</h3>${ring(v, 150)}<div class="mute ring-note">${unit}</div></div>`.trim();

/* ---------- Render tab 1 ---------- */
function draw() {
  const A = sel === 'all' ? S : [S[sel]]; // DSE yang ditampilkan
  const s = k => sum(A, k); // total
  const m = k => s(k) / A.length; // rata-rata
  const r = (a, b) => s(a) / s(b); // rasio

  // Hero: OSA, Sellin SP, KPI
  $('#cOsa').innerHTML = big('OSA', jt(s('osa')), r('osa', 'osaT'), 'Gap OSA', s('osaGap'));
  $('#cSp').innerHTML = big('SELLIN SP', N(s('sp')), r('sp', 'spT'), 'Gap Sellin SP', s('spGap'));
  $('#cKpi').innerHTML = `
    <h3>KPI</h3>
    <div class="kp">
      ${ring(m('kpi'), 170)}
      <dl>
        <div><dt>Score</dt><dd>${P(m('kpi'), 1)}</dd></div>
        <div><dt>KPI OSA</dt><dd>${P(m('osaKpi'), 1)}</dd></div>
        <div><dt>KPI Sellin SP</dt><dd>${P(m('spKpi'), 1)}</dd></div>
        <div><dt>Compliance</dt><dd>${P(m('comp'), 1)}</dd></div>
      </dl>
    </div>`;

  // Metrik pendukung
  $('#mini').innerHTML = [
    mini('OSA IM3 / 3ID', `${jt(s('osaIm3'))} / ${jt(s('osa3id'))}`),
    mini('Sellin SP IM3 / 3ID', `${N(s('spIm3'))} / ${N(s('sp3id'))}`),
    mini('EC', P(r('ec', 'ecT')), `${N(s('ec'), 1)} dari ${N(s('ecT'))}`),
    mini('Sellin SP 50% RR', P(r('rr', 'rrT')), `${N(s('rr'))} dari ${N(s('rrT'))}`),
    mini(
      'Site LRS',
      P(r('lrs', 'lrsT')),
      `${jt(s('lrs'))} dari ${jt(s('lrsT'))}<br><span class="${cl(s('lrs') - s('lrsL'))}">${s('lrs') >= s('lrsL') ? '▲' : '▼'} ${P(Math.abs(s('lrs') / s('lrsL') - 1), 1)} dari LMTD</span>`
    ),
    mini('GA-Trade', P(r('ga', 'gaT')), `${N(s('ga'))} dari ${N(s('gaT'))}`),
  ].join('');

  // Ring outlet dan kualitas
  $('#rings').innerHTML = [
    ringCard('PRO OUTLET', r('p', 'pT'), `${N(s('p'))} dari ${N(s('pT'))}`),
    ringCard('RET-TAG', r('tg', 'tgT'), `${N(s('tg'))} dari ${N(s('tgT'))}`),
    ringCard('OSSO', null, 'Belum ada di Excel'),
    ringCard('UAR', r('o3', 'o3T'), `${N(s('o3'))} dari ${N(s('o3T'))}`),
  ].join('');

  // Tabel peringkat DSE
  $('#sc').innerHTML =
    '<thead><tr><th class="l">DSE</th>' +
    SC.map(c => `<th>${c[0]}</th>`).join('') +
    '</tr></thead><tbody>' +
    S.map(
      (d, i) =>
        `<tr class="${i === sel ? 'on' : ''}"><td class="l"><button data-i="${i}" aria-pressed="${i === sel}"><b>${E(d.id)}</b><br><span class="mute">${E(d.cso)}</span></button></td>` +
        SC.map(c => `<td>${pillNum(d[c[1]], c[2](d))}</td>`).join('') +
        '</tr>'
    ).join('') +
    '</tbody>';
}

// Klik baris DSE pada tabel peringkat
$('#sc').onclick = e => {
  const b = e.target.closest('button[data-i]');
  if (b) {
    sel = +b.dataset.i;
    ds.value = sel;
    draw();
  }
};

draw();

/* ==========================================================================
   TAB 2 – Outlet wise
   ========================================================================== */
const O = D.outlets;

// Definisi kolom: [label, tipe]
// t = teks, r/n = angka, g = gap (merah/hijau), p = persen (pill), s = status OK
const C = [
  ['DSE', 't'], ['Site', 't'], ['PJP', 't'], ['Outlet', 't'], ['ID IM3', 't'], ['ID 3ID', 't'],
  ['Target', 'r'], ['Realisasi', 'r'], ['Gap', 'g'], ['Ach', 'p'], ['IM3', 'r'], ['3ID', 'r'],
  ['Status', 's'], ['Total', 'n'], ['IM3', 'n'], ['3ID', 'n'],
  ['Status', 's'], ['Total', 'n'], ['IM3', 'n'], ['3ID', 'n'],
];

// Header grup: [judul, jumlah kolom]
const GROUPS = [
  ['Outlet', 6],
  ['OSA (Rp)', 6],
  ['Sellin SP', 4],
  ['Retail tagging', 4],
];

// State filter dan sort
const st = { q: '', d: '', p: '', s: null, dir: 1 };

/* Isi dropdown filter */
[...new Set(O.map(r => r[0]))].sort().forEach(v => $('#fd').add(new Option(v, v)));
[...new Set(O.map(r => r[2]))].sort().forEach(v => $('#fp').add(new Option(v, v)));

/* Event filter dan sort */
$('#q').oninput = e => {
  st.q = e.target.value.toLowerCase();
  outlets();
};
$('#fd').onchange = e => {
  st.d = e.target.value;
  outlets();
};
$('#fp').onchange = e => {
  st.p = e.target.value;
  outlets();
};
$('#ot').onclick = e => {
  const h = e.target.closest('th[data-c]');
  if (!h) return;
  const c = +h.dataset.c;
  st.dir = st.s === c ? -st.dir : 1;
  st.s = c;
  outlets();
};

/* Render isi sel sesuai tipe kolom */
const cell = (v, t) =>
  v === 0 && 'rngp'.includes(t)
    ? '<span class="mute">-</span>'
    : t === 't'
    ? E(v)
    : t === 'r'
    ? N(v)
    : t === 'n'
    ? N(v)
    : t === 'g'
    ? `<span class="${v < 0 ? 't-bad' : 't-good'}">${N(v)}</span>`
    : t === 'p'
    ? pill(v, 1)
    : v === 'OK'
    ? '<span class="t-good"><b>OK</b></span>'
    : '<span class="mute">–</span>';

/* Render tabel outlet */
function outlets() {
  // Filter
  let r = O.filter(
    x =>
      (!st.d || x[0] === st.d) &&
      (!st.p || x[2] === st.p) &&
      (!st.q || [x[1], x[3], x[4], x[5]].join(' ').toLowerCase().includes(st.q))
  );

  // Sort
  if (st.s !== null) {
    r = [...r].sort((a, b) => {
      const x = a[st.s];
      const y = b[st.s];
      return (
        (typeof x === 'number' && typeof y === 'number'
          ? x - y
          : String(x).localeCompare(String(y), 'id', { numeric: true })) * st.dir
      );
    });
  }

  $('#cnt').textContent = `Menampilkan ${N(r.length)} dari ${N(O.length)} outlet`;

  // Baris total (footer)
  const tot = C.map(([, t], i) =>
    t === 't'
      ? ''
      : t === 's'
      ? r.filter(x => x[i] === 'OK').length + ' OK'
      : t === 'p'
      ? ''
      : (q => (q === 0 ? '-' : N(q)))(r.reduce((s, x) => s + x[i], 0))
  );
  const target = r.reduce((s, x) => s + x[6], 0);
  const realisasi = r.reduce((s, x) => s + x[7], 0);
  tot[0] = `Total (${N(r.length)} outlet)`;
  tot[9] = target ? pill(realisasi / target, 1) : '';

  $('#ot').innerHTML =
    // Header grup
    `<thead><tr class="grp">${GROUPS.map(g => `<th colspan="${g[1]}">${g[0]}</th>`).join('')}</tr><tr>` +
    // Header kolom
    C.map(
      ([l], i) =>
        `<th data-c="${i}" class="${i < 6 ? 'l' : ''}" aria-sort="${st.s === i ? (st.dir > 0 ? 'ascending' : 'descending') : 'none'}">${l}${st.s === i ? (st.dir > 0 ? ' ▲' : ' ▼') : ''}</th>`
    ).join('') +
    '</tr></thead><tbody>' +
    // Isi
    r.map(x => '<tr>' + C.map(([, t], i) => `<td class="${i < 6 ? 'l' : ''}">${cell(x[i], t)}</td>`).join('') + '</tr>').join('') +
    // Footer total
    '</tbody><tfoot><tr>' +
    tot.map((v, i) => `<td class="${i < 6 ? 'l' : ''}">${v}</td>`).join('') +
    '</tr></tfoot>';
}

outlets();