import { qs, qsa, setQuery } from "./utils.js";
import { state, applyFilters } from "./filters.js";
import { fmt } from "./utils.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs,
  getDoc,
  doc,
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";

// Firebase 설정
const firebaseConfig = {
  apiKey: "AIzaSyCUOvPVhd1zgVOJq3a88MeE4Ew1QgB42xU",
  authDomain: "vision-ac00e.firebaseapp.com",
  projectId: "vision-ac00e",
  storageBucket: "vision-ac00e.firebasestorage.app",
  messagingSenderId: "973829787287",
  appId: "1:973829787287:web:3ca6b7f51dceda8eb123d2",
  measurementId: "G-71PFXDK6S4",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let raw = [];

async function load() {
  try {
    console.log("🔥 Firebase에서 매물 로드 중...");

    // 매물 데이터 로드 (인덱스 오류 방지)
    const snap = await getDocs(collection(db, "listings"));

    raw = snap.docs
      .map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
      .filter((item) => item.status === "published") // 게시된 매물만
      .sort((a, b) => {
        // createdAt으로 정렬
        const aTime = a.createdAt?.seconds || 0;
        const bTime = b.createdAt?.seconds || 0;
        return bTime - aTime;
      });

    console.log(`✅ ${raw.length}개 매물 로드 완료`);

    // 필터 옵션 로드 및 UI에 반영
    await loadFilterOptions();

    bindUI();
    render();
  } catch (error) {
    console.error("❌ 매물 로드 실패:", error);

    // 에러 메시지 표시
    const gridEl = qs("#grid");
    if (gridEl) {
      gridEl.innerHTML = `
        <div class="col-span-full text-center py-12">
          <div class="text-red-600 mb-2">
            <i class="fas fa-exclamation-triangle text-4xl"></i>
          </div>
          <p class="text-slate-700 font-semibold mb-2">데이터 로드 실패</p>
          <p class="text-slate-500 text-sm">${error.message}</p>
          <button 
            onclick="location.reload()" 
            class="mt-4 px-6 py-2 bg-navy-900 text-white rounded-lg hover:bg-navy-800 transition">
            다시 시도
          </button>
        </div>
      `;
    }
  }
}

// 필터 옵션 로드 및 select 업데이트
async function loadFilterOptions() {
  try {
    console.log("📋 필터 옵션 로드 중...");

    // 지역 옵션
    const regionsDoc = await getDoc(doc(db, "filterOptions", "regions"));
    const regions = regionsDoc.exists()
      ? regionsDoc.data().options
      : ["인천 남동구", "시흥시", "김포시"];

    // 용도 옵션
    const purposesDoc = await getDoc(doc(db, "filterOptions", "purposes"));
    const purposes = purposesDoc.exists()
      ? purposesDoc.data().options
      : ["공장", "창고", "사무"];

    // 거래유형 옵션
    const dealTypesDoc = await getDoc(doc(db, "filterOptions", "dealTypes"));
    const dealTypes = dealTypesDoc.exists()
      ? dealTypesDoc.data().options
      : ["분양", "매매", "전세", "월세"];

    console.log("✅ 필터 옵션 로드 완료");

    // select 요소 업데이트
    updateSelectOptions("region", regions);
    updateSelectOptions("purpose", purposes);

    // 거래유형 탭 버튼 업데이트
    updateDealTypeTabs(dealTypes);
  } catch (error) {
    console.error("⚠️ 필터 옵션 로드 실패, 기본값 사용:", error);
  }
}

// select 옵션 업데이트
function updateSelectOptions(selectId, options) {
  const selectEl = qs(`#${selectId}`);
  if (!selectEl) return;

  const currentValue = selectEl.value;
  const placeholder = selectEl.querySelector("option[value='']");

  selectEl.innerHTML = "";
  if (placeholder) {
    selectEl.appendChild(placeholder.cloneNode(true));
  }

  options.forEach((opt) => {
    const option = document.createElement("option");
    option.value = opt;
    option.textContent = opt;
    selectEl.appendChild(option);
  });

  if (currentValue) {
    selectEl.value = currentValue;
  }
}

// 거래유형 탭 버튼 업데이트
function updateDealTypeTabs(dealTypes) {
  const tabContainer = document.querySelector("[data-deal]")?.parentElement;
  if (!tabContainer) return;

  // 기존 버튼들 저장 (전체 버튼 유지)
  const allBtn = document.querySelector('[data-deal="전체"]');

  // 컨테이너 초기화
  tabContainer.innerHTML = "";

  // 전체 버튼 추가
  if (allBtn) {
    tabContainer.appendChild(allBtn);
  }

  // 각 거래유형별 버튼 생성
  dealTypes.forEach((dealType) => {
    const btn = document.createElement("button");
    btn.dataset.deal = dealType;
    btn.className =
      "px-8 py-3 bg-white text-slate-700 rounded-2xl font-bold text-sm shadow-md hover:shadow-lg transition-all whitespace-nowrap border border-slate-200";
    btn.textContent = dealType;
    tabContainer.appendChild(btn);
  });
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
          href="tel:0328125001" 
          class="py-2 px-3 border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors text-sm font-semibold"
          aria-label="전화 문의"
          title="전화 문의"
        >
          <i class="fas fa-phone"></i>
        </a>
        <a 
          href="https://pf.kakao.com/_channelId" 
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
