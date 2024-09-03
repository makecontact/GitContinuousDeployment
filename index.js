import dotenv from 'dotenv';
import express from 'express';
import { verify } from "@octokit/webhooks-methods";
import { exec } from 'child_process';
import bodyParser from 'body-parser';

dotenv.config();

const app = express();

// Parse the PROJECTS environment variable
let PROJECTS = [];
try {
  PROJECTS = JSON.parse(process.env.PROJECTS || '[]');
} catch (error) {
  console.error('Error parsing PROJECTS from environment variable:', error);
  process.exit(1);
}

// Middleware to parse form-encoded data
app.use(bodyParser.urlencoded({ extended: false, verify: (req, res, buf) => {
  req.rawBody = buf;
}}));

app.post('/CD/webhook', async (req, res) => {
  console.log('Received webhook request');

  const signature = req.headers["x-hub-signature-256"];
  const payload = req.rawBody;
  
  #console.log('Headers:', req.headers);
  #console.log('Payload length:', payload?.length);
  #console.log('Secret length:', process.env.WEBHOOK_SECRET?.length);

  if (!signature) {
    console.log('No X-Hub-Signature-256 found in headers');
    return res.status(400).send('No X-Hub-Signature-256');
  }

  if (!payload) {
    console.log('No payload received');
    return res.status(400).send('No payload');
  }

  if (!process.env.WEBHOOK_SECRET) {
    console.log('WEBHOOK_SECRET not set in environment');
    return res.status(500).send('Server configuration error');
  }

  try {
    const payloadString = Buffer.isBuffer(payload) ? payload.toString('utf8') : payload;
    
    const isVerified = await verify(process.env.WEBHOOK_SECRET, payloadString, signature);
    if (!isVerified) {
      console.log('Invalid signature');
      return res.status(401).send('Unauthorized');
    }

    #console.log('Signature verified successfully');

    const decodedPayload = decodeURIComponent(payloadString.replace(/^payload=/, ''));
    const jsonPayload = JSON.parse(decodedPayload);

    console.log('Event type:', req.headers['x-github-event']);
    console.log('Action:', jsonPayload.action);

    switch (req.headers['x-github-event']) {
      case 'ping':
        console.log('Received ping event. Webhook is configured correctly.');
        res.status(200).send('Webhook received successfully');
        break;
      case 'push':
        const project = PROJECTS.find(p => 
          jsonPayload.repository.name === p.name && 
          jsonPayload.ref === `refs/heads/${p.branch}`
        );

        if (project) {
          console.log(`Update made to ${project.name} on Git`);
          exec(`cd ${project.path} && git pull && pm2 restart ${project.pm2Name}`, (error, stdout, stderr) => {
            if (error) {
              console.error(`exec error: ${error}`);
              return res.sendStatus(500);
            }
            console.log(`stdout: ${stdout}`);
            console.error(`stderr: ${stderr}`);
            res.status(200).send('Push event processed successfully');
          });
        } else {
          console.log('Received push event, but not for a configured project/branch');
          res.status(200).send('Push event received, but no action taken');
        }
        break;
      default:
        console.log(`Received ${req.headers['x-github-event']} event, no action taken`);
        res.status(200).send('Event received, but no action taken');
    }
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).send('Internal Server Error');
  }
});

const port = process.env.PORT || 3001;

// Global error handler
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

app.listen(port, () => {
  console.log(`GitCD listener running on port ${port}`);
  console.log('Configured projects:');
  PROJECTS.forEach(project => {
    console.log(`- ${project.name} (${project.branch})`);
  });
});
