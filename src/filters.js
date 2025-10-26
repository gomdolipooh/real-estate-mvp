export const state = {
  q: "",
  deal: "전체",
  region: "",
  purpose: "",
  minSize: "",
  maxSize: "",
  minPrice: "",
  maxPrice: "",
  page: 1,
  perPage: 12,
};

export function applyFilters(list) {
  return list.filter((it) => {
    const dealOk = state.deal === "전체" || it.dealType === state.deal;
    const regionOk = !state.region || it.region.includes(state.region);
    const purposeOk = !state.purpose || it.purpose === state.purpose;
    const sizeOk =
      (!state.minSize || it.sizePyeong >= +state.minSize) &&
      (!state.maxSize || it.sizePyeong <= +state.maxSize);
    const priceVal = it.price ?? it.rent;
    const priceOk =
      (!state.minPrice || priceVal >= +state.minPrice) &&
      (!state.maxPrice || priceVal <= +state.maxPrice);
    const q = state.q?.trim().toLowerCase();
    const qOk =
      !q || (it.title + it.region + it.purpose).toLowerCase().includes(q);
    return dealOk && regionOk && purposeOk && sizeOk && priceOk && qOk;
  });
}
