import { promises as fs } from "node:fs";
import {
  GetObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";

async function streamToBuffer(body) {
  if (!body) {
    throw new Error("S3 object body is empty");
  }
  if (typeof body.transformToByteArray === "function") {
    return Buffer.from(await body.transformToByteArray());
  }
  const chunks = [];
  for await (const chunk of body) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

export const createS3CompositionRepo = ({ s3, bucketName }) => {
  return {
    async getJson(key) {
      const response = await s3.send(
        new GetObjectCommand({
          Bucket: bucketName,
          Key: key,
        }),
      );
      const payload = await streamToBuffer(response.Body);
      return JSON.parse(payload.toString("utf8"));
    },

    async putJson(key, payload) {
      await s3.send(
        new PutObjectCommand({
          Bucket: bucketName,
          Key: key,
          Body: JSON.stringify(payload, null, 2),
          ContentType: "application/json",
        }),
      );
    },

    async downloadObject(key, targetPath) {
      try {
        const response = await s3.send(
          new GetObjectCommand({
            Bucket: bucketName,
            Key: key,
          }),
        );
        const buffer = await streamToBuffer(response.Body);
        await fs.writeFile(targetPath, buffer);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`S3 download failed for key "${key}": ${message}`);
      }
    },

    async uploadFile(key, filePath, contentType) {
      await s3.send(
        new PutObjectCommand({
          Bucket: bucketName,
          Key: key,
          Body: await fs.readFile(filePath),
          ContentType: contentType,
        }),
      );
    },
  };
};
