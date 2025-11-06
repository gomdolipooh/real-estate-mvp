// 메인 페이지 전용 JavaScript
import { qs } from "./utils.js";
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

// 최근 본 매물 관리
const RECENT_LISTINGS_KEY = "recentListings";
const MAX_RECENT_ITEMS = 10;
let currentUser = null;
let userFavorites = new Set(); // 사용자의 찜한 매물 ID 목록

function getRecentListings() {
  const storageKey = currentUser 
    ? RECENT_LISTINGS_KEY + "_" + currentUser.uid 
    : RECENT_LISTINGS_KEY + "_guest";
  
  try {
    const stored = localStorage.getItem(storageKey);
    if (!stored) return [];
    
    const items = JSON.parse(stored);
    const now = Date.now();
    const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;
    
    // 30일 이상 지난 항목 자동 삭제
    const filtered = items.filter(item => {
      return (now - item.timestamp) < THIRTY_DAYS;
    });
    
    if (filtered.length !== items.length) {
      localStorage.setItem(storageKey, JSON.stringify(filtered));
    }
    
    return filtered;
  } catch (error) {
    console.error("최근 본 매물 로드 실패:", error);
    return [];
  }
}

function clearRecentListings() {
  const storageKey = currentUser 
    ? RECENT_LISTINGS_KEY + "_" + currentUser.uid 
    : RECENT_LISTINGS_KEY + "_guest";
  
  try {
    localStorage.removeItem(storageKey);
    renderRecentListings();
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
    renderRecentListings(); // 최근 본 매물 렌더링
  } catch (error) {
    console.error("⚠️ Firebase 매물 로드 실패, 샘플 데이터 사용:", error);
    // Firebase 로드 실패 시 샘플 데이터만 사용
    renderCategories();
    renderRecentListings(); // 최근 본 매물 렌더링
  }
}

// 매물 카드 생성 함수
function createListingCard(listing, colorTheme = null) {
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

  // 색상 테마 적용
  const borderClass = colorTheme ? `border-4 ${colorTheme.border}` : 'border border-slate-200';
  const btnClass = colorTheme ? colorTheme.btn : 'bg-navy-900 hover:bg-navy-800';
  const hoverBorderClass = colorTheme ? colorTheme.hover : 'hover:border-slate-300';

  // 찜하기 버튼 (로그인한 상태에서만)
  const isFavorited = userFavorites.has(listing.id);
  const heartIcon = isFavorited ? "fas fa-heart" : "far fa-heart";
  const heartColor = isFavorited ? "text-red-500" : "text-slate-400 hover:text-red-500";
  const favoriteButton = currentUser ? `
    <button 
      onclick="toggleFavorite('${listing.id}')"
      data-favorite-id="${listing.id}"
      class="absolute top-3 right-3 w-10 h-10 bg-white/90 backdrop-blur-sm ${heartColor} rounded-full hover:bg-white transition-all shadow-md"
      title="${isFavorited ? '찜 해제' : '찜하기'}"
    >
      <i class="${heartIcon}"></i>
    </button>` : '';

  return `
    <article class="group bg-white rounded-2xl ${borderClass} ${hoverBorderClass} shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden">
      <div class="aspect-video bg-gradient-to-br from-slate-200 to-slate-300 relative overflow-hidden">
        <img src="${imageUrl}" alt="${listing.title}" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" onerror="this.src='/assets/placeholder.jpg'" />
        <div class="absolute top-3 left-3">
          <span class="px-3 py-1 bg-navy-900 text-white text-xs font-bold rounded-full">
            ${listing.dealType || "문의"}
          </span>
        </div>
        ${favoriteButton}
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
          <a href="listing.html?id=${listing.id}" class="flex-1 px-4 py-2 ${btnClass} text-white text-sm font-semibold rounded-lg transition-colors text-center">
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
    
    renderCategory("#category-small", sampleData.small.slice(0, 3), getColorTheme('small'));
    renderCategory("#category-medium", sampleData.medium.slice(0, 3), getColorTheme('medium'));
    renderCategory("#category-large", sampleData.large.slice(0, 3), getColorTheme('large'));
    renderCategory("#category-cosmetics", sampleData.cosmetics.slice(0, 3), getColorTheme('cosmetics'));
    renderCategory("#category-metal", sampleData.metal.slice(0, 3), getColorTheme('metal'));
    renderCategory("#category-food", sampleData.food.slice(0, 3), getColorTheme('food'));
    return;
  }

  console.log("✅ 실제 등록된 매물 사용");

  // 각 카테고리별로 매물 가져오기 (featured 우선)
  renderCategory("#category-small", getFeaturedListings("small"), getColorTheme('small'));
  renderCategory("#category-medium", getFeaturedListings("medium"), getColorTheme('medium'));
  renderCategory("#category-large", getFeaturedListings("large"), getColorTheme('large'));
  renderCategory("#category-cosmetics", getFeaturedListings("cosmetics"), getColorTheme('cosmetics'));
  renderCategory("#category-metal", getFeaturedListings("metal"), getColorTheme('metal'));
  renderCategory("#category-food", getFeaturedListings("food"), getColorTheme('food'));
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
function renderCategory(containerId, listingsData, colorTheme = null) {
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

  container.innerHTML = listingsData.map(listing => createListingCard(listing, colorTheme)).join("");
}

// 카테고리별 색상 테마 가져오기
function getColorTheme(category) {
  const themes = {
    'small': { border: 'border-blue-500', btn: 'bg-blue-600 hover:bg-blue-700', hover: 'hover:border-blue-500' },
    'medium': { border: 'border-purple-500', btn: 'bg-purple-600 hover:bg-purple-700', hover: 'hover:border-purple-500' },
    'large': { border: 'border-emerald-500', btn: 'bg-emerald-600 hover:bg-emerald-700', hover: 'hover:border-emerald-500' },
    'cosmetics': { border: 'border-pink-500', btn: 'bg-pink-600 hover:bg-pink-700', hover: 'hover:border-pink-500' },
    'metal': { border: 'border-orange-500', btn: 'bg-orange-600 hover:bg-orange-700', hover: 'hover:border-orange-500' },
    'food': { border: 'border-red-500', btn: 'bg-red-600 hover:bg-red-700', hover: 'hover:border-red-500' }
  };
  return themes[category] || { border: 'border-slate-200', btn: 'bg-navy-900 hover:bg-navy-800', hover: 'hover:border-slate-300' };
}

// 페이지 로드 시 매물 데이터 가져오기
loadListings();

// 평수별 탭 전환
const sizeTabBtns = document.querySelectorAll('[data-size-tab]');
const sizeHeader = document.getElementById('size-category-header');

sizeTabBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const tabName = btn.dataset.sizeTab;
    
    // 모든 탭 버튼 비활성화
    sizeTabBtns.forEach(b => {
      b.classList.remove('active', 'border-blue-500', 'border-purple-500', 'border-emerald-500', 'shadow-lg');
      b.classList.add('border-slate-200', 'shadow-md');
    });
    
    // 클릭한 탭 활성화
    btn.classList.add('active', 'shadow-lg');
    btn.classList.remove('border-slate-200', 'shadow-md');
    
    // 헤더 업데이트
    let headerContent = '';
    let headerClass = '';
    let linkHref = '';
    let btnColor = '';
    
    if (tabName === 'small') {
      btn.classList.add('border-blue-500');
      headerClass = 'from-blue-50 to-blue-100 border-blue-500';
      btnColor = 'bg-blue-600 hover:bg-blue-700';
      linkHref = 'listings.html?maxSize=100';
      headerContent = `
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center text-white text-xl flex-shrink-0">
            <i class="fas fa-home"></i>
          </div>
          <div>
            <h4 class="text-2xl font-bold text-slate-900 mb-1">소형 평수 TOP 3</h4>
            <p class="text-sm text-slate-700">100평 미만 | 소규모 사업에 최적화된 공간</p>
          </div>
        </div>
        <a href="${linkHref}" class="hidden md:inline-flex items-center gap-2 px-6 py-3 ${btnColor} text-white rounded-xl transition-all font-semibold text-sm">
          <span>전체보기</span>
          <i class="fas fa-arrow-right"></i>
        </a>
      `;
    } else if (tabName === 'medium') {
      btn.classList.add('border-purple-500');
      headerClass = 'from-purple-50 to-purple-100 border-purple-500';
      btnColor = 'bg-purple-600 hover:bg-purple-700';
      linkHref = 'listings.html?minSize=100&maxSize=300';
      headerContent = `
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center text-white text-xl flex-shrink-0">
            <i class="fas fa-warehouse"></i>
          </div>
          <div>
            <h4 class="text-2xl font-bold text-slate-900 mb-1">중형 평수 TOP 3</h4>
            <p class="text-sm text-slate-700">100평 ~ 300평 | 중소기업 규모에 적합한 공간</p>
          </div>
        </div>
        <a href="${linkHref}" class="hidden md:inline-flex items-center gap-2 px-6 py-3 ${btnColor} text-white rounded-xl transition-all font-semibold text-sm">
          <span>전체보기</span>
          <i class="fas fa-arrow-right"></i>
        </a>
      `;
    } else if (tabName === 'large') {
      btn.classList.add('border-emerald-500');
      headerClass = 'from-emerald-50 to-emerald-100 border-emerald-500';
      btnColor = 'bg-emerald-600 hover:bg-emerald-700';
      linkHref = 'listings.html?minSize=300&maxSize=500';
      headerContent = `
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center text-white text-xl flex-shrink-0">
            <i class="fas fa-industry"></i>
          </div>
          <div>
            <h4 class="text-2xl font-bold text-slate-900 mb-1">대형 평수 TOP 3</h4>
            <p class="text-sm text-slate-700">300평 ~ 500평 | 대규모 생산 시설에 최적화</p>
          </div>
        </div>
        <a href="${linkHref}" class="hidden md:inline-flex items-center gap-2 px-6 py-3 ${btnColor} text-white rounded-xl transition-all font-semibold text-sm">
          <span>전체보기</span>
          <i class="fas fa-arrow-right"></i>
        </a>
      `;
    }
    
    // 헤더 클래스 업데이트
    sizeHeader.className = `mb-6 p-6 rounded-2xl border-4 bg-gradient-to-r ${headerClass}`;
    sizeHeader.querySelector('.flex.items-center.justify-between').innerHTML = headerContent;
    
    // 모든 매물 컨테이너 숨기기
    document.getElementById('category-small').classList.add('hidden');
    document.getElementById('category-medium').classList.add('hidden');
    document.getElementById('category-large').classList.add('hidden');
    
    // 선택한 카테고리만 표시
    document.getElementById(`category-${tabName}`).classList.remove('hidden');
  });
});

// 업종별 탭 전환
const industryTabBtns = document.querySelectorAll('[data-industry-tab]');
const industryHeader = document.getElementById('industry-category-header');

industryTabBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const tabName = btn.dataset.industryTab;
    
    // 모든 탭 버튼 비활성화
    industryTabBtns.forEach(b => {
      b.classList.remove('active', 'border-pink-500', 'border-orange-500', 'border-red-500', 'shadow-lg');
      b.classList.add('border-slate-200', 'shadow-md');
    });
    
    // 클릭한 탭 활성화
    btn.classList.add('active', 'shadow-lg');
    btn.classList.remove('border-slate-200', 'shadow-md');
    
    // 헤더 업데이트
    let headerContent = '';
    let headerClass = '';
    let linkHref = '';
    let btnColor = '';
    
    if (tabName === 'cosmetics') {
      btn.classList.add('border-pink-500');
      headerClass = 'from-pink-50 to-pink-100 border-pink-500';
      btnColor = 'bg-pink-600 hover:bg-pink-700';
      linkHref = 'listings.html?q=화장품';
      headerContent = `
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 bg-gradient-to-br from-pink-500 to-pink-600 rounded-xl flex items-center justify-center text-white text-xl flex-shrink-0">
            <i class="fas fa-flask"></i>
          </div>
          <div>
            <h4 class="text-2xl font-bold text-slate-900 mb-1">화장품 공장 TOP 3</h4>
            <p class="text-sm text-slate-700">청정 환경이 필요한 화장품 제조 시설</p>
          </div>
        </div>
        <a href="${linkHref}" class="hidden md:inline-flex items-center gap-2 px-6 py-3 ${btnColor} text-white rounded-xl transition-all font-semibold text-sm">
          <span>전체보기</span>
          <i class="fas fa-arrow-right"></i>
        </a>
      `;
    } else if (tabName === 'metal') {
      btn.classList.add('border-orange-500');
      headerClass = 'from-orange-50 to-orange-100 border-orange-500';
      btnColor = 'bg-orange-600 hover:bg-orange-700';
      linkHref = 'listings.html?q=금속';
      headerContent = `
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center text-white text-xl flex-shrink-0">
            <i class="fas fa-cogs"></i>
          </div>
          <div>
            <h4 class="text-2xl font-bold text-slate-900 mb-1">금속·기계·부품 제조 공장 TOP 3</h4>
            <p class="text-sm text-slate-700">중장비 작업이 가능한 제조 시설</p>
          </div>
        </div>
        <a href="${linkHref}" class="hidden md:inline-flex items-center gap-2 px-6 py-3 ${btnColor} text-white rounded-xl transition-all font-semibold text-sm">
          <span>전체보기</span>
          <i class="fas fa-arrow-right"></i>
        </a>
      `;
    } else if (tabName === 'food') {
      btn.classList.add('border-red-500');
      headerClass = 'from-red-50 to-red-100 border-red-500';
      btnColor = 'bg-red-600 hover:bg-red-700';
      linkHref = 'listings.html?q=식품';
      headerContent = `
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center text-white text-xl flex-shrink-0">
            <i class="fas fa-utensils"></i>
          </div>
          <div>
            <h4 class="text-2xl font-bold text-slate-900 mb-1">식품 공장 TOP 3</h4>
            <p class="text-sm text-slate-700">위생 시설이 완비된 식품 제조 공간</p>
          </div>
        </div>
        <a href="${linkHref}" class="hidden md:inline-flex items-center gap-2 px-6 py-3 ${btnColor} text-white rounded-xl transition-all font-semibold text-sm">
          <span>전체보기</span>
          <i class="fas fa-arrow-right"></i>
        </a>
      `;
    }
    
    // 헤더 클래스 업데이트
    industryHeader.className = `mb-6 p-6 rounded-2xl border-4 bg-gradient-to-r ${headerClass}`;
    industryHeader.querySelector('.flex.items-center.justify-between').innerHTML = headerContent;
    
    // 모든 매물 컨테이너 숨기기
    document.getElementById('category-cosmetics').classList.add('hidden');
    document.getElementById('category-metal').classList.add('hidden');
    document.getElementById('category-food').classList.add('hidden');
    
    // 선택한 카테고리만 표시
    document.getElementById(`category-${tabName}`).classList.remove('hidden');
  });
});

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

function openMobileDrawer() {
  if (mobileRecentDrawer && drawerContent) {
    mobileRecentDrawer.classList.remove("hidden");
    setTimeout(() => {
      drawerContent.classList.remove("translate-x-full");
    }, 10);
    document.body.style.overflow = "hidden";
  }
}

function closeMobileDrawer() {
  if (mobileRecentDrawer && drawerContent) {
    drawerContent.classList.add("translate-x-full");
    setTimeout(() => {
      mobileRecentDrawer.classList.add("hidden");
      document.body.style.overflow = "";
    }, 300);
  }
}

if (mobileRecentBtn) {
  mobileRecentBtn.addEventListener("click", openMobileDrawer);
}

if (closeDrawerBtn) {
  closeDrawerBtn.addEventListener("click", closeMobileDrawer);
}

if (mobileRecentDrawer) {
  // 배경 클릭 시 닫기
  mobileRecentDrawer.addEventListener("click", (e) => {
    if (e.target === mobileRecentDrawer) {
      closeMobileDrawer();
    }
  });
}

// ==================== 인증 기능 ====================

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

// 로그인 상태 확인
onAuthStateChanged(auth, async (user) => {
  // 상단 바
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
    
    // 카테고리 다시 렌더링 (찜하기 버튼 표시)
    renderCategories();

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
    
    // 카테고리 다시 렌더링 (찜하기 버튼 숨김)
    renderCategories();
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
      console.log("⚠️ 사용자 문서 없음 (신규 사용자일 수 있음)");
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

// 이벤트 리스너 (상단 바)
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
        // 사용자 문서가 없으면 생성 (기존 계정 대응)
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
        // 기존 사용자 - role 가져오기
        const userData = userDocSnap.data();
        userRole = userData.role || "user";
        
        // 마지막 로그인 시간만 업데이트
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
    } else if (error.code === "auth/user-not-found") {
      msgEl.textContent = "존재하지 않는 계정입니다.";
    } else if (error.code === "auth/wrong-password") {
      msgEl.textContent = "비밀번호가 잘못되었습니다.";
    } else {
      msgEl.textContent = "로그인 실패: " + error.message;
    }
  }
}

const loginSubmitBtn = qs("#loginSubmitBtn");
if (loginSubmitBtn) {
  loginSubmitBtn.addEventListener("click", handleLogin);
}

// 로그인 모달에서 엔터키 처리
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
        role: "user", // 기본값: 일반회원
        createdAt: serverTimestamp(),
        lastLoginAt: serverTimestamp(),
      });
      console.log("✅ 사용자 정보 Firestore에 저장 완료");
    } catch (firestoreError) {
      console.error("⚠️ Firestore 저장 실패:", firestoreError);
      // Firestore 저장 실패해도 회원가입은 성공으로 처리
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
    } else if (error.code === "auth/weak-password") {
      msgEl.textContent = "비밀번호가 너무 약합니다. 6자 이상 입력해주세요.";
    } else {
      msgEl.textContent = "회원가입 실패: " + error.message;
    }
  }
}

const signupSubmitBtn = qs("#signupSubmitBtn");
if (signupSubmitBtn) {
  signupSubmitBtn.addEventListener("click", handleSignup);
}

// 회원가입 모달에서 엔터키 처리
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

