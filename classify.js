const Queue = require("bull");
const utils = require('./utils');

// Connect to a local redis intance locally, and the Heroku-provided URL in production
const REDIS_URL = process.env.REDIS_URL || "redis://127.0.0.1:6379";

// The maxium number of jobs each worker should process at once. This will need
// to be tuned for your application. If each job is mostly waiting on network
// responses it can be much higher. If each job is CPU-intensive, it might need
// to be much lower.
const maxJobsPerWorker = 1;

// Connect to the named work queue
const classifyQueue = new Queue('classify', REDIS_URL);
const callbackQueue = new Queue('callback', REDIS_URL);

classifyQueue.process(maxJobsPerWorker, async (job) => {
    const { correlationId } = job.data;

    try {
        await utils.sleep(1000);

        callbackQueue.add({ correlationId, incrementAmount: 4 });
    } catch (error) {
        callbackQueue.add({ error: error.message, correlationId });
    }
});

console.log('Worker classify started!');
