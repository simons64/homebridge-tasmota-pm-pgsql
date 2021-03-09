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

	private addDevice(device: string) {
		const q1 = {
			text: 'INSERT INTO sevenseg_powermeterdevice (name, volts, amps, watts, lastupdate) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)',
			values: [device, 0.0, 0.0, 0.0],
		}
		dbclient
			.query(q1)
			.catch((err: any) => console.log(err))
	}

	public checkForDevice(device: string) {
		const q1 = {text: 'SELECT name FROM sevenseg_powermeterdevice'}
		dbclient
			.query(q1)
			.then((res: any) => {
				var exists = false;
				for(const el of res.rows) {
					if(el.name && !el.name.localeCompare(device)) {
						exists = true;
						break;
					}
				}

				if(!exists) {
					this.addDevice(device);
				}	
			})
			.catch((err: any) => console.log(err))
	}

	public addLog(device: string, v: number, a: number, w: number) {
		// update last log on devices
		const q1 = {
			text: 'UPDATE sevenseg_powermeterdevice SET lastupdate = CURRENT_TIMESTAMP, volts = $2, amps = $3, watts = $4 WHERE name=$1',
			values: [device, v, a, w],
		}
		dbclient
			.query(q1)
			.catch((err: any) => console.log(err))

		// add log to log table
		const q2 = {
			text: 'INSERT INTO sevenseg_powermeterlog (dev, dt, volts, amps, watts) VALUES($1, CURRENT_TIMESTAMP, $2, $3, $4)',
			values: [device, v, a, w],
		}
		dbclient
			.query(q2)
			.catch((err: any) => console.log(err))
	}
}

export default Server;
