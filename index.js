const CronJob = require('cron').CronJob;
const express = require('express');
const fetch = require('node-fetch');

// load environment variables for localhost
try {
	require('dotenv').config()
} catch (e) {}

const API_KEY = process.env.API_KEY;
const HOME = 'Vejenbrødvej 2b, 2980 Kokkedal';
const TIMEZONE = process.env.TIMEZONE || 'Europe/Copenhagen';
const CRON_MORNING = process.env.CRON_MORNING || '*/10 6-9 * * 1-5 *'
const CRON_AFTERNOON = process.env.CRON_AFTERNOON || '*/10 14-18 * * 1-5 *'

class Job {
  constructor(name, label, address1, address2) {
    this.name = name;
    this.label = label;
    this.address1 = address1;
    this.address2 = address2;
  }
  getDrivingTime(morning) {
    let origin = morning ? this.address1 : this.address2;
    let destination = morning ? this.address2 : this.address1;
    fetch(`https://maps.googleapis.com/maps/api/directions/json?mode=driving&departure_time=now&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&key=${API_KEY}`).then(resp => {
      return resp.json()
    }).then(payload => {
      this.drivingTimeTraffic = payload.routes[0].legs[0].duration_in_traffic.text.split(' ')[0];
      this.drivingTime = payload.routes[0].legs[0].duration.text.split(' ')[0];
      console.log(`Retrieved driving time for <${this.label}> (from: ${origin}, to: ${destination}) - driving_time: <${this.drivingTime}>, driving_time_traffic: <${this.drivingTimeTraffic}>`)
    })
  }
}
const jobs = [
  new Job('Salesforce', 'sf', HOME, 'Strandvejen 125, 2900 Hellerup'),
  new Job('Novo', 'novo', HOME, 'Vandtårnsvej 108, 2960 Søborg')
]
jobs.forEach(j => {
  j.cronMorning = new CronJob(CRON_MORNING, function() {
    j.getDrivingTime(true);
  }, null, true, TIMEZONE);
  j.cronAfternoon = new CronJob(CRON_AFTERNOON, function() {
    j.getDrivingTime(false);
  }, null, true, TIMEZONE);
  j.cronMorning.start();
  j.cronAfternoon.start();
})

const app = express();

app.get('/scrapedata', (req, res) => {
  res.set('Content-Type', 'text/plain');
  res.send(jobs.reduce((prev, job) => {
    prev += `driving_time{label="${job.label}"} ${job.drivingTime || 0}
driving_time_traffic{label="${job.label}"} ${job.drivingTimeTraffic || 0}\n`;
    return prev;
  }, '')).end()
})

app.listen(process.env.PORT || 8080);
