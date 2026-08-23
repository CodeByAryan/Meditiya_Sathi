export default async function run(page, ui) {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto("http://localhost:5173/volunteers", { waitUntil: "networkidle" });
  await page.waitForTimeout(600);

  // Test DOM injection of edge case volunteers to test rendering
  const testResults = await page.evaluate(() => {
    // Check swipe / drag on carousel
    const carousel = document.querySelector("[role='region'][aria-roledescription='carousel']");
    const dots = document.querySelectorAll("button[aria-label^='Go to volunteer']");

    return {
      hasCarousel: !!carousel,
      dotsCount: dots.length,
      pageScrollWidth: document.documentElement.scrollWidth,
      windowWidth: window.innerWidth,
      hasOverflow: document.documentElement.scrollWidth > window.innerWidth
    };
  });

  // Click second dot to test carousel navigation
  const dot2 = page.locator("button[aria-label='Go to volunteer 2']");
  if (await dot2.count() > 0) {
    await dot2.click();
    await page.waitForTimeout(500);
  }

  return { testResults };
}
