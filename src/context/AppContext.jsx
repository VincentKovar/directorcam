import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  loadOrSeedProject,
  saveStoredProject,
  FONT_SIZE_KEY,
  PERMISSIONS_KEY,
  PREVIEW_VISIBLE_KEY,
} from "../utils/storage";
import { genProjectId, nextCueId } from "../utils/idGen";
import { clampWpm, exportProject, importProjectFile } from "../utils/importExport";
import {
  charactersPerSecond,
  getWords,
  jumpWords,
} from "../engine/teleprompterEngine";
import { fireCue as fireCueImpl } from "../engine/cueEngine";

const AppContext = createContext(null);

export function useApp() {
  return useContext(AppContext);
}

// Rough mobile detection: camera_switch uses facingMode constraints on mobile
// and cycles enumerateDevices() video inputs on desktop, per spec.
const IS_MOBILE = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

export function AppProvider({ children }) {
  // ---- Project data -------------------------------------------------------
  const [data, setData] = useState(loadOrSeedProject);
  const { project, cueSheet } = data;

  // ---- Teleprompter engine state ------------------------------------------
  const [scrollPosition, setScrollPosition] = useState(0);
  const [playbackState, setPlaybackState] = useState("stopped"); // stopped | playing | paused | slow

  // ---- Recording state -----------------------------------------------------
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);

  // ---- Camera state --------------------------------------------------------
  const [activeStream, setActiveStream] = useState(null);
  const [facingMode, setFacingMode] = useState("user");
  const streamRef = useRef(null);
  const deviceIndexRef = useRef(0); // desktop camera cycling position

  // ---- Cue engine state ----------------------------------------------------
  const [firedCueIds, setFiredCueIds] = useState(() => new Set());
  const audioMapRef = useRef(new Map()); // cueId -> HTMLAudioElement

  // ---- Overlays / countdown -----------------------------------------------
  const [activeOverlays, setActiveOverlays] = useState([]);
  // pauseInfo: null, or { countdown: number|null } when a pause_recording cue
  // is holding playback. countdown null = manual resume.
  const [pauseInfo, setPauseInfo] = useState(null);

  // ---- UI state shared across screens ---------------------------------------
  const [permission, setPermission] = useState(
    () => localStorage.getItem(PERMISSIONS_KEY) || "unset" // unset | granted | skipped
  );
  const [fontSize, setFontSizeState] = useState(() => {
    const n = Number(localStorage.getItem(FONT_SIZE_KEY));
    return Number.isFinite(n) && n >= 16 && n <= 96 ? n : 36;
  });
  const [previewVisible, setPreviewVisibleState] = useState(
    () => localStorage.getItem(PREVIEW_VISIBLE_KEY) !== "false"
  );
  const [toasts, setToasts] = useState([]);

  // Refs mirroring fast-changing state so the rAF loop and event handlers do
  // not need to re-subscribe each render.
  const wpmRef = useRef(project.wpm);
  wpmRef.current = project.wpm;
  const playbackRef = useRef(playbackState);
  playbackRef.current = playbackState;
  const scriptLenRef = useRef(project.script.length);
  scriptLenRef.current = project.script.length;
  const facingRef = useRef(facingMode);
  facingRef.current = facingMode;
  const cueSheetRef = useRef(cueSheet);
  cueSheetRef.current = cueSheet;
  const projectRef = useRef(project);
  projectRef.current = project;
  const isRecordingRef = useRef(isRecording);
  isRecordingRef.current = isRecording;

  // Memoized word index, shared by all screens.
  const words = useMemo(() => getWords(project.script), [project.script]);

  // ---- Persistence ----------------------------------------------------------
  useEffect(() => {
    saveStoredProject(data);
  }, [data]);

  // ---- Toasts ----------------------------------------------------------------
  const toast = useCallback((message, kind = "info") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  }, []);

  // ---- Project mutations -----------------------------------------------------
  const touch = (p) => ({ ...p, updatedAt: new Date().toISOString() });

  const updateProject = useCallback((patch) => {
    setData((d) => ({ ...d, project: touch({ ...d.project, ...patch }) }));
  }, []);

  const setWpm = useCallback(
    (wpm) => updateProject({ wpm: clampWpm(wpm) }),
    [updateProject]
  );

  const saveCue = useCallback((cue) => {
    setData((d) => {
      const exists = d.cueSheet.some((c) => c.id === cue.id);
      const cueSheet = exists
        ? d.cueSheet.map((c) => (c.id === cue.id ? cue : c))
        : [...d.cueSheet, { ...cue, id: cue.id || nextCueId(d.cueSheet) }];
      return { ...d, project: touch(d.project), cueSheet };
    });
  }, []);

  const deleteCue = useCallback((cueId) => {
    setData((d) => ({
      ...d,
      project: touch(d.project),
      cueSheet: d.cueSheet.filter((c) => c.id !== cueId),
    }));
  }, []);

  const reorderCue = useCallback((fromId, toId) => {
    setData((d) => {
      const list = [...d.cueSheet];
      const from = list.findIndex((c) => c.id === fromId);
      const to = list.findIndex((c) => c.id === toId);
      if (from === -1 || to === -1 || from === to) return d;
      const [moved] = list.splice(from, 1);
      list.splice(to, 0, moved);
      return { ...d, project: touch(d.project), cueSheet: list };
    });
  }, []);

  const newProject = useCallback(() => {
    const now = new Date().toISOString();
    setData({
      project: {
        id: genProjectId(),
        title: "Untitled project",
        script: "",
        wpm: 130,
        createdAt: now,
        updatedAt: now,
        slideDeckUrl: "",
      },
      cueSheet: [],
    });
    setScrollPosition(0);
    setPlaybackState("stopped");
    setFiredCueIds(new Set());
    setActiveOverlays([]);
  }, []);

  const doExport = useCallback(() => {
    exportProject(projectRef.current, cueSheetRef.current);
    toast("Project exported");
  }, [toast]);

  const doImport = useCallback(
    async (file) => {
      try {
        const imported = await importProjectFile(file);
        setData(imported);
        setScrollPosition(0);
        setPlaybackState("stopped");
        setFiredCueIds(new Set());
        setActiveOverlays([]);
        toast(`Imported "${imported.project.title}"`, "success");
      } catch (err) {
        toast(err.message, "error");
      }
    },
    [toast]
  );

  // ---- Settings persisted outside the project -------------------------------
  const setFontSize = useCallback((px) => {
    const clamped = Math.min(96, Math.max(16, Math.round(px)));
    setFontSizeState(clamped);
    localStorage.setItem(FONT_SIZE_KEY, String(clamped));
  }, []);

  const setPreviewVisible = useCallback((v) => {
    setPreviewVisibleState(v);
    localStorage.setItem(PREVIEW_VISIBLE_KEY, String(v));
  }, []);

  // ---- Camera ------------------------------------------------------------------
  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      setActiveStream(null);
    }
  }, []);

  // Acquire a camera stream. On mobile, `facing` maps to the facingMode
  // constraint. On desktop, facingMode is usually ignored by the browser, so
  // a camera_switch cue instead cycles through enumerateDevices() video
  // inputs (per spec).
  const startCamera = useCallback(
    async (facing = facingRef.current, cycleDevice = false) => {
      try {
        // Releasing the old camera first matters on Android, where front and
        // rear cameras usually cannot be open simultaneously.
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop());
        }
        let videoConstraints = {
          facingMode: facing,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        };
        if (!IS_MOBILE && cycleDevice) {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const cams = devices.filter((d) => d.kind === "videoinput");
          if (cams.length > 1) {
            deviceIndexRef.current = (deviceIndexRef.current + 1) % cams.length;
            videoConstraints = {
              deviceId: { exact: cams[deviceIndexRef.current].deviceId },
              width: { ideal: 1280 },
              height: { ideal: 720 },
            };
          }
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          video: videoConstraints,
          audio: true,
        });
        streamRef.current = stream;
        setActiveStream(stream);
        setFacingMode(facing);
        setPermission("granted");
        localStorage.setItem(PERMISSIONS_KEY, "granted");
        return stream;
      } catch (err) {
        toast(`Camera error: ${err.message}`, "error");
        throw err;
      }
    },
    [toast]
  );

  const switchCamera = useCallback(
    (facing) => {
      if (permission === "skipped") return;
      // Known limitation (accepted by spec): if a recording is in progress,
      // MediaRecorder stays bound to the old stream, so the file will not
      // contain the new camera's frames. The on-screen preview does update.
      startCamera(facing, true).catch(() => {});
    },
    [permission, startCamera]
  );

  const skipPermissions = useCallback(() => {
    setPermission("skipped");
    localStorage.setItem(PERMISSIONS_KEY, "skipped");
  }, []);

  const requestPermissions = useCallback(async () => {
    await startCamera("user");
  }, [startCamera]);

  // Re-open the permission prompt (used by the record button in skipped mode).
  const resetPermissions = useCallback(() => {
    setPermission("unset");
    localStorage.removeItem(PERMISSIONS_KEY);
  }, []);

  // ---- Recording ------------------------------------------------------------------
  const startRecording = useCallback(async () => {
    let stream = streamRef.current;
    if (!stream) {
      stream = await startCamera(facingRef.current);
    }
    recordedChunksRef.current = [];
    // Prefer VP9 per spec, fall back for browsers without it.
    const mime = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"].find(
      (m) => window.MediaRecorder && MediaRecorder.isTypeSupported(m)
    );
    const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) recordedChunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(recordedChunksRef.current, { type: "video/webm" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `directorcam_${Date.now()}.webm`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    };
    recorder.start(1000); // collect in 1-second chunks
    mediaRecorderRef.current = recorder;
    setIsRecording(true);
    toast("Recording started", "success");
  }, [startCamera, toast]);

  const stopRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    }
    mediaRecorderRef.current = null;
    setIsRecording(false);
    toast("Recording saved");
  }, [toast]);

  const toggleRecording = useCallback(() => {
    if (isRecordingRef.current) {
      stopRecording();
    } else if (permission === "skipped") {
      // Script-only mode: tapping record re-opens the permission prompt so
      // the user can opt back in.
      resetPermissions();
    } else {
      startRecording().catch(() => {});
    }
  }, [permission, startRecording, stopRecording, resetPermissions]);

  // ---- Playback control ---------------------------------------------------------
  // Re-arm rule: whenever the position moves backward, clear firedCueIds for
  // any auto cue whose scriptOffset is greater than the new position.
  const rearmAfter = useCallback((newPos) => {
    setFiredCueIds((prev) => {
      const next = new Set();
      for (const id of prev) {
        const cue = cueSheetRef.current.find((c) => c.id === id);
        if (!cue) continue;
        if (cue.trigger.mode === "auto" && cue.trigger.scriptOffset > newPos) continue;
        next.add(id);
      }
      return next;
    });
  }, []);

  // Move to an absolute character offset (production-view word click,
  // jump-back/forward). Re-arms cues past the new position; if stopped,
  // becomes paused (ready to resume from that point).
  const seekTo = useCallback(
    (offset) => {
      const clamped = Math.min(scriptLenRef.current, Math.max(0, offset));
      setScrollPosition(clamped);
      rearmAfter(clamped);
      setPlaybackState((s) => (s === "stopped" ? "paused" : s));
    },
    [rearmAfter]
  );

  const jumpByWords = useCallback(
    (deltaWords) => {
      setScrollPosition((pos) => {
        const target = jumpWords(getWords(projectRef.current.script), pos, deltaWords);
        if (target < pos) rearmAfter(target);
        return target;
      });
      setPlaybackState((s) => (s === "stopped" ? "paused" : s));
    },
    [rearmAfter]
  );

  const togglePlay = useCallback(() => {
    setPlaybackState((s) => {
      if (s === "playing" || s === "slow") return "paused";
      return "playing";
    });
    setPauseInfo(null);
  }, []);

  const stop = useCallback(() => {
    setPlaybackState("stopped");
    setScrollPosition(0);
    setFiredCueIds(new Set());
    setPauseInfo(null);
  }, []);

  const setSlow = useCallback((on) => {
    setPlaybackState((s) => {
      if (on && (s === "playing" || s === "slow")) return "slow";
      if (!on && s === "slow") return "playing";
      return s;
    });
  }, []);

  // ---- rAF scroll loop -------------------------------------------------------------
  useEffect(() => {
    if (playbackState !== "playing" && playbackState !== "slow") return undefined;
    let raf;
    let last = performance.now();
    const tick = (now) => {
      const deltaMs = now - last;
      last = now;
      const rate =
        charactersPerSecond(wpmRef.current) * (playbackRef.current === "slow" ? 0.4 : 1);
      setScrollPosition((pos) => {
        const next = pos + rate * (deltaMs / 1000);
        if (next >= scriptLenRef.current) {
          // End of script: hold position and drop to paused on the next tick.
          setTimeout(() => setPlaybackState("paused"), 0);
          return scriptLenRef.current;
        }
        return next;
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playbackState]);

  // ---- Overlays -----------------------------------------------------------------------
  const removeOverlay = useCallback((id) => {
    setActiveOverlays((o) => o.filter((x) => x.id !== id));
  }, []);

  const addOverlay = useCallback(
    (overlay) => {
      setActiveOverlays((o) => [...o, overlay]);
      if (overlay.duration > 0) {
        setTimeout(() => removeOverlay(overlay.id), overlay.duration);
      }
    },
    [removeOverlay]
  );

  // ---- Sound registry helpers ------------------------------------------------------------
  const stopLoopingSounds = useCallback(() => {
    for (const [id, audio] of audioMapRef.current) {
      if (audio.loop) {
        audio.pause();
        audioMapRef.current.delete(id);
      }
    }
  }, []);

  const stopAllSounds = useCallback(() => {
    for (const [, audio] of audioMapRef.current) audio.pause();
    audioMapRef.current.clear();
  }, []);

  // ---- pause_recording behaviour ----------------------------------------------------------
  const resumeFromPause = useCallback(() => {
    setPauseInfo(null);
    setPlaybackState("playing");
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state === "paused") recorder.resume();
  }, []);

  const pausePlayback = useCallback(({ countdown }) => {
    setPlaybackState("paused");
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state === "recording") recorder.pause();
    setPauseInfo({ countdown: countdown > 0 ? countdown : null });
  }, []);

  // Drive the pause countdown. Counting lives here (not in the overlay
  // component) so the resume happens even if the overlay is unmounted by a
  // tab change.
  useEffect(() => {
    if (!pauseInfo || pauseInfo.countdown === null) return undefined;
    if (pauseInfo.countdown <= 0) {
      resumeFromPause();
      return undefined;
    }
    const t = setTimeout(() => {
      setPauseInfo((p) => (p ? { countdown: p.countdown - 1 } : p));
    }, 1000);
    return () => clearTimeout(t);
  }, [pauseInfo, resumeFromPause]);

  // ---- Cue firing -----------------------------------------------------------------------------
  const fireCue = useCallback(
    (cue) => {
      fireCueImpl(cue, {
        switchCamera,
        addOverlay,
        pausePlayback,
        stopLoopingSounds,
        audioMap: audioMapRef.current,
        project: projectRef.current,
        toast,
      });
    },
    [switchCamera, addOverlay, pausePlayback, stopLoopingSounds, toast]
  );

  // Manual fire from the production view: execute immediately and mark fired.
  const fireManualCue = useCallback(
    (cue) => {
      fireCue(cue);
      setFiredCueIds((prev) => new Set([...prev, cue.id]));
    },
    [fireCue]
  );

  // Auto-cue watcher: on each scrollPosition change during playback, fire any
  // auto cue whose offset has been passed and which hasn't fired this pass.
  useEffect(() => {
    if (playbackState !== "playing" && playbackState !== "slow") return;
    const toFire = cueSheet.filter(
      (cue) =>
        cue.trigger.mode === "auto" &&
        scrollPosition >= cue.trigger.scriptOffset &&
        !firedCueIds.has(cue.id)
    );
    if (toFire.length === 0) return;
    setFiredCueIds((prev) => {
      const next = new Set(prev);
      toFire.forEach((c) => next.add(c.id));
      return next;
    });
    toFire.forEach((cue) => fireCue(cue));
  }, [scrollPosition, playbackState, cueSheet, firedCueIds, fireCue]);

  // Cleanup on unload: stop tracks and sounds.
  useEffect(() => {
    return () => {
      stopStream();
      stopAllSounds();
    };
  }, [stopStream, stopAllSounds]);

  const value = {
    // data
    project,
    cueSheet,
    words,
    // engine
    scrollPosition,
    playbackState,
    seekTo,
    jumpByWords,
    togglePlay,
    stop,
    setSlow,
    setWpm,
    // recording
    isRecording,
    toggleRecording,
    // camera
    activeStream,
    facingMode,
    switchCamera,
    // permissions
    permission,
    requestPermissions,
    skipPermissions,
    resetPermissions,
    // cues
    firedCueIds,
    fireManualCue,
    saveCue,
    deleteCue,
    reorderCue,
    // overlays
    activeOverlays,
    removeOverlay,
    pauseInfo,
    resumeFromPause,
    // project management
    updateProject,
    newProject,
    doExport,
    doImport,
    // ui
    fontSize,
    setFontSize,
    previewVisible,
    setPreviewVisible,
    toasts,
    toast,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
