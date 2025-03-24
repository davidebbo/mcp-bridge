import express from 'express';
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

// TODO: Here you'd want to add an auth middleware to protect the server

app.get('/', async (req, res) => {
    res.status(200).json(await client.listTools());
});

app.post('/', async (req, res) => {
    try {
        const call_tool_params = {
            name: req.body.tool,
            arguments: req.body.arguments
        }
        console.log(call_tool_params.arguments);
        res.status(200).json(await client.callTool(call_tool_params));
    } catch (error) {
        res.status(400).json({ error: error });
    }
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}/`);
});
