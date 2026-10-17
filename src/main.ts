import "./gaya.css";
import { toPng } from "html-to-image";
import { angka, bacaNominal, desimal, dolar, gram, kali, persen, rupiah, rupiahRingkas } from "./format";
import { SERI, grafikInflasi, grafikSkenario } from "./grafik";
import { polaGuilloche } from "./guilloche";
import { SEMUA, SUMBER, TAHUN_AKHIR, TAHUN_AWAL, adaTahun, mundur, perjalanan, ringkas, type Skenario } from "./model";

type Arah = "maju" | "mundur";
type Keadaan = { nominal: number; tahun: number; arah: Arah };

const $ = <T extends Element = HTMLElement>(s: string) => document.querySelector<T>(s)!;
const $$ = <T extends Element = HTMLElement>(s: string) => [...document.querySelectorAll<T>(s)];
const isi = (s: string, teks: string) => $$(s).forEach((el) => (el.textContent = teks));

const BAWAAN: Keadaan = { nominal: 1000, tahun: 1995, arah: "maju" };

function dariUrl(): Keadaan {
  const p = new URLSearchParams(location.search);
  const nominal = bacaNominal(p.get("rp") ?? "") ?? BAWAAN.nominal;
  const tahun = Number(p.get("th"));
  return {
    nominal,
    tahun: adaTahun(tahun) && tahun < TAHUN_AKHIR ? tahun : BAWAAN.tahun,
    arah: p.get("arah") === "mundur" ? "mundur" : "maju",
  };
}

let k = dariUrl();

function keUrl(): string {
  const p = new URLSearchParams({ rp: String(k.nominal), th: String(k.tahun) });
  if (k.arah === "mundur") p.set("arah", "mundur");
  return `${location.pathname}?${p}`;
}

/* ---------- isian ---------- */
const masukNominal = $<HTMLInputElement>("#nominal");
const pilihTahun = $<HTMLSelectElement>("#tahun");
const geserTahun = $<HTMLInputElement>("#geser-tahun");
const galat = $("#galat-nominal");

for (let t = TAHUN_AKHIR - 1; t >= TAHUN_AWAL; t--) pilihTahun.add(new Option(String(t), String(t)));
geserTahun.min = String(TAHUN_AWAL);
geserTahun.max = String(TAHUN_AKHIR - 1);
isi("[data-tahun-awal]", String(TAHUN_AWAL));
isi("[data-tahun-akhir]", String(TAHUN_AKHIR));
isi("[data-wdi]", SUMBER.wdi.ihk);
isi("[data-domain]", location.hostname.replace(/^www\./, ""));

// Lebar kotak nominal mengikuti teksnya (diukur dengan span tersembunyi berhuruf sama),
// supaya kalimat "Rp1.000 tahun 1995" tetap satu baris.
const ukur = document.createElement("span");
ukur.className = "ukur";
ukur.setAttribute("aria-hidden", "true");
masukNominal.after(ukur);
const lebarNominal = () => {
  ukur.textContent = masukNominal.value || "0";
  masukNominal.style.width = `${ukur.offsetWidth + 4}px`;
};
document.fonts?.ready.then(lebarNominal);

function setelIsian() {
  masukNominal.value = angka(k.nominal);
  lebarNominal();
  pilihTahun.value = String(k.tahun);
  geserTahun.value = String(k.tahun);
  $$<HTMLButtonElement>("[data-arah]").forEach((b) => b.setAttribute("aria-checked", String(b.dataset.arah === k.arah)));
  $$<HTMLButtonElement>("[data-cepat]").forEach((b) => b.setAttribute("aria-pressed", String(Number(b.dataset.cepat) === k.nominal)));
  isi("[data-kata-tahun]", k.arah === "maju" ? "tahun" : "sekarang, di tahun");
}

masukNominal.addEventListener("input", () => {
  lebarNominal();
  const n = bacaNominal(masukNominal.value);
  galat.hidden = n !== null || masukNominal.value.trim() === "";
  if (n !== null) perbarui({ nominal: n }, false);
});
masukNominal.addEventListener("blur", () => {
  galat.hidden = true;
  masukNominal.value = angka(k.nominal);
  lebarNominal();
});
masukNominal.addEventListener("focus", () => masukNominal.select());
pilihTahun.addEventListener("change", () => perbarui({ tahun: Number(pilihTahun.value) }));
geserTahun.addEventListener("input", () => perbarui({ tahun: Number(geserTahun.value) }));
$$<HTMLButtonElement>("[data-cepat]").forEach((b) => b.addEventListener("click", () => perbarui({ nominal: Number(b.dataset.cepat) })));
$$<HTMLButtonElement>("[data-arah]").forEach((b) => b.addEventListener("click", () => perbarui({ arah: b.dataset.arah as Arah })));
$("#isian").addEventListener("submit", (e) => e.preventDefault());

/* ---------- hasil ---------- */
const NAMA: Record<Skenario, string> = { tunai: "Disimpan tunai", emas: "Dibelikan emas", dolar: "Ditukar dolar AS" };

function render() {
  const { tahun, arah } = k;
  // Mode mundur: nominal = rupiah sekarang; hitung nilainya di tahun pilihan,
  // lalu semua bagian lain memakai nilai lampau itu sebagai titik awal.
  const awal = arah === "maju" ? k.nominal : mundur(k.nominal, tahun);
  const r = ringkas(awal, tahun);
  const sekarang = arah === "maju" ? r.setaraSekarang : k.nominal;

  isi("[data-setara-label]", "setara dengan");
  isi("[data-angka-besar]", rupiah(arah === "maju" ? r.setaraSekarang : awal));
  isi("[data-setara-sub]", arah === "maju" ? `di tahun ${TAHUN_AKHIR}` : `di tahun ${tahun}`);
  $("[data-konteks]").innerHTML =
    `Harga rata-rata naik <strong>${kali(r.kelipatan)}</strong> dari ${tahun} ke ${TAHUN_AKHIR}, ` +
    `atau <strong>${desimal(r.inflasiRataRata)}%</strong> per tahun. ` +
    `${rupiah(awal)} di ${tahun} sama dengan <strong>${persen(r.persenPdbKapita) === "0%" ? "kurang dari 0,1%" : persen(r.persenPdbKapita)}</strong> ` +
    `pendapatan per kapita setahun waktu itu.`;

  // Kartu uang: tahun lama di kiri, tahun akhir di kanan.
  isi("[data-kiri-tahun]", String(tahun));
  isi("[data-kiri-nilai]", rupiahRingkas(awal));
  isi("[data-kanan-tahun]", String(TAHUN_AKHIR));
  isi("[data-kanan-nilai]", rupiahRingkas(sekarang));
  isi("[data-seri]", `DS · ${tahun} · ${TAHUN_AKHIR}`);
  isi("[data-lembar-catatan]", `harga rata-rata naik ${kali(r.kelipatan)}`);

  // Ubin skenario.
  const nilai: Record<Skenario, number> = { tunai: awal, emas: r.nilaiEmasSekarang, dolar: r.nilaiDolarSekarang };
  const terbaik = (Object.keys(nilai) as Skenario[]).reduce((a, b) => (nilai[b] > nilai[a] ? b : a));
  const rinci: Record<Skenario, string> = {
    tunai: `Uangnya tetap ${rupiah(awal)}, harganya yang naik.`,
    emas: `${gram(r.gramEmas)} emas di ${tahun}, sekarang ${gram(r.gramEmas)} itu ${rupiahRingkas(r.nilaiEmasSekarang)}.`,
    dolar: `${dolar(r.usd)} di ${tahun}, sekarang ditukar lagi jadi ${rupiahRingkas(r.nilaiDolarSekarang)}.`,
  };
  isi("[data-label-skenario]", `Kalau ${rupiahRingkas(awal)} itu disimpan sejak ${tahun}`);
  $("[data-ubin]").innerHTML = SERI.map(({ kunci, warna }) => {
    const ubah = (nilai[kunci] / r.setaraSekarang - 1) * 100;
    return `<li>
      <p class="label penanda"><i style="background:${warna}"></i>${NAMA[kunci]}</p>
      ${kunci === terbaik ? '<span class="terbaik">paling awet</span>' : ""}
      <p class="nilai">${rupiahRingkas(nilai[kunci])}</p>
      <p class="ubah ${ubah >= 0 ? "naik" : "turun"}">${persen(ubah, true)} daya beli</p>
      <p class="rinci">${rinci[kunci]}</p>
    </li>`;
  }).join("");

  // Grafik skenario.
  const data = perjalanan(awal, tahun);
  $("[data-legenda-skenario]").innerHTML =
    SERI.map((s) => `<li><i style="background:${s.warna}"></i>${s.nama}</li>`).join("") +
    `<li><i class="putus"></i>Daya beli awal (${rupiahRingkas(r.setaraSekarang)})</li>`;
  const gs = $("#grafik-skenario");
  gs.setAttribute(
    "aria-label",
    `Grafik nilai riil ${rupiahRingkas(awal)} dari ${tahun} sampai ${TAHUN_AKHIR}: tunai ${rupiahRingkas(nilai.tunai)}, emas ${rupiahRingkas(nilai.emas)}, dolar ${rupiahRingkas(nilai.dolar)}, dalam rupiah ${TAHUN_AKHIR}.`,
  );
  grafikSkenario(gs, data, r.setaraSekarang);
  $('[data-tabel="skenario"]').innerHTML = tabel(
    ["Tahun", "Tunai", "Emas", "Dolar AS"],
    data.map((d) => [String(d.tahun), rupiah(d.tunai), rupiah(d.emas), rupiah(d.dolar)]),
    `Nilai riil ${rupiah(awal)} dari ${tahun}, dalam rupiah ${TAHUN_AKHIR}`,
  );

  // Grafik inflasi.
  const sejak = SEMUA.filter((b) => b.tahun > tahun);
  const tertinggi = sejak.reduce((a, b) => (b.inflasi > a.inflasi ? b : a), sejak[0]);
  $("[data-pengantar-inflasi]").textContent = sejak.length
    ? `Batang hijau adalah tahun-tahun setelah ${tahun}. Yang paling mahal di antaranya ${tertinggi.tahun}, saat harga naik ${persen(tertinggi.inflasi)} dalam setahun.`
    : "";
  isi("[data-catatan-inflasi]", "Batang di atas 60% dipotong; angkanya tertulis di atasnya.");
  const gi = $("#grafik-inflasi");
  gi.setAttribute("aria-label", `Grafik inflasi tahunan ${TAHUN_AWAL}–${TAHUN_AKHIR}; tertinggi 1968 ${persen(128.8)} dan 1998 ${persen(58.5)}.`);
  grafikInflasi(gi, SEMUA, tahun + 1);
  $('[data-tabel="inflasi"]').innerHTML = tabel(
    ["Tahun", "Inflasi", "Kurs Rp/US$", "Emas Rp/gram"],
    [...SEMUA].reverse().map((b) => [String(b.tahun), persen(b.inflasi), angka(b.kurs), angka(b.emasRpGram)]),
    "Inflasi harga konsumen, kurs resmi, dan harga emas rata-rata per tahun",
  );
}

function tabel(kepala: string[], baris: string[][], keterangan: string): string {
  return `<table><caption class="sr-only">${keterangan}</caption><thead><tr>${kepala.map((h) => `<th scope="col">${h}</th>`).join("")}</tr></thead><tbody>${baris
    .map((b) => `<tr>${b.map((c, i) => (i ? `<td>${c}</td>` : `<th scope="row">${c}</th>`)).join("")}</tr>`)
    .join("")}</tbody></table>`;
}

let tunda = 0;
function perbarui(ubah: Partial<Keadaan>, setel = true) {
  k = { ...k, ...ubah };
  if (setel) setelIsian();
  else {
    pilihTahun.value = String(k.tahun);
    geserTahun.value = String(k.tahun);
  }
  cancelAnimationFrame(tunda);
  tunda = requestAnimationFrame(() => {
    render();
    history.replaceState(null, "", keUrl());
  });
}

/* ---------- tabel & ukuran ---------- */
$$<HTMLButtonElement>("[data-tabel-tombol]").forEach((b) =>
  b.addEventListener("click", () => {
    const t = $(`[data-tabel="${b.dataset.tabelTombol}"]`);
    t.hidden = !t.hidden;
    b.setAttribute("aria-expanded", String(!t.hidden));
    b.textContent = t.hidden ? "Lihat tabel" : "Tutup tabel";
  }),
);

let lebarTerakhir = 0;
new ResizeObserver(([e]) => {
  const w = Math.round(e.contentRect.width);
  if (w !== lebarTerakhir) {
    lebarTerakhir = w;
    cancelAnimationFrame(tunda);
    tunda = requestAnimationFrame(render);
  }
}).observe($("#grafik-skenario"));

/* ---------- kartu uang ---------- */
$("svg.guilloche").outerHTML = polaGuilloche().replace("<svg ", '<svg class="guilloche" aria-hidden="true" ');

const status = $(".status-salin");
$("#unduh").addEventListener("click", async () => {
  status.textContent = "Menyiapkan gambar…";
  try {
    const url = await toPng($("#lembar"), { pixelRatio: 2, style: { transform: "none" }, cacheBust: true });
    const a = document.createElement("a");
    a.href = url;
    a.download = `dulu-segini-${k.tahun}-${Math.round(k.arah === "maju" ? k.nominal : mundur(k.nominal, k.tahun))}.png`;
    a.click();
    status.textContent = "";
  } catch {
    status.textContent = "Gagal membuat gambar. Coba tangkapan layar saja.";
  }
});
$("#salin").addEventListener("click", async () => {
  const url = new URL(keUrl(), location.origin).toString();
  try {
    await navigator.clipboard.writeText(url);
    status.textContent = "Tautan disalin.";
  } catch {
    status.textContent = url;
  }
  setTimeout(() => (status.textContent = ""), 2500);
});

setelIsian();
render();
