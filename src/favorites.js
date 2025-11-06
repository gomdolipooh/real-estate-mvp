import { qs, qsa } from "./utils.js";
import { fmt } from "./utils.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs,
  getDoc,
  doc,
  setDoc,
  deleteDoc,
  query,
  where,
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";
import {
  getAuth,
  onAuthStateChanged,
  signOut,
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

let currentUser = null;
let favorites = [];
let listings = [];

// 인증 상태 확인
onAuthStateChanged(auth, async (user) => {
  console.log("🔐 인증 상태 변경:", user ? user.email : "로그아웃");
  
  const loginRequired = qs("#loginRequired");
  const favoritesContent = qs("#favoritesContent");
  const loading = qs("#loading");
  
  // 상단 바 UI 업데이트
  const topAuthButtons = qs("#topAuthButtons");
  const topUserInfo = qs("#topUserInfo");
  const topUserEmailSpan = qs("#topUserEmail");

  if (user) {
    currentUser = user;
    console.log("✅ 로그인 상태 확인:", user.uid);
    
    // 상단 바 업데이트
    if (topAuthButtons) topAuthButtons.classList.add("hidden");
    if (topUserInfo) {
      topUserInfo.classList.remove("hidden");
      if (topUserEmailSpan) topUserEmailSpan.textContent = user.email;
    }
    
    if (loginRequired) loginRequired.classList.add("hidden");
    if (loading) loading.classList.remove("hidden");
    
    // 찜한 매물 로드
    await loadFavorites();
  } else {
    currentUser = null;
    console.log("❌ 로그아웃 상태");
    
    // 상단 바 업데이트
    if (topAuthButtons) topAuthButtons.classList.remove("hidden");
    if (topUserInfo) topUserInfo.classList.add("hidden");
    
    if (loading) loading.classList.add("hidden");
    if (loginRequired) loginRequired.classList.remove("hidden");
    if (favoritesContent) favoritesContent.classList.add("hidden");
  }
});

// 로그인 페이지로 이동
const goToLoginBtn = qs("#goToLoginBtn");
if (goToLoginBtn) {
  goToLoginBtn.addEventListener("click", () => {
    window.location.href = "/index.html";
  });
}

// 찜한 매물 로드
async function loadFavorites() {
  try {
    console.log("💝 찜한 매물 로드 중...");

    // 사용자의 찜한 매물 ID 목록 가져오기
    const favoritesSnap = await getDocs(
      query(collection(db, "favorites"), where("userId", "==", currentUser.uid))
    );

    const favoriteIds = favoritesSnap.docs.map((doc) => doc.data().listingId);

    console.log(`찜한 매물 ${favoriteIds.length}개 발견`);

    if (favoriteIds.length === 0) {
      showEmptyState();
      return;
    }

    // 모든 매물 데이터 로드
    const listingsSnap = await getDocs(collection(db, "listings"));
    listings = listingsSnap.docs
      .map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
      .filter((item) => item.status === "published" && favoriteIds.includes(item.id));

    console.log(`✅ ${listings.length}개 매물 로드 완료`);

    if (listings.length === 0) {
      showEmptyState();
    } else {
      renderFavorites();
    }
  } catch (error) {
    console.error("❌ 찜한 매물 로드 실패:", error);
    alert("찜한 매물을 불러오는 중 오류가 발생했습니다.");
    showEmptyState();
  }
}

// 빈 상태 표시
function showEmptyState() {
  const loading = qs("#loading");
  const favoritesContent = qs("#favoritesContent");
  const emptyState = qs("#emptyState");

  if (loading) loading.classList.add("hidden");
  if (favoritesContent) {
    favoritesContent.classList.remove("hidden");
    if (emptyState) emptyState.classList.remove("hidden");
  }
  qs("#grid").innerHTML = "";
  qs("#summary").textContent = "";
}

// 찜한 매물 렌더링
function renderFavorites() {
  const loading = qs("#loading");
  const favoritesContent = qs("#favoritesContent");
  const emptyState = qs("#emptyState");
  const summaryEl = qs("#summary");

  if (loading) loading.classList.add("hidden");
  if (favoritesContent) favoritesContent.classList.remove("hidden");
  if (emptyState) emptyState.classList.add("hidden");

  if (summaryEl) {
    summaryEl.textContent = `찜한 매물 ${listings.length.toLocaleString("ko-KR")}건`;
  }

  const html = listings
    .map(
      (it) => `
    <div class="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-lg transition-all duration-200 overflow-hidden">
      <!-- 이미지 영역 -->
      <div class="relative">
        <img 
          src="${it.images?.[0] || "/assets/placeholder.jpg"}" 
          alt="${it.title}" 
          class="w-full h-48 object-cover rounded-t-2xl" 
          loading="lazy"
        />
        <!-- 거래유형 배지 -->
        <span class="absolute top-3 left-3 px-2 py-1 text-xs font-semibold bg-white/90 backdrop-blur-sm text-navy-900 border border-white rounded-full">
          ${it.dealType}
        </span>
        <!-- 찜 해제 버튼 -->
        <button 
          onclick="removeFavorite('${it.id}')"
          class="absolute top-3 right-3 w-10 h-10 bg-red-500 text-white rounded-full hover:bg-red-600 transition-all shadow-lg"
          title="찜 해제"
        >
          <i class="fas fa-heart"></i>
        </button>
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
        >
          상세보기
        </a>
        <a 
          href="tel:0328125001" 
          class="py-2 px-3 border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors text-sm font-semibold"
        >
          <i class="fas fa-phone"></i>
        </a>
      </div>
    </div>
  `
    )
    .join("");
  qs("#grid").innerHTML = html;
}

// 찜 해제
window.removeFavorite = async function (listingId) {
  console.log("💔 removeFavorite 호출됨:", listingId);
  
  if (!currentUser) {
    alert("로그인이 필요합니다.");
    return;
  }

  if (!confirm("찜한 매물에서 제거하시겠습니까?")) return;

  try {
    console.log("💔 찜 해제 시작...");
    
    // favorites 컬렉션에서 삭제
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

    console.log("✅ 찜 해제 완료:", listingId);
    
    // 목록 새로고침
    await loadFavorites();
  } catch (error) {
    console.error("❌ 찜 해제 실패:", error);
    alert("찜 해제 중 오류가 발생했습니다: " + error.message);
  }
};

// 로그아웃 처리
const topLogoutBtn = qs("#topLogoutBtn");
if (topLogoutBtn) {
  topLogoutBtn.addEventListener("click", async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!confirm("로그아웃하시겠습니까?")) return;
    
    try {
      await signOut(auth);
      console.log("✅ 로그아웃 완료");
      window.location.href = "/index.html";
    } catch (error) {
      console.error("❌ 로그아웃 실패:", error);
      alert("로그아웃 중 오류가 발생했습니다.");
    }
  });
}

