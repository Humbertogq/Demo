import express from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";

const app = express();
app.use(express.json({ limit: "1mb" }));

const server = new McpServer({
  name: "mcp-tufesa",
  version: "1.0.0"
});

// Ejemplo de herramienta
server.tool("ping", "Responde pong", async () => {
  return { text: "pong" };
});

// Mapa de transportes
const transports: { [sessionId: string]: StreamableHTTPServerTransport } = {};

// Ruta que maneja todas las solicitudes MCP (inicialización, mensajes, cierre)
app.all("/mcp", async (req, res) => {
  // Verificar o generar sessionId
  const sessionId = req.headers["mcp-session-id"] as string | undefined;
  let transport = sessionId ? transports[sessionId] : undefined;

  if (!transport) {
    // Nueva sesión
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true
  });
    transports[transport.sessionId] = transport;
    await server.connect(transport);
  }

  try {
    await transport.handleRequest(req, res, req.body);
  } catch (err) {
    console.error("[MCP] Error en /mcp:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: "Internal MCP server error" });
    }
  }
});

// Healthcheck
app.get("/health", (_req, res) => res.send("ok"));

const PORT = Number(process.env.PORT) || 3000;
app.listen(PORT, () => {
  console.log(`[HTTP] Listening on port ${PORT}`);
  console.log(`[MCP] Streamable HTTP endpoint available at /mcp`);
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

  