import { useRef, useState } from "react";

const AudioRecorder = ({ onRecorded }) => {
  const [recording, setRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  const start = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);
    mediaRecorderRef.current = recorder;
    chunksRef.current = [];
    recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      onRecorded(new File([blob], `recording-${Date.now()}.webm`, { type: "audio/webm" }));
    };
    recorder.start();
    setRecording(true);
  };

  const stop = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  };

  return (
    <div className="flex items-center gap-2">
      {!recording ? (
        <button onClick={start} className="px-3 py-2 rounded bg-indigo-600 text-white">
          Start Recording
        </button>
      ) : (
        <button onClick={stop} className="px-3 py-2 rounded bg-red-600 text-white">
          Stop Recording
        </button>
      )}
    </div>
  );
};

export default AudioRecorder;
