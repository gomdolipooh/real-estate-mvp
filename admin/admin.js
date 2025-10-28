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
  serverTimestamp,
  query,
  orderBy,
  limit,
  getDocs,
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";
import {
  getStorage,
  ref,
  uploadBytesResumable,
  getDownloadURL,
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-storage.js";

// ★ 콘솔 값 그대로
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

// Storage 기본 버킷 (위 구성값 기준)
const storage = getStorage(app);

// 인증 체크: 미로그인 → 로그인 페이지로
onAuthStateChanged(auth, (user) => {
  if (!user) location.href = "/admin/login.html";
  else loadRecent();
});

// 로그아웃
const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) logoutBtn.onclick = () => signOut(auth);

// 저장 로직
const saveBtn = document.getElementById("saveBtn");
if (saveBtn) saveBtn.onclick = saveListing;

async function saveListing() {
  const title = val("title");
  const dealType = val("dealType");
  const price = num("price");
  const deposit = num("deposit");
  const rent = num("rent");
  const sizePyeong = num("sizePyeong");
  const floor = val("floor");
  const purpose = val("purpose");
  const region = val("region");
  const files = document.getElementById("images").files || [];

  if (!title) return msg("saveMsg", "제목은 필수입니다.", true);

  // 1) 이미지 업로드
  const urls = [];
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
          document.getElementById("progress").textContent = `업로드 ${i + 1}/${
            files.length
          } ... ${pct}%`;
        },
        reject,
        async () => {
          const url = await getDownloadURL(task.snapshot.ref);
          urls.push(url);
          resolve();
        }
      );
    });
  }

  // 2) Firestore 저장
  const data = {
    title,
    dealType,
    price: price ?? null,
    deposit: deposit ?? null,
    rent: rent ?? null,
    sizePyeong: sizePyeong ?? null,
    floor,
    purpose,
    region,
    images: urls,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    status: "published",
  };

  await addDoc(collection(db, "listings"), data);
  msg("saveMsg", "저장 완료! (잠시 후 아래 최근 목록에 반영됩니다.)");
  document.getElementById("progress").textContent = "";
  clearForm();
  loadRecent();
}

// 최근 6건
async function loadRecent() {
  const q = query(
    collection(db, "listings"),
    orderBy("createdAt", "desc"),
    limit(6)
  );
  const snap = await getDocs(q);
  const el = document.getElementById("recent");
  if (!el) return;
  el.innerHTML = "";
  snap.forEach((doc) => {
    const it = doc.data();
    const img = (it.images && it.images[0]) || "";
    el.innerHTML += `
      <article class="border rounded-xl bg-white shadow p-3">
        <img src="${img}" alt="${escapeHtml(
      it.title
    )}" class="w-full h-40 object-cover rounded-lg" />
        <div class="mt-2 font-semibold">${escapeHtml(it.title)}</div>
        <div class="text-sm text-slate-600">${it.region || ""} · ${
      it.sizePyeong || "-"
    }평 · ${it.floor || "-"}</div>
      </article>
    `;
  });
}

// helpers
function val(id) {
  return document.getElementById(id).value?.trim();
}
function num(id) {
  const v = document.getElementById(id).value?.trim();
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
    "region",
  ].forEach((id) => (document.getElementById(id).value = ""));
  document.getElementById("images").value = "";
}
function escapeHtml(s = "") {
  return s.replace(
    /[&<>"']/g,
    (m) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[
        m
      ])
  );
}
