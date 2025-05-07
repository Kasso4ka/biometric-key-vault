import { useState, useRef, useEffect } from "react";
import * as faceapi from "face-api.js";
import { Button } from "./ui/button";
import faceDetectionService from "@/services/FaceDetectionService";

export default function SaveEmbedding() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [savedEmbeddings, setSavedEmbeddings] = useState<Float32Array[]>([]);
  const [isModelLoaded, setIsModelLoaded] = useState(false);

  useEffect(() => {
    async function loadModels() {
      try {
        await faceDetectionService.loadModels();
        setIsModelLoaded(true);
      } catch (err) {
        console.error("Error during initialization:", err);
      }
    }
    loadModels();
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCapturing(true);
      }
    } catch (err) {
      console.error("Camera access error:", err);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
      setIsCapturing(false);
    }
  };

  const captureEmbedding = async () => {
    if (!videoRef.current || !canvasRef.current || !isModelLoaded) return;

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const detection = await faceapi
        .detectSingleFace(canvas, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detection) {
        alert("No face detected");
        return;
      }

      setSavedEmbeddings((prev) => [...prev, detection.descriptor]);

      ctx.beginPath();
      ctx.lineWidth = 3;
      ctx.strokeStyle = "green";
      const box = detection.detection.box;
      ctx.rect(box.x, box.y, box.width, box.height);
      ctx.stroke();

      console.log("Embedding saved:", detection.descriptor);
    } catch (err) {
      console.error("n error occurred while processing the image:", err);
    }
  };

  const downloadEmbeddings = () => {
    if (savedEmbeddings.length === 0) {
      alert("No saved embeddings");
      return;
    }

    const dataStr = JSON.stringify(savedEmbeddings.map((e) => Array.from(e)));
    const dataUri =
      "data:application/json;charset=utf-8," + encodeURIComponent(dataStr);

    const linkElement = document.createElement("a");
    linkElement.setAttribute("href", dataUri);
    linkElement.setAttribute("download", "face_embeddings.json");
    linkElement.click();
  };

  return (
    <div className="space-y-4">
      <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={isCapturing ? "w-full h-full object-cover" : "hidden"}
        />
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
        {!isCapturing && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-white">Нажмите "Запустить камеру"</p>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {!isCapturing ? (
          <Button onClick={startCamera} disabled={!isModelLoaded}>
            Запустить камеру
          </Button>
        ) : (
          <>
            <Button onClick={captureEmbedding}>Сохранить эмбеддинг</Button>
            <Button variant="outline" onClick={stopCamera}>
              Остановить камеру
            </Button>
          </>
        )}

        <Button
          onClick={downloadEmbeddings}
          disabled={savedEmbeddings.length === 0}
          variant="secondary"
        >
          Скачать эмбеддинги ({savedEmbeddings.length})
        </Button>
      </div>
    </div>
  );
}
