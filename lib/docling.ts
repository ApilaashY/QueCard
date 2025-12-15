import { spawn, exec } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";

const execAsync = promisify(exec);

export interface DoclingChunk {
  content: string;
  type: string;
  metadata: {
    page?: number;
    bbox?: number[];
    [key: string]: unknown;
  };
}

export interface DoclingResult {
  success: boolean;
  chunks?: DoclingChunk[];
  metadata?: {
    num_pages: number;
    num_chunks: number;
  };
  error?: string;
}

/**
 * Setup Python virtual environment and install dependencies
 * @returns Path to the Python executable in the venv
 */
async function ensureVenvSetup(): Promise<string> {
  const venvPath = path.join(process.cwd(), "scripts", ".venv");
  const requirementsPath = path.join(process.cwd(), "scripts", "requirements.txt");
  
  // Determine the Python executable path based on OS
  const isWindows = process.platform === "win32";
  const venvPython = isWindows
    ? path.join(venvPath, "Scripts", "python.exe")
    : path.join(venvPath, "bin", "python");

  // Check if venv exists
  if (!fs.existsSync(venvPython)) {
    console.log("Virtual environment not found. Creating...");
    
    try {
      // Create virtual environment
      await execAsync(`python3 -m venv "${venvPath}"`);
      console.log("Virtual environment created successfully");
    } catch (error) {
      throw new Error(`Failed to create virtual environment: ${error}`);
    }
  }

  // Check if requirements are installed by checking for docling
  const checkInstalled = isWindows
    ? `"${venvPython}" -c "import docling"`
    : `"${venvPython}" -c "import docling"`;

  try {
    await execAsync(checkInstalled);
    console.log("Docling already installed in venv");
  } catch {
    console.log("Installing requirements...");
    
    try {
      const pipInstall = isWindows
        ? `"${venvPython}" -m pip install -r "${requirementsPath}"`
        : `"${venvPython}" -m pip install -r "${requirementsPath}"`;
      
      await execAsync(pipInstall);
      console.log("Requirements installed successfully");
    } catch (error) {
      throw new Error(`Failed to install requirements: ${error}`);
    }
  }

  return venvPython;
}

/**
 * Process a PDF file using Docling to extract structured content
 * @param pdfPath - Absolute path to the PDF file
 * @returns Promise with structured chunks
 */
export async function processPdfWithDocling(
  pdfPath: string
): Promise<DoclingResult> {
  // Check if running in Vercel (production/serverless environment)
  const isVercel = process.env.VERCEL === '1';
  
  if (isVercel) {
    // Use Vercel Python serverless function
    return await processPdfWithVercelFunction(pdfPath);
  } else {
    // Use local Python subprocess
    return await processPdfWithLocalPython(pdfPath);
  }
}

/**
 * Process PDF using external Python service (Railway, Render, etc.)
 */
async function processPdfWithVercelFunction(pdfPath: string): Promise<DoclingResult> {
  try {
    // Read PDF file and convert to base64
    const pdfBuffer = fs.readFileSync(pdfPath);
    const pdfBase64 = pdfBuffer.toString('base64');
    
    // Use external Python service
    const pythonServiceUrl = process.env.PDF_PROCESSING_SERVICE_URL;
    
    if (!pythonServiceUrl) {
      return {
        success: false,
        error: 'PDF_PROCESSING_SERVICE_URL environment variable not set',
      };
    }
    
    const response = await fetch(`${pythonServiceUrl}/process-pdf`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ pdf_base64: pdfBase64 }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      return {
        success: false,
        error: error.error || error.detail || 'Failed to process PDF',
      };
    }
    
    const result = await response.json();
    return result;
  } catch (error) {
    return {
      success: false,
      error: `Failed to process PDF with external service: ${(error as Error).message}`,
    };
  }
}

/**
 * Process PDF using local Python subprocess (for development)
 */
async function processPdfWithLocalPython(pdfPath: string): Promise<DoclingResult> {
  // Ensure venv is set up and get Python path
  let pythonPath: string;
  try {
    pythonPath = await ensureVenvSetup();
  } catch (error) {
    return {
      success: false,
      error: `Failed to setup Python environment: ${(error as Error).message}`,
    };
  }

  return new Promise((resolve, reject) => {
    const scriptPath = path.join(
      process.cwd(),
      "scripts",
      "process_pdf_docling.py"
    );

    const pythonProcess = spawn(pythonPath, [scriptPath, pdfPath]);

    let stdout = "";
    let stderr = "";

    pythonProcess.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    pythonProcess.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    pythonProcess.on("close", (code) => {
      if (code !== 0) {
        console.error("Python script error:", stderr);
        reject(new Error(`Docling processing failed: ${stderr}`));
        return;
      }

      try {
        const result = JSON.parse(stdout);
        resolve(result);
      } catch (error) {
        reject(new Error(`Failed to parse Docling output: ${error}`));
      }
    });

    pythonProcess.on("error", (error) => {
      reject(new Error(`Failed to spawn Python process: ${error.message}`));
    });
  });
}

/**
 * Prepare chunks for Gemini processing
 * Combines smaller chunks and filters out very short ones
 */
export function prepareChunksForGemini(
  chunks: DoclingChunk[],
  minChunkSize = 50,
  targetChunkSize = 800
): string[] {
  const processedChunks: string[] = [];
  let currentChunk = "";

  for (const chunk of chunks) {
    const content = chunk.content.trim();

    // Skip very short chunks (likely headers or page numbers)
    if (content.length < minChunkSize) {
      continue;
    }

    // Add metadata context if available
    let enrichedContent = content;
    if (chunk.type && chunk.type !== "text") {
      enrichedContent = `[${chunk.type.toUpperCase()}]\n${content}`;
    }

    // Combine chunks until we reach target size
    if (currentChunk.length + enrichedContent.length < targetChunkSize) {
      currentChunk += (currentChunk ? "\n\n" : "") + enrichedContent;
    } else {
      if (currentChunk) {
        processedChunks.push(currentChunk);
      }
      currentChunk = enrichedContent;
    }
  }

  // Add the last chunk
  if (currentChunk) {
    processedChunks.push(currentChunk);
  }

  return processedChunks;
}
