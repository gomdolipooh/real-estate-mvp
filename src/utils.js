export const fmt = {
  num(n) {
    return n?.toLocaleString("ko-KR") ?? "";
  },
  price(v) {
    return v == null ? "-" : `${fmt.num(v)}만원`;
  },
  pyeong(p) {
    return `${fmt.num(p)}평`;
  },
};

export function qs(sel, el = document) {
  return el.querySelector(sel);
}
export function qsa(sel, el = document) {
  return [...el.querySelectorAll(sel)];
}

export function getQuery() {
  return Object.fromEntries(new URL(location.href).searchParams.entries());
}
export function setQuery(obj) {
  const url = new URL(location.href);
  Object.entries(obj).forEach(([k, v]) => {
    if (v === "" || v == null) url.searchParams.delete(k);
    else url.searchParams.set(k, v);
  });
  history.replaceState(null, "", url);
}
