import { useEffect, useState } from "react";
import { getVersion } from "@tauri-apps/api/app";
import { check, type Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";

export default function StudioUpdateCenter() {
  const [currentVersion, setCurrentVersion] = useState("...");
  const [availableUpdate, setAvailableUpdate] = useState<Update | null>(null);
  const [status, setStatus] = useState("Ready to check for updates.");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);

  useEffect(() => {
    getVersion()
      .then(setCurrentVersion)
      .catch(() => setCurrentVersion("Unknown"));
  }, []);

  async function checkForUpdates() {
    if (busy) return;

    setBusy(true);
    setProgress(null);
    setAvailableUpdate(null);
    setStatus("Checking GitHub for the latest signed Umbra Studio release...");

    try {
      const update = await check();

      if (!update) {
        setStatus(`Umbra Studio ${currentVersion} is up to date.`);
        return;
      }

      setAvailableUpdate(update);
      setStatus(`Umbra Studio ${update.version} is available.`);
    } catch (error) {
      setStatus(
        error instanceof Error
          ? `Update check failed: ${error.message}`
          : "Update check failed."
      );
    } finally {
      setBusy(false);
    }
  }

  async function installUpdate() {
    if (!availableUpdate || busy) return;

    setBusy(true);
    setProgress(0);
    setStatus(`Downloading Umbra Studio ${availableUpdate.version}...`);

    let downloaded = 0;
    let total = 0;

    try {
      await availableUpdate.downloadAndInstall((event) => {
        if (event.event === "Started") {
          total = event.data.contentLength ?? 0;
          downloaded = 0;
          setProgress(0);
          setStatus(`Downloading Umbra Studio ${availableUpdate.version}...`);
        }

        if (event.event === "Progress") {
          downloaded += event.data.chunkLength;

          if (total > 0) {
            setProgress(Math.min(100, Math.round((downloaded / total) * 100)));
          }
        }

        if (event.event === "Finished") {
          setProgress(100);
          setStatus("Update installed. Restarting Umbra Studio...");
        }
      });

      await relaunch();
    } catch (error) {
      setStatus(
        error instanceof Error
          ? `Update installation failed: ${error.message}`
          : "Update installation failed."
      );
      setBusy(false);
    }
  }

  return (
    <section className="admin-panel studio-update-center">
      <span className="card-label">DESKTOP UPDATE CENTER</span>
      <h2>Umbra Studio Updates</h2>

      <p className="admin-help">
        Installed version: <strong>{currentVersion}</strong>
      </p>

      <p className="admin-help">{status}</p>

      {progress !== null && (
        <div
          style={{
            width: "100%",
            height: "10px",
            overflow: "hidden",
            borderRadius: "999px",
            background: "rgba(255,255,255,.08)",
            margin: "14px 0"
          }}
        >
          <div
            style={{
              width: `${progress}%`,
              height: "100%",
              borderRadius: "999px",
              background: "currentColor",
              transition: "width .2s ease"
            }}
          />
        </div>
      )}

      <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
        <button
          className="secondary-action"
          disabled={busy}
          onClick={() => void checkForUpdates()}
        >
          {busy && !availableUpdate ? "Checking..." : "Check for Updates"}
        </button>

        {availableUpdate && (
          <button
            className="primary-action"
            disabled={busy}
            onClick={() => void installUpdate()}
          >
            {busy
              ? "Installing..."
              : `Install ${availableUpdate.version} & Restart`}
          </button>
        )}
      </div>

      <p className="admin-help">
        Updates are downloaded from the official Umbra Studio release channel
        and must pass the application's signing-key verification before
        installation.
      </p>
    </section>
  );
}
