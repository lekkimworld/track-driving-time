const redis = require('redis');
const express = require('express');

// load environment variables for localhost
try {
	require('dotenv').config()
} catch (e) {}

const client = redis.createClient({
  'url': process.env.REDIS_URL
});
const app = express();

app.get('/scrapedata', (req, res) => {
	// set content-type
	res.set('Content-Type', 'text/plain');

	// get keys
	client.keys("driving_time*", (err, keys) => {
		client.mget(keys, (err, replies) => {
			let buffer = '';
			for (let i=0; i<keys.length; i++) {
				let redisKey = keys[i];
				let value = replies[i];
				let idx = redisKey.lastIndexOf('_');
				let key = redisKey.substring(0, idx);
				let location = redisKey.substring(idx+1);
				buffer += `${key}\{location="${location}"\} ${value}\n`
			}
			res.send(buffer).end()
		})
	})
})

app.listen(process.env.PORT || 8080);
