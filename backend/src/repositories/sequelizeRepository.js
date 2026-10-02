/**
 * MySQL persistence adapter (Sequelize).
 *
 * Differences from the original:
 *   - the model is called `Wood`, not `User`. The original table was named
 *     `users` while holding wood species, which is the single most confusing
 *     thing a reviewer could hit in that codebase.
 *   - credentials come from the environment.
 *   - schema management happens in `src/db/migrate.js` and is invoked from the
 *     bootstrap, not as a side effect of importing a model file.
 */

import { Sequelize, DataTypes } from "sequelize";
import { config } from "../config/env.js";

export async function createSequelizeRepository() {
  const sequelize = new Sequelize(
    config.database.name,
    config.database.user,
    config.database.password,
    {
      host: config.database.host,
      port: config.database.port,
      dialect: "mysql",
      logging: config.database.logging ? console.log : false,
      define: { freezeTableName: true },
    },
  );

  const Wood = sequelize.define(
    "woods",
    {
      name: { type: DataTypes.STRING(120), allowNull: false },
      price: { type: DataTypes.INTEGER, allowNull: false, validate: { min: 1 } },
      condition: { type: DataTypes.TINYINT, allowNull: false, validate: { min: 0, max: 5 } },
      quality: { type: DataTypes.TINYINT, allowNull: false, validate: { min: 0, max: 5 } },
      durability: { type: DataTypes.TINYINT, allowNull: false, validate: { min: 0, max: 5 } },
    },
    { timestamps: true },
  );

  await sequelize.authenticate();
  await sequelize.sync();

  const strip = (instance) => (instance ? instance.get({ plain: true }) : null);

  return {
    kind: "mysql",
    async list() {
      return (await Wood.findAll({ order: [["id", "ASC"]] })).map(strip);
    },
    async findById(id) {
      return strip(await Wood.findByPk(Number(id)));
    },
    async create(data) {
      return strip(await Wood.create(data));
    },
    async update(id, data) {
      const wood = await Wood.findByPk(Number(id));
      if (!wood) return null;
      await wood.update(data);
      return strip(wood);
    },
    async remove(id) {
      return (await Wood.destroy({ where: { id: Number(id) } })) > 0;
    },
    async reset() {
      await Wood.destroy({ where: {}, truncate: true });
    },
    async close() {
      await sequelize.close();
    },
  };
}
