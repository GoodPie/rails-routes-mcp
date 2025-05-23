# Rails Routes MCP Server

This project provides a Model Context Protocol (MCP) server for inspecting and querying Rails application routes via a set of tools. It is implemented in TypeScript/JavaScript and interacts with a Rails app using the Rails CLI.

## Features

- List all routes in a Rails application
- Search routes by pattern or controller
- Get detailed information about routes for a specific controller

## Requirements

- Node.js (v16+ recommended)
- A local Rails application

## Setup

1. **Install dependencies:**
   ```sh
   npm install
   ```
   
2. **Define your rails application path:**

```sh
export RAILS_APP_PATH=/path/to/your/rails/app
export RAILS_COMMAND=rails
```

3. **Run the server:**
   ```sh
   npm start
   ```
   
## Adding to Claude Desktop

1. Open Claude Desktop.
2. Click "Claude" --> "Settings" --> "Developer".
3. Click "Edit Config"
4. Add the following to the `claide_desktop_config.json`

```json
{
  "mcpServers": {
    ...
    "rails-routes": {
      "command": "/path/to/node",
      "args": ["/path/to/your/rails-routes/dist/src/server.js"],
      "env": {
        "RAILS_APP_PATH": "path/to/your/rails/app",
        "RAILS_COMMAND": "path/to/your/rails/app/bin/rails"
      },
      ...
  }
}
```

5. Restart Claude Desktop.

## Testing

1. Use the `@modelcontextprotocol/inspector`

```sh
export RAILS_APP_PATH="/path/to/your/rails/app"
export RAILS_COMMAND="/path/to/your/rails/app/bin/rails"
npx @modelcontextprotocol/inspector node dist/src/index.js
```
## Usage

The server exposes tools for route inspection via MCP. You can interact with it using compatible MCP clients or by integrating it into your workflow.

###  Available Tools

- `list_all_routes`: Lists all routes. Optionally specify format (full or simple).
- `search_routes`: Search routes by pattern and optional controller.
- `get_route_details`: Get detailed route info for a specific controller.

## License

MIT

