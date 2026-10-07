// ⚠️  DEMO DATA ONLY – clearly separated from production data.
// Used by (1) the localStorage demo backend and (2) scripts/generate-seed.mjs → supabase/seed.sql.
// Prices, "market prices" and stock below are placeholders. Replace them with your real catalogue
// from Admin → Products (or delete all demo products with one click).

export const DEMO_CATEGORIES = [
  { slug: 'kitkat', name: 'KitKat' },
  { slug: 'kinder', name: 'Kinder' },
  { slug: 'ferrero', name: 'Ferrero' },
  { slug: 'snickers', name: 'Snickers' },
  { slug: 'toblerone', name: 'Toblerone' },
  { slug: 'lindt', name: 'Lindt' },
  { slug: 'hersheys', name: "Hershey's" },
  { slug: 'bounty', name: 'Bounty' },
  { slug: 'gift-boxes', name: 'Gift Boxes' },
  { slug: 'premium', name: 'Premium Chocolates' },
];

const common = {
  storage_info: 'Store in a cool, dry place below 25°C, away from direct sunlight and strong odours.',
  authenticity_info: 'Demo text – replace with your real sourcing / authenticity information.',
  country_of_origin: 'As printed on pack',
  expiry_info: 'Best before date printed on pack',
};

export const DEMO_PRODUCTS = [
  { slug: 'kitkat-2-finger', name: 'KitKat 2 Finger', brand: 'KitKat', category: 'kitkat', price: 60, comparison_price: 80, cost_price: 45, stock: 120, weight: '17.7 g', featured: true,
    short_description: 'Crisp wafer fingers wrapped in smooth milk chocolate.',
    description: 'A classic break-time snack: light, crunchy wafer layers covered in milk chocolate. Perfect for a quick treat or lunchbox.',
    ingredients: 'Sugar, wheat flour, cocoa butter, cocoa mass, skimmed milk powder, vegetable fat, emulsifier (soy lecithin), yeast, raising agent. Contains milk, wheat, soy.' },
  { slug: 'kitkat-4-finger', name: 'KitKat 4 Finger', brand: 'KitKat', category: 'kitkat', price: 110, comparison_price: 140, cost_price: 85, stock: 80, weight: '41.5 g', featured: false,
    short_description: 'The full four-finger break in milk chocolate.',
    description: 'Four wafer fingers to share (or not). Milk chocolate with a satisfying snap.',
    ingredients: 'Sugar, wheat flour, cocoa butter, cocoa mass, skimmed milk powder, vegetable fat, emulsifier (soy lecithin). Contains milk, wheat, soy.' },
  { slug: 'kinder-bueno', name: 'Kinder Bueno', brand: 'Kinder', category: 'kinder', price: 190, comparison_price: 240, cost_price: 150, stock: 60, weight: '43 g (2 bars)', featured: true,
    short_description: 'Crispy wafer, creamy hazelnut filling, milk chocolate.',
    description: 'Two bars with a light wafer shell, a smooth milk-and-hazelnut cream filling and a delicate chocolate coating.',
    ingredients: 'Sugar, vegetable oils, hazelnuts, skimmed milk powder, cocoa butter, wheat flour, whey powder. Contains milk, hazelnuts, wheat, soy.' },
  { slug: 'kinder-joy', name: 'Kinder Joy', brand: 'Kinder', category: 'kinder', price: 110, comparison_price: 140, cost_price: 82, stock: 45, weight: '20 g', featured: false,
    short_description: 'Two-in-one: cocoa & milk cream with wafer bites, plus a toy surprise.',
    description: 'A split egg with a sweet milk and cocoa cream on one side and crispy wafer balls on the other.',
    ingredients: 'Sugar, milk, vegetable oils, cocoa, wheat flour, whey powder. Contains milk, wheat, soy, may contain nuts.' },
  { slug: 'ferrero-rocher-16', name: 'Ferrero Rocher (16 pcs)', brand: 'Ferrero', category: 'ferrero', price: 1150, comparison_price: 1450, cost_price: 920, stock: 25, weight: '200 g', featured: true,
    short_description: 'Hazelnut crunch inside a rich chocolate shell – sixteen golden pralines.',
    description: 'A whole roasted hazelnut wrapped in hazelnut cream, a crisp wafer shell and finely chopped hazelnut pieces. A well-loved gift.',
    ingredients: 'Milk chocolate, sugar, vegetable oil, hazelnuts, wheat flour, whey powder, cocoa. Contains milk, hazelnuts, wheat, soy.' },
  { slug: 'ferrero-rocher-3', name: 'Ferrero Rocher (3 pcs)', brand: 'Ferrero', category: 'ferrero', price: 190, comparison_price: 240, cost_price: 150, stock: 3, weight: '37.5 g', featured: false,
    short_description: 'A tiny treat box of three hazelnut pralines.',
    description: 'Try before you gift: three Ferrero Rocher pralines in a compact pack.',
    ingredients: 'Milk chocolate, sugar, vegetable oil, hazelnuts, wheat flour, whey powder, cocoa. Contains milk, hazelnuts, wheat, soy.' },
  { slug: 'snickers-50g', name: 'Snickers Bar 50 g', brand: 'Snickers', category: 'snickers', price: 95, comparison_price: 120, cost_price: 72, stock: 100, weight: '50 g', featured: false,
    short_description: 'Peanuts, caramel and nougat covered in milk chocolate.',
    description: 'Hunger bar with roasted peanuts, gooey caramel and nougat wrapped in milk chocolate.',
    ingredients: 'Milk chocolate, peanuts, sugar, glucose syrup, skimmed milk powder, palm oil, egg white. Contains milk, peanuts, egg, soy.' },
  { slug: 'toblerone-100g', name: 'Toblerone Milk 100 g', brand: 'Toblerone', category: 'toblerone', price: 420, comparison_price: 520, cost_price: 340, stock: 40, weight: '100 g', featured: true,
    short_description: 'Swiss-style milk chocolate with honey and almond nougat.',
    description: 'The distinctive triangular bar with honey and almond nougat pieces in milk chocolate.',
    ingredients: 'Milk chocolate, sugar, honey, almonds, egg white. Contains milk, almonds, egg, may contain other nuts.' },
  { slug: 'toblerone-360g', name: 'Toblerone Milk 360 g', brand: 'Toblerone', category: 'toblerone', price: 1350, comparison_price: 1700, cost_price: 1100, stock: 0, weight: '360 g', featured: false,
    short_description: 'The big sharing bar – ideal for gifting.',
    description: 'A large Toblerone bar for sharing at home or gifting during celebrations.',
    ingredients: 'Milk chocolate, sugar, honey, almonds, egg white. Contains milk, almonds, egg, may contain other nuts.' },
  { slug: 'lindt-excellence-70', name: 'Lindt Excellence 70% Cocoa', brand: 'Lindt', category: 'lindt', price: 780, comparison_price: 950, cost_price: 620, stock: 30, weight: '100 g', featured: true,
    short_description: 'Intense dark chocolate with a smooth, balanced finish.',
    description: 'A refined dark chocolate for people who love a deep cocoa flavour without too much bitterness.',
    ingredients: 'Cocoa mass, sugar, cocoa butter, cocoa powder, vanilla. May contain milk, nuts, soy.' },
  { slug: 'lindt-lindor-assorted', name: 'Lindt Lindor Assorted 200 g', brand: 'Lindt', category: 'premium', price: 1650, comparison_price: 2050, cost_price: 1350, stock: 18, weight: '200 g', featured: true,
    short_description: 'Melt-in-the-mouth truffles with a smooth filling.',
    description: 'A premium assortment of truffles with a thin chocolate shell and a creamy centre.',
    ingredients: 'Sugar, vegetable fat, cocoa butter, skimmed milk powder, cocoa mass, hazelnut paste. Contains milk, hazelnuts, soy.' },
  { slug: 'hersheys-milk-bar', name: "Hershey's Milk Chocolate Bar", brand: "Hershey's", category: 'hersheys', price: 380, comparison_price: 480, cost_price: 300, stock: 35, weight: '100 g', featured: false,
    short_description: 'Classic creamy milk chocolate.',
    description: 'A simple and familiar milk chocolate bar with a creamy, mellow taste.',
    ingredients: 'Sugar, milk, chocolate, cocoa butter, milk fat, lecithin, PGPR. Contains milk, soy.' },
  { slug: 'bounty-57g', name: 'Bounty Coconut Bar', brand: 'Bounty', category: 'bounty', price: 110, comparison_price: 140, cost_price: 84, stock: 55, weight: '57 g (2 bars)', featured: false,
    short_description: 'Soft coconut filling in milk chocolate.',
    description: 'Tender coconut centre covered in smooth milk chocolate.',
    ingredients: 'Coconut, sugar, glucose syrup, milk chocolate, skimmed milk powder. Contains milk, soy.' },
  { slug: 'assorted-gift-box', name: 'Assorted Chocolate Gift Box', brand: 'Choco Haat', category: 'gift-boxes', price: 1850, comparison_price: null, cost_price: 1500, stock: 12, weight: '≈ 450 g', featured: true,
    short_description: 'A hand-packed box of popular chocolates, ready to gift.',
    description: 'A selection of our best-selling chocolates in a gift-ready box. Contents may vary slightly depending on stock.',
    ingredients: 'Assorted chocolates – see individual wrappers for ingredients and allergens.' },
];

export function demoProductRow(p) {
  return {
    ...common,
    ...p,
    show_comparison: p.comparison_price != null,
    is_demo: true,
  };
}
