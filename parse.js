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
const parseQueue = new Queue('parse', REDIS_URL);
const sentimentQueue = new Queue('sentiment', REDIS_URL);
const classifyQueue = new Queue('classify', REDIS_URL);
const callbackQueue = new Queue('callback', REDIS_URL);

parseQueue.process(maxJobsPerWorker, async (job) => {
    const { correlationId } = job.data;

    try {
        // throw an error 5% of the time
        if (Math.random() < 0.05) {
            throw new Error("This job failed!")
        }

        await utils.sleep(3000);

        for (let i = 0; i < 10; i++) {
            sentimentQueue.add({ correlationId });
            classifyQueue.add({ correlationId });
        }
        callbackQueue.add({ correlationId, incrementAmount: 20 });
    } catch (error) {
        callbackQueue.add({ error: error.message, correlationId });
    }
});

console.log('Worker parse started!');
