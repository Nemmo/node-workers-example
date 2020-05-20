const express = require('express');
const Queue = require('bull');

// Serve on PORT on Heroku and on localhost:5000 locally
const PORT = process.env.PORT || '5000';
// Connect to a local redis intance locally, and the Heroku-provided URL in production
const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

const app = express();

// Create / Connect to a named work queue
const parseQueue = new Queue('parse', REDIS_URL);
const callbackQueue = new Queue('callback', REDIS_URL);
const jobsProgress = new Map();

// Serve the two static assets
app.get('/', (req, res) => res.sendFile('index.html', { root: __dirname }));
app.get('/client.js', (req, res) => res.sendFile('client.js', { root: __dirname }));

// Kick off a new job by adding it to the parse queue
app.post('/job', async (req, res) => {
    const correlationId = jobsProgress.size + 1;
    const job = await parseQueue.add({
        correlationId,
    });
    jobsProgress.set(correlationId, 0);

    res.json({ id: correlationId });
});

// Allows the client to query the state of a background job
app.get('/job/:id', async (req, res) => {
    const correlationId = Number(req.params.id);

    const progress = jobsProgress.get(correlationId);
    const state = (() => {
        if (progress === 0) return 'waiting';
        if (progress === 100) return 'completed';
        if (progress === -1) return 'failed';

        return 'active';
    })();
    res.json({ id: correlationId, state, progress });
});

callbackQueue.process(async (job) => {
    const { error, correlationId, incrementAmount } = job.data;

    const currentProgress = jobsProgress.get(correlationId);
    if (error) {
        jobsProgress.set(correlationId, -1);
    } else {
        jobsProgress.set(correlationId, currentProgress + incrementAmount);
    }
});

app.listen(PORT, () => console.log("Server started!"));
