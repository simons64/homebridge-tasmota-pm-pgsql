import { Client } from 'pg';

export default new Client ({
 	user: 'simon',
    host: '127.0.0.1',
	database: 'pmdevices',
	password: '2457',
    port: 5432,
});

