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

      // Enviar imagen a OpenAI Vision (GPT-4o)
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: "Describe brevemente esta imagen y extrae todo el texto visible." },
              { type: "image_url", image_url: { url: imgUrl } },
            ],
          },
        ],
      });

      const result = response.choices[0].message.content;
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