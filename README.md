# Git Continuous Deployment

This project is a GitHub webhook listener for continuous deployment. It automatically pulls and deploys changes for configured projects when pushes are made to specified branches.

## Features

- Supports multiple projects
- Configurable via environment variables
- Automatically pulls latest changes and restarts PM2 processes

## Setup

1. Clone the repository
2. Install dependencies: `npm install`
3. Set up your .env file with your webhook secret and project configurations
4. Start the listener with PM2: `pm2 start index.js --name "github-webhook-listener" --watch --max-memory-restart 150M`

## Configuration

Configure your projects in the .env file like this:

```
WEBHOOK_SECRET=your_secret_here
PORT=3001
PROJECTS=[{"name":"ProjectName","path":"/path/to/project","branch":"main","pm2Name":"pm2-process-name"}]
```

## Usage

Set up a webhook in your GitHub repository settings pointing to your server's IP or domain, using the path /CD/webhook.

