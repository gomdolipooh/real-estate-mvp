import { initializeApp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  query,
  orderBy,
  setDoc,
  where,
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";
import {
  getStorage,
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-storage.js";

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
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

console.log("🔥 Firebase 초기화 완료");
console.log("📦 Database:", db.app.options.projectId);
console.log("💾 Storage:", storage.app.options.storageBucket);

// 현재 편집 중인 문서 ID
let currentEditId = null;

// 인증 체크
onAuthStateChanged(auth, (user) => {
  if (!user) {
    console.log("❌ 사용자 미인증 - 로그인 페이지로 이동");
    location.href = "/admin/login.html";
  } else {
    console.log("✅ 사용자 인증됨:", user.email);
    initializeAdmin();
  }
});

// 로그아웃
const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) {
  logoutBtn.onclick = () => {
    console.log("🚪 로그아웃");
    signOut(auth);
  };
}

// Admin 초기화
function initializeAdmin() {
  setupTabs();
  setupListingForm();
  setupFilterManagement();
  loadFilterOptions();
}

// ==================== 탭 관리 ====================
function setupTabs() {
  const tabBtns = document.querySelectorAll(".tab-btn");
  const tabContents = document.querySelectorAll(".tab-content");

  tabBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetTab = btn.dataset.tab;

      // 모든 탭 비활성화
      tabBtns.forEach((b) => {
        b.classList.remove("bg-slate-900", "text-white");
        b.classList.add("bg-slate-200", "text-slate-700", "hover:bg-slate-300");
      });

      // 선택된 탭 활성화
      btn.classList.remove(
        "bg-slate-200",
        "text-slate-700",
        "hover:bg-slate-300"
      );
      btn.classList.add("bg-slate-900", "text-white");

      // 모든 콘텐츠 숨기기
      tabContents.forEach((c) => c.classList.add("hidden"));

      // 선택된 콘텐츠 보이기
      document.getElementById(`tab-${targetTab}`).classList.remove("hidden");

      // 탭별 데이터 로드
      if (targetTab === "manage") {
        loadAllListings();
      } else if (targetTab === "filters") {
        loadFilterOptions();
      } else if (targetTab === "inquiries") {
        loadInquiries();
      } else if (targetTab === "users") {
        loadUsers();
      }
    });
  });
}

// ==================== 매물 폼 관리 ====================
function setupListingForm() {
  const saveBtn = document.getElementById("saveBtn");
  const cancelEditBtn = document.getElementById("cancelEditBtn");

  if (saveBtn) saveBtn.onclick = saveListing;
  if (cancelEditBtn) {
    cancelEditBtn.onclick = () => {
      cancelEdit();
    };
  }

  // 매물 관리 탭 버튼들
  const refreshBtn = document.getElementById("refreshListings");
  if (refreshBtn) refreshBtn.onclick = loadAllListings;

  // 검색 필터
  const searchInput = document.getElementById("searchListings");
  const filterStatus = document.getElementById("filterStatus");
  if (searchInput) {
    searchInput.addEventListener("input", filterListings);
  }
  if (filterStatus) {
    filterStatus.addEventListener("change", filterListings);
  }

  // 의뢰 내역 관련 버튼
  const refreshInquiries = document.getElementById("refreshInquiries");
  if (refreshInquiries) refreshInquiries.onclick = loadInquiries;

  const filterInquiryType = document.getElementById("filterInquiryType");
  const filterInquiryStatus = document.getElementById("filterInquiryStatus");
  if (filterInquiryType) {
    filterInquiryType.addEventListener("change", filterInquiries);
  }
  if (filterInquiryStatus) {
    filterInquiryStatus.addEventListener("change", filterInquiries);
  }
}

// 매물 저장 (등록 또는 수정)
async function saveListing() {
  try {
    console.log("💾 매물 저장 시작...");

    const title = val("title");
    const dealType = val("dealType");
    const price = num("price");
    const deposit = num("deposit");
    const rent = num("rent");
    const sizePyeong = num("sizePyeong");
    const floor = val("floor");
    const purpose = val("purpose");
    const region = val("region");
    const description = val("description");
    const files = document.getElementById("images").files || [];
    const editId = document.getElementById("editId").value;

    if (!title) {
      msg("saveMsg", "제목은 필수입니다.", true);
      return;
    }

    msg("saveMsg", "저장 중...");
    document.getElementById("saveBtn").disabled = true;

    // 이미지 업로드
    const urls = [];

    // 기존 이미지 유지 (수정 모드인 경우)
    if (editId) {
      const existingImagesDiv = document.getElementById("existingImages");
      const existingImgs = existingImagesDiv.querySelectorAll("img");
      existingImgs.forEach((img) => {
        urls.push(img.dataset.url);
      });
    }

    // 새 이미지 업로드
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      const path = `listings/${Date.now()}_${i}_${f.name}`;
      const storageRef = ref(storage, path);
      const task = uploadBytesResumable(storageRef, f);

      await new Promise((resolve, reject) => {
        task.on(
          "state_changed",
          (snap) => {
            const pct = Math.round(
              (snap.bytesTransferred / snap.totalBytes) * 100
            );
            document.getElementById("progress").textContent = `업로드 ${
              i + 1
            }/${files.length} ... ${pct}%`;
          },
          (error) => {
            console.error("❌ 이미지 업로드 실패:", error);
            reject(error);
          },
          async () => {
            const url = await getDownloadURL(task.snapshot.ref);
            console.log("✅ 이미지 업로드 성공:", url);
            urls.push(url);
            resolve();
          }
        );
      });
    }

    // Firestore 데이터
    const data = {
      title,
      dealType,
      price: price ?? null,
      deposit: deposit ?? null,
      rent: rent ?? null,
      sizePyeong: sizePyeong ?? null,
      floor: floor || "",
      purpose: purpose || "",
      region: region || "",
      description: description || "",
      images: urls,
      updatedAt: serverTimestamp(),
      status: "published",
    };

    if (editId) {
      // 수정
      await updateDoc(doc(db, "listings", editId), data);
      console.log("✅ 매물 수정 완료:", editId);
      msg("saveMsg", "수정 완료!");
    } else {
      // 등록
      data.createdAt = serverTimestamp();
      const docRef = await addDoc(collection(db, "listings"), data);
      console.log("✅ 매물 등록 완료:", docRef.id);
      msg("saveMsg", "등록 완료!");
    }

    document.getElementById("progress").textContent = "";
    clearForm();
    cancelEdit();

    // 매물 관리 탭이 활성화되어 있으면 목록 새로고침
    if (!document.getElementById("tab-manage").classList.contains("hidden")) {
      loadAllListings();
    }
  } catch (error) {
    console.error("❌ 저장 실패:", error);
    msg("saveMsg", `저장 실패: ${error.message}`, true);
  } finally {
    document.getElementById("saveBtn").disabled = false;
  }
}

// 매물 편집 모드로 전환
async function editListing(id) {
  try {
    console.log("✏️ 매물 편집 모드:", id);

    const docSnap = await getDoc(doc(db, "listings", id));
    if (!docSnap.exists()) {
      alert("매물을 찾을 수 없습니다.");
      return;
    }

    const data = docSnap.data();
    currentEditId = id;

    // 폼에 데이터 채우기
    document.getElementById("editId").value = id;
    document.getElementById("title").value = data.title || "";
    document.getElementById("dealType").value = data.dealType || "월세";
    document.getElementById("price").value = data.price ?? "";
    document.getElementById("deposit").value = data.deposit ?? "";
    document.getElementById("rent").value = data.rent ?? "";
    document.getElementById("sizePyeong").value = data.sizePyeong ?? "";
    document.getElementById("floor").value = data.floor || "";
    document.getElementById("purpose").value = data.purpose || "";
    document.getElementById("region").value = data.region || "";
    document.getElementById("description").value = data.description || "";

    // 기존 이미지 표시
    const existingImagesDiv = document.getElementById("existingImages");
    existingImagesDiv.innerHTML = "";
    if (data.images && data.images.length > 0) {
      data.images.forEach((url, idx) => {
        const imgDiv = document.createElement("div");
        imgDiv.className = "relative";
        imgDiv.innerHTML = `
          <img src="${url}" alt="이미지 ${idx + 1}" 
               data-url="${url}"
               class="w-24 h-24 object-cover rounded-lg border" />
          <button type="button" 
                  onclick="removeExistingImage(this)"
                  class="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full text-xs hover:bg-red-600">
            ×
          </button>
        `;
        existingImagesDiv.appendChild(imgDiv);
      });
    }

    // UI 변경
    document.getElementById("formTitle").textContent = "매물 수정";
    document.getElementById("cancelEditBtn").classList.remove("hidden");

    // 등록 탭으로 이동
    document.querySelector('[data-tab="register"]').click();

    // 스크롤 최상단으로
    window.scrollTo({ top: 0, behavior: "smooth" });
  } catch (error) {
    console.error("❌ 편집 모드 전환 실패:", error);
    alert("편집 모드 전환 중 오류가 발생했습니다.");
  }
}

// 기존 이미지 제거
window.removeExistingImage = function (btn) {
  btn.closest("div").remove();
};

// 편집 취소
function cancelEdit() {
  currentEditId = null;
  document.getElementById("editId").value = "";
  document.getElementById("formTitle").textContent = "새 매물 등록";
  document.getElementById("cancelEditBtn").classList.add("hidden");
  document.getElementById("existingImages").innerHTML = "";
  clearForm();
}

// 매물 삭제
async function deleteListing(id) {
  if (!confirm("정말 이 매물을 삭제하시겠습니까?")) return;

  try {
    console.log("🗑️ 매물 삭제:", id);

    // 이미지도 삭제할지 물어보기
    const deleteImages = confirm("이미지 파일도 함께 삭제하시겠습니까?");

    if (deleteImages) {
      const docSnap = await getDoc(doc(db, "listings", id));
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.images && data.images.length > 0) {
          for (const url of data.images) {
            try {
              const imgRef = ref(storage, url);
              await deleteObject(imgRef);
              console.log("✅ 이미지 삭제 완료:", url);
            } catch (error) {
              console.error("⚠️ 이미지 삭제 실패:", error);
            }
          }
        }
      }
    }

    await deleteDoc(doc(db, "listings", id));
    console.log("✅ 매물 삭제 완료");
    alert("삭제되었습니다.");
    loadAllListings();
  } catch (error) {
    console.error("❌ 삭제 실패:", error);
    alert("삭제 중 오류가 발생했습니다.");
  }
}

// 전체 매물 목록 로드
async function loadAllListings() {
  try {
    console.log("📋 전체 매물 목록 로드...");

    const loadingEl = document.getElementById("loadingListings");
    const tableEl = document.getElementById("listingsTable");

    if (loadingEl) loadingEl.style.display = "block";
    if (tableEl) tableEl.style.display = "none";

    const q = query(collection(db, "listings"), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);

    console.log(`✅ ${snap.size}개 매물 로드 완료`);

    const tbody = document.getElementById("listingsBody");
    if (!tbody) return;

    tbody.innerHTML = "";

    if (snap.empty) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" class="px-3 py-8 text-center text-slate-500">
            등록된 매물이 없습니다.
          </td>
        </tr>
      `;
    } else {
      snap.forEach((doc) => {
        const data = doc.data();
        const img = data.images && data.images[0] ? data.images[0] : "";

        let priceText = "";
        if (data.dealType === "매매" || data.dealType === "분양") {
          priceText = data.price ? `${formatNumber(data.price)}만` : "-";
        } else if (data.dealType === "전세") {
          priceText = data.deposit ? `${formatNumber(data.deposit)}만` : "-";
        } else if (data.dealType === "월세") {
          priceText = `${formatNumber(data.deposit || 0)}/${formatNumber(
            data.rent || 0
          )}`;
        }

        const row = document.createElement("tr");
        row.className = "border-b hover:bg-slate-50 transition";
        row.dataset.id = doc.id;
        row.dataset.title = data.title || "";
        row.dataset.region = data.region || "";
        row.dataset.status = data.status || "published";
        row.innerHTML = `
          <td class="px-3 py-3">
            <img src="${img}" alt="" 
                 class="w-16 h-16 object-cover rounded-lg border"
                 onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%27100%27 height=%27100%27%3E%3Crect fill=%27%23e2e8f0%27 width=%27100%27 height=%27100%27/%3E%3C/svg%3E'" />
          </td>
          <td class="px-3 py-3">
            <div class="font-semibold text-slate-900 max-w-xs truncate">
              ${escapeHtml(data.title)}
            </div>
          </td>
          <td class="px-3 py-3">
            <span class="px-2 py-1 bg-slate-100 rounded text-xs font-semibold">
              ${data.dealType || "-"}
            </span>
          </td>
          <td class="px-3 py-3 font-semibold">${priceText}</td>
          <td class="px-3 py-3 text-slate-600">${data.region || "-"}</td>
          <td class="px-3 py-3">${data.sizePyeong || "-"}평</td>
          <td class="px-3 py-3">
            <span class="px-2 py-1 ${
              data.status === "published"
                ? "bg-emerald-100 text-emerald-700"
                : "bg-slate-100 text-slate-600"
            } rounded text-xs font-semibold">
              ${data.status === "published" ? "게시됨" : "임시저장"}
            </span>
          </td>
          <td class="px-3 py-3 text-center">
            <div class="flex gap-1 justify-center flex-wrap">
              <button 
                onclick="manageFeatured('${doc.id}')"
                class="px-3 py-1.5 bg-yellow-500 text-white rounded hover:bg-yellow-600 transition text-xs font-semibold"
                title="TOP3 설정">
                <i class="fas fa-star"></i>
              </button>
              <button 
                onclick="editListing('${doc.id}')"
                class="px-3 py-1.5 bg-blue-500 text-white rounded hover:bg-blue-600 transition text-xs font-semibold"
                title="수정">
                <i class="fas fa-edit"></i>
              </button>
              <button 
                onclick="deleteListing('${doc.id}')"
                class="px-3 py-1.5 bg-red-500 text-white rounded hover:bg-red-600 transition text-xs font-semibold"
                title="삭제">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </td>
        `;
        tbody.appendChild(row);
      });
    }

    if (loadingEl) loadingEl.style.display = "none";
    if (tableEl) tableEl.style.display = "block";
  } catch (error) {
    console.error("❌ 목록 로드 실패:", error);
    const tbody = document.getElementById("listingsBody");
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" class="px-3 py-8 text-center text-red-600">
            로드 실패: ${error.message}
          </td>
        </tr>
      `;
    }
  }
}

// 매물 목록 필터링 (클라이언트 사이드)
function filterListings() {
  const searchText = document
    .getElementById("searchListings")
    .value.toLowerCase();
  const statusFilter = document.getElementById("filterStatus").value;

  const rows = document.querySelectorAll("#listingsBody tr");
  rows.forEach((row) => {
    const title = (row.dataset.title || "").toLowerCase();
    const region = (row.dataset.region || "").toLowerCase();
    const status = row.dataset.status || "";

    const matchSearch =
      title.includes(searchText) || region.includes(searchText);
    const matchStatus = !statusFilter || status === statusFilter;

    if (matchSearch && matchStatus) {
      row.style.display = "";
    } else {
      row.style.display = "none";
    }
  });
}

// TOP3 관리 모달 열기
async function manageFeatured(id) {
  try {
    console.log("🌟 TOP3 관리:", id);

    const docSnap = await getDoc(doc(db, "listings", id));
    if (!docSnap.exists()) {
      alert("매물을 찾을 수 없습니다.");
      return;
    }

    const data = docSnap.data();
    const featured = data.featured || {};

    // 모달 HTML 생성
    const modalHTML = `
      <div id="featuredModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onclick="if(event.target===this) closeFeaturedModal()">
        <div class="bg-white rounded-2xl shadow-2xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
          <div class="flex items-center justify-between mb-6">
            <h3 class="text-2xl font-bold text-slate-900">
              <i class="fas fa-star text-yellow-500 mr-2"></i>TOP3 카테고리 설정
            </h3>
            <button onclick="closeFeaturedModal()" class="text-slate-400 hover:text-slate-600 text-2xl">
              <i class="fas fa-times"></i>
            </button>
          </div>

          <div class="mb-4 p-4 bg-blue-50 rounded-lg">
            <p class="text-sm text-slate-700 font-semibold">${data.title}</p>
            <p class="text-xs text-slate-500 mt-1">${data.region} · ${
      data.sizePyeong || "-"
    }평</p>
          </div>

          <p class="text-sm text-slate-600 mb-4">
            이 매물을 메인 페이지 TOP3에 표시할 카테고리를 선택하세요. (1~3순위 설정)
          </p>

          <div class="space-y-4">
            ${generateFeaturedCheckbox(
              "small",
              "🏠 소형 평수 (100평 미만)",
              featured.small
            )}
            ${generateFeaturedCheckbox(
              "medium",
              "🏭 중형 평수 (100평 ~ 300평)",
              featured.medium
            )}
            ${generateFeaturedCheckbox(
              "large",
              "🏢 대형 평수 (300평 ~ 500평)",
              featured.large
            )}
            ${generateFeaturedCheckbox(
              "cosmetics",
              "💄 화장품 공장",
              featured.cosmetics
            )}
            ${generateFeaturedCheckbox(
              "metal",
              "⚙️ 금속·기계·부품 제조",
              featured.metal
            )}
            ${generateFeaturedCheckbox("food", "🍔 식품 공장", featured.food)}
          </div>

          <div class="mt-6 flex gap-3">
            <button onclick="saveFeatured('${id}')" class="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition font-semibold">
              <i class="fas fa-save mr-2"></i>저장
            </button>
            <button onclick="closeFeaturedModal()" class="px-6 bg-slate-200 text-slate-700 py-3 rounded-lg hover:bg-slate-300 transition font-semibold">
              취소
            </button>
          </div>
        </div>
      </div>
    `;

    // 기존 모달 제거 후 추가
    const existingModal = document.getElementById("featuredModal");
    if (existingModal) existingModal.remove();

    document.body.insertAdjacentHTML("beforeend", modalHTML);
    document.body.style.overflow = "hidden";
  } catch (error) {
    console.error("❌ TOP3 관리 오류:", error);
    alert("오류가 발생했습니다.");
  }
}

// 카테고리 체크박스 생성 헬퍼
function generateFeaturedCheckbox(category, label, currentOrder) {
  const checked = currentOrder ? "checked" : "";
  const order = currentOrder || "";

  return `
    <div class="border rounded-lg p-4 hover:bg-slate-50 transition">
      <label class="flex items-center gap-3 cursor-pointer">
        <input 
          type="checkbox" 
          id="featured_${category}"
          ${checked}
          onchange="toggleFeaturedOrder('${category}')"
          class="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
        />
        <span class="flex-1 font-semibold text-slate-900">${label}</span>
        <div id="order_${category}" class="flex items-center gap-2 ${
    checked ? "" : "hidden"
  }">
          <span class="text-sm text-slate-600">순위:</span>
          <select 
            id="select_${category}"
            class="border rounded px-3 py-1 text-sm focus:ring-2 focus:ring-blue-500"
          >
            <option value="1" ${order == 1 ? "selected" : ""}>1순위</option>
            <option value="2" ${order == 2 ? "selected" : ""}>2순위</option>
            <option value="3" ${order == 3 ? "selected" : ""}>3순위</option>
          </select>
        </div>
      </label>
    </div>
  `;
}

// 카테고리 선택 토글
window.toggleFeaturedOrder = function (category) {
  const checkbox = document.getElementById(`featured_${category}`);
  const orderDiv = document.getElementById(`order_${category}`);

  if (checkbox.checked) {
    orderDiv.classList.remove("hidden");
  } else {
    orderDiv.classList.add("hidden");
  }
};

// TOP3 설정 저장
window.saveFeatured = async function (id) {
  try {
    const categories = [
      "small",
      "medium",
      "large",
      "cosmetics",
      "metal",
      "food",
    ];
    const featured = {};

    categories.forEach((cat) => {
      const checkbox = document.getElementById(`featured_${cat}`);
      const select = document.getElementById(`select_${cat}`);

      if (checkbox && checkbox.checked && select) {
        featured[cat] = parseInt(select.value);
      }
    });

    console.log("💾 TOP3 저장:", featured);

    await updateDoc(doc(db, "listings", id), {
      featured: Object.keys(featured).length > 0 ? featured : null,
      updatedAt: serverTimestamp(),
    });

    alert("TOP3 설정이 저장되었습니다!");
    closeFeaturedModal();
    loadAllListings();
  } catch (error) {
    console.error("❌ TOP3 저장 실패:", error);
    alert("저장 중 오류가 발생했습니다.");
  }
};

// 모달 닫기
window.closeFeaturedModal = function () {
  const modal = document.getElementById("featuredModal");
  if (modal) {
    modal.remove();
    document.body.style.overflow = "";
  }
};

// editListing과 deleteListing을 전역으로 노출
window.editListing = editListing;
window.deleteListing = deleteListing;
window.manageFeatured = manageFeatured;

// ==================== 필터 옵션 관리 ====================
function setupFilterManagement() {
  // 지역 추가
  const addRegionBtn = document.getElementById("addRegion");
  if (addRegionBtn) {
    addRegionBtn.onclick = async () => {
      const input = document.getElementById("newRegion");
      const value = input.value.trim();
      if (!value) return;

      await addFilterOption("regions", value);
      input.value = "";
      loadFilterOptions();
    };
  }

  // 용도 추가
  const addPurposeBtn = document.getElementById("addPurpose");
  if (addPurposeBtn) {
    addPurposeBtn.onclick = async () => {
      const input = document.getElementById("newPurpose");
      const value = input.value.trim();
      if (!value) return;

      await addFilterOption("purposes", value);
      input.value = "";
      loadFilterOptions();
    };
  }

  // 거래유형 추가
  const addDealTypeBtn = document.getElementById("addDealType");
  if (addDealTypeBtn) {
    addDealTypeBtn.onclick = async () => {
      const input = document.getElementById("newDealType");
      const value = input.value.trim();
      if (!value) return;

      await addFilterOption("dealTypes", value);
      input.value = "";
      loadFilterOptions();
    };
  }
}

// 필터 옵션 추가
async function addFilterOption(collectionName, value) {
  try {
    console.log(`➕ 필터 옵션 추가: ${collectionName} - ${value}`);

    const docRef = doc(db, "filterOptions", collectionName);
    const docSnap = await getDoc(docRef);

    let options = [];
    if (docSnap.exists()) {
      options = docSnap.data().options || [];
    }

    if (options.includes(value)) {
      alert("이미 존재하는 옵션입니다.");
      return;
    }

    options.push(value);
    await setDoc(docRef, { options });

    console.log("✅ 필터 옵션 추가 완료");
    alert("추가되었습니다.");
  } catch (error) {
    console.error("❌ 필터 옵션 추가 실패:", error);
    alert("추가 중 오류가 발생했습니다.");
  }
}

// 필터 옵션 삭제
async function removeFilterOption(collectionName, value) {
  if (!confirm(`"${value}"을(를) 삭제하시겠습니까?`)) return;

  try {
    console.log(`➖ 필터 옵션 삭제: ${collectionName} - ${value}`);

    const docRef = doc(db, "filterOptions", collectionName);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      let options = docSnap.data().options || [];
      options = options.filter((opt) => opt !== value);
      await setDoc(docRef, { options });

      console.log("✅ 필터 옵션 삭제 완료");
      alert("삭제되었습니다.");
      loadFilterOptions();
    }
  } catch (error) {
    console.error("❌ 필터 옵션 삭제 실패:", error);
    alert("삭제 중 오류가 발생했습니다.");
  }
}

// 필터 옵션 로드
async function loadFilterOptions() {
  try {
    console.log("📋 필터 옵션 로드...");

    // 지역 옵션
    const regionsDoc = await getDoc(doc(db, "filterOptions", "regions"));
    const regions = regionsDoc.exists()
      ? regionsDoc.data().options
      : ["인천 남동구", "시흥시", "김포시"];
    renderFilterList("regionList", "regions", regions);

    // 용도 옵션
    const purposesDoc = await getDoc(doc(db, "filterOptions", "purposes"));
    const purposes = purposesDoc.exists()
      ? purposesDoc.data().options
      : ["공장", "창고", "사무"];
    renderFilterList("purposeList", "purposes", purposes);

    // 거래유형 옵션
    const dealTypesDoc = await getDoc(doc(db, "filterOptions", "dealTypes"));
    const dealTypes = dealTypesDoc.exists()
      ? dealTypesDoc.data().options
      : ["분양", "매매", "전세", "월세"];
    renderFilterList("dealTypeList", "dealTypes", dealTypes);

    // 폼의 select 옵션도 업데이트
    updateFormSelects(regions, purposes, dealTypes);

    console.log("✅ 필터 옵션 로드 완료");
  } catch (error) {
    console.error("❌ 필터 옵션 로드 실패:", error);
  }
}

// 필터 목록 렌더링
function renderFilterList(elementId, collectionName, options) {
  const listEl = document.getElementById(elementId);
  if (!listEl) return;

  listEl.innerHTML = "";

  if (options.length === 0) {
    listEl.innerHTML =
      '<li class="text-slate-500 text-sm">등록된 옵션이 없습니다.</li>';
    return;
  }

  options.forEach((opt) => {
    const li = document.createElement("li");
    li.className =
      "flex items-center justify-between p-2 border rounded-lg hover:bg-slate-50";
    li.innerHTML = `
      <span class="text-sm">${escapeHtml(opt)}</span>
      <button 
        onclick="removeFilterOption('${collectionName}', '${escapeHtml(opt)}')"
        class="text-red-500 hover:text-red-700 text-sm">
        <i class="fas fa-times"></i>
      </button>
    `;
    listEl.appendChild(li);
  });
}

// 폼의 select 옵션 업데이트
function updateFormSelects(regions, purposes, dealTypes) {
  // 지역 select
  const regionSelect = document.getElementById("region");
  if (regionSelect) {
    const currentValue = regionSelect.value;
    regionSelect.innerHTML = '<option value="">선택</option>';
    regions.forEach((r) => {
      const opt = document.createElement("option");
      opt.value = r;
      opt.textContent = r;
      regionSelect.appendChild(opt);
    });
    if (currentValue) regionSelect.value = currentValue;
  }

  // 용도 select
  const purposeSelect = document.getElementById("purpose");
  if (purposeSelect) {
    const currentValue = purposeSelect.value;
    purposeSelect.innerHTML = '<option value="">선택</option>';
    purposes.forEach((p) => {
      const opt = document.createElement("option");
      opt.value = p;
      opt.textContent = p;
      purposeSelect.appendChild(opt);
    });
    if (currentValue) purposeSelect.value = currentValue;
  }

  // 거래유형 select
  const dealTypeSelect = document.getElementById("dealType");
  if (dealTypeSelect) {
    const currentValue = dealTypeSelect.value;
    dealTypeSelect.innerHTML = "";
    dealTypes.forEach((d) => {
      const opt = document.createElement("option");
      opt.value = d;
      opt.textContent = d;
      dealTypeSelect.appendChild(opt);
    });
    if (currentValue) dealTypeSelect.value = currentValue;
  }
}

// removeFilterOption을 전역으로 노출
window.removeFilterOption = removeFilterOption;

// ==================== Helper 함수 ====================
function val(id) {
  const el = document.getElementById(id);
  return el ? el.value?.trim() : "";
}

function num(id) {
  const v = val(id);
  return v === "" ? null : Number(v);
}

function msg(id, text, isErr = false) {
  const el = document.getElementById(id);
  if (el) {
    el.textContent = text;
    el.className = isErr ? "text-sm text-red-600" : "text-sm text-emerald-600";
  }
}

function clearForm() {
  [
    "title",
    "price",
    "deposit",
    "rent",
    "sizePyeong",
    "floor",
    "description",
  ].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });

  const imagesInput = document.getElementById("images");
  if (imagesInput) imagesInput.value = "";

  const existingImagesDiv = document.getElementById("existingImages");
  if (existingImagesDiv) existingImagesDiv.innerHTML = "";
}

function escapeHtml(s = "") {
  return String(s).replace(
    /[&<>"']/g,
    (m) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[
        m
      ])
  );
}

function formatNumber(num) {
  return num?.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// ==================== 의뢰 내역 관리 ====================
async function loadInquiries() {
  try {
    console.log("📋 의뢰 내역 로드...");

    const loadingEl = document.getElementById("loadingInquiries");
    const tableEl = document.getElementById("inquiriesTable");

    if (loadingEl) loadingEl.style.display = "block";
    if (tableEl) tableEl.style.display = "none";

    const snap = await getDocs(collection(db, "inquiries"));

    const inquiries = snap.docs
      .map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
      .sort((a, b) => {
        const aTime = a.createdAt?.seconds || 0;
        const bTime = b.createdAt?.seconds || 0;
        return bTime - aTime;
      });

    console.log(`✅ ${inquiries.length}개 의뢰 로드 완료`);

    const tbody = document.getElementById("inquiriesBody");
    if (!tbody) return;

    tbody.innerHTML = "";

    if (inquiries.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" class="px-3 py-8 text-center text-slate-500">
            접수된 의뢰가 없습니다.
          </td>
        </tr>
      `;
    } else {
      inquiries.forEach((inquiry) => {
        const date = inquiry.createdAt?.toDate?.()
          ? inquiry.createdAt.toDate().toLocaleDateString("ko-KR")
          : "-";

        const typeText = inquiry.type === "buy" ? "매수" : "매도";
        const typeBg =
          inquiry.type === "buy"
            ? "bg-blue-100 text-blue-700"
            : "bg-emerald-100 text-emerald-700";

        const statusText =
          inquiry.status === "pending"
            ? "대기중"
            : inquiry.status === "contacted"
            ? "연락완료"
            : "처리완료";
        const statusBg =
          inquiry.status === "pending"
            ? "bg-yellow-100 text-yellow-700"
            : inquiry.status === "contacted"
            ? "bg-blue-100 text-blue-700"
            : "bg-emerald-100 text-emerald-700";

        const region = inquiry.complexes?.join(", ") || "-";

        let condition = "";
        if (inquiry.type === "buy") {
          condition = `${inquiry.propertyType || "-"} / ${
            inquiry.dealType || "-"
          } / ${inquiry.desiredPyeong || "-"}평`;
        } else {
          condition = `${inquiry.propertyType || "-"} / ${
            inquiry.dealType || "-"
          } / ${inquiry.address || "-"}`;
        }

        const row = document.createElement("tr");
        row.className = "border-b hover:bg-slate-50 transition";
        row.dataset.id = inquiry.id;
        row.dataset.type = inquiry.type;
        row.dataset.status = inquiry.status;
        row.innerHTML = `
          <td class="px-3 py-3 text-slate-600">${date}</td>
          <td class="px-3 py-3">
            <span class="px-2 py-1 ${typeBg} rounded text-xs font-semibold">
              ${typeText}
            </span>
          </td>
          <td class="px-3 py-3 font-semibold">${inquiry.name || "미입력"}</td>
          <td class="px-3 py-3">
            <a href="tel:${
              inquiry.phone
            }" class="text-blue-600 hover:underline">
              ${inquiry.phone}
            </a>
          </td>
          <td class="px-3 py-3 text-slate-600 text-xs max-w-xs truncate">${region}</td>
          <td class="px-3 py-3 text-slate-600 text-xs max-w-xs truncate">${condition}</td>
          <td class="px-3 py-3">
            <span class="px-2 py-1 ${statusBg} rounded text-xs font-semibold">
              ${statusText}
            </span>
          </td>
          <td class="px-3 py-3 text-center">
            <div class="flex gap-1 justify-center">
              <button 
                onclick="viewInquiry('${inquiry.id}')"
                class="px-3 py-1.5 bg-blue-500 text-white rounded hover:bg-blue-600 transition text-xs font-semibold"
                title="상세보기">
                <i class="fas fa-eye"></i>
              </button>
              <button 
                onclick="updateInquiryStatus('${inquiry.id}')"
                class="px-3 py-1.5 bg-emerald-500 text-white rounded hover:bg-emerald-600 transition text-xs font-semibold"
                title="상태변경">
                <i class="fas fa-check"></i>
              </button>
              <button 
                onclick="deleteInquiry('${inquiry.id}')"
                class="px-3 py-1.5 bg-red-500 text-white rounded hover:bg-red-600 transition text-xs font-semibold"
                title="삭제">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </td>
        `;
        tbody.appendChild(row);
      });
    }

    if (loadingEl) loadingEl.style.display = "none";
    if (tableEl) tableEl.style.display = "block";
  } catch (error) {
    console.error("❌ 의뢰 내역 로드 실패:", error);
    const tbody = document.getElementById("inquiriesBody");
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" class="px-3 py-8 text-center text-red-600">
            로드 실패: ${error.message}
          </td>
        </tr>
      `;
    }
  }
}

// 의뢰 내역 필터링
function filterInquiries() {
  const typeFilter = document.getElementById("filterInquiryType").value;
  const statusFilter = document.getElementById("filterInquiryStatus").value;

  const rows = document.querySelectorAll("#inquiriesBody tr");
  rows.forEach((row) => {
    const type = row.dataset.type || "";
    const status = row.dataset.status || "";

    const matchType = !typeFilter || type === typeFilter;
    const matchStatus = !statusFilter || status === statusFilter;

    if (matchType && matchStatus) {
      row.style.display = "";
    } else {
      row.style.display = "none";
    }
  });
}

// 의뢰 상세보기
window.viewInquiry = async function (id) {
  try {
    const docSnap = await getDoc(doc(db, "inquiries", id));
    if (!docSnap.exists()) {
      alert("의뢰 내역을 찾을 수 없습니다.");
      return;
    }

    const inquiry = docSnap.data();
    const typeText = inquiry.type === "buy" ? "매수 의뢰" : "매도 의뢰";
    const date = inquiry.createdAt?.toDate?.()
      ? inquiry.createdAt.toDate().toLocaleString("ko-KR")
      : "-";

    let detailHTML = `
      <div class="space-y-3">
        <div class="flex items-center justify-between">
          <h4 class="font-bold text-lg">${typeText}</h4>
          <span class="text-sm text-slate-500">${date}</span>
        </div>
        <hr>
        <div><strong>이름:</strong> ${inquiry.name || "미입력"}</div>
        <div><strong>연락처:</strong> <a href="tel:${
          inquiry.phone
        }" class="text-blue-600">${inquiry.phone}</a></div>
        <div><strong>산업단지:</strong> ${
          inquiry.complexes?.join(", ") || "-"
        }</div>
    `;

    if (inquiry.type === "buy") {
      detailHTML += `
        <div><strong>물건종류:</strong> ${inquiry.propertyType || "-"}</div>
        <div><strong>거래종류:</strong> ${inquiry.dealType || "-"}</div>
        <div><strong>희망평수:</strong> ${inquiry.desiredPyeong || "-"}평</div>
        <div><strong>희망거래가:</strong> ${inquiry.desiredPrice || "-"}</div>
      `;
    } else {
      detailHTML += `
        <div><strong>물건종류:</strong> ${inquiry.propertyType || "-"}</div>
        <div><strong>거래종류:</strong> ${inquiry.dealType || "-"}</div>
        <div><strong>주소:</strong> ${inquiry.address || "-"}</div>
        <div><strong>평수:</strong> ${inquiry.pyeong || "-"}평</div>
        <div><strong>희망가격:</strong> ${inquiry.price || "-"}</div>
      `;
    }

    detailHTML += `
        ${
          inquiry.message
            ? `<hr><div><strong>전하실 말씀:</strong><br><pre class="mt-2 p-3 bg-slate-50 rounded text-sm whitespace-pre-wrap">${inquiry.message}</pre></div>`
            : ""
        }
      </div>
    `;

    // 모달 표시
    const modalHTML = `
      <div id="inquiryDetailModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onclick="if(event.target===this) closeInquiryModal()">
        <div class="bg-white rounded-2xl shadow-2xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-xl font-bold">의뢰 상세 내용</h3>
            <button onclick="closeInquiryModal()" class="text-slate-400 hover:text-slate-600 text-2xl">
              <i class="fas fa-times"></i>
            </button>
          </div>
          ${detailHTML}
          <div class="mt-6 flex gap-3">
            <a href="tel:${inquiry.phone}" class="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition text-center font-semibold">
              <i class="fas fa-phone mr-2"></i>전화하기
            </a>
            <button onclick="closeInquiryModal()" class="px-6 bg-slate-200 text-slate-700 py-2 rounded-lg hover:bg-slate-300 transition font-semibold">
              닫기
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML("beforeend", modalHTML);
    document.body.style.overflow = "hidden";
  } catch (error) {
    console.error("❌ 의뢰 상세보기 오류:", error);
    alert("오류가 발생했습니다.");
  }
};

// 의뢰 상태 변경
window.updateInquiryStatus = async function (id) {
  try {
    const docSnap = await getDoc(doc(db, "inquiries", id));
    if (!docSnap.exists()) {
      alert("의뢰 내역을 찾을 수 없습니다.");
      return;
    }

    const currentStatus = docSnap.data().status || "pending";
    const statusOptions = {
      pending: "대기중",
      contacted: "연락완료",
      completed: "처리완료",
    };

    const newStatus = prompt(
      `현재 상태: ${statusOptions[currentStatus]}\n\n새로운 상태를 선택하세요:\n1. 대기중 (pending)\n2. 연락완료 (contacted)\n3. 처리완료 (completed)`,
      currentStatus
    );

    if (!newStatus || newStatus === currentStatus) return;

    if (!["pending", "contacted", "completed"].includes(newStatus)) {
      alert("올바른 상태를 입력하세요 (pending, contacted, completed)");
      return;
    }

    await updateDoc(doc(db, "inquiries", id), {
      status: newStatus,
      updatedAt: serverTimestamp(),
    });

    alert("상태가 변경되었습니다.");
    loadInquiries();
  } catch (error) {
    console.error("❌ 상태 변경 실패:", error);
    alert("상태 변경 중 오류가 발생했습니다.");
  }
};

// 의뢰 삭제
window.deleteInquiry = async function (id) {
  if (!confirm("이 의뢰를 삭제하시겠습니까?")) return;

  try {
    await deleteDoc(doc(db, "inquiries", id));
    console.log("✅ 의뢰 삭제 완료");
    alert("삭제되었습니다.");
    loadInquiries();
  } catch (error) {
    console.error("❌ 삭제 실패:", error);
    alert("삭제 중 오류가 발생했습니다.");
  }
};

// 의뢰 모달 닫기
window.closeInquiryModal = function () {
  const modal = document.getElementById("inquiryDetailModal");
  if (modal) {
    modal.remove();
    document.body.style.overflow = "";
  }
};

// ==================== 회원 관리 ====================

let allUsers = [];
let filteredUsers = [];

// 회원 목록 로드
async function loadUsers() {
  const loadingEl = document.getElementById("loadingUsers");
  const tableEl = document.getElementById("usersTable");
  const noUsersEl = document.getElementById("noUsers");
  const totalUsersEl = document.getElementById("totalUsers");

  try {
    console.log("👥 회원 목록 로드 중...");

    if (loadingEl) loadingEl.classList.remove("hidden");
    if (tableEl) tableEl.classList.add("hidden");
    if (noUsersEl) noUsersEl.classList.add("hidden");

    // Firestore에서 users 컬렉션 읽기
    const q = query(collection(db, "users"), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);

    allUsers = snapshot.docs.map((doc) => ({
      uid: doc.id,
      ...doc.data(),
    }));

    filteredUsers = [...allUsers];

    console.log(`✅ ${allUsers.length}명의 회원 로드 완료`);

    if (totalUsersEl) totalUsersEl.textContent = allUsers.length;

    if (loadingEl) loadingEl.classList.add("hidden");

    if (allUsers.length === 0) {
      if (noUsersEl) noUsersEl.classList.remove("hidden");
    } else {
      if (tableEl) tableEl.classList.remove("hidden");
      renderUsers();
    }
  } catch (error) {
    console.error("❌ 회원 로드 실패:", error);
    if (loadingEl) loadingEl.classList.add("hidden");
    alert("회원 목록을 불러오는 중 오류가 발생했습니다: " + error.message);
  }
}

// 회원 목록 렌더링
function renderUsers() {
  const tbody = document.getElementById("usersBody");
  if (!tbody) return;

  if (filteredUsers.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="text-center py-8 text-slate-500">
          검색 결과가 없습니다.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filteredUsers
    .map((user) => {
      const createdAt = user.createdAt?.toDate
        ? user.createdAt.toDate().toLocaleString("ko-KR")
        : "-";
      const lastLoginAt = user.lastLoginAt?.toDate
        ? user.lastLoginAt.toDate().toLocaleString("ko-KR")
        : "-";
      const role = user.role || "user";
      const roleText = role === "admin" ? "관리자" : "일반회원";
      const roleBadgeClass =
        role === "admin"
          ? "bg-red-100 text-red-700"
          : "bg-blue-100 text-blue-700";

      return `
        <tr class="border-b hover:bg-slate-50">
          <td class="px-3 py-3">${user.email || "-"}</td>
          <td class="px-3 py-3">
            <span class="px-2 py-1 rounded text-xs font-semibold ${roleBadgeClass}">
              ${roleText}
            </span>
          </td>
          <td class="px-3 py-3 text-xs text-slate-600">${createdAt}</td>
          <td class="px-3 py-3 text-xs text-slate-600">${lastLoginAt}</td>
          <td class="px-3 py-3 text-center">
            <button
              onclick="toggleUserRole('${user.uid}', '${role}')"
              class="px-3 py-1 bg-slate-200 hover:bg-slate-300 rounded text-xs transition"
              title="역할 변경"
            >
              <i class="fas fa-user-cog"></i>
            </button>
          </td>
        </tr>
      `;
    })
    .join("");
}

// 회원 역할 토글
window.toggleUserRole = async function (uid, currentRole) {
  const newRole = currentRole === "admin" ? "user" : "admin";
  const confirmMsg = `이 회원을 ${newRole === "admin" ? "관리자" : "일반회원"}로 변경하시겠습니까?`;

  if (!confirm(confirmMsg)) return;

  try {
    await updateDoc(doc(db, "users", uid), {
      role: newRole,
      updatedAt: serverTimestamp(),
    });

    console.log(`✅ 역할 변경 완료: ${currentRole} → ${newRole}`);
    alert("역할이 변경되었습니다.");
    loadUsers();
  } catch (error) {
    console.error("❌ 역할 변경 실패:", error);
    alert("역할 변경 중 오류가 발생했습니다: " + error.message);
  }
};

// 회원 필터링
function filterUsers() {
  const roleFilter = document.getElementById("filterUserRole")?.value || "";
  const emailSearch = document.getElementById("searchUserEmail")?.value.toLowerCase() || "";

  filteredUsers = allUsers.filter((user) => {
    const matchesRole = !roleFilter || user.role === roleFilter;
    const matchesEmail = !emailSearch || user.email?.toLowerCase().includes(emailSearch);
    return matchesRole && matchesEmail;
  });

  renderUsers();
}

// 필터 이벤트 리스너
const filterUserRoleEl = document.getElementById("filterUserRole");
const searchUserEmailEl = document.getElementById("searchUserEmail");
const refreshUsersBtn = document.getElementById("refreshUsers");

if (filterUserRoleEl) {
  filterUserRoleEl.addEventListener("change", filterUsers);
}

if (searchUserEmailEl) {
  searchUserEmailEl.addEventListener("input", filterUsers);
}

if (refreshUsersBtn) {
  refreshUsersBtn.addEventListener("click", loadUsers);
}
