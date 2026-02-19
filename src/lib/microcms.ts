import { createClient } from "microcms-js-sdk";
import type { MicroCMSListContent, MicroCMSQueries } from "microcms-js-sdk";

// microCMS クライアント生成
const serviceDomain = import.meta.env.MICROCMS_SERVICE_DOMAIN;
const apiKey = import.meta.env.MICROCMS_API_KEY;

if (!serviceDomain || !apiKey) {
  console.warn(
    "microCMS の環境変数が設定されていません。ダミーデータで表示します。"
  );
}

export const client = serviceDomain && apiKey
  ? createClient({ serviceDomain, apiKey })
  : null;

// ────────────────────────────────────
// 型定義
// ────────────────────────────────────

/** お知らせ型 */
export type News = {
  title: string;
  content: string;
  category?: string[];
  thumbnail?: {
    url: string;
    height: number;
    width: number;
  };
} & MicroCMSListContent;

// ────────────────────────────────────
// ダミーデータ（microCMS 未接続時のフォールバック）
// ────────────────────────────────────

const dummyNews: News[] = [
  {
    id: "sample-1",
    title: "サンプルお知らせ 1",
    content: "<p>これはサンプルのお知らせです。microCMS に接続すると実際のコンテンツが表示されます。</p>",
    createdAt: "2026-01-15T00:00:00.000Z",
    updatedAt: "2026-01-15T00:00:00.000Z",
    publishedAt: "2026-01-15T00:00:00.000Z",
    revisedAt: "2026-01-15T00:00:00.000Z",
  },
  {
    id: "sample-2",
    title: "サンプルお知らせ 2",
    content: "<p>2 つ目のサンプルお知らせです。環境変数を設定して microCMS と接続してください。</p>",
    createdAt: "2026-01-10T00:00:00.000Z",
    updatedAt: "2026-01-10T00:00:00.000Z",
    publishedAt: "2026-01-10T00:00:00.000Z",
    revisedAt: "2026-01-10T00:00:00.000Z",
  },
];

// ────────────────────────────────────
// ヘルパー関数
// ────────────────────────────────────

/** お知らせ一覧を取得 */
export async function getNewsList(queries?: MicroCMSQueries) {
  if (!client) {
    return { contents: dummyNews, totalCount: dummyNews.length, offset: 0, limit: 10 };
  }
  return await client.getList<News>({ endpoint: "news", queries });
}

/** お知らせ詳細を取得 */
export async function getNewsDetail(contentId: string, queries?: MicroCMSQueries) {
  if (!client) {
    const found = dummyNews.find((n) => n.id === contentId);
    if (!found) throw new Error(`News not found: ${contentId}`);
    return found;
  }
  return await client.getListDetail<News>({ endpoint: "news", contentId, queries });
}
