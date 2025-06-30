import { addKeyword, EVENTS } from "@builderbot/bot";
import { ErrorReporter } from "../utils/errorReporter";



import axios from "axios";
import { OpenAI } from "openai";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const IMGUR_CLIENT_ID = process.env.IMGUR_CLIENT_ID;

const welcomeFlowImg = addKeyword(EVENTS.MEDIA).addAnswer(
  "Procesando tu imagen, por favor espera unos segundos...",
  { capture: false },
  async (ctx, { flowDynamic, provider }) => {

    const fs = await import('fs');
    try {
      console.log("[DEBUG] ctx recibido en welcomeFlowImg:", JSON.stringify(ctx, null, 2));

      // Descargar y descifrar la imagen usando el provider
      // El provider se obtiene del segundo argumento del callback
      // (ctx, { flowDynamic, provider })
      if (!provider) {
        await flowDynamic("No se encontró el provider para descargar la imagen.");
        return;
      }

      // Guardar la imagen en tmp
      const localPath = await provider.saveFile(ctx, { path: "./tmp/" });
      if (!localPath) {
        await flowDynamic("No se pudo guardar la imagen recibida.");
        return;
      }

      // Leer el archivo como buffer
      const buffer = fs.default.readFileSync(localPath);

      // Subir imagen a Imgur
      const imgurRes = await axios.post(
        "https://api.imgur.com/3/image",
        {
          image: buffer.toString("base64"),
          type: "base64",
        },
        {
          headers: {
            Authorization: `Client-ID ${IMGUR_CLIENT_ID}`,
          },
        }
      );
      const imgUrl = imgurRes.data.data.link;

      const assistantId = process.env.ASSISTANT_ID_IMG;
      if (!assistantId) {
        await flowDynamic("No se encontró el ASSISTANT_ID_IMG en las variables de entorno.");
        return;
      }

      // Crear un thread solo con la imagen (sin texto, instrucciones en el prompt del asistente)
      const thread = await openai.beta.threads.create({
        messages: [
          {
            role: "user",
            content: [
              { type: "image_url", image_url: { url: imgUrl } },
            ],
          },
        ],
      });

      // Ejecutar el asistente sobre el thread
      const run = await openai.beta.threads.runs.create(thread.id, {
        assistant_id: assistantId,
      });

      // Esperar a que termine el procesamiento
      let runStatus;
      do {
        await new Promise((res) => setTimeout(res, 2000));
        runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
      } while (runStatus.status !== "completed" && runStatus.status !== "failed");

      if (runStatus.status === "failed") {
        await flowDynamic("El asistente falló al procesar la imagen.");
        return;
      }

      // Obtener el mensaje de respuesta
      const messages = await openai.beta.threads.messages.list(thread.id);
      const resultMsg = messages.data.find((msg) => msg.role === "assistant");
      const result = resultMsg?.content?.[0]?.text?.value || "No se obtuvo respuesta del asistente.";
      await flowDynamic(result);

      // Eliminar el archivo temporal
      fs.default.unlink(localPath, (err) => {
        if (err) {
          console.error(`❌ Error al eliminar el archivo: ${localPath}`, err);
        } else {
          console.log(`🗑️ Archivo eliminado: ${localPath}`);
        }
      });
    } catch (err) {
      console.error("Error procesando imagen:", err);
      await flowDynamic("Ocurrió un error al analizar la imagen. Intenta más tarde.");
    }
  }
);

export { welcomeFlowImg };