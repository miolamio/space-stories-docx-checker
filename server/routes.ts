import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import { DocumentAnalyzer } from "../attached_assets/test_docx_parser";
import path from "path";
import fs from "fs";
import os from "os";

const upload = multer({ dest: os.tmpdir() });

export function registerRoutes(app: Express): Server {
  app.post("/api/process-docx", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "No file uploaded",
          articles: [],
          logs: [],
        });
      }

      const analyzer = new DocumentAnalyzer();
      const result = await analyzer.processDocument(req.file.path);

      // Clean up the temporary file
      fs.unlink(req.file.path, (err) => {
        if (err) console.error("Error deleting temporary file:", err);
      });

      res.json(result);
    } catch (error) {
      console.error("Error processing DOCX file:", error);
      res.status(500).json({
        success: false,
        message: "Error processing DOCX file",
        articles: [],
        logs: [],
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
