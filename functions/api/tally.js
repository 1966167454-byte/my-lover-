// 票数统计接口：GET /api/tally
import { json, buildTally } from '../_lib/tally.mjs';

export async function onRequestGet(context) {
  return json(await buildTally(context.env));
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
