// Per-store surface: the ONLY place business identity lives. An instance edits this file,
// the @theme tokens in src/styles/global.css, fonts in astro.config.mjs, and scripts/seed.mjs.
export const SITE = {
  name: 'Mi Tienda',
  legalName: 'Mi Tienda',
  tagline: 'Productos importados con envío a todo el país',
  description: 'Tienda en línea de productos importados: ropa, cosméticos, tecnología y hogar. Pedidos por WhatsApp.',
  city: 'Quito',
  country: 'EC',
  locale: 'es-EC',
  currency: 'USD',
  email: 'hola@example.com',
  phone: '',
  instagram: '',
  facebook: '',
  // Taxonomy copy: a store of imports says "Marca"; a gift shop might say "Ocasión".
  taxonomy: {
    category: { singular: 'Categoría', plural: 'Categorías' },
    brand: { singular: 'Marca', plural: 'Marcas' },
  },
};
