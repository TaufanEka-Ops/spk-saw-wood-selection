/**
 * In-memory persistence adapter.
 *
 * Exists so the API can be started and tested without a database server,
 * which is what makes `npm test` runnable on any machine. Implements the same
 * contract as the Sequelize adapter, so the choice is a single env var.
 */

let sequence = 0;
const nextId = () => String(++sequence);

export function createMemoryRepository(seed = []) {
  const rows = new Map();
  for (const row of seed) rows.set(row.id ?? nextId(), { ...row, id: row.id ?? nextId() });
  // keep ids stable and sequential for seeded data
  let counter = rows.size;

  const clone = (row) => (row ? { ...row } : null);

  return {
    kind: "memory",

    async list() {
      return [...rows.values()].map(clone);
    },

    async findById(id) {
      return clone(rows.get(String(id)));
    },

    async create(data) {
      counter += 1;
      const id = String(counter);
      const row = { id, ...data };
      rows.set(id, row);
      return clone(row);
    },

    async update(id, data) {
      const key = String(id);
      if (!rows.has(key)) return null;
      const row = { ...rows.get(key), ...data, id: key };
      rows.set(key, row);
      return clone(row);
    },

    async remove(id) {
      return rows.delete(String(id));
    },

    async reset() {
      rows.clear();
      counter = 0;
    },
  };
}
