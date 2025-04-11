import express from 'express';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const PORT = 8000;

// Define interfaces for configuration
interface MCPServerConfig {
  command: string;
  args: string[];
}

interface MCPConfig {
  mcpServers: {
    [name: string]: MCPServerConfig;
  };
}

// Function to load and parse the config file
function loadConfig(configPath: string): MCPConfig {
  try {
    const configContent = fs.readFileSync(configPath, 'utf8');
    return JSON.parse(configContent) as MCPConfig;
  } catch (error) {
    console.error(`Error loading config file: ${error}`);
    process.exit(1);
  }
}

// Map to store MCP clients
const clients: Map<string, Client> = new Map();

// Get config file path from command line or use default
const args = process.argv.slice(2);
const configPath = args.length > 0 ? args[0] : path.join(process.cwd(), 'mcp-config.json');

const config = loadConfig(configPath);

const allTools: any[] = [];

// Initialize all MCP clients
async function initializeClients() {
  for (const [name, serverConfig] of Object.entries(config.mcpServers)) {
    console.log(`Initializing MCP client for: ${name}`);
    
    const transport = new StdioClientTransport({
      command: serverConfig.command,
      args: serverConfig.args
    });

    const client = new Client({
      name: `mcp-bridge-${name}`,
      version: "1.0.0"
    });

    try {
      await client.connect(transport);
      clients.set(name, client);
      console.log(`Connected to MCP server: ${name}`);
    } catch (error) {
      console.error(`Failed to connect to MCP server ${name}: ${error}`);
    }

    const tools = await client.listTools();
    if (tools) {
      console.log(`Tools available on ${name}:`);
      tools.tools.forEach(tool => {
        console.log(`- ${tool.name}`);
        tool.name = `${name}.${tool.name}`;
        allTools.push(tool);
      });
    }
  }

  if (clients.size === 0) {
    console.error("No MCP clients could be initialized");
    process.exit(1);
  }
}

// Initialize clients before starting the server
await initializeClients();

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

// List tools across all servers
app.get('/', authMiddleware, async (req, res) => {
  res.status(200).json(allTools);
});

app.post('/', authMiddleware, async (req, res) => {
    // The tool field should be in the format "server.tool"
    const serverAndTool = req.body.tool.split('.');
    if (serverAndTool.length !== 2) {
        res.status(400).json({ error: 'Invalid tool format. Expected "server.tool"' });
        return;
    }
    const [serverName, toolName] = serverAndTool;

    const client = clients.get(serverName);
    if (!client) {
        res.status(404).json({ error: `Server "${serverName}" not found` });
        return;
    }
    try {
        console.log(`=== calltool ${serverAndTool}`);
        const args = req.body.arguments;
        console.log(`Args: ${JSON.stringify(args)}`);
        const ret = await client.callTool({
            name: toolName,
            arguments: args
        });
        console.log(`Result: ${JSON.stringify(ret)}`);
        res.status(200).json(ret);
    } catch (error) {
        console.error(`Error calling tool: ${JSON.stringify(error)}`);
        res.status(400).json({ error: error });
    }
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}/`);
    console.log(`Available servers: ${Array.from(clients.keys()).join(', ')}`);
});
