require("dotenv").config({ path: "../.env"});

module.exports = {
    client: "mysql",
    connection: {
      host: process.env.DB_HOST || "localhost",
      port: process.env.DB_PORT || 3306,
      database: process.env.DB_NAME || "db",
      user: process.env.DB_USER || "ttmobile",
      password: process.env.DB_PASSWORD || "ttmobile",
      charset: "utf8",
    },
    migrations: {
      tableName: "knex_migrations",
    },
};
