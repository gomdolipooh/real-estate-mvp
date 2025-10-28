import { qs, getQuery } from "./utils.js";
import { fmt } from "./utils.js";

async function load() {
  const { id } = getQuery();
  const r = await fetch("/data/listings.json");
  const list = await r.json();
  const it = list.find((x) => String(x.id) === String(id));
  if (!it) {
    qs("#detail").innerHTML = "<p>해당 매물을 찾을 수 없습니다.</p>";
    return;
  }

  document.title = `${it.title} — 비전부동산`;

  qs("#detail").innerHTML = `
    <div class="gallery">
      <img src="${it.images?.[0] || "/assets/placeholder.jpg"}" alt="${
    it.title
  }" />
    </div>
    <div class="info">
      <h1>${it.title}</h1>
      <div class="meta">${it.region} · ${fmt.pyeong(it.sizePyeong)} · ${
    it.floor
  } · ${it.purpose}</div>
      <p class="price">${
        it.price
          ? fmt.price(it.price)
          : `보증금 ${fmt.price(it.deposit)} / 월세 ${fmt.price(it.rent)}`
      }</p>
      <div class="contact">
        <a class="cta" href="tel:${it.contact.phone}">전화문의</a>
        <a class="cta" href="https://pf.kakao.com/${
          it.contact.kakao
        }" target="_blank">카카오톡</a>
        <a class="cta" href="mailto:info@example.com?subject=${encodeURIComponent(
          "[매물문의] " + it.title
        )}">이메일</a>
      </div>
      <hr />
      <ul>
        <li>거래유형: ${it.dealType}</li>
        <li>용도: ${it.purpose}</li>
        <li>면적: ${fmt.pyeong(it.sizePyeong)}</li>
        <li>층: ${it.floor}</li>
        <li>지역: ${it.region}</li>
      </ul>
    </div>
  `;
}

load();
