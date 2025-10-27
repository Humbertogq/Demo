import { StdioClient } from "@modelcontextprotocol/sdk/client/stdio.js";

const client = new StdioClient({
  command: "node",
  args: ["./src/mcp-server.js"]
});

await client.connect();

const tools = await client.call("tools/list");
console.log("Tools:", tools);
