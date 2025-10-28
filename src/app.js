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
  // 데스크탑 검색창
  const searchForm = qs("#searchForm");
  if (searchForm) {
    searchForm.addEventListener("submit", (e) => {
      e.preventDefault();
      state.q = qs("#q").value;
      state.page = 1;
      setQuery({ q: state.q, page: state.page });
      render();
    });
  }

  // 모바일 검색창
  const mobileSearchForm = qs("#mobileSearchForm");
  if (mobileSearchForm) {
    mobileSearchForm.addEventListener("submit", (e) => {
      e.preventDefault();
      state.q = qs("#mobileQ").value;
      state.page = 1;
      setQuery({ q: state.q, page: state.page });
      render();
    });
  }

  // 모바일 햄버거 메뉴 토글
  const mobileMenuToggle = qs("#mobileMenuToggle");
  const mobileDrawer = qs("#mobileDrawer");
  if (mobileMenuToggle && mobileDrawer) {
    mobileMenuToggle.addEventListener("click", () => {
      const isExpanded =
        mobileMenuToggle.getAttribute("aria-expanded") === "true";
      mobileDrawer.classList.toggle("hidden");
      mobileMenuToggle.setAttribute("aria-expanded", !isExpanded);
      mobileMenuToggle.setAttribute(
        "aria-label",
        isExpanded ? "메뉴 열기" : "메뉴 닫기"
      );

      // 아이콘 변경
      const icon = mobileMenuToggle.querySelector("i");
      if (icon) {
        icon.className = isExpanded
          ? "fas fa-bars text-xl"
          : "fas fa-times text-xl";
      }
    });

    // 모바일 드로어 내 링크 클릭 시 드로어 닫기
    qsa("#mobileDrawer a").forEach((link) => {
      link.addEventListener("click", () => {
        mobileDrawer.classList.add("hidden");
        mobileMenuToggle.setAttribute("aria-expanded", "false");
        mobileMenuToggle.setAttribute("aria-label", "메뉴 열기");
        const icon = mobileMenuToggle.querySelector("i");
        if (icon) {
          icon.className = "fas fa-bars text-xl";
        }
      });
    });
  }

  // 거래 탭
  qsa("button[data-deal]").forEach((btn) => {
    btn.addEventListener("click", () => {
      qsa("button[data-deal]").forEach((b) => {
        b.classList.remove("bg-navy-900", "text-white");
        b.classList.add("bg-white", "text-slate-700", "border");
      });
      btn.classList.remove(
        "bg-white",
        "text-slate-700",
        "border",
        "border-slate-200"
      );
      btn.classList.add("bg-navy-900", "text-white", "shadow-md");
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
  qsa("[href^='#']").forEach((a) =>
    a.addEventListener("click", (e) => {
      const href = a.getAttribute("href");
      if (href.startsWith("#")) {
        e.preventDefault();
        document.querySelector(href)?.scrollIntoView({ behavior: "smooth" });
      }
    })
  );
}

function render() {
  const list = applyFilters(raw);
  const start = (state.page - 1) * state.perPage;
  const pageList = list.slice(start, start + state.perPage);

  // 현재 필터 조건 수집
  const activeFilters = [];
  if (state.region) activeFilters.push(state.region);
  if (state.purpose) activeFilters.push(state.purpose);
  if (state.minSize) activeFilters.push(`최소 ${state.minSize}평`);
  if (state.maxSize) activeFilters.push(`최대 ${state.maxSize}평`);
  if (state.minPrice) activeFilters.push(`최소 ${fmt.num(state.minPrice)}만원`);
  if (state.maxPrice) activeFilters.push(`최대 ${fmt.num(state.maxPrice)}만원`);

  // Summary 렌더링
  const summaryEl = qs("#summary");
  if (activeFilters.length > 0) {
    summaryEl.innerHTML = `
      <div class="flex flex-wrap items-center gap-2">
        <span class="font-bold text-slate-900">검색결과 ${list.length.toLocaleString(
          "ko-KR"
        )}건</span>
        <span class="text-slate-400">·</span>
        ${activeFilters
          .map(
            (filter) => `
          <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-navy-900 text-white">
            ${filter}
          </span>
        `
          )
          .join("")}
      </div>
    `;
  } else {
    summaryEl.textContent = `검색결과 ${list.length.toLocaleString("ko-KR")}건`;
  }

  const html = pageList
    .map(
      (it) => `
    <div class="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-lg scale-100 hover:scale-[1.01] transition-all duration-200 ease-out overflow-hidden">
      <!-- 이미지 영역 -->
      <div class="relative">
        <img 
          src="${it.images?.[0] || "/assets/placeholder.jpg"}" 
          alt="${it.title}" 
          class="w-full h-48 object-cover rounded-t-2xl" 
          loading="lazy"
        />
        <!-- 거래유형 배지 (좌측 상단) -->
        <span class="absolute top-3 left-3 px-2 py-1 text-xs font-semibold bg-white/90 backdrop-blur-sm text-navy-900 border border-white rounded-full">
          ${it.dealType}
        </span>
      </div>
      
      <!-- 본문 -->
      <div class="p-3.5">
        <!-- 제목 -->
        <h3 class="line-clamp-2 font-semibold text-slate-900 mb-2 text-sm leading-tight">
          ${it.title}
        </h3>
        
        <!-- 가격 -->
        <div class="font-bold text-slate-900 mb-2 text-base">
          ${
            it.price
              ? fmt.price(it.price)
              : `<span class="text-slate-600 text-xs font-normal">보증금 ${fmt.price(
                  it.deposit
                )}</span><span class="text-slate-400 mx-1">/</span><span class="text-slate-900 font-bold">월세 ${fmt.price(
                  it.rent
                )}</span>`
          }
        </div>
        
        <!-- 메타 정보 -->
        <div class="text-slate-500 text-sm mb-3">
          ${it.region} · ${fmt.pyeong(it.sizePyeong)} · ${it.floor}
        </div>
      </div>
      
      <!-- CTA 바 -->
      <div class="border-t border-slate-200 p-3 flex gap-2">
        <a 
          href="/listing.html?id=${it.id}" 
          class="flex-1 text-center py-2 px-3 bg-navy-900 text-white rounded-xl hover:bg-navy-800 transition-colors text-sm font-semibold"
          aria-label="${it.title} 상세보기"
        >
          상세보기
        </a>
        <a 
          href="tel:${it.contact.phone}" 
          class="py-2 px-3 border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors text-sm font-semibold"
          aria-label="전화 문의"
          title="전화 문의"
        >
          <i class="fas fa-phone"></i>
        </a>
        <a 
          href="https://pf.kakao.com/${it.contact.kakao}" 
          target="_blank"
          class="py-2 px-3 border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors text-sm font-semibold"
          aria-label="카카오톡 문의"
          title="카카오톡 문의"
        >
          <i class="fas fa-comment"></i>
        </a>
      </div>
    </div>
  `
    )
    .join("");
  qs("#grid").innerHTML = html;
}

load();
