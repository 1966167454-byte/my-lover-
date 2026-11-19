// 公共工具：JSON 响应 + 票数统计（供 Cloudflare Pages Functions 使用，数据存 D1）
import { PARTICIPANTS } from './data.mjs';

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

// 从 D1 中汇总全部选手的票数（D1 强一致，投完立即可见）
export async function buildTally(env) {
  const grouped = await env.DB.prepare(
    'SELECT participant_id AS id, COUNT(*) AS c FROM votes GROUP BY participant_id'
  ).all();

  const countMap = {};
  for (const row of grouped.results) {
    countMap[row.id] = row.c;
  }

  const rows = PARTICIPANTS.map((p) => ({
    id: p.id,
    name: p.name,
    className: p.className,
    count: countMap[p.id] || 0,
  })).sort((a, b) => b.count - a.count);

  const totalVotes = rows.reduce((s, r) => s + r.count, 0);
  const voterRes = await env.DB.prepare(
    'SELECT COUNT(DISTINCT voter_id) AS c FROM votes'
  ).first();
  const voterCount = voterRes ? voterRes.c : 0;

  return { voterCount, totalVotes, rows };
}
