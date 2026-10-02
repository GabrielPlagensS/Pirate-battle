import { http, HttpResponse, delay } from "msw";
import { addMatch, history, ranking } from "./db";
import type { GameResult, MatchRecord } from "../types/game";
import { getScenario } from "./scenario";

const pendingKey = "pirate-battle-pending";

async function condition(): Promise<Response | undefined> {
  const scenario = getScenario();
  const latency =
    scenario.mode === "variable"
      ? Math.round(100 + Math.random() * 900)
      : scenario.latencyMs;
  if (scenario.mode === "timeout") {
    await delay(9000);
    return HttpResponse.json({ message: "Timeout" }, { status: 504 });
  }
  if (scenario.mode === "error") {
    await delay(latency);
    return HttpResponse.json(
      { message: "Mock network failure" },
      { status: 503 },
    );
  }
  await delay(latency);
  return undefined;
}

function page<T>(items: T[], requestedPage: number, pageSize: number) {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(requestedPage, 1), totalPages);
  return {
    items: items.slice((safePage - 1) * pageSize, safePage * pageSize),
    page: safePage,
    pageSize,
    total,
    totalPages,
  };
}

export const handlers = [
  // Sonda usada por main.tsx para saber se o mock ainda está interceptando requisições.
  http.get("/api/health", () => HttpResponse.json({ ok: true })),
  http.get("/api/ranking", async ({ request }) => {
    const failed = await condition();
    if (failed) return failed;
    const url = new URL(request.url);
    const p = Number(url.searchParams.get("page") ?? 1);
    const size = Number(url.searchParams.get("pageSize") ?? 8);
    if (getScenario().mode === "empty")
      return HttpResponse.json(page([], p, size));
    return HttpResponse.json(page(ranking(), p, size));
  }),
  http.get("/api/history", async ({ request }) => {
    const failed = await condition();
    if (failed) return failed;
    const url = new URL(request.url);
    const p = Number(url.searchParams.get("page") ?? 1);
    const size = Number(url.searchParams.get("pageSize") ?? 8);
    if (getScenario().mode === "empty")
      return HttpResponse.json(page([], p, size));
    return HttpResponse.json(page(history(), p, size));
  }),
  http.post("/api/matches", async ({ request }) => {
    const failed = await condition();
    const body = (await request.json()) as GameResult & {
      id: string;
      playerId: string;
      date: string;
    };
    const match: MatchRecord = {
      id: body.id,
      playerId: body.playerId,
      date: body.date,
      score: body.score,
      duration: body.duration,
      reason: body.reason,
      config: body.config,
    };
    if (failed) {
      localStorage.setItem(pendingKey, JSON.stringify(match));
      return failed;
    }
    const saved = addMatch(match);
    localStorage.removeItem(pendingKey);
    return HttpResponse.json(saved, { status: 201 });
  }),
];
