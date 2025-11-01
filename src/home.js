// 메인 페이지 전용 JavaScript
import { qs } from "./utils.js";

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
      window.location.href = `/listings.html?q=${encodeURIComponent(q)}`;
    } else {
      window.location.href = "/listings.html";
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
      window.location.href = `/listings.html?q=${encodeURIComponent(q)}`;
    } else {
      window.location.href = "/listings.html";
    }
  });
}

