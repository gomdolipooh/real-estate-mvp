import { qs, qsa, setQuery } from "./utils.js";
import { state, applyFilters } from "./filters.js";
import { fmt } from "./utils.js";

let raw = [];

async function load() {
  const r = await fetch("/data/listings.json");
  raw = await r.json();
  bindUI();
  render();
}

function bindUI() {
  // 검색창
  qs("#searchForm").addEventListener("submit", (e) => {
    e.preventDefault();
    state.q = qs("#q").value;
    state.page = 1;
    setQuery({ q: state.q, page: state.page });
    render();
  });

  // 거래 탭
  qsa("#dealTabs button").forEach((btn) => {
    btn.addEventListener("click", () => {
      qsa("#dealTabs button").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      state.deal = btn.dataset.deal;
      state.page = 1;
      setQuery({ deal: state.deal, page: state.page });
      render();
    });
  });

  // 필터
  qs("#applyFilters").addEventListener("click", () => {
    state.region = qs("#region").value;
    state.purpose = qs("#purpose").value;
    state.minSize = qs("#minSize").value;
    state.maxSize = qs("#maxSize").value;
    state.minPrice = qs("#minPrice").value;
    state.maxPrice = qs("#maxPrice").value;
    state.page = 1;
    setQuery({
      region: state.region,
      purpose: state.purpose,
      minSize: state.minSize,
      maxSize: state.maxSize,
      minPrice: state.minPrice,
      maxPrice: state.maxPrice,
      page: state.page,
    });
    render();
  });
  qs("#resetFilters").addEventListener("click", () => {
    location.search = "";
  });

  // 헤더 내 앵커 스크롤
  qsa("[data-scroll]").forEach((a) =>
    a.addEventListener("click", (e) => {
      e.preventDefault();
      const sel = a.getAttribute("data-scroll");
      document.querySelector(sel)?.scrollIntoView({ behavior: "smooth" });
    })
  );
}

function render() {
  const list = applyFilters(raw);
  const start = (state.page - 1) * state.perPage;
  const pageList = list.slice(start, start + state.perPage);

  qs("#summary").textContent = `검색결과 ${list.length.toLocaleString(
    "ko-KR"
  )}건`;

  const html = pageList
    .map(
      (it) => `
    <article class="card">
      <img src="${it.images?.[0] || "/assets/placeholder.jpg"}" alt="${
        it.title
      }" />
      <div class="pad">
        <span class="badge">${it.dealType}</span>
        <span class="badge">${it.purpose}</span>
        <h3>${it.title}</h3>
        <div class="price">${
          it.price
            ? fmt.price(it.price)
            : `보증금 ${fmt.price(it.deposit)} / 월세 ${fmt.price(it.rent)}`
        }</div>
        <div class="meta">${it.region} · ${fmt.pyeong(it.sizePyeong)} · ${
        it.floor
      }</div>
      </div>
      <div class="cta-row">
        <a class="cta" href="/listing.html?id=${it.id}">상세보기</a>
        <a class="cta" href="tel:${it.contact.phone}">전화</a>
        <a class="cta" href="https://pf.kakao.com/${
          it.contact.kakao
        }" target="_blank">카톡</a>
      </div>
    </article>
  `
    )
    .join("");
  qs("#grid").innerHTML = html;
}

load();
