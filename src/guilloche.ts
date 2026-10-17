/**
 * Pola guilloche (ukiran garis halus khas uang kertas) digambar sebagai SVG:
 * dua roset hipotrokoid di kiri-kanan dan pita gelombang di tengah. Semua
 * deterministik, jadi gambar yang diunduh selalu sama dengan yang tampil.
 */

const f = (n: number) => n.toFixed(1);

function jalur(titik: [number, number][]): string {
  return `M${titik.map(([x, y]) => `${f(x)} ${f(y)}`).join("L")}Z`;
}

/** Hipotrokoid: kurva roset dengan R/r menentukan jumlah kelopak. */
function roset(cx: number, cy: number, R: number, r: number, d: number, skala: number, putar: number): string {
  const titik: [number, number][] = [];
  const k = (R - r) / r;
  // Satu putaran penuh butuh r / gcd(R, r) lilitan; R dan r bulat di sini.
  const fpb = (a: number, b: number): number => (b ? fpb(b, a % b) : a);
  const lilit = r / fpb(R, r);
  const n = Math.round(260 * lilit);
  for (let i = 0; i <= n; i++) {
    const t = (i / n) * Math.PI * 2 * lilit;
    const x = (R - r) * Math.cos(t) + d * Math.cos(k * t);
    const y = (R - r) * Math.sin(t) - d * Math.sin(k * t);
    const c = Math.cos(putar);
    const s = Math.sin(putar);
    titik.push([cx + skala * (x * c - y * s), cy + skala * (x * s + y * c)]);
  }
  return jalur(titik);
}

/** Pita gelombang mendatar: beberapa sinus bergeser fase yang saling silang. */
function pita(y0: number, lebar: number, tinggi: number, garis: number): string[] {
  const hasil: string[] = [];
  for (let g = 0; g < garis; g++) {
    const fase = (g / garis) * Math.PI * 2;
    const titik: string[] = [];
    for (let x = 0; x <= lebar; x += 4) {
      const y = y0 + Math.sin(x / 26 + fase) * tinggi * 0.5 + Math.sin(x / 61 - fase) * tinggi * 0.25;
      titik.push(`${x === 0 ? "M" : "L"}${f(x)} ${f(y)}`);
    }
    hasil.push(titik.join(""));
  }
  return hasil;
}

export function polaGuilloche(lebar = 820, tinggi = 400): string {
  const jalurJalur: string[] = [];
  const tengahY = tinggi / 2;
  for (let i = 0; i < 9; i++) {
    jalurJalur.push(roset(tinggi * 0.42, tengahY, 96, 36, 22 + i * 5, 1.25, i * 0.05));
    jalurJalur.push(roset(lebar - tinggi * 0.42, tengahY, 84, 30, 18 + i * 5, 1.3, -i * 0.06));
  }
  jalurJalur.push(...pita(tinggi * 0.18, lebar, 16, 7), ...pita(tinggi * 0.84, lebar, 16, 7));
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${lebar} ${tinggi}" preserveAspectRatio="xMidYMid slice"><g fill="none" stroke="currentColor" stroke-width="0.6">${jalurJalur
    .map((d) => `<path d="${d}"/>`)
    .join("")}</g></svg>`;
}
