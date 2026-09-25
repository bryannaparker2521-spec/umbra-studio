import { useEffect, useRef, useState } from "react";
import { getVersion } from "@tauri-apps/api/app";
import { check, type Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";

type StudioUpdateCenterProps = {
  mode?: "panel" | "startup";
};

let startupCheckCompleted = false;

function isTauriDesktop() {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

function getUpdaterErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  try { return JSON.stringify(error); } catch { return String(error); }
}

export default function StudioUpdateCenter({ mode = "panel" }: StudioUpdateCenterProps) {
  const [currentVersion, setCurrentVersion] = useState("...");
  const [availableUpdate, setAvailableUpdate] = useState<Update | null>(null);
  const [status, setStatus] = useState("Ready to check for updates.");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [startupPromptOpen, setStartupPromptOpen] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (!isTauriDesktop()) {
      setCurrentVersion("Web Preview");
      if (mode === "panel") setStatus("Desktop updates are available in the installed Umbra Studio app.");
      return;
    }

    getVersion()
      .then((version) => { if (mountedRef.current) setCurrentVersion(version); })
      .catch((error) => {
        console.error("Unable to read Umbra Studio version:", error);
        if (mountedRef.current) setCurrentVersion("Unknown");
      });
  }, [mode]);

  useEffect(() => {
    if (mode !== "startup" || !isTauriDesktop() || startupCheckCompleted) return;
    startupCheckCompleted = true;
    void checkForUpdates(true);
    // This intentionally runs once per desktop launch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  async function checkForUpdates(fromStartup = false) {
    if (busy || !isTauriDesktop()) return;

    setBusy(true);
    setProgress(null);
    setAvailableUpdate(null);
    if (!fromStartup) setStatus("Checking GitHub for the latest signed Umbra Studio release...");

    try {
      const update = await check();
      if (!mountedRef.current) return;

      if (!update) {
        setStatus(`Umbra Studio ${currentVersion === "..." ? "" : currentVersion} is up to date.`.replace("  ", " "));
        return;
      }

      console.info("Umbra Studio update found:", {
        currentVersion,
        availableVersion: update.version
      });

      setAvailableUpdate(update);
      setStatus(`Umbra Studio ${update.version} is available.`);
      if (fromStartup) setStartupPromptOpen(true);
    } catch (error) {
      console.error("Umbra Studio updater check failed:", error);
      if (mountedRef.current && !fromStartup) {
        setStatus(`Update check failed: ${getUpdaterErrorMessage(error)}`);
      }
    } finally {
      if (mountedRef.current) setBusy(false);
    }
  }

  async function installUpdate() {
    if (!availableUpdate || busy || !isTauriDesktop()) return;

    setBusy(true);
    setProgress(0);
    setStatus(`Downloading Umbra Studio ${availableUpdate.version}...`);

    let downloaded = 0;
    let total = 0;

    try {
      await availableUpdate.downloadAndInstall((event) => {
        if (!mountedRef.current) return;

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
      console.error("Umbra Studio update installation failed:", error);
      if (mountedRef.current) {
        setStatus(`Update installation failed: ${getUpdaterErrorMessage(error)}`);
        setBusy(false);
      }
    }
  }

  if (mode === "startup") {
    if (!startupPromptOpen || !availableUpdate) return null;

    return (
      <div style={{position:"fixed",inset:0,zIndex:10000,display:"grid",placeItems:"center",padding:"24px",background:"rgba(4,2,7,.82)",backdropFilter:"blur(8px)"}}>
        <section className="admin-panel studio-update-center" style={{width:"min(560px,100%)",boxSizing:"border-box",border:"1px solid rgba(232,201,111,.38)",boxShadow:"0 30px 100px rgba(0,0,0,.6)"}} role="dialog" aria-modal="true" aria-label="Umbra Studio update available">
          <span className="card-label">UMBRA STUDIO UPDATE</span>
          <h2>Version {availableUpdate.version} is ready</h2>
          <p className="admin-help">A new signed Umbra Studio desktop update is available. Install it now and the Studio will restart automatically.</p>
          <p className="admin-help">Installed version: <strong>{currentVersion}</strong></p>
          <p className="admin-help">{status}</p>

          {progress !== null && (
            <div style={{width:"100%",height:"10px",overflow:"hidden",borderRadius:"999px",background:"rgba(255,255,255,.08)",margin:"14px 0"}}>
              <div style={{width:`${progress}%`,height:"100%",borderRadius:"999px",background:"currentColor",transition:"width .2s ease"}} />
            </div>
          )}

          <div style={{display:"flex",gap:"12px",flexWrap:"wrap",marginTop:"18px"}}>
            <button className="primary-action" disabled={busy} onClick={() => void installUpdate()}>
              {busy ? "Installing..." : `Install ${availableUpdate.version} & Restart`}
            </button>
            <button className="secondary-action" disabled={busy} onClick={() => setStartupPromptOpen(false)}>Later</button>
          </div>
          <p className="admin-help" style={{marginTop:"16px"}}>The update must pass Umbra Studio's signing-key verification before installation.</p>
        </section>
      </div>
    );
  }

  return (
    <section className="admin-panel studio-update-center">
      <span className="card-label">DESKTOP UPDATE CENTER</span>
      <h2>Umbra Studio Updates</h2>
      <p className="admin-help">Installed version: <strong>{currentVersion}</strong></p>
      <p className="admin-help">{status}</p>

      {progress !== null && (
        <div style={{width:"100%",height:"10px",overflow:"hidden",borderRadius:"999px",background:"rgba(255,255,255,.08)",margin:"14px 0"}}>
          <div style={{width:`${progress}%`,height:"100%",borderRadius:"999px",background:"currentColor",transition:"width .2s ease"}} />
        </div>
      )}

      <div style={{display:"flex",gap:"12px",flexWrap:"wrap"}}>
        <button className="secondary-action" disabled={busy || !isTauriDesktop()} onClick={() => void checkForUpdates(false)}>
          {busy && !availableUpdate ? "Checking..." : "Check for Updates"}
        </button>
        {availableUpdate && (
          <button className="primary-action" disabled={busy} onClick={() => void installUpdate()}>
            {busy ? "Installing..." : `Install ${availableUpdate.version} & Restart`}
          </button>
        )}
      </div>

      <p className="admin-help">Updates are downloaded from the official Umbra Studio release channel and must pass the application's signing-key verification before installation.</p>
    </section>
  );
}
