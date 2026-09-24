import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseVariants, variantsToText, addLine, cartMessage, cartTotal, itemCount, setQty, soldOut, variantOptions, waUrl, type Line } from './shop.ts';

const base = { productId: 1, slug: 'polo', name: 'Polo', price: 12.5, image: null, variantId: null, options: [], max: null };
const fmt = (n: number) => `$${n.toFixed(2)}`;

test('soldOut: no variants is NOT sold out; all variants at 0 IS', () => {
  assert.equal(soldOut([]), false);
  assert.equal(soldOut([{ id: 1, option1: 'M', option2: '', stock: 0 }]), true);
  assert.equal(soldOut([{ id: 1, option1: 'M', option2: '', stock: 0 }, { id: 2, option1: 'L', option2: '', stock: 2 }]), false);
});

test('product without variants: uncapped, merges lines', () => {
  let c: Line[] = addLine([], base, 3);
  c = addLine(c, base, 50);
  assert.equal(c.length, 1);
  assert.equal(c[0].qty, 53);
});

test('variants are separate lines and capped by stock', () => {
  const m = { ...base, variantId: 10, options: ['Talla: M'], max: 2 };
  const l = { ...base, variantId: 11, options: ['Talla: L'], max: 5 };
  let c = addLine(addLine([], m, 5), l);
  assert.equal(c.length, 2);
  assert.equal(c[0].qty, 2, 'capped at stock');
  c = setQty(c, c[1].key, 99);
  assert.equal(c[1].qty, 5);
  assert.equal(itemCount(c), 7);
});

test('sold-out variant never enters the cart; qty 0 removes', () => {
  assert.deepEqual(addLine([], { ...base, variantId: 3, max: 0 }), []);
  const c = addLine([], base);
  assert.deepEqual(setQty(c, c[0].key, 0), []);
});

test('totals avoid float drift and flag unpriced lines', () => {
  const c = addLine(addLine([], { ...base, price: 0.1 }, 3), { ...base, productId: 2, price: null });
  assert.deepEqual(cartTotal(c), { total: 0.3, partial: true });
});

test('variantOptions labels only declared axes', () => {
  assert.deepEqual(variantOptions(['Tono', 'Tamaño'], { option1: '220 Beige', option2: '30ml' }), ['Tono: 220 Beige', 'Tamaño: 30ml']);
  assert.deepEqual(variantOptions(['Capacidad', null], { option1: '128GB', option2: 'x' }), ['Capacidad: 128GB']);
});

test('WhatsApp message lists options and total', () => {
  const c = addLine(addLine([], { ...base, variantId: 1, options: ['Talla: M', 'Color: Rojo'], max: 5 }, 2), { ...base, productId: 2, name: 'Labial', price: 4.99 });
  const msg = cartMessage(c, 'Pedido:\n{items}\nTotal: {total}', fmt);
  assert.equal(msg, 'Pedido:\n• 2 × Polo (Talla: M, Color: Rojo) — $25.00\n• 1 × Labial — $4.99\nTotal: $29.99');
  assert.match(waUrl('+593 99 123 4567', 'hola'), /^https:\/\/wa\.me\/593991234567\?text=hola$/);
});

test('CMS variant lines round-trip; bad stock becomes 0', () => {
  const rows = parseVariants('M | Rojo | 12 | TS-M-R\n\n220 Beige|30ml|x\n128GB');
  assert.deepEqual(rows, [
    { option1: 'M', option2: 'Rojo', stock: 12, sku: 'TS-M-R', sort: 0 },
    { option1: '220 Beige', option2: '30ml', stock: 0, sku: null, sort: 1 },
    { option1: '128GB', option2: '', stock: 0, sku: null, sort: 2 },
  ]);
  assert.equal(variantsToText(rows), 'M|Rojo|12|TS-M-R\n220 Beige|30ml|0\n128GB||0');
});
