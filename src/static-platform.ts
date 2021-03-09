import {
	AccessoryPlugin, 
	AccessoryConfig,
	API,
	HAP, 
	Logging, 
	PlatformConfig, 
	StaticPlatformPlugin
} from "homebridge";

import {PGClient} from './pgclient';
import {TasmotaPowerMeterDevice} from "./accessory";


const PLATFORM_NAME = "TasmotaPostgres";
let hap: HAP;

export = (api: API) => {
  hap = api.hap;

  api.registerPlatform(PLATFORM_NAME, TasmotaPMSQLPlatform);
};


class TasmotaPMSQLPlatform implements StaticPlatformPlugin {
  private readonly log: Logging;
  private readonly devices: any;
  private devs: any;

  private pgclient = new PGClient();

  constructor(log: Logging, config: PlatformConfig, api: API) {
    this.log = log;
	this.devices = config.devices;
	
	this.devs = new Array();
	for(const dev of config.devices) {
	    this.devs.push( new TasmotaPowerMeterDevice(hap, this.log, dev.name, dev, this.pgclient) );
	}

    log.info("Tasmota Postgres Platform initialized :)");
  }

  accessories(callback: (foundAccessories: AccessoryPlugin[]) => void): void {
    callback(
		this.devs
	);
  }
}
