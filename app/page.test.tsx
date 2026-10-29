import { render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";

import Home from "@/app/page";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

test("홈 화면은 제목과 장소·날짜·인원 검색바를 보여준다", () => {
  render(<Home />);

  expect(screen.getByRole("heading", { level: 1, name: /머무를 곳과 먹을 곳을/ })).toBeInTheDocument();
  expect(screen.getByRole("combobox", { name: "장소" })).toBeInTheDocument();
  expect(screen.getByText("체크인 – 체크아웃")).toBeInTheDocument();
  expect(screen.getByText("성인 2")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "숙식 찾기" })).toBeInTheDocument();
});
