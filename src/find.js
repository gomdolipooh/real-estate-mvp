import { qs, qsa } from "./utils.js";

function init() {
  bindEvents();
}

function bindEvents() {
  // 폼 제출 이벤트
  const form = qs("#findForm");
  if (form) {
    form.addEventListener("submit", handleSubmit);
  }

  // 체크박스 이벤트
  qsa(".checkbox-item").forEach((item) => {
    item.addEventListener("click", () => {
      const checkbox = item.querySelector('input[type="checkbox"]');
      checkbox.checked = !checkbox.checked;
    });
  });

  // 텍스트 에리어 툴바 이벤트
  bindTextareaToolbar();
}

function bindTextareaToolbar() {
  const messageTextarea = qs("#message");
  if (!messageTextarea) return;

  // 폰트 변경
  const fontSelect = qs(".font-select");
  if (fontSelect) {
    fontSelect.addEventListener("change", (e) => {
      messageTextarea.style.fontFamily = e.target.value;
    });
  }

  // 폰트 크기 변경
  const sizeSelect = qs(".size-select");
  if (sizeSelect) {
    sizeSelect.addEventListener("change", (e) => {
      messageTextarea.style.fontSize = e.target.value;
    });
  }

  // 폰트 크기 버튼
  qsa(".size-btn").forEach((btn, index) => {
    btn.addEventListener("click", () => {
      const currentSize = parseInt(messageTextarea.style.fontSize) || 16;
      const newSize = index === 0 ? currentSize - 2 : currentSize + 2;
      messageTextarea.style.fontSize = `${Math.max(
        12,
        Math.min(24, newSize)
      )}px`;
    });
  });

  // 이미지 버튼 (현재는 알림만)
  const imageBtn = qs(".image-btn");
  if (imageBtn) {
    imageBtn.addEventListener("click", () => {
      alert("이미지 업로드 기능은 추후 구현 예정입니다.");
    });
  }

  // 도움말 버튼
  const helpBtn = qs(".help-btn");
  if (helpBtn) {
    helpBtn.addEventListener("click", () => {
      alert(
        "원하시는 매물의 상세 조건을 입력해주세요.\n예: 특수시설, 접근성, 층수, 전력용량 등"
      );
    });
  }
}

function handleSubmit(e) {
  e.preventDefault();

  const formData = new FormData(e.target);
  const data = Object.fromEntries(formData.entries());

  // 필수 필드 검증
  if (!data.phone) {
    alert("휴대폰 또는 전화번호를 입력해주세요.");
    qs("#phone").focus();
    return;
  }

  // 체크박스 값 처리
  const complexes = qsa('input[name="complex"]:checked').map((cb) => cb.value);
  if (complexes.length === 0) {
    alert("산업단지를 하나 이상 선택해주세요.");
    return;
  }

  // 데이터 정리
  const submitData = {
    ...data,
    complexes: complexes,
    timestamp: new Date().toISOString(),
    status: "pending",
    type: "find", // 찾기 요청임을 구분
  };

  // 실제 서버 전송 대신 로컬 스토리지에 저장 (데모용)
  const submissions = JSON.parse(
    localStorage.getItem("findSubmissions") || "[]"
  );
  submissions.push(submitData);
  localStorage.setItem("findSubmissions", JSON.stringify(submissions));

  // 성공 메시지
  alert(
    "매물 찾기 요청이 완료되었습니다!\n조건에 맞는 매물을 찾아 연락드리겠습니다."
  );

  // 폼 초기화
  e.target.reset();

  // 체크박스 상태 초기화
  qsa('input[type="checkbox"]').forEach((cb) => {
    cb.checked = false;
  });
}

// 페이지 로드 시 초기화
document.addEventListener("DOMContentLoaded", init);
