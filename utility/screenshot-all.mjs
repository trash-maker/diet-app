import { chromium } from 'playwright';
import { mkdirSync } from 'fs';

const dir = 'C:/tmp/diet-screenshots';
mkdirSync(dir, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
const base = 'http://localhost:5174';

async function shot(name, url, extra = 0) {
  await page.goto(url);
  await page.waitForTimeout(1200 + extra);
  await page.screenshot({ path: `${dir}/${name}.png`, fullPage: true });
  console.log('âœ“', name);
}

// â”€â”€ Seed localStorage with test data â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// ra-data-local-storage stores ALL resources in one key: 'ra-data-local-storage'
await page.goto(base);
await page.waitForTimeout(800);
await page.evaluate(() => {
  const db = {
    users: [
      { id: '1', name: 'Marco Rossi', gender: 'male' },
      { id: '2', name: 'Giulia Bianchi', gender: 'female' },
    ],
    ingredients: [
      { id: '1', name: 'Petto di pollo', category: 'Carni' },
      { id: '2', name: 'Riso basmati', category: 'Cereali' },
      { id: '3', name: 'Broccoli', category: 'Verdure' },
      { id: '4', name: "Olio d'oliva", category: 'Condimenti' },
    ],
    recipes: [
      {
        id: '1',
        name: 'Pollo al forno con broccoli',
        ingredients: [
          { name: 'Petto di pollo', quantity: '200', unit: 'g' },
          { name: 'Broccoli', quantity: '150', unit: 'g' },
          { name: "Olio d'oliva", quantity: '1', unit: 'cucchiaio' },
        ],
        schedule: {
          '1': { mon: ['lunch', 'dinner'], wed: ['lunch'] },
          '2': { tue: ['dinner'], fri: ['lunch'] },
        },
        instructions: '## Preparazione\n\nPrecalda il forno a 200Â°C.\n\n- Taglia il pollo a pezzi\n- Condisci con olio e spezie\n- Cuoci per 30 minuti',
      },
      {
        id: '2',
        name: 'Riso basmati con verdure',
        ingredients: [
          { name: 'Riso basmati', quantity: '80', unit: 'g' },
          { name: 'Broccoli', quantity: '100', unit: 'g' },
        ],
        schedule: {
          '1': { tue: ['lunch'], thu: ['lunch'] },
        },
        instructions: '## Preparazione\n\nCuoci il riso in acqua salata.\n\n1. Lessa i broccoli\n2. Unisci al riso\n3. Condisci a piacere',
      },
    ],
    'meal-plans': [
      {
        id: '1',
        weekStart: '2026-05-25',
        slots: {
          '1': {
            mon: {
              lunch:  { recipeId: '1', note: '' },
              dinner: { recipeId: '1', note: 'con insalata' },
            },
            tue: { lunch: { recipeId: '2', note: '' } },
          },
          '2': {
            tue:  { dinner: { recipeId: '1', note: '' } },
            fri:  { lunch:  { recipeId: '1', note: '' } },
          },
        },
        shoppingListChecked: [],
      },
    ],
  };
  localStorage.setItem('ra-data-local-storage', JSON.stringify(db));
});
await page.reload();
await page.waitForTimeout(1000);
console.log('âœ“ seed done');

// â”€â”€ List pages â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
await shot('01-users-list',         `${base}/#/users`);
await shot('02-ingredients-list',   `${base}/#/ingredients`);
await shot('03-recipes-list',       `${base}/#/recipes`);
await shot('04-meal-plans-list',    `${base}/#/meal-plans`);

// â”€â”€ Create pages â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
await shot('05-users-create',       `${base}/#/users/create`);
await shot('06-ingredients-create', `${base}/#/ingredients/create`);
await shot('07-recipes-create',     `${base}/#/recipes/create`, 600);
await shot('08-meal-plans-create',  `${base}/#/meal-plans/create`, 600);

// â”€â”€ Show / Edit â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
await shot('09-users-show',         `${base}/#/users/1/show`);
await shot('10-users-edit',         `${base}/#/users/1`);
await shot('11-ingredients-show',   `${base}/#/ingredients/1/show`);
await shot('12-ingredients-edit',   `${base}/#/ingredients/1`);
await shot('13-recipes-show',       `${base}/#/recipes/1/show`, 800);
await shot('14-recipes-edit',       `${base}/#/recipes/1`, 800);
await shot('15-meal-plans-show',    `${base}/#/meal-plans/1/show`, 600);
await shot('16-meal-plans-edit',    `${base}/#/meal-plans/1`, 600);

// â”€â”€ Shopping list â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
await page.goto(`${base}/#/meal-plans/1/shopping-list`);
await page.waitForTimeout(1200);
await page.screenshot({ path: `${dir}/17-shopping-list.png`, fullPage: true });
console.log('âœ“ 17-shopping-list');

// â”€â”€ Print page (noLayout) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
await page.goto(`${base}/#/meal-plans/1/print`);
await page.waitForTimeout(1800);
await page.screenshot({ path: `${dir}/18-print-page.png`, fullPage: true });
console.log('âœ“ 18-print-page');

await browser.close();
console.log('\nDone â€“', dir);

