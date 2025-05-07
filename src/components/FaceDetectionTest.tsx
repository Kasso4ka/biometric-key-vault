import React, { useRef, useState, useEffect } from "react";
import faceDetectionService from "../services/FaceDetectionService";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardFooter } from "./ui/card";
import { Alert, AlertDescription } from "./ui/alert";
import * as faceapi from "face-api.js";

const FaceDetectionTest: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isCapturing, setIsCapturing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [faceEmbedding, setFaceEmbedding] = useState<Float32Array | null>(null);
  const [faceBytes, setFaceBytes] = useState<Uint8Array | null>(null);

  useEffect(() => {
    const initModels = async () => {
      try {
        await faceDetectionService.loadModels();
        setIsLoading(false);
      } catch (err) {
        console.error("Error during initialization:", err);
        setError("Failed to load face recognition models");
        setIsLoading(false);
      }
    };

    initModels();
  }, []);

  const startWebcam = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCapturing(true);
      }
    } catch (err) {
      console.error("Camera access error:", err);
      setError("Unable to access camera. Check your browser permissions.");
    }
  };

  const stopWebcam = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      const tracks = stream.getTracks();
      tracks.forEach((track) => track.stop());
      videoRef.current.srcObject = null;
      setIsCapturing(false);
    }
  };

  const captureAndGetEmbedding = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");

    if (!context) return;

    try {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      const embedding = await faceDetectionService.getFaceEmbedding(canvas);

      if (!embedding) {
        setError(
          "No face detected. Please make sure your face is clearly visible in the frame."
        );
        return;
      }

      setFaceEmbedding(embedding);
      const bytes = faceDetectionService.convertEmbeddingToBytes(embedding);
      setFaceBytes(bytes);

      const detections = await faceapi
        .detectSingleFace(canvas, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks();

      if (detections) {
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        const box = detections.detection.box;
        context.beginPath();
        context.lineWidth = 3;
        context.strokeStyle = "green";
        context.rect(box.x, box.y, box.width, box.height);
        context.stroke();
      }
    } catch (err) {
      console.error("Error while processing image:", err);
      setError("An error occurred while processing the image");
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <h2 className="text-xl font-semibold">Тест распознавания лиц</h2>
        <p className="text-gray-500">
          {isLoading
            ? "Загрузка моделей распознавания лиц..."
            : "Модели загружены. Готово к использованию."}
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="relative bg-black aspect-video rounded-md overflow-hidden">
          {!isCapturing && !faceEmbedding && (
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-white text-lg">
                Нажмите "Запустить камеру" для начала
              </p>
            </div>
          )}

          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={isCapturing ? "w-full h-full object-cover" : "hidden"}
          />

          <canvas
            ref={canvasRef}
            className={
              faceEmbedding ? "absolute inset-0 w-full h-full" : "hidden"
            }
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {!isCapturing ? (
            <Button
              onClick={startWebcam}
              disabled={isLoading}
              className="w-full"
            >
              Запустить камеру
            </Button>
          ) : (
            <>
              <Button onClick={captureAndGetEmbedding} className="flex-1">
                Получить эмбеддинг лица
              </Button>

              <Button onClick={stopWebcam} variant="outline" className="flex-1">
                Остановить камеру
              </Button>
            </>
          )}
        </div>

        {faceEmbedding && (
          <div className="space-y-3 mt-4">
            <div>
              <h3 className="font-medium mb-1">
                Эмбеддинг лица (128 значений):
              </h3>
              <div className="bg-gray-100 dark:bg-gray-800 p-2 rounded-md max-h-32 overflow-y-auto">
                <pre className="text-xs">
                  {JSON.stringify(Array.from(faceEmbedding), null, 1)}
                </pre>
              </div>
            </div>

            {faceBytes && (
              <div>
                <h3 className="font-medium mb-1">
                  Байтовое представление (16 байт):
                </h3>
                <div className="bg-gray-100 dark:bg-gray-800 p-2 rounded-md">
                  <pre className="text-xs">
                    Hex:{" "}
                    {Array.from(faceBytes)
                      .map((b) => b.toString(16).padStart(2, "0"))
                      .join(" ")}
                  </pre>
                  <pre className="text-xs">
                    Dec: {Array.from(faceBytes).join(", ")}
                  </pre>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default FaceDetectionTest;
