import { describe, expect, it } from "vitest";
import { SEMUA, TAHUN_AKHIR, TAHUN_AWAL, baris, inflasiRataRata, kelipatan, mundur, perjalanan, ringkas, setara } from "./model";

describe("data", () => {
  it("lengkap dan berurutan dari tahun awal sampai akhir", () => {
    expect(SEMUA[0].tahun).toBe(TAHUN_AWAL);
    expect(SEMUA.at(-1)!.tahun).toBe(TAHUN_AKHIR);
    SEMUA.forEach((b, i) => expect(b.tahun).toBe(TAHUN_AWAL + i));
  });

  it("IHK tahun dasar 2010 = 100", () => {
    expect(baris(2010).ihk).toBeCloseTo(100, 6);
  });

  it("inflasi tahunan konsisten dengan IHK", () => {
    for (const b of SEMUA.slice(1)) {
      const sebelum = baris(b.tahun - 1);
      expect(b.inflasi).toBeCloseTo((b.ihk / sebelum.ihk - 1) * 100, 2);
    }
  });

  it("krisis 1998 terlihat sebagai inflasi tertinggi sejak 1975", () => {
    const sejak1975 = SEMUA.filter((b) => b.tahun >= 1975);
    const tertinggi = sejak1975.reduce((a, b) => (b.inflasi > a.inflasi ? b : a));
    expect(tertinggi.tahun).toBe(1998);
    expect(tertinggi.inflasi).toBeGreaterThan(50);
  });

  it("harga emas rupiah per gram = US$/oz × kurs ÷ 31,1035", () => {
    const b = baris(2020);
    expect(b.emasRpGram).toBeCloseTo((b.emasUsdOz * b.kurs) / 31.1034768, 0);
  });
});

describe("setara", () => {
  it("tahun yang sama tidak berubah", () => {
    expect(setara(5000, 2000, 2000)).toBe(5000);
  });

  it("maju lalu mundur kembali ke nilai awal", () => {
    const sekarang = setara(1000, 1995, TAHUN_AKHIR);
    expect(mundur(sekarang, 1995)).toBeCloseTo(1000, 6);
  });

  it("lebih dari nominal karena harga naik", () => {
    expect(setara(1000, 1995, TAHUN_AKHIR)).toBeGreaterThan(1000);
  });

  it("transitif lewat tahun antara", () => {
    const langsung = setara(1000, 1980, 2020);
    const lewat = setara(setara(1000, 1980, 2000), 2000, 2020);
    expect(lewat).toBeCloseTo(langsung, 6);
  });

  it("kelipatan dan rata-rata inflasi konsisten", () => {
    const k = kelipatan(1990, 2020);
    const r = inflasiRataRata(1990, 2020) / 100;
    expect(Math.pow(1 + r, 30)).toBeCloseTo(k, 6);
    expect(inflasiRataRata(2000, 2000)).toBe(0);
  });

  it("menolak tahun di luar data", () => {
    expect(() => setara(1000, TAHUN_AWAL - 1, TAHUN_AKHIR)).toThrow(RangeError);
  });
});

describe("perjalanan", () => {
  it("di tahun mulai ketiga skenario bernilai sama", () => {
    const [awal] = perjalanan(100_000, 2000);
    expect(awal.tahun).toBe(2000);
    expect(awal.emas).toBeCloseTo(awal.tunai, 6);
    expect(awal.dolar).toBeCloseTo(awal.tunai, 6);
    expect(awal.tunai).toBeCloseTo(setara(100_000, 2000, TAHUN_AKHIR), 6);
  });

  it("tunai di tahun akhir sama dengan nominal (rupiah tahun akhir)", () => {
    const akhir = perjalanan(100_000, 1990).at(-1)!;
    expect(akhir.tahun).toBe(TAHUN_AKHIR);
    expect(akhir.tunai).toBeCloseTo(100_000, 6);
  });

  it("nilai riil tunai tidak pernah naik selama inflasi positif", () => {
    const p = perjalanan(100_000, 2000);
    for (let i = 1; i < p.length; i++) {
      if (baris(p[i].tahun).inflasi > 0) expect(p[i].tunai).toBeLessThanOrEqual(p[i - 1].tunai);
    }
  });
});

describe("ringkas", () => {
  it("cocok dengan perjalanan di tahun akhir", () => {
    const r = ringkas(50_000, 1998);
    const akhir = perjalanan(50_000, 1998).at(-1)!;
    expect(r.nilaiEmasSekarang).toBeCloseTo(akhir.emas, 4);
    expect(r.nilaiDolarSekarang).toBeCloseTo(akhir.dolar, 4);
  });

  it("susut tunai 0 di tahun akhir", () => {
    expect(ringkas(1000, TAHUN_AKHIR).susutTunai).toBeCloseTo(0, 9);
  });
});
