import { scaleBand, scaleLinear, scaleLog } from "d3-scale";
import { line } from "d3-shape";
import { persen, rupiahRingkas } from "./format";
import type { Baris, Skenario, TitikSkenario } from "./model";

export const SERI: { kunci: Skenario; nama: string; warna: string }[] = [
  { kunci: "tunai", nama: "Tunai", warna: "var(--seri-tunai)" },
  { kunci: "emas", nama: "Emas", warna: "var(--seri-emas)" },
  { kunci: "dolar", nama: "Dolar AS", warna: "var(--seri-dolar)" },
];

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

type Tip = { el: HTMLDivElement; tampil(x: number, y: number, html: string): void; sembunyi(): void };

function buatTip(wadah: HTMLElement): Tip {
  const el = document.createElement("div");
  el.className = "tip";
  el.hidden = true;
  wadah.append(el);
  return {
    el,
    tampil(x, y, html) {
      el.innerHTML = html;
      el.hidden = false;
      const lebar = wadah.clientWidth;
      const w = el.offsetWidth;
      // Di kanan kursor, pindah ke kiri bila tidak muat.
      const kiri = x + 16 + w > lebar ? x - 16 - w : x + 16;
      el.style.left = `${Math.max(0, kiri)}px`;
      el.style.top = `${Math.max(0, y - el.offsetHeight / 2)}px`;
    },
    sembunyi() {
      el.hidden = true;
    },
  };
}

/** Kelipatan 1–2–5 di rentang log, untuk garis kisi yang mudah dibaca. */
function tickLog(min: number, maks: number): number[] {
  const hasil: number[] = [];
  for (let e = Math.floor(Math.log10(min)); e <= Math.ceil(Math.log10(maks)); e++) {
    for (const m of [1, 2, 5]) {
      const v = m * 10 ** e;
      if (v >= min && v <= maks) hasil.push(v);
    }
  }
  // Terlalu rapat untuk layar sempit: sisakan pangkat sepuluh saja.
  return hasil.length > 7 ? hasil.filter((v) => Math.log10(v) % 1 === 0) : hasil;
}

/** Rapatkan label ujung yang bertabrakan, dengan jarak minimum `jarak` px. */
function renggangkan(ys: number[], jarak: number, atas: number, bawah: number): number[] {
  const urut = ys.map((y, i) => ({ y, i })).sort((a, b) => a.y - b.y);
  for (let k = 1; k < urut.length; k++) urut[k].y = Math.max(urut[k].y, urut[k - 1].y + jarak);
  const lebih = urut.at(-1)!.y - bawah;
  if (lebih > 0) urut.forEach((u) => (u.y -= lebih));
  for (let k = urut.length - 2; k >= 0; k--) urut[k].y = Math.min(urut[k].y, urut[k + 1].y - jarak);
  if (urut[0].y < atas) urut.forEach((u, k) => (u.y = atas + k * jarak));
  const hasil = [...ys];
  urut.forEach((u) => (hasil[u.i] = u.y));
  return hasil;
}

/**
 * Nilai riil tabungan per skenario dari tahun mulai sampai tahun akhir.
 * Sumbu Y logaritmik: tunai bisa menyusut 90% sementara emas naik berlipat,
 * jadi skala biasa menempelkan garis tunai ke nol.
 */
export function grafikSkenario(wadah: HTMLElement, data: TitikSkenario[], acuan: number): void {
  const lebar = Math.max(300, wadah.clientWidth);
  const sempit = lebar < 560;
  const tinggi = sempit ? 300 : 380;
  const m = { atas: 14, kanan: sempit ? 92 : 150, bawah: 28, kiri: sempit ? 58 : 72 };
  const semuaNilai = data.flatMap((d) => [d.tunai, d.emas, d.dolar]).concat(acuan);
  const min = Math.min(...semuaNilai) * 0.8;
  const maks = Math.max(...semuaNilai) * 1.25;
  const x = scaleLinear()
    .domain([data[0].tahun, data.at(-1)!.tahun])
    .range([m.kiri, lebar - m.kanan]);
  const y = scaleLog().domain([min, maks]).range([tinggi - m.bawah, m.atas]);
  const garis = (k: Skenario) =>
    line<TitikSkenario>()
      .x((d) => x(d.tahun))
      .y((d) => y(d[k]))(data) ?? "";

  const rentang = data.at(-1)!.tahun - data[0].tahun;
  // Satu label tahun butuh kira-kira 44 px; pilih langkah 1/2/5/10 yang muat.
  const muat = Math.max(2, Math.floor((lebar - m.kiri - m.kanan) / 44));
  const langkah = [1, 2, 5, 10, 20].find((l) => rentang / l <= muat) ?? 20;
  const tahunTick = data.map((d) => d.tahun).filter((t) => t % langkah === 0);
  const ticksY = tickLog(min, maks);

  const akhir = data.at(-1)!;
  const yLabel = renggangkan(
    SERI.map((s) => y(akhir[s.kunci])),
    sempit ? 30 : 34,
    m.atas + 8,
    tinggi - m.bawah - 4,
  );

  wadah.innerHTML = `
  <svg viewBox="0 0 ${lebar} ${tinggi}" width="${lebar}" height="${tinggi}" aria-hidden="true">
    <g class="kisi">${ticksY.map((v) => `<line x1="${m.kiri}" x2="${lebar - m.kanan}" y1="${y(v)}" y2="${y(v)}"/>`).join("")}</g>
    <g class="sumbu">
      ${ticksY.map((v) => `<text x="${m.kiri - 8}" y="${y(v) + 4}" text-anchor="end">${esc(rupiahRingkas(v).replace(" juta", "jt").replace(" miliar", "M"))}</text>`).join("")}
      ${tahunTick.map((t) => `<text x="${x(t)}" y="${tinggi - 6}" text-anchor="middle">${t}</text>`).join("")}
    </g>
    <line x1="${m.kiri}" x2="${lebar - m.kanan}" y1="${y(acuan)}" y2="${y(acuan)}" stroke="var(--samar)" stroke-width="1.5" stroke-dasharray="5 4"/>
    ${SERI.map((s) => `<path d="${garis(s.kunci)}" fill="none" stroke="${s.warna}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`).join("")}
    ${SERI.map(
      (s, i) => `
      <circle cx="${x(akhir.tahun)}" cy="${y(akhir[s.kunci])}" r="4" fill="${s.warna}" stroke="var(--kertas)" stroke-width="2"/>
      <text class="label-ujung" x="${x(akhir.tahun) + 10}" y="${yLabel[i] - 2}">${s.nama}<tspan class="angka" x="${x(akhir.tahun) + 10}" dy="15">${esc(rupiahRingkas(akhir[s.kunci]))}</tspan></text>`,
    ).join("")}
    <g class="hover" visibility="hidden">
      <line class="silang" y1="${m.atas}" y2="${tinggi - m.bawah}"/>
      ${SERI.map((s) => `<circle data-titik="${s.kunci}" r="4.5" fill="${s.warna}" stroke="var(--kertas)" stroke-width="2"/>`).join("")}
    </g>
    <rect class="area-hover" x="${m.kiri}" y="${m.atas}" width="${lebar - m.kanan - m.kiri}" height="${tinggi - m.atas - m.bawah}" fill="transparent"/>
  </svg>`;

  const svg = wadah.querySelector("svg")!;
  const hover = svg.querySelector<SVGGElement>(".hover")!;
  const tip = buatTip(wadah);
  const area = svg.querySelector(".area-hover")!;
  const gerak = (e: PointerEvent) => {
    const kotak = svg.getBoundingClientRect();
    const px = ((e.clientX - kotak.left) / kotak.width) * lebar;
    const t = Math.round(x.invert(px));
    const d = data.find((b) => b.tahun === t) ?? (t < data[0].tahun ? data[0] : akhir);
    const cx = x(d.tahun);
    hover.setAttribute("visibility", "visible");
    hover.querySelector(".silang")!.setAttribute("x1", String(cx));
    hover.querySelector(".silang")!.setAttribute("x2", String(cx));
    for (const s of SERI) {
      const c = hover.querySelector(`[data-titik="${s.kunci}"]`)!;
      c.setAttribute("cx", String(cx));
      c.setAttribute("cy", String(y(d[s.kunci])));
    }
    const skala = kotak.width / lebar;
    tip.tampil(
      cx * skala,
      y(d.emas) * skala,
      `<p class="tip-judul">${d.tahun}</p>${SERI.map(
        (s) =>
          `<div class="tip-baris"><i style="background:${s.warna}"></i><span>${s.nama}</span><b>${esc(rupiahRingkas(d[s.kunci]))}</b></div>`,
      ).join("")}`,
    );
  };
  area.addEventListener("pointermove", gerak as EventListener);
  area.addEventListener("pointerdown", gerak as EventListener);
  area.addEventListener("pointerleave", () => {
    hover.setAttribute("visibility", "hidden");
    tip.sembunyi();
  });
}

/** Batang inflasi per tahun; tahun sejak `mulai` diberi warna penuh. */
export function grafikInflasi(wadah: HTMLElement, data: readonly Baris[], mulai: number): void {
  const lebar = Math.max(300, wadah.clientWidth);
  const sempit = lebar < 560;
  const tinggi = sempit ? 260 : 320;
  const m = { atas: 22, kanan: 8, bawah: 28, kiri: 40 };
  const BATAS = 60;
  const x = scaleBand<number>()
    .domain(data.map((d) => d.tahun))
    .range([m.kiri, lebar - m.kanan])
    .paddingInner(0.18);
  const minY = Math.min(0, ...data.map((d) => d.inflasi));
  const y = scaleLinear().domain([minY, BATAS]).range([tinggi - m.bawah, m.atas]);
  const w = x.bandwidth();
  const r = Math.min(4, w / 2);
  const ticksY = [0, 10, 20, 30, 40, 50, 60];
  const langkah = (lebar - m.kiri - m.kanan) / data.length < 9 ? 10 : 5;

  const batang = data
    .map((d) => {
      const v = Math.min(d.inflasi, BATAS);
      const x0 = x(d.tahun)!;
      const aktif = d.tahun >= mulai;
      const warna = aktif ? "var(--hijau)" : "var(--garis-kuat)";
      if (v >= 0) {
        const yy = y(v);
        const h = y(0) - yy;
        const rr = Math.min(r, h);
        // Ujung data membulat, pangkal di garis nol tetap rata.
        const d0 = `M${x0},${y(0)}V${yy + rr}Q${x0},${yy} ${x0 + rr},${yy}H${x0 + w - rr}Q${x0 + w},${yy} ${x0 + w},${yy + rr}V${y(0)}Z`;
        const potong =
          d.inflasi > BATAS
            ? `<path d="M${x0 - 1},${yy + 7}l${w + 2},-4M${x0 - 1},${yy + 11}l${w + 2},-4" stroke="var(--kertas)" stroke-width="2"/>`
            : "";
        return `<path d="${d0}" fill="${warna}"/>${potong}`;
      }
      return `<rect x="${x0}" y="${y(0)}" width="${w}" height="${y(v) - y(0)}" rx="${r}" fill="${warna}"/>`;
    })
    .join("");

  const diatas = data.filter((d) => d.inflasi > BATAS);
  const krisis = data.find((d) => d.tahun === 1998);

  wadah.innerHTML = `
  <svg viewBox="0 0 ${lebar} ${tinggi}" width="${lebar}" height="${tinggi}" aria-hidden="true">
    <g class="kisi">${ticksY.map((v) => `<line x1="${m.kiri}" x2="${lebar - m.kanan}" y1="${y(v)}" y2="${y(v)}"/>`).join("")}</g>
    <g class="sumbu">
      ${ticksY.map((v) => `<text x="${m.kiri - 6}" y="${y(v) + 4}" text-anchor="end">${v}%</text>`).join("")}
      ${data
        .filter((d) => d.tahun % langkah === 0)
        .map((d) => `<text x="${x(d.tahun)! + w / 2}" y="${tinggi - 6}" text-anchor="middle">${d.tahun}</text>`)
        .join("")}
    </g>
    ${batang}
    ${
      diatas.length
        ? `<text class="anotasi" x="${x(diatas.at(-1)!.tahun)! + w + 6}" y="${y(BATAS) + 10}">${esc(
            diatas.map((d) => `${d.tahun}: ${persen(d.inflasi)}`).join(" · "),
          )}</text>`
        : ""
    }
    ${krisis ? `<text class="anotasi" x="${x(1998)! + w / 2}" y="${y(Math.min(krisis.inflasi, BATAS)) - 8}" text-anchor="middle">krisis moneter · ${esc(persen(krisis.inflasi))}</text>` : ""}
    <line class="nol" x1="${m.kiri}" x2="${lebar - m.kanan}" y1="${y(0)}" y2="${y(0)}"/>
    <rect class="area-hover" x="${m.kiri}" y="${m.atas}" width="${lebar - m.kanan - m.kiri}" height="${tinggi - m.atas - m.bawah}" fill="transparent"/>
  </svg>`;

  const svg = wadah.querySelector("svg")!;
  const tip = buatTip(wadah);
  const area = svg.querySelector(".area-hover")!;
  const gerak = (e: PointerEvent) => {
    const kotak = svg.getBoundingClientRect();
    const px = ((e.clientX - kotak.left) / kotak.width) * lebar;
    const i = Math.max(0, Math.min(data.length - 1, Math.floor((px - m.kiri) / x.step())));
    const d = data[i];
    const skala = kotak.width / lebar;
    tip.tampil(
      (x(d.tahun)! + w / 2) * skala,
      y(Math.min(Math.max(d.inflasi, 0), BATAS)) * skala,
      `<p class="tip-judul">${d.tahun}</p>
       <div class="tip-baris"><i style="background:var(--hijau)"></i><span>Inflasi</span><b>${esc(persen(d.inflasi))}</b></div>
       <div class="tip-baris"><i></i><span>Kurs</span><b>Rp${Math.round(d.kurs).toLocaleString("id-ID")}/US$</b></div>`,
    );
  };
  area.addEventListener("pointermove", gerak as EventListener);
  area.addEventListener("pointerdown", gerak as EventListener);
  area.addEventListener("pointerleave", () => tip.sembunyi());
}
