import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export async function getMediaDurationSec(filePath) {
  try {
    const { stdout } = await execFileAsync(
      "ffprobe",
      [
        "-v",
        "error",
        "-show_entries",
        "format=duration",
        "-of",
        "default=noprint_wrappers=1:nokey=1",
        filePath,
      ],
      {
        maxBuffer: 1024 * 1024 * 5,
      },
    );
    const durationSec = Number(String(stdout).trim());
    return Number.isFinite(durationSec) && durationSec > 0
      ? durationSec
      : undefined;
  } catch {
    return undefined;
  }
}

export async function runCommand(command, args) {
  try {
    await execFileAsync(command, args, {
      maxBuffer: 1024 * 1024 * 20,
    });
  } catch (error) {
    const stderr = error?.stderr ?? error?.message ?? String(error);
    throw new Error(`${command} failed: ${stderr}`);
  }
}
