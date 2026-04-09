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

export async function runCommand(command, args, options = {}) {
  const capture = Boolean(options.capture);
  try {
    const result = await execFileAsync(command, args, {
      maxBuffer: 1024 * 1024 * 20,
    });
    if (capture) {
      return {
        stdout: String(result.stdout ?? ""),
        stderr: String(result.stderr ?? ""),
      };
    }
    return undefined;
  } catch (error) {
    const stderrBuf = error?.stderr;
    const stderr =
      (typeof stderrBuf === "string"
        ? stderrBuf
        : Buffer.isBuffer(stderrBuf)
          ? stderrBuf.toString("utf8")
          : null) ??
      error?.message ??
      String(error);
    throw new Error(`${command} failed: ${stderr}`);
  }
}

/** Best-effort stream 0 summary for render diagnostics (local path). */
export async function ffprobeVideoSummary(filePath) {
  try {
    const { stdout } = await execFileAsync(
      "ffprobe",
      [
        "-v",
        "error",
        "-select_streams",
        "v:0",
        "-show_entries",
        "stream=width,height,codec_name,pix_fmt,avg_frame_rate",
        "-show_entries",
        "format=duration",
        "-of",
        "json",
        filePath,
      ],
      { maxBuffer: 1024 * 1024 },
    );
    return JSON.parse(String(stdout));
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
