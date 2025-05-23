import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Configure your Rails app path
const RAILS_APP_PATH = process.env.RAILS_APP_PATH || '/path/to/your/rails/app';
const RAILS_COMMAND = process.env.RAILS_COMMAND || `${RAILS_APP_PATH}/bin/rails`;

// Helper to execute commands with clean output
async function execClean(command: string): Promise<string> {
  try {
    const { stdout, stderr } = await execAsync(command, {
      cwd: RAILS_APP_PATH,
      env: {
        ...process.env,
        RAILS_ENV: 'development',
        ASDF_SKIP_RESHIM: '1',
        // Suppress version manager outputs
        RBENV_SILENT: '1',
        RVM_SILENCE: '1'
      },
      shell: '/bin/bash'
    });

    // Log any stderr to console.error (goes to MCP logs, not stdout)
    if (stderr) {
      console.error('Command stderr:', stderr);
    }

    return stdout;
  } catch (error) {
    console.error('Command failed:', error);
    throw error;
  }
}

const server = new Server({
  name: 'rails-routes',
  version: '1.0.0',
  description: 'MCP server for Rails route inspection'
}, {
  capabilities: {
    tools: {}
  }
});

// Define available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'list_all_routes',
        description: 'List all routes in the Rails application',
        inputSchema: {
          type: 'object',
          properties: {
            format: {
              type: 'string',
              enum: ['full', 'simple'],
              description: 'Output format - full includes HTTP verbs and controller actions',
              default: 'full'
            }
          }
        }
      },
      {
        name: 'search_routes',
        description: 'Search routes by pattern',
        inputSchema: {
          type: 'object',
          properties: {
            pattern: {
              type: 'string',
              description: 'Pattern to search for (e.g., "user", "api/v2")'
            },
            controller: {
              type: 'string',
              description: 'Filter by controller name'
            }
          },
          required: ['pattern']
        }
      },
      {
        name: 'get_route_details',
        description: 'Get detailed information about routes for a specific controller',
        inputSchema: {
          type: 'object',
          properties: {
            controller: {
              type: 'string',
              description: 'Controller name (e.g., "users", "api/v2/orders")'
            }
          },
          required: ['controller']
        }
      }
    ]
  };
});

// Tool execution handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'list_all_routes': {
        const format = args?.format || 'full';
        const cmd = format === 'full'
          ? `${RAILS_COMMAND} routes`
          : `${RAILS_COMMAND} routes | awk '{print $1, $2, $3}'`;

        console.error(`Executing command: ${cmd}`);
        const stdout = await execClean(cmd);

        return {
          content: [{
            type: 'text',
            text: stdout || 'No routes found'
          }]
        };
      }

      case 'search_routes': {
        const { pattern, controller } = args as { pattern: string; controller?: string };
        let cmd = `${RAILS_COMMAND} routes | grep -i "${pattern}"`;

        if (controller) {
          cmd += ` | grep -i "${controller}#"`;
        }

        console.error(`Executing command: ${cmd}`);

        try {
          const stdout = await execClean(cmd);
          return {
            content: [{
              type: 'text',
              text: stdout || `No routes found matching pattern: ${pattern}`
            }]
          };
        } catch (error) {
          // grep returns exit code 1 when no matches found
          if ((error as any).code === 1) {
            return {
              content: [{
                type: 'text',
                text: `No routes found matching pattern: ${pattern}`
              }]
            };
          }
          throw error;
        }
      }

      case 'get_route_details': {
        const { controller } = args as { controller: string };
        const cmd = `${RAILS_COMMAND} routes | grep "${controller}#"`;

        console.error(`Executing command: ${cmd}`);

        try {
          const stdout = await execClean(cmd);

          // Parse routes to provide structured information
          const routes = stdout.split('\n').filter(line => line.trim());
          const parsed = routes.map(route => {
            const parts = route.trim().split(/\s+/);
            return {
              prefix: parts[0] || '',
              verb: parts[1] || '',
              pattern: parts[2] || '',
              action: parts[3] || ''
            };
          });

          const summary = `Controller: ${controller}
Total routes: ${parsed.length}
Actions: ${[...new Set(parsed.map(r => r.action.split('#')[1]))].join(', ')}

Full routes:
${stdout}`;

          return {
            content: [{
              type: 'text',
              text: summary
            }]
          };
        } catch (error) {
          if ((error as any).code === 1) {
            return {
              content: [{
                type: 'text',
                text: `No routes found for controller: ${controller}`
              }]
            };
          }
          throw error;
        }
      }

      default:
        return {
          error: `Unknown tool: ${name}`
        };
    }
  } catch (error) {
    console.error('Tool execution error:', error);
    return {
      error: `Error executing rails routes: ${(error as Error).message}`
    };
  }
});

// Start the server
async function main() {
  try {
    console.error('Starting Rails Routes MCP Server...');
    console.error(`Rails app path: ${RAILS_APP_PATH}`);
    console.error(`Rails command: ${RAILS_COMMAND}`);

    // Test if rails command works
    try {
      await execAsync(`${RAILS_COMMAND} --version`, {
        cwd: RAILS_APP_PATH,
        shell: '/bin/bash'
      });
      console.error('Rails command verified successfully');
    } catch (error) {
      console.error('Warning: Could not verify rails command:', error);
    }

    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('Rails Routes MCP Server running...');
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

main().catch(console.error);