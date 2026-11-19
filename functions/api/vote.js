// 投票接口：POST /api/vote（数据存 D1）
import { ID_SET, MAX_VOTES } from '../_lib/data.mjs';
import { json, buildTally } from '../_lib/tally.mjs';

export async function onRequestPost(context) {
  const { request, env } = context;

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return json({ ok: false, error: '无效的请求体' }, 400);
  }

  const voterId = String((body && body.voterId) || '').trim();
  if (!voterId || voterId.length > 80) {
    return json({ ok: false, error: '缺少有效的 voterId' }, 400);
  }

  const rawVotes = Array.isArray(body.votes) ? body.votes : [];
  const votes = [...new Set(rawVotes.map(String))];

  if (votes.length > MAX_VOTES) {
    return json({ ok: false, error: '每人最多投 ' + MAX_VOTES + ' 票' }, 400);
  }
  for (const id of votes) {
    if (!ID_SET.has(id)) {
      return json({ ok: false, error: '存在无效的选手 id: ' + id }, 400);
    }
  }
  if (votes.length === 0) {
    return json({ ok: false, error: '请至少投 1 票' }, 400);
  }

  // 已投过票的，不可修改、不可撤销
  const existing = await env.DB.prepare(
    'SELECT COUNT(*) AS c FROM votes WHERE voter_id = ?'
  ).bind(voterId).first();

  if (existing && existing.c > 0) {
    return json({ ok: false, error: '已投过票，不可修改或撤销' }, 409);
  }

  // 一次性写入（D1 batch 为事务，避免半途失败）
  const statements = votes.map((id) =>
    env.DB.prepare(
      'INSERT INTO votes (voter_id, participant_id) VALUES (?, ?)'
    ).bind(voterId, id)
  );
  await env.DB.batch(statements);

  return json({ ok: true, tally: await buildTally(env) });
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
