"""Ambil data mentah dan bangun src/data/seri.json.

Sumber:
  - World Bank, World Development Indicators (API v2), Indonesia:
      FP.CPI.TOTL     Indeks Harga Konsumen (2010 = 100); inflasi tahunan
                      dihitung dari indeks ini supaya selalu konsisten
      PA.NUS.FCRF     Kurs resmi, Rp per US$ (rata-rata periode)
      NY.GDP.PCAP.CN  PDB per kapita, rupiah berlaku
  - World Bank Commodity Price Data (Pink Sheet), harga tahunan nominal:
      Gold, US$ per troy ounce

Jalankan dari akar proyek:  python data/skrip/ambil.py
Butuh: openpyxl (pip install openpyxl). Berkas mentah disimpan di data/mentah/
supaya pembangunan ulang bisa dilakukan tanpa internet (--luring).
"""

from __future__ import annotations

import json
import re
import sys
import urllib.request
from datetime import date
from pathlib import Path

AKAR = Path(__file__).resolve().parents[2]
MENTAH = AKAR / "data" / "mentah"
KELUARAN = AKAR / "src" / "data" / "seri.json"

INDIKATOR = {
    "ihk": "FP.CPI.TOTL",
    "kurs": "PA.NUS.FCRF",
    "pdbKapita": "NY.GDP.PCAP.CN",
}
HALAMAN_PINK_SHEET = "https://www.worldbank.org/en/research/commodity-markets"
GRAM_PER_TROY_OUNCE = 31.1034768

# Redenominasi 1965 (Rp1.000 lama = Rp1 baru) dan hiperinflasi 1966 membuat
# angka sebelum 1967 tidak bisa dibandingkan langsung dengan rupiah sekarang.
TAHUN_AWAL = 1967

UA = {"User-Agent": "dulu-segini/1.0 (+https://github.com/Reverseflash45)"}


def unduh(url: str) -> bytes:
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read()


def ambil_wdi(kode: str, luring: bool) -> tuple[dict[int, float], str]:
    berkas = MENTAH / f"wdi_{kode}.json"
    if not luring:
        berkas.write_bytes(
            unduh(f"https://api.worldbank.org/v2/country/IDN/indicator/{kode}?format=json&date=1960:2100&per_page=500")
        )
    meta, baris = json.loads(berkas.read_text(encoding="utf-8"))
    if meta.get("total") != len(baris):
        sys.exit(f"{kode}: API mengembalikan {len(baris)} dari {meta.get('total')} baris")
    nilai = {int(b["date"]): float(b["value"]) for b in baris if b["value"] is not None}
    return nilai, meta.get("lastupdated", "")


def ambil_emas(luring: bool) -> tuple[dict[int, float], str]:
    berkas = MENTAH / "cmo_tahunan.xlsx"
    if not luring:
        halaman = unduh(HALAMAN_PINK_SHEET).decode("utf-8", "replace")
        cocok = re.search(r'https://[^"]*CMO-Historical-Data-Annual\.xlsx', halaman)
        if not cocok:
            sys.exit("Tautan Pink Sheet tahunan tidak ditemukan di halaman World Bank.")
        berkas.write_bytes(unduh(cocok.group(0)))

    import openpyxl  # hanya dibutuhkan di sini

    wb = openpyxl.load_workbook(berkas, read_only=True, data_only=True)
    baris = list(wb["Annual Prices (Nominal)"].iter_rows(values_only=True))
    diperbarui = next((str(b[0]) for b in baris[:6] if b and isinstance(b[0], str) and "Updated" in b[0]), "")
    kepala = next(i for i, b in enumerate(baris) if b and "Gold" in [str(c).strip() for c in b if c])
    kolom = [str(c).strip() if c else "" for c in baris[kepala]].index("Gold")
    satuan = str(baris[kepala + 1][kolom])
    if "troy oz" not in satuan:
        sys.exit(f"Satuan emas berubah: {satuan!r}")
    emas = {}
    for b in baris[kepala + 2 :]:
        if isinstance(b[0], (int, float)) and isinstance(b[kolom], (int, float)):
            emas[int(b[0])] = float(b[kolom])
    return emas, diperbarui


def main() -> None:
    sys.stdout.reconfigure(encoding="utf-8")
    luring = "--luring" in sys.argv
    MENTAH.mkdir(parents=True, exist_ok=True)
    KELUARAN.parent.mkdir(parents=True, exist_ok=True)

    seri: dict[str, dict[int, float]] = {}
    pembaruan: dict[str, str] = {}
    for nama, kode in INDIKATOR.items():
        seri[nama], pembaruan[kode] = ambil_wdi(kode, luring)
    seri["emasUsdOz"], pembaruan["pink_sheet"] = ambil_emas(luring)

    # Tahun terakhir = tahun terakhir yang lengkap untuk SEMUA seri.
    akhir = min(max(s) for s in seri.values())
    tahun = list(range(TAHUN_AWAL, akhir + 1))
    hilang = [(n, t) for n, s in seri.items() for t in tahun if t not in s]
    if hilang:
        sys.exit(f"Data bolong: {hilang[:10]}")

    baris = []
    for t in tahun:
        inflasi = (seri["ihk"][t] / seri["ihk"][t - 1] - 1) * 100
        emas_rp_gram = seri["emasUsdOz"][t] * seri["kurs"][t] / GRAM_PER_TROY_OUNCE
        baris.append(
            {
                "tahun": t,
                "ihk": round(seri["ihk"][t], 6),
                "inflasi": round(inflasi, 3),
                "kurs": round(seri["kurs"][t], 4),
                "pdbKapita": round(seri["pdbKapita"][t]),
                "emasUsdOz": round(seri["emasUsdOz"][t], 2),
                "emasRpGram": round(emas_rp_gram, 2),
            }
        )

    keluaran = {
        "dibangun": date.today().isoformat(),
        "tahunAwal": TAHUN_AWAL,
        "tahunAkhir": akhir,
        "sumber": {
            "wdi": {k: pembaruan[v] for k, v in INDIKATOR.items()},
            "pinkSheet": pembaruan["pink_sheet"],
        },
        "baris": baris,
    }
    KELUARAN.write_text(json.dumps(keluaran, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(f"{len(baris)} tahun ({TAHUN_AWAL}–{akhir}) → {KELUARAN.relative_to(AKAR)}")
    for b in (baris[0], baris[-1]):
        print(" ", b)


if __name__ == "__main__":
    main()
