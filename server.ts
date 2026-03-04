import express from "express";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // API routes FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Expanded Documentation Content
  app.get("/api/docs", (req, res) => {
    res.json([
      {
        id: "getting-started",
        title: "Getting Started",
        content: "Welcome to Velo Code! No heavy installations required. Just open your browser, and the IDE is ready instantly. We use the File System Access API to read/write files directly to your local folder."
      },
      {
        id: "plugin-system",
        title: "The Plugin Architecture",
        content: "Velo Code uses a modular hook system. The core editor only handles text. To run code, you create a plugin that registers an extension (like .cpp or .py) and tells the editor how to execute it using Web Workers."
      },
      {
        id: "wasm-compilation",
        title: "In-Browser Compilation",
        content: "By leveraging WebAssembly (WASM), extensions can compile code entirely offline in your browser. No Docker, no external servers. It runs directly on your machine's local resources."
      },
      {
        id: "offline-mode",
        title: "Working Offline",
        content: "Once loaded, Velo Code functions as a Progressive Web App (PWA). You can code, run HTML/JS previews, and even compile WASM-supported languages completely offline."
      }
    ]);
  });

  // New Architecture Data Route
  app.get("/api/architecture", (req, res) => {
    res.json({
      title: "Under the Hood: Toolchain-free Execution",
      steps: [
        { step: 1, name: "Core Editor", desc: "Handles UI, syntax highlighting, and text editing." },
        { step: 2, name: "Extension Registry", desc: "Maps file extensions (.html, .cpp) to specific execution functions." },
        { step: 3, name: "Web Worker Offloading", desc: "Code is sent to a background worker thread to prevent the UI from freezing during compilation." },
        { step: 4, name: "WASM Engine", desc: "The worker runs the language-specific WebAssembly compiler (e.g., Pyodide for Python) to execute the code and return the output." }
      ]
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();