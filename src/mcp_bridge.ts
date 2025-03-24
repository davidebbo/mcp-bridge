import express from 'express';
import dotenv from 'dotenv';

dotenv.config();

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const PORT = 8000;

const args = process.argv.slice(2);
if (args.length < 2) {
    console.error("Usage: pass the command line that starts the MCP server");
    process.exit(1);
}

const transport = new StdioClientTransport({
    command: args[0],
    args: args.slice(1)
});

const client = new Client(
  {
    name: "mcp-bridge",
    version: "1.0.0"
  }
);

await client.connect(transport);

const app = express();

app.use(express.json());

// Only allow requests with a valid API token
const authMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction): void => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token || token !== process.env.API_TOKEN) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }
    
    next();
};

app.get('/', authMiddleware, async (req, res) => {
    res.status(200).json(await client.listTools());
});

app.post('/', authMiddleware, async (req, res) => {
    try {
        res.status(200).json(await client.callTool({
            name: req.body.tool,
            arguments: req.body.arguments
        }));
    } catch (error) {
        res.status(400).json({ error: error });
    }
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}/`);
});
