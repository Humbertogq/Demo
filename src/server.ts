import express from "express";
// import { MCPServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";

// --- Config básica HTTP ---
const app = express();
app.use(express.json());

// --- Crea tu servidor MCP ---
const mcp = new McpServer({
  name: "mcp-tufesa",
  version: "1.0.0",
});

// Ejemplo de herramienta mínima
mcp.tool("ping", "Responde pong", async () => {
  return { text: "pong" };
});

// --- Estado del transporte SSE actual ---
// Por simplicidad mantenemos un único transporte por proceso.
// (Si necesitas multi-sesión, habría que gestionarlo con IDs/sesiones.)
let transport: SSEServerTransport | null = null;

// Endpoint SSE: el cliente MCP abre el canal de eventos aquí.
// IMPORTANTE: el constructor correcto es (postPath, res [, options])
app.get("/sse", (req, res) => {
  // Crea el transporte y conéctalo al servidor MCP.
  transport = new SSEServerTransport("/messages", res);
  // Conecta sin await para no bloquear el hilo de la request SSE.
  mcp.connect(transport).catch((err) => {
    console.error("[MCP] Error al conectar transporte SSE:", err);
    try { res.end(); } catch {}
    transport = null;
  });
});

// Endpoint de mensajes: el cliente envía mensajes MCP aquí (POST).
app.post("/messages", (req, res) => {
  if (!transport) {
    res.status(503).json({ error: "SSE no inicializado. Abre primero /sse." });
    return;
  }
  // Delega el procesamiento de mensajes al transporte SSE.
  transport.handlePostMessage(req, res);
});

// Healthcheck simple (Render lo usa/puedes probar en navegador)
app.get("/health", (_req, res) => res.status(200).send("ok"));

// Levanta HTTP en el puerto que asigna Render
const PORT = Number(process.env.PORT) || 3000;
app.listen(PORT, () => {
  console.log(`[HTTP] Listening on ${PORT}`);
  console.log(`[MCP] Usa GET /sse y POST /messages para el transporte SSE`);
});



  // import 'dotenv/config';
  // import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
  // import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
  // import express from 'express';
  // import { z } from 'zod';
  // import { fetch } from 'undici';

  // import { Server } from "http";
  // import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";


  // const server = new McpServer({ name: 'mcp-tufesa', version: '1.0.0' });

  
  // const app = express();
  // const HolaInput = z.object({ nombre: z.string() });
  // const HolaOutput = z.object({ mensaje: z.string() });


  
  // app.get("/health", (_req, res) => {
  //   res.status(200).send("ok");
  // });

  // // Render asigna el puerto en process.env.PORT
  // const PORT = Number(process.env.PORT) || 3000;
  // app.listen(PORT, () => {
  //   console.log(`[HTTP] Listening on port ${PORT} (Render health ok)`);
  // });


  // server.registerTool(
  //   'hola',
  //   {
  //     title: 'Saludo',
  //     description: 'Devuelve un saludo personalizado.',
  //     inputSchema: HolaInput.shape,
  //     outputSchema: HolaOutput.shape
  //   },
  //   async (args) => {
  //     const { nombre } = HolaInput.parse(args);
  //     const mensaje = `¡Hola, ${nombre}! 👋 Soy tu servidor MCP.`;
  //     const data = HolaOutput.parse({ mensaje });
  //     return { content: [{ type: 'text', text: data.mensaje }], structuredContent: data };
  //   }
  // );

  
  // const RastreoInput = z.object({
  //   guia: z.string().min(3),
  //   push: z.string().optional()
  // });
  // const Checkpoint = z.object({
  //   fecha: z.string(),
  //   ciudad: z.string().optional(),
  //   descripcion: z.string(),
  //   codigo: z.string().optional()
  // });
  // const RastreoOutput = z.object({
  //   guia: z.string(),
  //   estado: z.string(),
  //   ultimaActualizacion: z.string(),
  //   estimadoEntrega: z.string().nullable(),
  //   origen: z.string().optional(),
  //   destino: z.string().optional(),
  //   direccionActual: z.string().optional(),
  //   historial: z.array(Checkpoint),
  //   bruto: z.any()
  // });

  // server.registerTool(
  //   'envios.rastreo',
  //   {
  //     title: 'Rastreo de envío',
  //     description: 'Consulta estatus por número de guía.',
  //     inputSchema: RastreoInput.shape,
  //     outputSchema: RastreoOutput.shape
  //   },
  //   async (args) => {
  //     const { guia, push } = RastreoInput.parse(args);

  //     const base = process.env.TUFESA_API_BASE;
  //     if (!base) throw new Error('Falta TUFESA_API_BASE en variables de entorno.');

  //     const url = new URL('commdatosenvio', base.endsWith('/') ? base : base + '/');
  //     url.searchParams.set('codigo', guia);
  //     url.searchParams.set('push', push ?? '-');

  //     const apiKey = process.env.TUFESA_API_KEY;
  //     if (apiKey) url.searchParams.set('key', apiKey);

  //     const res = await fetch(url, {
  //       headers: {
  //         accept: 'application/json',
  //         ...(apiKey ? { 'x-api-key': apiKey } : {})
  //       }
  //     });
  //     if (!res.ok) throw new Error(`Error API TUFESA: ${res.status}`);

  //     const json = await res.json();
  //     if (!Array.isArray(json) || json.length === 0) throw new Error('Respuesta inesperada');

  //     const o = json[0];
  //     const eventos: any[] = Array.isArray(o.historial) ? o.historial : [];
  //     const last = eventos.length ? eventos[eventos.length - 1] : null;

  //     const estado =
  //       (last?.MensageCliente as string) ||
  //       (last?.movimiento as string) ||
  //       (o.msgtxt as string) ||
  //       'DESCONOCIDO';

  //     const ultimaAct =
  //       last?.fechamov && last?.horamov
  //         ? `${last.fechamov} ${last.horamov}`
  //         : (o.fecha && o.hora ? `${o.fecha} ${o.hora}` : 'No disponible');

  //     const estimado =
  //       typeof o.fchEstimada === 'string' && o.fchEstimada.trim().toLowerCase() !== 'por definir'
  //         ? String(o.fchEstimada)
  //         : null;

  //     const checkpoints = eventos.map((e) => ({
  //       fecha: `${e.fechamov ?? ''}${e.horamov ? ' ' + e.horamov : ''}`.trim() || (e.fchlegible ?? ''),
  //       ciudad: e.UbicacionLegible ?? e.ubicacion,
  //       descripcion: e.MensageCliente ?? e.movimiento ?? '',
  //       codigo: e.mov
  //     }));

  //     const normalized = RastreoOutput.parse({
  //       guia: String(o.code ?? guia),
  //       estado,
  //       ultimaActualizacion: ultimaAct,
  //       estimadoEntrega: estimado,
  //       origen: o.orgLegible ?? o.origen,
  //       destino: o.dstLegible ?? o.destino,
  //       direccionActual: o.direccionActual,
  //       historial: checkpoints,
  //       bruto: o
  //     });

  //     const resumen = [
  //       `Guía ${normalized.guia}`,
  //       `Estado: ${normalized.estado}`,
  //       `Última actualización: ${normalized.ultimaActualizacion}`,
  //       normalized.estimadoEntrega ? `ETA: ${normalized.estimadoEntrega}` : 'ETA: por definir'
  //     ].join(' — ');

  //     return { content: [{ type: 'text', text: resumen }], structuredContent: normalized };
  //   }
  // );

  
  // const stdio = new StdioServerTransport();
  // await server.connect(stdio);
  // console.error('[MCP] Server listo (stdio).');

  