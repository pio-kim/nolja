import { expect, test } from "@playwright/test";

test("홈 화면이 열리고 검색바가 보인다", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle("NOLJA · 국내 숙식 탐색");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("머무를 곳과 먹을 곳을");
  await expect(page.getByRole("combobox", { name: "장소" })).toBeVisible();
});
