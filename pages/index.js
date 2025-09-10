import React, { useRef, useEffect, useState } from "react";
import Webcam from "react-webcam";
import * as tf from "@tensorflow/tfjs"; 
import * as blazeface from "@tensorflow-models/blazeface";
import * as cocoSsd from "@tensorflow-models/coco-ssd";
import "@tensorflow/tfjs-backend-webgl";

const videoConstraints = { width: 640, height: 480, facingMode: "user" };
const CANDIDATE_NAME = "Jane Doe";
const SESSION_ID = "session001";

export default function Home() {
  const webcamRef = useRef(null);
  const [webcamReady, setWebcamReady] = useState(false);
  const [logs, setLogs] = useState([]);
  const [recording, setRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [recordedChunks, setRecordedChunks] = useState([]);
  const [focusState, setFocusState] = useState({ lost: false, absent: false, multiple: false });
  const awayTimer = useRef(null);
  const absentStart = useRef(null);
  const sessionStart = useRef(new Date());

  const handleWebcamReady = () => {
    setWebcamReady(true);
  }
  const handleStartRecording = () => {
    const videoEl = webcamRef.current?.video;
    if (!videoEl) { alert("Video element not ready"); return; }
    const stream = videoEl.srcObject;
    if (!(stream instanceof MediaStream)) { alert("Camera not ready"); return; }
    const recorder = new MediaRecorder(stream, { mimeType: "video/webm" });
    setMediaRecorder(recorder);
    setRecordedChunks([]); 
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) setRecordedChunks((prev) => [...prev, e.data]);
    };
    recorder.start();
    setRecording(true);
  };

  const handleStopRecording = () => {
    if (mediaRecorder && recording) {
      mediaRecorder.stop();
      setRecording(false);
    }
  };

  const downloadRecording = () => {
    if (recordedChunks.length) {
      const blob = new Blob(recordedChunks, { type: "video/webm" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${SESSION_ID}_recording.webm`;
      a.click();
    }
  };

  function logEvent(type) {
    setLogs((prev) => [
      ...prev,
      { type, time: new Date().toLocaleTimeString(), candidate: CANDIDATE_NAME, session: SESSION_ID },
    ]);
  }
  useEffect(() => {
    let faceModel, run = true, interval;
    (async () => {
      faceModel = await blazeface.load();
      interval = setInterval(async () => {
        if (!run) return;
        const videoReady = webcamRef.current && webcamRef.current.video.readyState === 4;
        if (!videoReady) return;
        const faces = await faceModel.estimateFaces(webcamRef.current.video);
        if (faces.length === 1) {
          clearTimeout(awayTimer.current);
          awayTimer.current = setTimeout(() => {
            if (!focusState.lost) {
              logEvent("User not focused {'>'} 5s");
              setFocusState((s) => ({ ...s, lost: true }));
            }
          }, 5000);
        } else {
          clearTimeout(awayTimer.current);
          setFocusState((s) => ({ ...s, lost: false }));
        }
        if (faces.length === 0) {
          if (!absentStart.current) absentStart.current = Date.now();
          else if (Date.now() - absentStart.current > 10000 && !focusState.absent) {
            logEvent("No face {'>'} 10s");
            setFocusState((s) => ({ ...s, absent: true }));
          }
        } else {
          absentStart.current = null;
          setFocusState((s) => ({ ...s, absent: false }));
        }
        if (faces.length > 1 && !focusState.multiple) {
          logEvent("Multiple faces detected");
          setFocusState((s) => ({ ...s, multiple: true }));
        } else if (faces.length <= 1 && focusState.multiple) {
          setFocusState((s) => ({ ...s, multiple: false }));
        }
      }, 1000);
    })();
    return () => { run = false; clearInterval(interval); };
    
  }, [focusState.lost, focusState.absent, focusState.multiple]);

  useEffect(() => {
    let objModel, run = true, interval;

    const setupAndRun = async () => {
      try {
        await tf.setBackend('webgl');
        await tf.ready();
      } catch {
        await tf.setBackend('cpu');
        await tf.ready();
      }
      objModel = await cocoSsd.load();
      interval = setInterval(async () => {
        if (!run) return;
        const ready = webcamRef.current && webcamRef.current.video.readyState === 4;
        if (!ready) return;
        const pred = await objModel.detect(webcamRef.current.video);
        pred.forEach((o) => {
          if (["cell phone", "book", "laptop"].includes(o.class) && o.score > 0.6) {
            logEvent(`Suspicious item detected: ${o.class}`);
          }
        });
      }, 2000);
    };

    setupAndRun();

    return () => { run = false; clearInterval(interval); };
  }, []);
  const countEvents = (substr) => logs.filter(log => log.type.toLowerCase().includes(substr.toLowerCase())).length;

  const generateReportCSV = () => {
    const interviewEnd = new Date();
    const durationSec = Math.floor((interviewEnd - sessionStart.current) / 1000);
    const durationStr = `${Math.floor(durationSec / 60)}m ${durationSec % 60}s`;

    const focusLostCount = countEvents("not focused");
    const multipleFacesCount = countEvents("multiple faces");
    const noFaceCount = countEvents("no face");
    const suspiciousItemsCount = countEvents("suspicious item");

    const deductions = focusLostCount * 2 + multipleFacesCount * 5 + noFaceCount * 5 + suspiciousItemsCount * 5;
    const finalScore = Math.max(0, 100 - deductions);

    const rows = [
      ["Candidate Name", CANDIDATE_NAME],
      ["Interview Duration", durationStr],
      ["Focus Lost Count", focusLostCount],
      ["Multiple Faces Count", multipleFacesCount],
      ["No Face Count", noFaceCount],
      ["Suspicious Items Count", suspiciousItemsCount],
      ["Final Integrity Score", finalScore],
    ];

    return rows.map(row => row.join(",")).join("\n");
  };

  const downloadReport = () => {
    const csv = generateReportCSV();
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${SESSION_ID}_proctoring_report.csv`;
    a.click();
  };

  const cardStyle = {
    width: 340,
    background: "#fff",
    borderRadius: 20,
    padding: "2rem 1.5rem",
    boxShadow: "0 4px 32px #3b82f650",
    marginTop: 10,
    minHeight: 460,
  };
  const buttonStyle = {
    padding: "10px 18px",
    fontWeight: "500",
    marginRight: 8,
    marginTop: 8,
    background: "#4F46E5",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
    transition: "background 0.2s",
  };
  const buttonDisabled = {
    ...buttonStyle, background: "#a5b4fc", cursor: "not-allowed"
  };

  return (
    <main style={{
      background: "linear-gradient(135deg, #f7fafc 0%, #e0e7ff 100%)",
      minHeight: "100vh",
      padding: "2rem"
    }}>
      <h1 style={{ textAlign: "center", fontWeight: 700, fontSize: "2.2rem", marginBottom: "2rem", color: "#3730A3" }}>
        Video Proctoring Interview
      </h1>
      <div style={{
        display: "flex",
        gap: "2.5rem",
        justifyContent: "center",
        alignItems: "start",
        flexWrap: "wrap"
      }}>
        <div>
          <Webcam
            ref={webcamRef}
            audio={true}
            videoConstraints={videoConstraints}
            width={videoConstraints.width}
            height={videoConstraints.height}
            style={{ borderRadius: "18px", border: "4px solid #6366F1", boxShadow: "0 2px 12px #4f46e5b0" }}
            onUserMedia={handleWebcamReady}
          />
          <div style={{ textAlign: "center", fontSize: "1.15rem", color: "#3b82f6", marginTop: "1rem" }}>
            Candidate: <b>{CANDIDATE_NAME}</b>
          </div>
        </div>
        <div style={cardStyle}>
          <h2 style={{ color: "#6366f1", marginBottom: "1.2rem", fontWeight: 600 }}>Live Event Log</h2>
          <ul style={{
            height: 260, overflowY: "auto", marginBottom: 16,
            paddingLeft: 12, fontSize: "1.06rem", color: "#444"
          }}>
            {logs.slice(-15).map((log, i) =>
              <li key={i}>
                <span style={{ fontWeight: 500 }}>{log.type}</span><br />
                <span style={{ color: "#2563eb" }}>{log.time}</span>
              </li>
            )}
            {logs.length === 0 &&
              <div style={{ color: "#aaa", fontStyle: "italic" }}>No events detected yet.</div>
            }
          </ul>
          <div style={{ marginBottom: "1rem" }}>
            {focusState.absent && <div style={{ color: "#ef4444", marginBottom: 5, fontWeight: 600 }}>⚠ No Face {'>'} 10s</div>}
            {focusState.lost && <div style={{ color: "#f59e42", marginBottom: 5, fontWeight: 600 }}>⚠ Not Focused {'>'} 5s</div>}
            {focusState.multiple && <div style={{ color: "#f43f5e", fontWeight: 600 }}>⚠ Multiple Faces</div>}
          </div>
          <hr style={{ margin: "0.5rem 0 1rem 0", border: "1px solid #E5E7EB" }} />
          <div>
            {!recording &&
              <button
                style={!webcamReady ? buttonDisabled : buttonStyle}
                onClick={handleStartRecording}
                disabled={!webcamReady}
              >
                &#9679; Start Recording
              </button>
            }
            {recording &&
              <button style={buttonStyle} onClick={handleStopRecording}>
                &#9632; Stop Recording
              </button>
            }
            <button
              style={recordedChunks.length === 0 ? buttonDisabled : buttonStyle}
              disabled={recordedChunks.length === 0}
              onClick={downloadRecording}
            >
              &#128190; Download Video
            </button>
            <button
              style={logs.length === 0 ? buttonDisabled : buttonStyle}
              disabled={logs.length === 0}
              onClick={downloadReport}
            >
              📄 Download Proctoring Report
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
