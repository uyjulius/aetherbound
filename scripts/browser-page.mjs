// Hosted CI has no GPU. Keep the same CSS viewport and controls while rendering
// fewer pixels; animation, gameplay timing and assertions remain unchanged.
export async function browserPage(browser, options = {}) {
  const page = await browser.newPage({ deviceScaleFactor: process.env.CI ? .5 : 1, ...options });
  page.setDefaultTimeout(process.env.CI ? 90000 : 45000);
  return page;
}
