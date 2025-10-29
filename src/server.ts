import express from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";

const app = express();
app.use(express.json({ limit: "1mb" }));

const server = new McpServer({
  name: "mcp-tufesa",
  version: "1.0.0"
});

// Herramienta sin parámetros
server.tool("Tufesapack_ping", "Verifica conexión", async (_args, _extra) => {
  return { content: [{ type:"text", text:"pong" }] };
});

// Herramienta con parámetros (ejemplo: sumar dos números)
const sumarSchema = {
  a: z.number().describe("Primer número"),
  b: z.number().describe("Segundo número")
};

server.tool("Tufesapack_sumar", sumarSchema,  async (args, _extra) => {
  const result = (args as any).a + (args as any).b;
  return { content:[{ type:"text", text:`Resultado: ${result}` }], structuredContent:{ result } };
});


// Dentro de src/server.ts — reemplaza o actualiza la herramienta Tufesa_rastrear
 
const rastrearSchema = {
  guia: z.string().describe("Número de guía de envío"),
  cliente: z.string().optional().describe("Nombre del cliente (opcional)")
};

server.tool("Tufesapack_rastrear",
    {
      // aquí puedes incluir tanto el esquema como metadatos
      ...rastrearSchema, // ← esto sigue validando tus parámetros con zod
      title: "Rastreo de Envíos Tufesapack",
      description:
        "Consulta el estado, historial y detalles de entrega de tus envíos usando el número de guía Tufesapack.",
      readOnlyHint: true,
    }, async (args, _extra) => {
  const guia = (args as any).guia.trim();
  const cliente = (args as any).cliente || "";

  const apiBase = process.env.TUFESA_API_BASE || "https://ventas.tufesa.com.mx/wsrestwebjsonbeta/";
  const url = `${apiBase}commDatosEnvio?codigo=${encodeURIComponent(guia)}&push=-`;

  let json: any;
  try {
    const response = await fetch(url, { method: "GET" });

    if (!response.ok) {
      const msg = await response.text();
      throw new Error(`HTTP ${response.status} — ${msg}`);
    }

    json = await response.json();
  } catch (err: any) {
    return {
      content: [
        {
          type: "text",
          text: `⚠️ No se pudo conectar con el servicio de rastreo.\nError técnico: ${err.message}`
        }
      ]
    };
  }

  // Verifica que sea un arreglo válido
  if (!Array.isArray(json) || json.length === 0) {
    return {
      content: [
        {
          type: "text",
          text: `🚫 No se encontró información para la guía ${guia}.\nEl sistema indica que esta guía no está registrada o aún no tiene datos disponibles en la red de Tufesa.`
        }
      ]
    };
  }

  const data = json[0];
  const historial = Array.isArray(data.historial) ? data.historial : [];

  // Si no hay historial, devolvemos un mensaje genérico
  if (historial.length === 0) {
    return {
      content: [
        {
          type: "text",
          text: `📭 La guía ${guia} existe pero aún no tiene movimientos registrados.`
        }
      ]
    };
  }

  // Último evento (estado actual)
  const ultimo = historial[historial.length - 1];
  const estado = ultimo?.MensageCliente || ultimo?.movimiento || "Desconocido";
  const ubicacion = ultimo?.UbicacionLegible || data.dstLegible || data.destino || "Desconocida";
  const fecha = ultimo?.fchlegible || data.fecha || "";

  const remitente = data.remitente || "No disponible";
  const destinatario = data.destinatario || "No disponible";
  const origen = data.orgLegible || data.origen || "Desconocido";
  const destino = data.dstLegible || data.destino || "Desconocido";
  const entrega = data.entrega || {};

  // Formateamos historial para texto
  const historialTexto = historial
    .map(
      (h) =>
        `• ${h.movimiento} — ${h.UbicacionLegible || h.ubicacion} (${h.fchlegible})`
    )
    .join("\n");

  // 🧩 Construimos una respuesta rica para ChatGPT
  return {
    content: [
      {
        type: "text",
        text:
          `📦 **Rastreo completo del envío** (guía: ${guia})\n\n` +
          `**Remitente:** ${remitente}\n` +
          `**Destinatario:** ${destinatario}\n` +
          `**Origen:** ${origen}\n` +
          `**Destino:** ${destino}\n\n` +
          `**Estatus actual:** ${estado}\n` +
          `**Ubicación actual:** ${ubicacion}\n` +
          `**Fecha:** ${fecha}\n\n` +
          `📜 **Historial de movimientos:**\n${historialTexto}\n\n` +
          (entrega?.recibe
            ? `✅ **Entregado a:** ${entrega.recibe} el ${entrega.fechamov} ${entrega.horamov}\n`
            : "") +
          (entrega?.lat && entrega?.lng
            ? `🗺️ **Ubicación GPS:** ${entrega.lat}, ${entrega.lng}`
            : "")
      }
    ],
    structuredContent: {
      guia,
      cliente,
      remitente,
      destinatario,
      origen,
      destino,
      estado,
      ubicacion,
      fecha,
      historial,
      entrega
    }
  };
});

// server.tool("Tufesa_rastrear", rastrearSchema, async (args, _extra) => {
//   const guia = (args as any).guia.trim();
//   const cliente = (args as any).cliente || "";

//   const apiBase = process.env.TUFESA_API_BASE || "https://ventas.tufesa.com.mx/wsrestwebjsonbeta/";
//   const url = `${apiBase}commDatosEnvio?codigo=${encodeURIComponent(guia)}&push=-`;

//   let json: any;
//   try {
//     const response = await fetch(url, { method: "GET" });

//     if (!response.ok) {
//       const msg = await response.text();
//       throw new Error(`HTTP ${response.status} — ${msg}`);
//     }

//     json = await response.json();
//   } catch (err: any) {
//     return {
//       content: [
//         {
//           type: "text",
//           text: `⚠️ No se pudo conectar con el servicio de rastreo.\nError técnico: ${err.message}`
//         }
//       ]
//     };
//   }

  
//   if (!Array.isArray(json) || json.length === 0) {
//     return {
//       content: [
//         {
//           type: "text",
//           text: `❌ La guía ${guia} no está registrada en el sistema o aún no tiene información disponible.`
//         }
//       ]
//     };
//   }

//   const data = json[0];

//   if (!data.historial || data.historial.length === 0) {
//     return {
//       content: [
//         {
//           type: "text",
//           text: `📭 La guía ${guia} existe pero no tiene movimientos registrados aún.`
//         }
//       ]
//     };
//   }


//   const ultimo = data.historial[data.historial.length - 1];

//   const estado = ultimo?.MensageCliente || ultimo?.movimiento || "Desconocido";
//   const ubicacion = ultimo?.UbicacionLegible || data.dstLegible || data.destino || "Desconocida";
//   const fecha = ultimo?.fchlegible || data.fecha || "";
//   const remitente = data.remitente || "Sin información";
//   const destinatario = data.destinatario || "Sin información";
//   const origen = data.orgLegible || data.origen || "Desconocido";
//   const destino = data.dstLegible || data.destino || "Desconocido";

//   return {
//     content: [
//       {
//         type: "text",
//         text:
//           `📦 Resultado del rastreo (guía: ${guia})\n\n` +
//           `Remitente: ${remitente}\nDestinatario: ${destinatario}\n` +
//           `Origen: ${origen}\nDestino: ${destino}\n\n` +
//           `Estatus: ${estado}\nUbicación actual: ${ubicacion}\nFecha: ${fecha}`
//       }
//     ],
//     structuredContent: {
//       guia,
//       cliente,
//       remitente,
//       destinatario,
//       origen,
//       destino,
//       estado,
//       ubicacion,
//       fecha,
//       historial: data.historial,
//       entrega: data.entrega
//     }
//   };
// });


app.post("/mcp", async (req, res) => {
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true
  });

  res.on("close", () => {
    transport.close();
  });

  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
});

app.get("/health", (_req, res) => {
  res.status(200).send("ok");
});

const PORT = Number(process.env.PORT) || 3000;
app.listen(PORT, () => {
  console.log(`[HTTP] Listening on port ${PORT}`);
  console.log(`[MCP] Streamable HTTP endpoint: POST /mcp`);
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

  