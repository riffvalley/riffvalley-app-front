import { expect, test } from '@playwright/test';
import { mockApi, seedSession } from '../../sessionFixtures';

test('babyUser submits a request with Catalog selections and sees it in own requests', async ({ page }) => {
  await mockApi(page);
  await seedSession(page, '["babyUser"]');

  const submitted: unknown[] = [];
  const ownRequest = {
    id: 'request-1', discName: 'Disco Nuevo', artistName: 'Banda Nueva',
    releaseDate: '2026-08-12', ep: false, debut: false, status: 'pending',
    adminNotes: null, createdAt: '2026-08-01T00:00:00.000Z',
    genre: { id: 'genre-rock', name: 'Rock' }, country: { id: 'country-es', name: 'España' },
  };

  await page.route((url) => url.pathname.endsWith('/catalog'), async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
      genres: [{ id: 'genre-rock', name: 'Rock', color: '#123456' }],
      countries: [{ id: 'country-es', name: 'España', isoCode: 'ES' }],
    }) });
  });
  await page.route((url) => url.pathname.endsWith('/requests/my'), async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
  });
  await page.route((url) => url.pathname.endsWith('/requests'), async (route) => {
    if (route.request().method() !== 'POST') return route.continue();
    submitted.push(route.request().postDataJSON());
    await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify(ownRequest) });
  });

  await page.goto('/suggest');
  await expect(page).toHaveURL('/suggest');
  await expect(page.getByText('Rock', { exact: true })).toHaveCount(0); // options appear inside closed selectors
  await expect(page.getByText('Sin solicitudes todavía')).toBeVisible();

  await page.getByPlaceholder('Ej: Metallica').fill('  Banda Nueva  ');
  await page.getByPlaceholder('Ej: Master of Puppets').fill('  Disco Nuevo  ');
  await page.locator('input[type="date"]').fill('2026-08-12');
  await page.locator('.main_wrapper').nth(0).click();
  await page.locator('.teleport-overlay li').filter({ hasText: 'Rock' }).click();
  await page.locator('.main_wrapper').nth(1).click();
  await page.locator('.teleport-overlay li').filter({ hasText: 'España' }).click();
  await page.getByRole('button', { name: 'EP', exact: true }).click();
  await page.getByRole('button', { name: 'Debut', exact: true }).click();
  await page.getByRole('button', { name: 'Enviar solicitud' }).click();

  await expect(page.getByText('Petición enviada correctamente')).toBeVisible();
  await expect(page.getByText('Banda Nueva — Disco Nuevo')).toBeVisible();
  expect(submitted).toEqual([{
    discName: 'Disco Nuevo', artistName: 'Banda Nueva', releaseDate: '2026-08-12',
    ep: true, debut: true, genreId: 'genre-rock', countryId: 'country-es',
  }]);
});
