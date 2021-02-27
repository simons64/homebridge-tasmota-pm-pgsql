import dbclient from './dbconfig';

class Server {
    constructor() {
		this.dbconnect();
 	}

	private dbconnect() {
		dbclient.connect();
    }
	public dbdisconnect() {
		dbclient.end();
	}

    public getAllDevices() {
		dbclient.query('SELECT * FROM sevenseg_powermeterdevice', (err, res) => {
		  console.log(err, res)
		})
	}
    public getAllLogs() {
		dbclient.query('SELECT * FROM sevenseg_powermeterlog', (err, res) => {
		  console.log(err, res)
		})
	}

	public addLog(device: string, v: number, a: number, w: number) {
		// update last log on devices
		const q1 = {
			text: 'UPDATE sevenseg_powermeterdevice SET lastupdate = CURRENT_TIMESTAMP, volts = $2, amps = $3, watts = $4 WHERE name=$1',
			values: [device, v, a, w],
		}
		dbclient
			.query(q1)
			.then(res => console.log(res))
			.catch(err => console.log(err))

		// add log to log table
		const q2 = {
			text: 'INSERT INTO sevenseg_powermeterlog (dev, dt, volts, amps, watts) VALUES($1, CURRENT_TIMESTAMP, $2, $3, $4)',
			values: [device, v, a, w],
		}
		dbclient
			.query(q2)
			.then(res => console.log(res))
			.catch(err => console.log(err))
	}
}

export default Server;
