import "./goldIcon.css";

/** Золотая монета вместо буквы "з". */
export function goldCoinIcon(): HTMLElement {
  const span = document.createElement("span");
  span.className = "gold-coin";
  span.setAttribute("aria-hidden", "true");
  span.innerHTML =
    '<svg viewBox="0 0 16 16" focusable="false">' +
    '<circle cx="8" cy="8" r="7" fill="#d4a82e" stroke="#6a4e14" stroke-width="1.15"/>' +
    '<circle cx="8" cy="8" r="5.1" fill="#e8c04a" stroke="#f6de88" stroke-width="0.85"/>' +
    '<circle cx="5.6" cy="5.3" r="1.5" fill="#fff6c8" opacity="0.65"/>' +
    "</svg>";
  return span;
}

/** Число + иконка монеты (для цен и тултипов). */
export function goldAmountNode(amount: number, className = "gold-amount"): HTMLElement {
  const wrap = document.createElement("span");
  wrap.className = className;
  wrap.append(document.createTextNode(String(amount)), goldCoinIcon());
  return wrap;
}

/** Строка вроде "Продажа: 120🪙" внутри тултипа. */
export function goldTipLine(label: string, amount: number, className: string): HTMLElement {
  const row = document.createElement("div");
  row.className = className;
  row.append(document.createTextNode(`${label} `), goldAmountNode(amount, "gold-amount gold-amount-inline"));
  return row;
}
