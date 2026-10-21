import crypto from 'node:crypto';

export const DEMO_TTL_MS = 30 * 60 * 1000;
const LEASE_MS = 45 * 1000;

// Short-lived anonymous practice only. Account-owned training uses its own store.
// A lease prevents overlapping requests across old/new instances during deploys.
export function createDemoStore(query = null, now = Date.now) {
  const memory = new Map();
  const copy = value => structuredClone(value);
  async function read(id, owner) {
    if (query) {
      const result = await query('SELECT state FROM experience_demo_sessions WHERE id=$1 AND owner_hash=$2 AND expires_at>NOW()', [id, owner]);
      return result.rows[0]?.state || null;
    }
    const row = memory.get(id);
    return row && row.owner === owner && row.expires > now() ? copy(row.state) : null;
  }
  return {
    async create(id, owner, state) {
      if (query) {
        await query("INSERT INTO experience_demo_sessions(id,owner_hash,state,expires_at) VALUES($1,$2,$3::jsonb,NOW()+INTERVAL '30 minutes')", [id, owner, JSON.stringify(state)]);
      } else memory.set(id, {owner, state: copy(state), expires: now() + DEMO_TTL_MS, lease: null, busyUntil: 0});
    },
    read,
    async acquire(id, owner) {
      const lease = crypto.randomUUID();
      if (query) {
        const result = await query("UPDATE experience_demo_sessions SET busy_token=$3,busy_until=NOW()+INTERVAL '45 seconds' WHERE id=$1 AND owner_hash=$2 AND expires_at>NOW() AND (busy_until IS NULL OR busy_until<NOW()) RETURNING state", [id, owner, lease]);
        if (result.rows[0]) return {state: result.rows[0].state, lease};
        return {error: await read(id, owner) ? 'busy' : 'expired'};
      }
      const row = memory.get(id);
      if (!row || row.owner !== owner || row.expires <= now()) return {error: 'expired'};
      if (row.busyUntil > now()) return {error: 'busy'};
      row.lease = lease; row.busyUntil = now() + LEASE_MS;
      return {state: copy(row.state), lease};
    },
    async save(id, owner, lease, state) {
      if (query) {
        const result = await query("UPDATE experience_demo_sessions SET state=$4::jsonb,expires_at=NOW()+INTERVAL '30 minutes',busy_token=NULL,busy_until=NULL WHERE id=$1 AND owner_hash=$2 AND busy_token=$3", [id, owner, lease, JSON.stringify(state)]);
        if (result.rowCount !== 1) throw new Error('Demo request lease lost');
        return;
      }
      const row = memory.get(id);
      if (!row || row.owner !== owner || row.lease !== lease) throw new Error('Demo request lease lost');
      row.state = copy(state); row.expires = now() + DEMO_TTL_MS; row.lease = null; row.busyUntil = 0;
    },
    async release(id, owner, lease) {
      if (query) {
        await query('UPDATE experience_demo_sessions SET busy_token=NULL,busy_until=NULL WHERE id=$1 AND owner_hash=$2 AND busy_token=$3', [id, owner, lease]);
      } else {
        const row = memory.get(id);
        if (row?.owner === owner && row.lease === lease) { row.lease = null; row.busyUntil = 0; }
      }
    },
    async cleanup() {
      if (query) await query('DELETE FROM experience_demo_sessions WHERE expires_at<=NOW()');
      else for (const [id, row] of memory) if (row.expires <= now()) memory.delete(id);
    }
  };
}
