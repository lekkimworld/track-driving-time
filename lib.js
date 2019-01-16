const fetch = require('node-fetch');
const redis = require('redis');
const moment = require('moment-timezone');

// load environment variables for localhost
try {
	require('dotenv').config()
} catch (e) {}

// build redis client
const client = redis.createClient({
    'url': process.env.REDIS_URL
});

class Job {
    constructor(name, label, address1, address2) {
        this.name = name;
        this.label = label;
        this.address1 = address1;
        this.address2 = address2;
    }
    getDrivingTime(morning) {
        this.origin = morning ? this.address1 : this.address2;
        this.destination = morning ? this.address2 : this.address1;
        const API_KEY = process.env.API_KEY;

        return fetch(`https://maps.googleapis.com/maps/api/directions/json?mode=driving&departure_time=now&origin=${encodeURIComponent(this.origin)}&destination=${encodeURIComponent(this.destination)}&key=${API_KEY}`).then(resp => {
            return resp.json();
        }).then(payload => {
            const drivingTimeTraffic = payload.routes[0].legs[0].duration_in_traffic.text.split(' ')[0];
            const drivingTime = payload.routes[0].legs[0].duration.text.split(' ')[0];
            return Promise.resolve({
                'job': this,
                drivingTime,
                drivingTimeTraffic
            })
        })
    }
}

module.exports = {
    HOME: 'Vejenbrødvej 2b, 2980 Kokkedal',
    getTimeOfDay: () => {
        let result = 0;
        const now = moment(Date.now());
        const nowCph = now.tz(process.env.TIMEZONE || 'Europe/Copenhagen');
        if (nowCph.isoWeekday() >= 6) return 0;
        const h = nowCph.hour();
        if (h >= (process.env.START_MORNING || 6) && h <= (process.env.END_MORNING || 9)) {
            result = 1;
        } else if (h >= (process.env.START_EVENING || 15) && h <= (process.env.END_EVENING || 18)) {
            result = 2;
        }
        return result;
    },
    publishResult: (key, value) => {
        return new Promise((resolve, reject) =>{
            client.set(key, value, 'EX', (process.env.REDIS_EXP_MINUTES || 15)*60, (err, replies) => {
                if (err) return reject(err);
                return resolve();
            })
        })
    },
    Job
}
