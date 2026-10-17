import data from "./data/seri.json";

export type Baris = (typeof data.baris)[number];

export const TAHUN_AWAL = data.tahunAwal;
export const TAHUN_AKHIR = data.tahunAkhir;
export const SUMBER = data.sumber;
export const DIBANGUN = data.dibangun;
export const SEMUA: readonly Baris[] = data.baris;

const PER_TAHUN = new Map(SEMUA.map((b) => [b.tahun, b]));

export function baris(tahun: number): Baris {
  const b = PER_TAHUN.get(tahun);
  if (!b) throw new RangeError(`Tidak ada data tahun ${tahun}`);
  return b;
}

export const adaTahun = (t: number) => PER_TAHUN.has(t);

/**
 * Rupiah tahun `dari` dinyatakan dalam rupiah tahun `ke` dengan Indeks Harga
 * Konsumen: daya beli yang sama, bukan nominal yang sama.
 */
export function setara(nominal: number, dari: number, ke: number): number {
  return (nominal * baris(ke).ihk) / baris(dari).ihk;
}

/** Berapa kali lipat harga rata-rata naik dari `dari` ke `ke`. */
export const kelipatan = (dari: number, ke: number) => baris(ke).ihk / baris(dari).ihk;

/** Inflasi rata-rata per tahun (majemuk) antara dua tahun, dalam persen. */
export function inflasiRataRata(dari: number, ke: number): number {
  if (ke === dari) return 0;
  return (Math.pow(kelipatan(dari, ke), 1 / (ke - dari)) - 1) * 100;
}

export type Skenario = "tunai" | "emas" | "dolar";

export type TitikSkenario = {
  tahun: number;
  /** Nilai riil, dinyatakan dalam rupiah tahun akhir. */
  tunai: number;
  emas: number;
  dolar: number;
};

/**
 * Kalau `nominal` rupiah di tahun `mulai` disimpan apa adanya (tunai), ditukar
 * ke emas, atau ditukar ke dolar, berapa daya belinya tiap tahun sampai tahun
 * akhir, dinyatakan dalam rupiah tahun akhir supaya bisa dibandingkan.
 *
 * Emas dan dolar memakai harga/kurs rata-rata tahunan, tanpa ongkos jual-beli,
 * pajak, atau bunga.
 */
export function perjalanan(nominal: number, mulai: number): TitikSkenario[] {
  const awal = baris(mulai);
  const gram = nominal / awal.emasRpGram;
  const usd = nominal / awal.kurs;
  const ihkAkhir = baris(TAHUN_AKHIR).ihk;
  return SEMUA.filter((b) => b.tahun >= mulai).map((b) => {
    const riil = (rupiahNominal: number) => (rupiahNominal * ihkAkhir) / b.ihk;
    return {
      tahun: b.tahun,
      tunai: riil(nominal),
      emas: riil(gram * b.emasRpGram),
      dolar: riil(usd * b.kurs),
    };
  });
}

export type Ringkasan = {
  nominal: number;
  tahun: number;
  /** Daya beli awal, dalam rupiah tahun akhir. */
  setaraSekarang: number;
  kelipatan: number;
  inflasiRataRata: number;
  /** Persen daya beli yang hilang kalau disimpan tunai sampai tahun akhir. */
  susutTunai: number;
  gramEmas: number;
  nilaiEmasSekarang: number;
  usd: number;
  nilaiDolarSekarang: number;
  /** Nominal sebagai persen PDB per kapita tahun itu. */
  persenPdbKapita: number;
};

export function ringkas(nominal: number, tahun: number): Ringkasan {
  const b = baris(tahun);
  const akhir = baris(TAHUN_AKHIR);
  const setaraSekarang = setara(nominal, tahun, TAHUN_AKHIR);
  const gramEmas = nominal / b.emasRpGram;
  const usd = nominal / b.kurs;
  return {
    nominal,
    tahun,
    setaraSekarang,
    kelipatan: kelipatan(tahun, TAHUN_AKHIR),
    inflasiRataRata: inflasiRataRata(tahun, TAHUN_AKHIR),
    susutTunai: (1 - nominal / setaraSekarang) * 100,
    gramEmas,
    nilaiEmasSekarang: gramEmas * akhir.emasRpGram,
    usd,
    nilaiDolarSekarang: usd * akhir.kurs,
    persenPdbKapita: (nominal / b.pdbKapita) * 100,
  };
}

/** Kebalikan: rupiah tahun akhir dinyatakan dalam rupiah tahun `ke`. */
export const mundur = (nominalSekarang: number, ke: number) => setara(nominalSekarang, TAHUN_AKHIR, ke);
