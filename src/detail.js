import { qs, getQuery } from "./utils.js";
import { fmt } from "./utils.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";
import {
  getFirestore,
  doc,
  getDoc,
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

async function load() {
  const { id } = getQuery();
  
  if (!id) {
    qs("#detail").innerHTML = "<p>매물 ID가 없습니다.</p>";
    return;
  }

  try {
    console.log("🔥 Firebase에서 매물 상세 로드:", id);
    
    const docRef = doc(db, "listings", id);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      qs("#detail").innerHTML = "<p>해당 매물을 찾을 수 없습니다.</p>";
      return;
    }

    const it = {
      id: docSnap.id,
      ...docSnap.data(),
    };

    console.log("✅ 매물 상세 로드 완료");

    document.title = `${it.title} — 비전부동산`;

    // 이미지 배열 준비
    const images = (it.images && it.images.length > 0) ? it.images : ["/assets/placeholder.jpg"];
    const imageCount = images.length;

    // 메인 이미지 갤러리 HTML (쇼핑몰 스타일)
    const galleryHTML = `
      <div class="image-slider">
        <div class="slider-main">
          <img id="mainImage" src="${images[0]}" alt="${it.title}" class="slider-image" />
          
          ${imageCount > 1 ? `
            <!-- 이전/다음 버튼 -->
            <button id="prevBtn" class="slider-btn slider-btn-prev" aria-label="이전 이미지">
              <i class="fas fa-chevron-left"></i>
            </button>
            <button id="nextBtn" class="slider-btn slider-btn-next" aria-label="다음 이미지">
              <i class="fas fa-chevron-right"></i>
            </button>
            
            <!-- 이미지 카운터 -->
            <div class="slider-counter">
              <span id="currentIndex">1</span> / ${imageCount}
            </div>
            
            <!-- 도트 인디케이터 -->
            <div class="slider-dots">
              ${images.map((_, idx) => `
                <button class="dot ${idx === 0 ? 'active' : ''}" data-index="${idx}" aria-label="이미지 ${idx + 1}"></button>
              `).join('')}
            </div>
          ` : ''}
        </div>
        
        ${imageCount > 1 ? `
          <!-- 작은 썸네일 (선택사항) -->
          <div class="slider-thumbnails">
            ${images.map((img, idx) => `
              <button class="thumbnail-btn ${idx === 0 ? 'active' : ''}" data-index="${idx}">
                <img src="${img}" alt="썸네일 ${idx + 1}" />
              </button>
            `).join('')}
          </div>
        ` : ''}
      </div>
    `;

    qs("#detail").innerHTML = `
      ${galleryHTML}
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
          <a class="cta" href="tel:0328125001">전화문의</a>
          <a class="cta" href="https://pf.kakao.com/_channelId" target="_blank">카카오톡</a>
          <a class="cta" href="mailto:vs1705@daum.net?subject=${encodeURIComponent(
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
        ${it.description ? `<hr /><div class="description"><h3>상세 설명</h3><p>${it.description.replace(/\n/g, '<br>')}</p></div>` : ''}
      </div>
    `;

    // 이미지 갤러리 기능 초기화
    if (imageCount > 1) {
      initGallery(images);
    }
  } catch (error) {
    console.error("❌ 매물 로드 실패:", error);
    qs("#detail").innerHTML = `
      <div class="text-center py-8">
        <p class="text-red-600 mb-4">매물을 불러오는 중 오류가 발생했습니다.</p>
        <p class="text-slate-600 text-sm">${error.message}</p>
        <a href="listings.html" class="inline-block mt-4 px-6 py-2 bg-navy-900 text-white rounded-lg">
          매물 목록으로 돌아가기
        </a>
      </div>
    `;
  }
}

// 이미지 갤러리 기능 (쇼핑몰 스타일)
function initGallery(images) {
  let currentIndex = 0;
  const mainImage = document.getElementById("mainImage");
  const currentIndexEl = document.getElementById("currentIndex");
  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");
  const dots = document.querySelectorAll(".dot");
  const thumbnailBtns = document.querySelectorAll(".thumbnail-btn");

  // 이미지 변경 함수
  function showImage(index) {
    if (index < 0) index = images.length - 1;
    if (index >= images.length) index = 0;
    
    currentIndex = index;
    
    // 메인 이미지 변경 (페이드 효과)
    mainImage.style.opacity = '0';
    setTimeout(() => {
      mainImage.src = images[index];
      mainImage.style.opacity = '1';
    }, 150);
    
    // 카운터 업데이트
    if (currentIndexEl) currentIndexEl.textContent = index + 1;

    // 도트 인디케이터 업데이트
    dots.forEach((dot, idx) => {
      if (idx === index) {
        dot.classList.add("active");
      } else {
        dot.classList.remove("active");
      }
    });

    // 썸네일 버튼 업데이트
    thumbnailBtns.forEach((btn, idx) => {
      if (idx === index) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    });
  }

  // 이전 버튼
  if (prevBtn) {
    prevBtn.addEventListener("click", () => showImage(currentIndex - 1));
  }

  // 다음 버튼
  if (nextBtn) {
    nextBtn.addEventListener("click", () => showImage(currentIndex + 1));
  }

  // 도트 클릭
  dots.forEach((dot) => {
    dot.addEventListener("click", () => {
      const index = parseInt(dot.dataset.index);
      showImage(index);
    });
  });

  // 썸네일 클릭
  thumbnailBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const index = parseInt(btn.dataset.index);
      showImage(index);
    });
  });

  // 키보드 방향키 지원
  document.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") {
      showImage(currentIndex - 1);
    } else if (e.key === "ArrowRight") {
      showImage(currentIndex + 1);
    }
  });

  // 자동 슬라이드 (선택사항, 5초마다)
  // let autoSlideInterval = setInterval(() => {
  //   showImage(currentIndex + 1);
  // }, 5000);

  // 사용자가 조작하면 자동 슬라이드 중지
  // [prevBtn, nextBtn, ...dots, ...thumbnailBtns].forEach(el => {
  //   if (el) el.addEventListener('click', () => clearInterval(autoSlideInterval));
  // });
}

load();
