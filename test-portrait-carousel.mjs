export default async function run(page, ui) {
  const results = [];
  const viewports = [
    { name: "320px", width: 320, height: 600 },
    { name: "360px", width: 360, height: 700 },
    { name: "375px", width: 375, height: 667 },
    { name: "390px", width: 390, height: 844 },
    { name: "414px", width: 414, height: 896 },
    { name: "430px", width: 430, height: 932 },
    { name: "1280px", width: 1280, height: 800 }
  ];

  for (const vp of viewports) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto("http://localhost:5173/volunteers", { waitUntil: "networkidle" });
    await page.waitForTimeout(600);

    const data = await page.evaluate((vpName) => {
      const isOverflown = document.documentElement.scrollWidth > window.innerWidth;

      const mobileCards = Array.from(document.querySelectorAll(".sm\\:hidden.flex.flex-col.items-center"));
      const isMobile = window.innerWidth < 640;

      let cardWidth = null;
      let cardHeight = null;
      let isPortrait = false;
      let avatarWidth = null;
      let avatarHeight = null;
      let isCircular = false;
      let cardRatio = null;

      if (isMobile && mobileCards.length > 0) {
        const cardParent = mobileCards[0].closest("[class*='basis-']");
        if (cardParent) {
          const rect = cardParent.getBoundingClientRect();
          cardWidth = rect.width;
          cardHeight = rect.height;
          cardRatio = (cardWidth / cardHeight).toFixed(2);
          isPortrait = cardHeight > cardWidth;
        }

        const avatar = mobileCards[0].querySelector("img, .relative.h-32, .relative.h-36");
        if (avatar) {
          const avatarRect = avatar.getBoundingClientRect();
          avatarWidth = avatarRect.width;
          avatarHeight = avatarRect.height;
          isCircular = Math.abs(avatarWidth - avatarHeight) < 2;
        }
      }

      return {
        viewport: vpName,
        viewportWidth: window.innerWidth,
        isOverflown,
        isMobile,
        cardWidth,
        cardHeight,
        cardRatio,
        isPortrait,
        avatarWidth,
        avatarHeight,
        isCircular,
      };
    }, vp.name);

    results.push(data);
  }

  // Test home page
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto("http://localhost:5173/", { waitUntil: "networkidle" });
  await page.waitForTimeout(600);

  const homeData = await page.evaluate(() => {
    const isOverflown = document.documentElement.scrollWidth > window.innerWidth;
    const cards = Array.from(document.querySelectorAll(".sm\\:hidden.flex.flex-col.items-center"));
    let firstCardRect = null;
    let secondCardRect = null;
    let card1VisibleRatio = null;
    let card2VisibleRatio = null;

    if (cards.length >= 2) {
      const c1 = cards[0].closest("[class*='basis-']").getBoundingClientRect();
      const c2 = cards[1].closest("[class*='basis-']").getBoundingClientRect();
      firstCardRect = { left: c1.left, right: c1.right, width: c1.width };
      secondCardRect = { left: c2.left, right: c2.right, width: c2.width };

      // Calculate visibility
      const c1VisibleWidth = Math.min(c1.right, window.innerWidth) - Math.max(c1.left, 0);
      const c2VisibleWidth = Math.min(c2.right, window.innerWidth) - Math.max(c2.left, 0);
      card1VisibleRatio = (c1VisibleWidth / c1.width).toFixed(2);
      card2VisibleRatio = (c2VisibleWidth / c2.width).toFixed(2);
    }

    return {
      page: "home",
      isOverflown,
      card1VisibleRatio,
      card2VisibleRatio,
      firstCardRect,
      secondCardRect
    };
  });

  results.push(homeData);

  return results;
}
