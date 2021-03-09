import {AccessoryPlugin, AccessoryConfig, API, HAP, Logging, PlatformConfig, StaticPlatformPlugin,} from "homebridge";
import {TasmotaPowerMeterDevice} from "./accessory";

const PLATFORM_NAME = "sqlBackend";

let hap: HAP;

export = (api: API) => {
  hap = api.hap;

  api.registerPlatform(PLATFORM_NAME, TasmotaPMSQLPlatform);
};


class TasmotaPMSQLPlatform implements StaticPlatformPlugin {

  private readonly log: Logging;
  private readonly aconf: any;

  constructor(log: Logging, config: PlatformConfig, api: API) {
    this.log = log;

	this.aconf = {
			"name": "NAME OF THIS ACCESSORY",
		
			"url": "mqtt://MQTT-ADDRESS",
			"username": "MQTT USER NAME",
			"password": "MQTT PASSWORD",
			"topics": {
				"getPower": "stat/sonoff/POWER",
				"setPower": "cmnd/sonoff/power",
				"getEnergy": "tele/sonoff/SENSOR",
				"getState": "tele/sonoff/STATE",
	        	"activity": "tele/sonoff/LWT"
			},
			"onValue": "ON",
			"offValue": "OFF",
		
			"outletInUseBy": "current",
			"outletInUseCurrent": "0.01",
	    
			"startCmd": "cmnd/sonoff/TelePeriod",
			"startParameter": "15",
		
			"savePeriod": "15",
			"manufacturer": "ITEAD",
			"model": "Sonoff TH",
			"serialNumberMAC": "MAC OR SERIAL NUMBER"
	}; 



    log.info("Example platform finished initializing!");
  }


  /*
   * This method is called to retrieve all accessories exposed by the platform.
   * The Platform can delay the response my invoking the callback at a later time,
   * it will delay the bridge startup though, so keep it to a minimum.
   * The set of exposed accessories CANNOT change over the lifetime of the plugin!
   */
  accessories(callback: (foundAccessories: AccessoryPlugin[]) => void): void {
    callback([
      new TasmotaPowerMeterDevice(hap, this.log, "Switch 1", this.aconf),
      new TasmotaPowerMeterDevice(hap, this.log, "Switch 2", this.aconf),
    ]);
  }

}
