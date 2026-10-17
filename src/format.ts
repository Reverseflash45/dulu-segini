const bulat = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 });
const satuDesimal = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1, minimumFractionDigits: 0 });
const duaDesimal = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2, minimumFractionDigits: 0 });

/** "Rp9.080" — nominal penuh, dibulatkan ke rupiah terdekat (minimal Rp1 bila > 0). */
export function rupiah(n: number): string {
  if (n > 0 && n < 1) return `Rp${duaDesimal.format(n)}`;
  return `Rp${bulat.format(Math.round(n))}`;
}

/** "Rp1,8 juta", "Rp2,3 miliar", di bawah sejuta tetap penuh. */
export function rupiahRingkas(n: number): string {
  const a = Math.abs(n);
  if (a >= 1e12) return `Rp${satuDesimal.format(n / 1e12)} triliun`;
  if (a >= 1e9) return `Rp${satuDesimal.format(n / 1e9)} miliar`;
  if (a >= 1e6) return `Rp${satuDesimal.format(n / 1e6)} juta`;
  return rupiah(n);
}

export const angka = (n: number) => bulat.format(Math.round(n));
export const desimal = (n: number) => satuDesimal.format(n);

export function persen(n: number, tanda = false): string {
  const s = `${satuDesimal.format(Math.abs(n) < 0.05 ? 0 : n)}%`;
  return tanda && n > 0.05 ? `+${s}` : s;
}

export function dolar(n: number): string {
  if (n < 1) return `US$${duaDesimal.format(n)}`;
  if (n < 100) return `US$${satuDesimal.format(n)}`;
  return `US$${bulat.format(Math.round(n))}`;
}

export function gram(n: number): string {
  if (n >= 1000) return `${satuDesimal.format(n / 1000)} kg`;
  if (n >= 10) return `${satuDesimal.format(n)} gram`;
  if (n >= 0.01) return `${duaDesimal.format(n)} gram`;
  return `${new Intl.NumberFormat("id-ID", { maximumSignificantDigits: 2 }).format(n * 1000)} mg`;
}

/** "9,1×" */
export const kali = (n: number) => `${n >= 100 ? bulat.format(n) : satuDesimal.format(n)}×`;

const SATUAN: Record<string, number> = {
  rb: 1e3,
  ribu: 1e3,
  k: 1e3,
  jt: 1e6,
  juta: 1e6,
  m: 1e9,
  miliar: 1e9,
  milyar: 1e9,
  t: 1e12,
  triliun: 1e12,
};

/**
 * Baca nominal yang diketik orang: "1.000", "1000", "Rp 25.000", "1,5 juta",
 * "500rb", "2jt". Titik = pemisah ribuan, koma = desimal (gaya Indonesia).
 * Mengembalikan null bila tidak bisa dibaca atau bukan angka positif.
 */
export function bacaNominal(teks: string): number | null {
  const s = teks.toLowerCase().replace(/rp\.?/g, "").replace(/\s+/g, "").trim();
  const m = s.match(/^([\d.,]+)([a-z]*)$/);
  if (!m) return null;
  const [, bagianAngka, akhiran] = m;
  const kali = akhiran ? SATUAN[akhiran] : 1;
  if (kali === undefined) return null;
  let a = bagianAngka;
  const ribuan = /^\d{1,3}(\.\d{3})+(,\d+)?$/.test(a); // 1.000.000 atau 1.000,5
  const titikDesimal = Boolean(akhiran) && /^\d+\.\d{1,2}$/.test(a); // 1.5jt, gaya Inggris
  if (ribuan) a = a.replace(/\./g, "");
  else if (!titikDesimal && a.includes(".")) return null; // ambigu, misalnya 10.5 tanpa satuan
  a = a.replace(",", ".");
  if (!/^\d+(\.\d+)?$/.test(a)) return null;
  const n = parseFloat(a) * kali;
  return Number.isFinite(n) && n > 0 ? n : null;
}
