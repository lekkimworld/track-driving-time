const lib = require('./lib.js');

let timeofday = lib.getTimeOfDay();
let morning
if (timeofday === 1) {
    morning = true;
} else if (timeofday === 2) {
    morning = false;
} else {
    process.exit(0);
}

// create job and get driving time
const job = new lib.Job('Novo', 'novo', lib.HOME, 'Vandtårnsvej 108, 2960 Søborg');
job.getDrivingTime(morning).then(result => {
    // log it
    console.log(`Retrieved driving time from: ${job.origin} to: ${job.destination} - driving_time: <${result.drivingTime}>, driving_time_traffic: <${result.drivingTimeTraffic}>`)

    // get pubnub instance and publish
    return Promise.all([
        lib.publishResult(`driving_time_${job.label}`, result.drivingTime),
        lib.publishResult(`driving_time_traffic_${job.label}`, result.drivingTimeTraffic)
    ])
}).then(() => {
    console.log(`Wrote to redis (job label: ${job.label})`);
    process.exit(0);
}).catch(err => {
    console.log(`Unable to write to redis due to error (job label: ${job.label})`, err);
    process.exit(1);
});
