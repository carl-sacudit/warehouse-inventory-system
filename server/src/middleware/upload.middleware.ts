import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { RequestHandler } from "express";
import multer from "multer";

export const uploadDirectory = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../uploads"
);

mkdirSync(uploadDirectory, { recursive: true });

const imageExtensions: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

const upload = multer({
  storage: multer.diskStorage({
    destination: uploadDirectory,
    filename: (_req, file, callback) => {
      callback(
        null,
        `${randomUUID()}${imageExtensions[file.mimetype] ?? ".jpg"}`
      );
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => {
    if (!imageExtensions[file.mimetype]) {
      callback(new Error("Choose a JPG, PNG, WebP, or GIF image."));
      return;
    }

    callback(null, true);
  },
}).single("image");

export const uploadProductImage: RequestHandler = (req, res, next) => {
  upload(req, res, (error: unknown) => {
    if (error) {
      const message =
        error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE"
          ? "Product images must be 5 MB or smaller."
          : error instanceof Error
            ? error.message
            : "Unable to upload product image.";

      res.status(400).json({ success: false, message });
      return;
    }

    next();
  });
};