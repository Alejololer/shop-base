// Pure purchase logic: stock rules, cart lines, WhatsApp message. No Astro, DB or DOM imports,
// so `npm test` runs it with plain Node. Browser glue lives in src/components/Cart.astro.

export type VariantLite = { id: number; option1: string; option2: string; stock: number };

export type Line = {
  key: string;
  productId: number;
  slug: string;
  name: string;
  price: number | null;
  image: string | null;
  variantId: number | null;
  options: string[]; // already labelled: ["Talla: M", "Color: Rojo"]
  qty: number;
  max: number | null; // null = uncapped (product without variants)
};

export const lineKey = (productId: number, variantId: number | null) => `${productId}::${variantId ?? ''}`;

// "No variants" and "every variant at 0" must behave OPPOSITELY. [].every() is true, so the
// length guard is what keeps every variant-less product from showing as sold out.
export const hasVariants = (variants: VariantLite[]) => variants.length > 0;
export const soldOut = (variants: VariantLite[]) => hasVariants(variants) && variants.every((v) => v.stock <= 0);

export const variantOptions = (labels: [string | null, string | null], v: Pick<VariantLite, 'option1' | 'option2'>) =>
  [
    [labels[0], v.option1],
    [labels[1], v.option2],
  ]
    .filter(([l, val]) => l && val)
    .map(([l, val]) => `${l}: ${val}`);

const clamp = (qty: number, max: number | null) => Math.max(0, max == null ? qty : Math.min(qty, max));

export function addLine(lines: Line[], item: Omit<Line, 'key' | 'qty'>, qty = 1): Line[] {
  if (item.max != null && item.max <= 0) return lines; // sold-out variant never enters the cart
  const key = lineKey(item.productId, item.variantId);
  const found = lines.find((l) => l.key === key);
  if (found) return setQty(lines, key, found.qty + qty);
  return [...lines, { ...item, key, qty: clamp(qty, item.max) }];
}

export function setQty(lines: Line[], key: string, qty: number): Line[] {
  return lines
    .map((l) => (l.key === key ? { ...l, qty: clamp(qty, l.max) } : l))
    .filter((l) => l.qty > 0);
}

export const itemCount = (lines: Line[]) => lines.reduce((n, l) => n + l.qty, 0);

/** Total of priced lines; `partial` flags lines whose price is still "por confirmar". */
export function cartTotal(lines: Line[]) {
  const cents = lines.reduce((s, l) => s + (l.price == null ? 0 : Math.round(l.price * 100) * l.qty), 0);
  return { total: cents / 100, partial: lines.some((l) => l.price == null) };
}

export const money = (n: number, currency = 'USD', locale = 'es-EC') =>
  new Intl.NumberFormat(locale, { style: 'currency', currency }).format(n);

export const fill = (tpl: string, vars: Record<string, string>) => tpl.replace(/\{(\w+)\}/g, (m, k) => vars[k] ?? m);

export function cartMessage(lines: Line[], template: string, fmt: (n: number) => string = (n) => money(n)) {
  const items = lines
    .map((l) => {
      const opts = l.options.length ? ` (${l.options.join(', ')})` : '';
      const price = l.price == null ? 'precio por confirmar' : fmt(l.price * l.qty);
      return `• ${l.qty} × ${l.name}${opts} — ${price}`;
    })
    .join('\n');
  const { total, partial } = cartTotal(lines);
  return fill(template, { items, total: fmt(total) + (partial ? ' + productos por confirmar' : '') });
}

export const waUrl = (phone: string, text: string) => `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`;

/** "M|Rojo|12|TS-M-R" per line → variant rows. Stock defaults to 0; blank lines are skipped. */
export const parseVariants = (raw: string | null | undefined) =>
  (raw ?? '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l, sort) => {
      const [option1 = '', option2 = '', stock = '0', sku = ''] = l.split('|').map((s) => s.trim());
      return { option1, option2, stock: Math.max(0, Number.parseInt(stock, 10) || 0), sku: sku || null, sort };
    });

export const variantsToText = (vs: { option1: string; option2: string; stock: number; sku: string | null }[]) =>
  vs.map((v) => [v.option1, v.option2, v.stock, v.sku ?? ''].join('|').replace(/\|+$/, '')).join('\n');
