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
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  query,
  where,
  addDoc,
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";

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
const auth = getAuth(app);

// Admin 이메일 목록
const ADMIN_EMAILS = ["admin@vision.com", "vs1705@daum.net"];

let raw = [];
let currentUser = null;
let userFavorites = new Set(); // 사용자의 찜한 매물 ID 목록

// 최근 본 매물 관리
const RECENT_LISTINGS_KEY = "recentListings";
const MAX_RECENT_ITEMS = 10;

function getRecentListings() {
  // 로그인 안해도 임시로 표시 (로그인하지 않으면 localStorage key에 'guest' 사용)
  const storageKey = currentUser 
    ? RECENT_LISTINGS_KEY + "_" + currentUser.uid 
    : RECENT_LISTINGS_KEY + "_guest";
  
  try {
    const stored = localStorage.getItem(storageKey);
    if (!stored) return [];
    
    const items = JSON.parse(stored);
    const now = Date.now();
    const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000; // 30일
    
    // 30일 이상 지난 항목 자동 삭제
    const filtered = items.filter(item => {
      return (now - item.timestamp) < THIRTY_DAYS;
    });
    
    // 필터링된 결과가 원본과 다르면 저장
    if (filtered.length !== items.length) {
      localStorage.setItem(storageKey, JSON.stringify(filtered));
    }
    
    return filtered;
  } catch (error) {
    console.error("최근 본 매물 로드 실패:", error);
    return [];
  }
}

function saveRecentListing(listing) {
  const storageKey = currentUser 
    ? RECENT_LISTINGS_KEY + "_" + currentUser.uid 
    : RECENT_LISTINGS_KEY + "_guest";
  
  try {
    let recent = getRecentListings();
    
    // 이미 존재하는 항목 제거 (중복 방지)
    recent = recent.filter(item => item.id !== listing.id);
    
    // 맨 앞에 추가
    recent.unshift({
      id: listing.id,
      title: listing.title,
      dealType: listing.dealType,
      price: listing.price,
      deposit: listing.deposit,
      rent: listing.rent,
      region: listing.region,
      sizePyeong: listing.sizePyeong,
      floor: listing.floor,
      images: listing.images,
      timestamp: Date.now()
    });
    
    // 최대 개수 제한
    recent = recent.slice(0, MAX_RECENT_ITEMS);
    
    localStorage.setItem(storageKey, JSON.stringify(recent));
    renderRecentListings();
    
    console.log("📌 최근 본 매물 저장:", listing.title);
  } catch (error) {
    console.error("최근 본 매물 저장 실패:", error);
  }
}

function clearRecentListings() {
  const storageKey = currentUser 
    ? RECENT_LISTINGS_KEY + "_" + currentUser.uid 
    : RECENT_LISTINGS_KEY + "_guest";
  
  try {
    localStorage.removeItem(storageKey);
    renderRecentListings();
    console.log("🗑️ 최근 본 매물 전체 삭제");
  } catch (error) {
    console.error("최근 본 매물 삭제 실패:", error);
  }
}

function renderRecentListings() {
  const container = qs("#recentListingsContainer");
  const mobileContainer = qs("#mobileRecentListingsContainer");
  const recentCountBadge = qs("#recentCount");
  
  const recent = getRecentListings();
  
  // 카운트 배지 업데이트
  if (recentCountBadge) {
    if (recent.length > 0) {
      recentCountBadge.textContent = recent.length;
      recentCountBadge.classList.remove("hidden");
    } else {
      recentCountBadge.classList.add("hidden");
    }
  }
  
  const emptyHTML = `
    <div class="p-8 text-center">
      <i class="fas fa-eye-slash text-4xl text-slate-300 mb-3"></i>
      <p class="text-slate-500 text-sm">최근 본 매물이 없습니다</p>
      <p class="text-slate-400 text-xs mt-1">매물을 클릭하면 여기에 표시됩니다</p>
    </div>
  `;
  
  const html = recent.length === 0 ? emptyHTML : recent.map(item => `
    <a href="/listing.html?id=${item.id}" class="block p-3 hover:bg-slate-50 transition-colors">
      <div class="flex gap-3">
        <img 
          src="${item.images?.[0] || "/assets/placeholder.jpg"}" 
          alt="${item.title}"
          class="w-20 h-20 object-cover rounded-lg flex-shrink-0"
          loading="lazy"
        />
        <div class="flex-1 min-w-0">
          <div class="flex items-start justify-between gap-2 mb-1">
            <span class="text-xs font-semibold text-navy-900 bg-slate-100 px-2 py-0.5 rounded">
              ${item.dealType}
            </span>
          </div>
          <h3 class="text-sm font-semibold text-slate-900 line-clamp-2 mb-1">
            ${item.title}
          </h3>
          <p class="text-xs font-bold text-navy-900 mb-1">
            ${item.price 
              ? fmt.price(item.price) 
              : `${fmt.price(item.deposit)} / ${fmt.price(item.rent)}`
            }
          </p>
          <p class="text-xs text-slate-500">
            ${item.region} · ${fmt.pyeong(item.sizePyeong)}
          </p>
        </div>
      </div>
    </a>
  `).join("");
  
  // 데스크탑 사이드바 업데이트
  if (container) {
    container.innerHTML = html;
  }
  
  // 모바일 드로어 업데이트
  if (mobileContainer) {
    mobileContainer.innerHTML = html;
  }
}

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
    renderRecentListings(); // 최근 본 매물 렌더링
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

  // 최근 본 매물 전체 삭제 (데스크탑)
  const clearBtn = qs("#clearRecentListings");
  if (clearBtn) {
    clearBtn.addEventListener("click", (e) => {
      e.stopPropagation(); // 헤더 클릭 이벤트 방지
      if (confirm("최근 본 매물을 모두 삭제하시겠습니까?")) {
        clearRecentListings();
      }
    });
  }

  // 최근 본 매물 토글 (접기/펼치기)
  const toggleBtn = qs("#toggleRecentListings");
  const recentContent = qs("#recentListingsContent");
  const recentHeader = qs("#recentHeader");
  let isExpanded = true; // 초기 상태: 펼쳐짐

  function toggleRecentListings() {
    if (!recentContent || !toggleBtn) return;

    isExpanded = !isExpanded;
    const icon = toggleBtn.querySelector("i");

    if (isExpanded) {
      // 펼치기
      recentContent.style.maxHeight = "calc(100vh - 13rem)";
      recentContent.style.opacity = "1";
      if (icon) {
        icon.className = "fas fa-chevron-up text-lg";
      }
    } else {
      // 접기
      recentContent.style.maxHeight = "0";
      recentContent.style.opacity = "0";
      if (icon) {
        icon.className = "fas fa-chevron-down text-lg";
      }
    }
  }

  if (toggleBtn) {
    toggleBtn.addEventListener("click", (e) => {
      e.stopPropagation(); // 헤더 클릭 이벤트 방지
      toggleRecentListings();
    });
  }

  // 헤더 전체 클릭 시에도 토글
  if (recentHeader) {
    recentHeader.addEventListener("click", (e) => {
      // 버튼이 아닌 헤더 영역 클릭 시에만 토글
      if (e.target === recentHeader || e.target.closest("h2") || e.target.closest(".fa-clock-rotate-left")) {
        toggleRecentListings();
      }
    });
  }

  // 최근 본 매물 전체 삭제 (모바일)
  const clearMobileBtn = qs("#clearMobileRecentListings");
  if (clearMobileBtn) {
    clearMobileBtn.addEventListener("click", () => {
      if (confirm("최근 본 매물을 모두 삭제하시겠습니까?")) {
        clearRecentListings();
      }
    });
  }

  // 모바일 최근 본 매물 드로어
  const mobileRecentBtn = qs("#mobileRecentBtn");
  const mobileRecentDrawer = qs("#mobileRecentDrawer");
  const drawerContent = qs("#drawerContent");
  const closeDrawerBtn = qs("#closeMobileDrawer");

  function openMobileRecentDrawer() {
    if (mobileRecentDrawer && drawerContent) {
      mobileRecentDrawer.classList.remove("hidden");
      setTimeout(() => {
        drawerContent.classList.remove("translate-x-full");
      }, 10);
      document.body.style.overflow = "hidden";
    }
  }

  function closeMobileRecentDrawer() {
    if (mobileRecentDrawer && drawerContent) {
      drawerContent.classList.add("translate-x-full");
      setTimeout(() => {
        mobileRecentDrawer.classList.add("hidden");
        document.body.style.overflow = "";
      }, 300);
    }
  }

  if (mobileRecentBtn) {
    mobileRecentBtn.addEventListener("click", openMobileRecentDrawer);
  }

  if (closeDrawerBtn) {
    closeDrawerBtn.addEventListener("click", closeMobileRecentDrawer);
  }

  if (mobileRecentDrawer) {
    // 배경 클릭 시 닫기
    mobileRecentDrawer.addEventListener("click", (e) => {
      if (e.target === mobileRecentDrawer) {
        closeMobileRecentDrawer();
      }
    });
  }
}

function render() {
  console.log("🎨 render() 호출됨");
  console.log("👤 currentUser:", currentUser ? currentUser.email : "없음");
  console.log("💝 userFavorites size:", userFavorites.size);
  
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

  console.log(`📊 렌더링 매물 수: ${pageList.length}`);
  
  const html = pageList
    .map(
      (it) => {
        const isFavorited = userFavorites.has(it.id);
        const heartIcon = isFavorited ? "fas fa-heart" : "far fa-heart";
        const heartColor = isFavorited ? "text-red-500" : "text-slate-400 hover:text-red-500";
        
        // 찜하기 버튼 HTML (로그인한 상태에서만)
        const favoriteButton = currentUser ? `
        <!-- 찜하기 버튼 (우측 상단) -->
        <button 
          onclick="toggleFavorite('${it.id}')"
          data-favorite-id="${it.id}"
          class="absolute top-3 right-3 w-10 h-10 bg-white/90 backdrop-blur-sm ${heartColor} rounded-full hover:bg-white transition-all shadow-md"
          title="${isFavorited ? '찜 해제' : '찜하기'}"
        >
          <i class="${heartIcon}"></i>
        </button>` : '';
        
        return `
    <div class="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-lg scale-100 hover:scale-[1.01] transition-all duration-200 ease-out overflow-hidden" data-listing-id="${it.id}">
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
        ${favoriteButton}
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
          class="listing-detail-link flex-1 text-center py-2 px-3 bg-navy-900 text-white rounded-xl hover:bg-navy-800 transition-colors text-sm font-semibold"
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
  `;
      }
    )
    .join("");
  qs("#grid").innerHTML = html;

  // 매물 클릭 이벤트 등록 (최근 본 매물 저장)
  qsa(".listing-detail-link").forEach((link) => {
    link.addEventListener("click", (e) => {
      const card = e.target.closest("[data-listing-id]");
      if (card) {
        const listingId = card.dataset.listingId;
        const listing = pageList.find((it) => it.id === listingId);
        if (listing) {
          saveRecentListing(listing);
        }
      }
    });
  });
}

load();

// ==================== 인증 기능 ====================

// 로그인 상태 확인
onAuthStateChanged(auth, async (user) => {
  const topAuthButtons = qs("#topAuthButtons");
  const topUserInfo = qs("#topUserInfo");
  const topUserEmailSpan = qs("#topUserEmail");

  if (user) {
    currentUser = user;
    
    // 로그인 상태
    if (topAuthButtons) topAuthButtons.classList.add("hidden");
    if (topUserInfo) {
      topUserInfo.classList.remove("hidden");
      if (topUserEmailSpan) topUserEmailSpan.textContent = user.email;
    }

    // 사용자의 찜한 매물 로드
    await loadUserFavorites();
    
    // 최근 본 매물 다시 렌더링
    renderRecentListings();
    
    // 찜한 매물 로드 후 UI 업데이트 (현재 페이지가 렌더링되어 있으면)
    if (qs("#grid")?.innerHTML) {
      render(); // 찜하기 버튼 상태 업데이트
    }

    // Admin 계정 체크 - Firestore에서 role 확인
    await checkAdminRole(user);
  } else {
    currentUser = null;
    userFavorites.clear();
    
    // 로그아웃 상태
    if (topAuthButtons) topAuthButtons.classList.remove("hidden");
    if (topUserInfo) topUserInfo.classList.add("hidden");
    
    // 최근 본 매물 숨기기
    renderRecentListings();
    
    // 찜하기 버튼 초기화 (현재 페이지가 렌더링되어 있으면)
    if (qs("#grid")?.innerHTML) {
      render();
    }
  }
});

// Firestore에서 사용자 role 확인하여 Admin 여부 체크
async function checkAdminRole(user) {
  try {
    const userDocRef = doc(db, "users", user.uid);
    const userDocSnap = await getDoc(userDocRef);
    
    if (userDocSnap.exists()) {
      const userData = userDocSnap.data();
      if (userData.role === "admin") {
        console.log("🔑 Admin 권한 확인:", user.email);
        showAdminButton();
      } else {
        console.log("👤 일반 사용자:", user.email);
      }
    } else {
      console.log("⚠️ 사용자 문서 없음");
    }
  } catch (error) {
    console.error("❌ Admin 권한 확인 실패:", error);
  }
}

// Admin 버튼 표시
function showAdminButton() {
  const topUserInfo = qs("#topUserInfo");
  if (topUserInfo && !qs("#topAdminPageBtn")) {
    const adminBtn = document.createElement("a");
    adminBtn.id = "topAdminPageBtn";
    adminBtn.href = "/admin/index.html";
    adminBtn.className = "px-3 py-1 text-xs font-semibold bg-red-600 text-white hover:bg-red-700 rounded transition-all";
    adminBtn.innerHTML = '<i class="fas fa-cog mr-1"></i>관리자';
    topUserInfo.insertBefore(adminBtn, topUserInfo.firstChild);
  }
}

// 모달 열기/닫기
const loginModal = qs("#loginModal");
const signupModal = qs("#signupModal");
const topLoginBtn = qs("#topLoginBtn");
const topSignupBtn = qs("#topSignupBtn");
const topLogoutBtn = qs("#topLogoutBtn");
const closeLoginModal = qs("#closeLoginModal");
const closeSignupModal = qs("#closeSignupModal");
const switchToSignup = qs("#switchToSignup");
const switchToLogin = qs("#switchToLogin");

function openLoginModal() {
  if (loginModal) {
    loginModal.classList.remove("hidden");
    loginModal.classList.add("flex");
    document.body.style.overflow = "hidden";
  }
}

function closeLoginModalFunc() {
  if (loginModal) {
    loginModal.classList.add("hidden");
    loginModal.classList.remove("flex");
    document.body.style.overflow = "";
    qs("#loginEmail").value = "";
    qs("#loginPassword").value = "";
    qs("#loginMsg").textContent = "";
  }
}

function openSignupModal() {
  if (signupModal) {
    signupModal.classList.remove("hidden");
    signupModal.classList.add("flex");
    document.body.style.overflow = "hidden";
  }
}

function closeSignupModalFunc() {
  if (signupModal) {
    signupModal.classList.add("hidden");
    signupModal.classList.remove("flex");
    document.body.style.overflow = "";
    qs("#signupEmail").value = "";
    qs("#signupPassword").value = "";
    qs("#signupPasswordConfirm").value = "";
    qs("#signupMsg").textContent = "";
  }
}

// 이벤트 리스너
if (topLoginBtn) topLoginBtn.addEventListener("click", openLoginModal);
if (topSignupBtn) topSignupBtn.addEventListener("click", openSignupModal);
if (closeLoginModal) closeLoginModal.addEventListener("click", closeLoginModalFunc);
if (closeSignupModal) closeSignupModal.addEventListener("click", closeSignupModalFunc);

if (topLogoutBtn) {
  topLogoutBtn.addEventListener("click", async () => {
    try {
      await signOut(auth);
      alert("로그아웃되었습니다.");
    } catch (error) {
      console.error("로그아웃 실패:", error);
      alert("로그아웃 실패: " + error.message);
    }
  });
}

// 모달 전환
if (switchToSignup) {
  switchToSignup.addEventListener("click", () => {
    closeLoginModalFunc();
    openSignupModal();
  });
}

if (switchToLogin) {
  switchToLogin.addEventListener("click", () => {
    closeSignupModalFunc();
    openLoginModal();
  });
}

// 배경 클릭 시 닫기
if (loginModal) {
  loginModal.addEventListener("click", (e) => {
    if (e.target === loginModal) closeLoginModalFunc();
  });
}

if (signupModal) {
  signupModal.addEventListener("click", (e) => {
    if (e.target === signupModal) closeSignupModalFunc();
  });
}

// ==================== 찜하기 기능 ====================

// 사용자의 찜한 매물 로드
async function loadUserFavorites() {
  if (!currentUser) return;

  try {
    const favoritesSnap = await getDocs(
      query(collection(db, "favorites"), where("userId", "==", currentUser.uid))
    );

    userFavorites.clear();
    favoritesSnap.docs.forEach((doc) => {
      userFavorites.add(doc.data().listingId);
    });

    console.log(`💝 찜한 매물 ${userFavorites.size}개 로드`);
  } catch (error) {
    console.error("찜한 매물 로드 실패:", error);
  }
}

// 찜하기 토글
window.toggleFavorite = async function (listingId) {
  console.log("❤️ toggleFavorite 호출됨:", listingId);
  
  if (!currentUser) {
    alert("로그인이 필요합니다.");
    return;
  }

  try {
    if (userFavorites.has(listingId)) {
      // 찜 해제
      console.log("💔 찜 해제 시작...");
      const favoritesSnap = await getDocs(
        query(
          collection(db, "favorites"),
          where("userId", "==", currentUser.uid),
          where("listingId", "==", listingId)
        )
      );

      for (const doc of favoritesSnap.docs) {
        await deleteDoc(doc.ref);
      }

      userFavorites.delete(listingId);
      console.log("✅ 찜 해제 완료:", listingId);
    } else {
      // 찜하기
      console.log("💝 찜하기 시작...");
      await addDoc(collection(db, "favorites"), {
        userId: currentUser.uid,
        listingId: listingId,
        createdAt: serverTimestamp(),
      });

      userFavorites.add(listingId);
      console.log("✅ 찜하기 완료:", listingId);
    }

    // UI 업데이트
    updateFavoriteButton(listingId);
  } catch (error) {
    console.error("❌ 찜하기 처리 실패:", error);
    alert("찜하기 처리 중 오류가 발생했습니다: " + error.message);
  }
};

// 찜하기 버튼 UI 업데이트
function updateFavoriteButton(listingId) {
  const btn = document.querySelector(`[data-favorite-id="${listingId}"]`);
  if (!btn) {
    console.warn("찜하기 버튼을 찾을 수 없습니다:", listingId);
    return;
  }

  const icon = btn.querySelector("i");
  if (userFavorites.has(listingId)) {
    // 찜한 상태
    btn.classList.remove("text-slate-400", "hover:text-red-500");
    btn.classList.add("text-red-500");
    btn.title = "찜 해제";
    if (icon) {
      icon.className = "fas fa-heart";
    }
    console.log("💝 UI 업데이트: 찜한 상태");
  } else {
    // 찜 안한 상태
    btn.classList.remove("text-red-500");
    btn.classList.add("text-slate-400", "hover:text-red-500");
    btn.title = "찜하기";
    if (icon) {
      icon.className = "far fa-heart";
    }
    console.log("💔 UI 업데이트: 찜 안한 상태");
  }
}

// 로그인 처리
async function handleLogin() {
  const email = qs("#loginEmail").value.trim();
  const password = qs("#loginPassword").value;
  const msgEl = qs("#loginMsg");

  if (!email || !password) {
    msgEl.textContent = "이메일과 비밀번호를 입력해주세요.";
    return;
  }

  try {
    msgEl.textContent = "로그인 중...";
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    
    // Firestore에 사용자 정보 저장/업데이트 및 role 확인
    let userRole = "user";
    try {
      const userDocRef = doc(db, "users", userCredential.user.uid);
      const userDocSnap = await getDoc(userDocRef);
      
      if (!userDocSnap.exists()) {
        const isAdmin = ADMIN_EMAILS.includes(userCredential.user.email);
        await setDoc(userDocRef, {
          email: userCredential.user.email,
          role: isAdmin ? "admin" : "user",
          createdAt: serverTimestamp(),
          lastLoginAt: serverTimestamp(),
        });
        userRole = isAdmin ? "admin" : "user";
        console.log("✅ 새 사용자 문서 생성, role:", userRole);
      } else {
        const userData = userDocSnap.data();
        userRole = userData.role || "user";
        
        await updateDoc(userDocRef, {
          lastLoginAt: serverTimestamp(),
        });
        
        console.log("✅ 기존 사용자, role:", userRole);
      }
    } catch (firestoreError) {
      console.warn("⚠️ Firestore 업데이트 실패:", firestoreError);
    }
    
    // Admin role인 경우에만 admin 페이지로 이동
    if (userRole === "admin") {
      console.log("🔑 Admin 계정 확인 - 관리자 페이지로 이동");
      window.location.href = "/admin/index.html";
    } else {
      console.log("👤 일반 사용자 로그인 완료");
      closeLoginModalFunc();
      msgEl.textContent = "";
    }
  } catch (error) {
    console.error("로그인 실패:", error);
    if (error.code === "auth/invalid-credential") {
      msgEl.textContent = "이메일 또는 비밀번호가 잘못되었습니다.";
    } else {
      msgEl.textContent = "로그인 실패: " + error.message;
    }
  }
}

const loginSubmitBtn = qs("#loginSubmitBtn");
if (loginSubmitBtn) {
  loginSubmitBtn.addEventListener("click", handleLogin);
}

// 엔터키로 로그인
const loginEmailInput = qs("#loginEmail");
const loginPasswordInput = qs("#loginPassword");
if (loginEmailInput) {
  loginEmailInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") handleLogin();
  });
}
if (loginPasswordInput) {
  loginPasswordInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") handleLogin();
  });
}

// 회원가입 처리
async function handleSignup() {
  const email = qs("#signupEmail").value.trim();
  const password = qs("#signupPassword").value;
  const passwordConfirm = qs("#signupPasswordConfirm").value;
  const msgEl = qs("#signupMsg");

  if (!email || !password || !passwordConfirm) {
    msgEl.textContent = "모든 필드를 입력해주세요.";
    return;
  }

  if (password.length < 6) {
    msgEl.textContent = "비밀번호는 최소 6자 이상이어야 합니다.";
    return;
  }

  if (password !== passwordConfirm) {
    msgEl.textContent = "비밀번호가 일치하지 않습니다.";
    return;
  }

  try {
    msgEl.textContent = "회원가입 중...";
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    
    // Firestore에 사용자 정보 저장
    try {
      await setDoc(doc(db, "users", userCredential.user.uid), {
        email: userCredential.user.email,
        role: "user",
        createdAt: serverTimestamp(),
        lastLoginAt: serverTimestamp(),
      });
    } catch (firestoreError) {
      console.error("⚠️ Firestore 저장 실패:", firestoreError);
    }
    
    closeSignupModalFunc();
    msgEl.textContent = "";
    alert("회원가입이 완료되었습니다!");
  } catch (error) {
    console.error("회원가입 실패:", error);
    if (error.code === "auth/email-already-in-use") {
      msgEl.textContent = "이미 사용 중인 이메일입니다.";
    } else if (error.code === "auth/invalid-email") {
      msgEl.textContent = "유효하지 않은 이메일 형식입니다.";
    } else {
      msgEl.textContent = "회원가입 실패: " + error.message;
    }
  }
}

const signupSubmitBtn = qs("#signupSubmitBtn");
if (signupSubmitBtn) {
  signupSubmitBtn.addEventListener("click", handleSignup);
}

// 엔터키로 회원가입
const signupEmailInput = qs("#signupEmail");
const signupPasswordInput = qs("#signupPassword");
const signupPasswordConfirmInput = qs("#signupPasswordConfirm");
if (signupEmailInput) {
  signupEmailInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") handleSignup();
  });
}
if (signupPasswordInput) {
  signupPasswordInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") handleSignup();
  });
}
if (signupPasswordConfirmInput) {
  signupPasswordConfirmInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") handleSignup();
  });
}
