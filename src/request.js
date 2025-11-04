import { initializeApp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  serverTimestamp,
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

// 현재 모드 ("buy" 또는 "sell")
let currentMode = "buy";

// DOM 요소
const btnBuy = document.getElementById("btnBuy");
const btnSell = document.getElementById("btnSell");
const buyForm = document.getElementById("buyForm");
const sellForm = document.getElementById("sellForm");
const requestForm = document.getElementById("requestForm");

// 안내 텍스트
const infoTitle = document.getElementById("infoTitle");
const info1 = document.getElementById("info1");
const info2 = document.getElementById("info2");
const info3 = document.getElementById("info3");
const info4 = document.getElementById("info4");
const info5 = document.getElementById("info5");
const submitText = document.getElementById("submitText");

// 매수/매도 탭 전환
btnBuy.addEventListener("click", () => {
  currentMode = "buy";
  
  // 버튼 스타일
  btnBuy.className = "flex-1 py-4 px-6 rounded-xl font-bold text-lg transition-all duration-300 bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg";
  btnSell.className = "flex-1 py-4 px-6 rounded-xl font-bold text-lg transition-all duration-300 bg-slate-100 text-slate-600 hover:bg-slate-200";
  
  // 폼 전환
  buyForm.classList.remove("hidden");
  sellForm.classList.add("hidden");
  
  // 안내 텍스트 변경 (매수)
  infoTitle.textContent = "매물 매수 의뢰 안내";
  info1.textContent = "정확한 정보를 바탕으로 자세한 상담을 도와드리기 위한 페이지입니다.";
  info2.textContent = "온라인에 공개하지 못하는 매물이 훨씬 더 많습니다.";
  info3.textContent = "접수하신 내용을 바탕으로 최적의 매물을 고객님께 안내해 드립니다.";
  info4.textContent = "힘들게 찾아다니지 마세요. 맡기고 기다리시면 됩니다.";
  info5.textContent = "문의주셔서 감사합니다.";
  submitText.textContent = "매수 의뢰하기";
});

btnSell.addEventListener("click", () => {
  currentMode = "sell";
  
  // 버튼 스타일
  btnBuy.className = "flex-1 py-4 px-6 rounded-xl font-bold text-lg transition-all duration-300 bg-slate-100 text-slate-600 hover:bg-slate-200";
  btnSell.className = "flex-1 py-4 px-6 rounded-xl font-bold text-lg transition-all duration-300 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white shadow-lg";
  
  // 폼 전환
  buyForm.classList.add("hidden");
  sellForm.classList.remove("hidden");
  
  // 안내 텍스트 변경 (매도)
  infoTitle.textContent = "매물 매도 의뢰 안내";
  info1.textContent = "정확한 정보를 바탕으로 자세한 상담을 도와드리기 위한 페이지입니다.";
  info2.textContent = "등록하신 매물은 온·오프라인에 즉시 반영합니다.";
  info3.textContent = "비전부동산의 전 직원은 직접 발로 뛰는 영업으로 만족스런 결과를 보여드립니다.";
  info4.textContent = "10년 이상의 경험으로 최적의 가격을 제안해드립니다.";
  info5.textContent = "문의주셔서 감사합니다.";
  submitText.textContent = "매도 의뢰하기";
});

// 폼 제출
requestForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  // 공통 정보
  const name = document.getElementById("name").value.trim();
  const phone = document.getElementById("phone").value.trim();
  const complexes = Array.from(document.querySelectorAll('input[name="complex"]:checked')).map(cb => cb.value);

  if (!phone) {
    alert("휴대폰 번호를 입력해주세요.");
    return;
  }

  try {
    let data = {
      type: currentMode, // "buy" 또는 "sell"
      name,
      phone,
      complexes,
      createdAt: serverTimestamp(),
      status: "pending", // pending, contacted, completed
    };

    if (currentMode === "buy") {
      // 매수 의뢰 데이터
      data = {
        ...data,
        propertyType: document.getElementById("buyPropertyType").value,
        dealType: document.getElementById("buyDealType").value,
        desiredPyeong: document.getElementById("buyDesiredPyeong").value,
        desiredPrice: document.getElementById("buyDesiredPrice").value,
        message: document.getElementById("buyMessage").value.trim(),
      };
    } else {
      // 매도 의뢰 데이터
      data = {
        ...data,
        propertyType: document.getElementById("sellPropertyType").value,
        dealType: document.getElementById("sellDealType").value,
        address: document.getElementById("sellAddress").value.trim(),
        pyeong: document.getElementById("sellPyeong").value,
        price: document.getElementById("sellPrice").value.trim(),
        message: document.getElementById("sellMessage").value.trim(),
      };

      if (!data.address) {
        alert("매물 주소를 입력해주세요.");
        return;
      }
    }

    console.log("📝 의뢰 데이터 전송:", data);

    // Firebase에 저장
    const docRef = await addDoc(collection(db, "inquiries"), data);
    
    console.log("✅ 의뢰 접수 완료:", docRef.id);

    // 성공 메시지
    alert(`의뢰가 성공적으로 접수되었습니다!\n\n담당자가 확인 후 연락드리겠습니다.\n감사합니다.`);

    // 폼 초기화
    requestForm.reset();

  } catch (error) {
    console.error("❌ 의뢰 접수 실패:", error);
    alert("의뢰 접수 중 오류가 발생했습니다.\n전화로 문의해주세요: 032-812-5001");
  }
});

