import { describe, expect, it } from "vitest";
import { bacaNominal, gram, persen, rupiah, rupiahRingkas } from "./format";

describe("bacaNominal", () => {
  it.each([
    ["1000", 1000],
    ["1.000", 1000],
    ["Rp 25.000", 25000],
    ["rp1.000.000", 1_000_000],
    ["1,5 juta", 1_500_000],
    ["1,5jt", 1_500_000],
    ["1.5jt", 1_500_000],
    ["500rb", 500_000],
    ["500 ribu", 500_000],
    ["2jt", 2_000_000],
    ["3 miliar", 3e9],
    ["0,5", 0.5],
    ["1.000,5", 1000.5],
  ])("%s → %d", (teks, harap) => {
    expect(bacaNominal(teks)).toBeCloseTo(harap, 6);
  });

  it.each(["", "abc", "0", "-500", "10.5", "1x", "1.00.0"])("menolak %s", (teks) => {
    expect(bacaNominal(teks)).toBeNull();
  });
});

describe("format", () => {
  it("rupiah memakai titik ribuan", () => {
    expect(rupiah(9080.4)).toBe("Rp9.080");
    expect(rupiah(0.25)).toBe("Rp0,25");
  });

  it("rupiahRingkas", () => {
    expect(rupiahRingkas(1_823_487)).toBe("Rp1,8 juta");
    expect(rupiahRingkas(2_300_000_000)).toBe("Rp2,3 miliar");
    expect(rupiahRingkas(950_000)).toBe("Rp950.000");
  });

  it("persen dengan tanda", () => {
    expect(persen(12.34, true)).toBe("+12,3%");
    expect(persen(-89.04)).toBe("-89%");
    expect(persen(0.01, true)).toBe("0%");
  });

  it("gram", () => {
    expect(gram(0.0055)).toBe("5,5 mg");
    expect(gram(0.53)).toBe("0,53 gram");
    expect(gram(1500)).toBe("1,5 kg");
  });
});
