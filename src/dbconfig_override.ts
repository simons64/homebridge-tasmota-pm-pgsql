const pg = require("pg");

export default new pg.Client({
    user: '',
    host: '',
    database: '',
    password: '',
    port: 1,
});
