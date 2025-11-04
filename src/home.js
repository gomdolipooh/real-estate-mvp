// 메인 페이지 전용 JavaScript
import { qs } from "./utils.js";
import { fmt } from "./utils.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs,
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

// 매물 데이터 로드
let listings = [];

async function loadListings() {
  try {
    console.log("🔥 Firebase에서 매물 로드 중...");
    
    // 인덱스 오류 해결: 단순 쿼리로 변경
    const snap = await getDocs(collection(db, "listings"));

    listings = snap.docs
      .map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
      .filter((item) => item.status === "published") // 클라이언트 사이드 필터링
      .sort((a, b) => {
        // createdAt으로 정렬
        const aTime = a.createdAt?.seconds || 0;
        const bTime = b.createdAt?.seconds || 0;
        return bTime - aTime;
      });

    console.log(`✅ ${listings.length}개 매물 로드 완료`);
    renderCategories();
  } catch (error) {
    console.error("⚠️ Firebase 매물 로드 실패, 샘플 데이터 사용:", error);
    // Firebase 로드 실패 시 샘플 데이터만 사용
    renderCategories();
  }
}

// 매물 카드 생성 함수
function createListingCard(listing) {
  // 가격 포맷 헬퍼 함수
  const formatPrice = (n) => {
    if (!n) return "0";
    return n.toLocaleString("ko-KR") + "만";
  };

  // 가격 텍스트 생성
  let priceText = "";
  if (listing.dealType === "매매" || listing.dealType === "분양") {
    priceText = listing.price ? `${listing.dealType} ${formatPrice(listing.price)}` : `${listing.dealType}`;
  } else if (listing.dealType === "전세") {
    priceText = listing.deposit ? `전세 ${formatPrice(listing.deposit)}` : "전세";
  } else if (listing.dealType === "월세") {
    const depositText = formatPrice(listing.deposit || 0);
    const rentText = formatPrice(listing.rent || 0);
    priceText = `${depositText} / ${rentText}`;
  } else {
    priceText = listing.dealType || "문의";
  }

  // 이미지 URL (첫 번째 이미지 또는 placeholder)
  const imageUrl = (listing.images && listing.images[0]) ? listing.images[0] : "/assets/placeholder.jpg";

  return `
    <article class="group bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden">
      <div class="aspect-video bg-gradient-to-br from-slate-200 to-slate-300 relative overflow-hidden">
        <img src="${imageUrl}" alt="${listing.title}" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" onerror="this.src='/assets/placeholder.jpg'" />
        <div class="absolute top-3 left-3">
          <span class="px-3 py-1 bg-navy-900 text-white text-xs font-bold rounded-full">
            ${listing.dealType || "문의"}
          </span>
        </div>
      </div>
      <div class="p-5">
        <h4 class="font-bold text-lg text-slate-900 mb-3 line-clamp-2 group-hover:text-blue-600 transition-colors">
          ${listing.title}
        </h4>
        <div class="space-y-2 mb-4">
          <p class="text-2xl font-black text-navy-900">
            ${priceText}
          </p>
          <div class="flex items-center gap-2 text-sm text-slate-600">
            <i class="fas fa-map-marker-alt text-slate-400"></i>
            <span>${listing.region || "지역 미정"}</span>
          </div>
          <div class="flex items-center gap-4 text-sm text-slate-600">
            <span class="flex items-center gap-1">
              <i class="fas fa-ruler-combined text-slate-400"></i>
              ${listing.sizePyeong || "-"}평
            </span>
            <span class="flex items-center gap-1">
              <i class="fas fa-layer-group text-slate-400"></i>
              ${listing.floor || "-"}
            </span>
          </div>
        </div>
        <div class="flex gap-2">
          <a href="listing.html?id=${listing.id}" class="flex-1 px-4 py-2 bg-navy-900 text-white text-sm font-semibold rounded-lg hover:bg-navy-800 transition-colors text-center">
            상세보기
          </a>
          <a href="tel:0328125001" class="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors">
            <i class="fas fa-phone"></i>
          </a>
        </div>
      </div>
    </article>
  `;
}

// 샘플 매물 데이터 생성
function generateSampleListings() {
  const samples = {
    small: [
      { id: 2001, title: "남동공단 소형 공장 임대 - 주차 편리", dealType: "월세", deposit: 3000, rent: 300, sizePyeong: 80, floor: "1/2", region: "인천 남동구", images: ["/assets/placeholder.jpg"], contact: { phone: "0328125001" } },
      { id: 2002, title: "시흥 정왕동 창고형 공장", dealType: "월세", deposit: 2500, rent: 250, sizePyeong: 65, floor: "1/1", region: "시흥시 정왕동", images: ["/assets/placeholder.jpg"], contact: { phone: "0328125001" } },
      { id: 2003, title: "고잔동 소형 사무실 겸 창고", dealType: "전세", deposit: 5000, rent: 0, sizePyeong: 45, floor: "2/3", region: "인천 남동구 고잔동", images: ["/assets/placeholder.jpg"], contact: { phone: "0328125001" } },
      { id: 2004, title: "남동공단 1층 소형 공장 - 즉시입주", dealType: "월세", deposit: 2000, rent: 200, sizePyeong: 55, floor: "1/1", region: "인천 남동구", images: ["/assets/placeholder.jpg"], contact: { phone: "0328125001" } },
      { id: 2005, title: "신축급 소형 창고 - 전력충분", dealType: "월세", deposit: 3500, rent: 350, sizePyeong: 90, floor: "1/2", region: "인천 남동구 논현동", images: ["/assets/placeholder.jpg"], contact: { phone: "0328125001" } }
    ],
    medium: [
      { id: 3001, title: "남동공단 중형 공장 임대 - 호이스트 3t", dealType: "월세", deposit: 8000, rent: 800, sizePyeong: 180, floor: "1/2", region: "인천 남동구", images: ["/assets/placeholder.jpg"], contact: { phone: "0328125001" } },
      { id: 3002, title: "시화공단 2층 공장 - 전력 500kw", dealType: "월세", deposit: 12000, rent: 1200, sizePyeong: 250, floor: "2/2", region: "시흥시 정왕동", images: ["/assets/placeholder.jpg"], contact: { phone: "0328125001" } },
      { id: 3003, title: "남동공단 단독 공장 매매", dealType: "매매", deposit: 0, rent: 0, price: 150000, sizePyeong: 200, floor: "1/1", region: "인천 남동구 고잔동", images: ["/assets/placeholder.jpg"], contact: { phone: "0328125001" } },
      { id: 3004, title: "논현동 중형 창고 - 주차장 넓음", dealType: "월세", deposit: 10000, rent: 1000, sizePyeong: 220, floor: "1/1", region: "인천 남동구 논현동", images: ["/assets/placeholder.jpg"], contact: { phone: "0328125001" } },
      { id: 3005, title: "간석동 공장 겸 사무실", dealType: "전세", deposit: 25000, rent: 0, sizePyeong: 160, floor: "1/3", region: "인천 남동구 간석동", images: ["/assets/placeholder.jpg"], contact: { phone: "0328125001" } }
    ],
    large: [
      { id: 4001, title: "남동공단 대형 공장 - 호이스트 10t", dealType: "월세", deposit: 25000, rent: 2500, sizePyeong: 450, floor: "1/1", region: "인천 남동구", images: ["/assets/placeholder.jpg"], contact: { phone: "0328125001" } },
      { id: 4002, title: "시화공단 단독 공장 매매", dealType: "매매", deposit: 0, rent: 0, price: 380000, sizePyeong: 400, floor: "1/1", region: "시흥시 정왕동", images: ["/assets/placeholder.jpg"], contact: { phone: "0328125001" } },
      { id: 4003, title: "남동공단 대형 물류창고", dealType: "월세", deposit: 30000, rent: 3000, sizePyeong: 380, floor: "1/2", region: "인천 남동구 고잔동", images: ["/assets/placeholder.jpg"], contact: { phone: "0328125001" } },
      { id: 4004, title: "논현동 대형 제조 공장 - 전력 1000kw", dealType: "월세", deposit: 35000, rent: 3500, sizePyeong: 420, floor: "1/1", region: "인천 남동구 논현동", images: ["/assets/placeholder.jpg"], contact: { phone: "0328125001" } },
      { id: 4005, title: "남동공단 신축 대형 공장", dealType: "분양", deposit: 0, rent: 0, price: 450000, sizePyeong: 350, floor: "1/2", region: "인천 남동구", images: ["/assets/placeholder.jpg"], contact: { phone: "0328125001" } }
    ],
    cosmetics: [
      { id: 5001, title: "화장품 제조 공장 - 클린룸 완비", dealType: "월세", deposit: 15000, rent: 1500, sizePyeong: 180, floor: "2/3", region: "인천 남동구", images: ["/assets/placeholder.jpg"], contact: { phone: "0328125001" } },
      { id: 5002, title: "고잔동 화장품 OEM 공장", dealType: "전세", deposit: 35000, rent: 0, sizePyeong: 220, floor: "3/4", region: "인천 남동구 고잔동", images: ["/assets/placeholder.jpg"], contact: { phone: "0328125001" } },
      { id: 5003, title: "신축 화장품 제조시설 - 위생등급 A", dealType: "월세", deposit: 20000, rent: 2000, sizePyeong: 250, floor: "1/2", region: "시흥시", images: ["/assets/placeholder.jpg"], contact: { phone: "0328125001" } },
      { id: 5004, title: "남동공단 화장품 연구소 겸 공장", dealType: "매매", deposit: 0, rent: 0, price: 280000, sizePyeong: 300, floor: "1/1", region: "인천 남동구", images: ["/assets/placeholder.jpg"], contact: { phone: "0328125001" } },
      { id: 5005, title: "정왕동 화장품 포장 공장", dealType: "월세", deposit: 12000, rent: 1200, sizePyeong: 160, floor: "1/2", region: "시흥시 정왕동", images: ["/assets/placeholder.jpg"], contact: { phone: "0328125001" } }
    ],
    metal: [
      { id: 6001, title: "금속 가공 공장 - 크레인 15t", dealType: "월세", deposit: 18000, rent: 1800, sizePyeong: 320, floor: "1/1", region: "인천 남동구", images: ["/assets/placeholder.jpg"], contact: { phone: "0328125001" } },
      { id: 6002, title: "기계 부품 제조 공장 - 전력충분", dealType: "월세", deposit: 22000, rent: 2200, sizePyeong: 280, floor: "1/2", region: "시흥시", images: ["/assets/placeholder.jpg"], contact: { phone: "0328125001" } },
      { id: 6003, title: "남동공단 금속 프레스 공장", dealType: "매매", deposit: 0, rent: 0, price: 320000, sizePyeong: 350, floor: "1/1", region: "인천 남동구 고잔동", images: ["/assets/placeholder.jpg"], contact: { phone: "0328125001" } },
      { id: 6004, title: "정밀 기계 가공 공장 - 천장고 8m", dealType: "월세", deposit: 25000, rent: 2500, sizePyeong: 290, floor: "1/1", region: "인천 남동구 논현동", images: ["/assets/placeholder.jpg"], contact: { phone: "0328125001" } },
      { id: 6005, title: "금속 절단 및 용접 공장", dealType: "전세", deposit: 45000, rent: 0, sizePyeong: 310, floor: "1/2", region: "시흥시 정왕동", images: ["/assets/placeholder.jpg"], contact: { phone: "0328125001" } }
    ],
    food: [
      { id: 7001, title: "식품 제조 공장 - HACCP 인증", dealType: "월세", deposit: 16000, rent: 1600, sizePyeong: 200, floor: "1/2", region: "인천 남동구", images: ["/assets/placeholder.jpg"], contact: { phone: "0328125001" } },
      { id: 7002, title: "고잔동 냉동창고 겸 식품공장", dealType: "월세", deposit: 20000, rent: 2000, sizePyeong: 240, floor: "1/1", region: "인천 남동구 고잔동", images: ["/assets/placeholder.jpg"], contact: { phone: "0328125001" } },
      { id: 7003, title: "신축 식품 가공 시설 - 위생시설 완비", dealType: "분양", deposit: 0, rent: 0, price: 250000, sizePyeong: 180, floor: "1/3", region: "시흥시", images: ["/assets/placeholder.jpg"], contact: { phone: "0328125001" } },
      { id: 7004, title: "남동공단 베이커리 공장", dealType: "전세", deposit: 30000, rent: 0, sizePyeong: 160, floor: "1/2", region: "인천 남동구", images: ["/assets/placeholder.jpg"], contact: { phone: "0328125001" } },
      { id: 7005, title: "정왕동 식품 포장 공장 - 즉시입주", dealType: "월세", deposit: 14000, rent: 1400, sizePyeong: 190, floor: "2/2", region: "시흥시 정왕동", images: ["/assets/placeholder.jpg"], contact: { phone: "0328125001" } }
    ]
  };
  return samples;
}

// 카테고리별 매물 렌더링
function renderCategories() {
  console.log(`📊 카테고리별 매물 렌더링 시작 (총 ${listings.length}개)`);

  // 매물이 없을 때 샘플 데이터 사용
  if (listings.length === 0) {
    console.log("⚠️ 등록된 매물이 없어 샘플 데이터 사용");
    const sampleData = generateSampleListings();
    
    renderCategory("#category-small", sampleData.small.slice(0, 3));
    renderCategory("#category-medium", sampleData.medium.slice(0, 3));
    renderCategory("#category-large", sampleData.large.slice(0, 3));
    renderCategory("#category-cosmetics", sampleData.cosmetics.slice(0, 3));
    renderCategory("#category-metal", sampleData.metal.slice(0, 3));
    renderCategory("#category-food", sampleData.food.slice(0, 3));
    return;
  }

  console.log("✅ 실제 등록된 매물 사용");

  // 각 카테고리별로 매물 가져오기 (featured 우선)
  renderCategory("#category-small", getFeaturedListings("small"));
  renderCategory("#category-medium", getFeaturedListings("medium"));
  renderCategory("#category-large", getFeaturedListings("large"));
  renderCategory("#category-cosmetics", getFeaturedListings("cosmetics"));
  renderCategory("#category-metal", getFeaturedListings("metal"));
  renderCategory("#category-food", getFeaturedListings("food"));
}

// 카테고리별 매물 가져오기 (featured 우선, 없으면 자동 필터링)
function getFeaturedListings(category) {
  console.log(`\n📋 ${category} 카테고리 처리 시작`);
  console.log(`총 매물 수: ${listings.length}`);
  
  // 디버깅: 모든 매물의 featured 필드 확인
  listings.forEach((l, idx) => {
    if (l.featured) {
      console.log(`매물 ${idx}: "${l.title}" - featured:`, l.featured);
    }
  });
  
  // 1. featured 필드가 있는 매물 찾기
  const featuredItems = listings
    .filter(l => {
      const hasFeatured = l.featured && l.featured[category];
      if (hasFeatured) {
        console.log(`✅ Featured 발견: "${l.title}" - ${category} ${l.featured[category]}순위`);
      }
      return hasFeatured;
    })
    .sort((a, b) => a.featured[category] - b.featured[category])
    .slice(0, 3);

  console.log(`✨ ${category}: featured 매물 ${featuredItems.length}개 발견`);

  if (featuredItems.length >= 3) {
    console.log(`→ Featured 매물 3개로 충분, 반환:`, featuredItems.map(f => f.title));
    return featuredItems;
  }

  // 2. featured 매물이 부족하면 자동 필터링으로 채우기
  console.log(`🔄 ${category}: featured ${featuredItems.length}개 + 자동 필터링으로 채우기`);
  
  let autoFiltered = [];
  
  switch(category) {
    case "small":
      autoFiltered = listings.filter(l => 
        l.sizePyeong && l.sizePyeong < 100 && 
        !featuredItems.some(f => f.id === l.id)
      );
      break;
    case "medium":
      autoFiltered = listings.filter(l => 
        l.sizePyeong && l.sizePyeong >= 100 && l.sizePyeong <= 300 &&
        !featuredItems.some(f => f.id === l.id)
      );
      break;
    case "large":
      autoFiltered = listings.filter(l => 
        l.sizePyeong && l.sizePyeong >= 300 && l.sizePyeong <= 500 &&
        !featuredItems.some(f => f.id === l.id)
      );
      break;
    case "cosmetics":
      autoFiltered = listings.filter(l => 
        ((l.title && l.title.includes("화장품")) || (l.purpose && l.purpose.includes("화장품"))) &&
        !featuredItems.some(f => f.id === l.id)
      );
      break;
    case "metal":
      autoFiltered = listings.filter(l => 
        ((l.title && (l.title.includes("금속") || l.title.includes("기계") || l.title.includes("부품"))) ||
         (l.purpose && (l.purpose.includes("금속") || l.purpose.includes("기계") || l.purpose.includes("부품")))) &&
        !featuredItems.some(f => f.id === l.id)
      );
      break;
    case "food":
      autoFiltered = listings.filter(l => 
        ((l.title && l.title.includes("식품")) || (l.purpose && l.purpose.includes("식품"))) &&
        !featuredItems.some(f => f.id === l.id)
      );
      break;
  }

  // featured + 자동 필터링 결합하여 3개 반환
  return [...featuredItems, ...autoFiltered].slice(0, 3);
}

// 카테고리 렌더링 헬퍼 함수
function renderCategory(containerId, listingsData) {
  const container = qs(containerId);
  if (!container) return;

  if (listingsData.length === 0) {
    container.innerHTML = `
      <div class="col-span-full text-center py-12 text-slate-500">
        <i class="fas fa-inbox text-4xl mb-3"></i>
        <p>등록된 매물이 없습니다.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = listingsData.map(createListingCard).join("");
}

// 페이지 로드 시 매물 데이터 가져오기
loadListings();

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
  });
}

// 검색 폼 처리 - listings.html로 리다이렉트
const searchForm = qs("#searchForm");
if (searchForm) {
  searchForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const q = qs("#q").value;
    if (q) {
      window.location.href = `listings.html?q=${encodeURIComponent(q)}`;
    } else {
      window.location.href = "listings.html";
    }
  });
}

// 모바일 검색 폼 처리
const mobileSearchForm = qs("#mobileSearchForm");
if (mobileSearchForm) {
  mobileSearchForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const q = qs("#mobileQ").value;
    if (q) {
      window.location.href = `listings.html?q=${encodeURIComponent(q)}`;
    } else {
      window.location.href = "listings.html";
    }
  });
}
