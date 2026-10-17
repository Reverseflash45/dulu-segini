import "./gaya.css";
import "./metode.css";
import { SUMBER, TAHUN_AKHIR } from "./model";

document.querySelectorAll("[data-tahun-akhir]").forEach((el) => (el.textContent = String(TAHUN_AKHIR)));
document.querySelectorAll("[data-wdi]").forEach((el) => (el.textContent = SUMBER.wdi.ihk));
document.querySelectorAll("[data-pink]").forEach((el) => (el.textContent = SUMBER.pinkSheet.replace("Updated on", "diperbarui")));
