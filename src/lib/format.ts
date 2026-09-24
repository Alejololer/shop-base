import { SITE } from '../config/site';
import { money } from './shop';

export const usd = (n: number | null | undefined) => (n == null ? 'Consultar' : money(n, SITE.currency, SITE.locale));

export const slugify = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

export const WHATSAPP = import.meta.env.PUBLIC_WHATSAPP ?? '';
export const waLink = (text: string, phone = WHATSAPP) => `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`;

/** Parse "Label|Value" lines from a textarea into rows. */
export const parseRows = (raw: string | null | undefined) =>
  (raw ?? '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const [label, ...rest] = l.split('|');
      return { label: label.trim(), value: rest.join('|').trim() };
    });

export const rowsToText = (rows: { label: string; value: string | number | null }[]) =>
  rows.map((r) => `${r.label}|${r.value ?? ''}`).join('\n');

export const priceLabel = (n: number | null | undefined) => (n == null ? 'Precio por confirmar' : usd(n));
