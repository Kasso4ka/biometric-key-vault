import { Camera, Loader2, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader } from "./ui/card";
import { Alert, AlertDescription } from "./ui/alert";
import { useEffect, useRef, useState } from "react";
import { Button } from "./ui/button";

interface WebcamCaptureProps {
  onCapture: (imageData: string, videoElement: HTMLVideoElement) => void;
  buttonText?: string;
  captureButtonText?: string;
  title?: string;
  description?: string;
  loading?: boolean;
  loadingText?: string;
}

const WebcamCapture: React.FC<WebcamCaptureProps> = ({
  onCapture,
  buttonText = "Начать сканирование",
  captureButtonText = "Сделать снимок",
  title = "Биометрический сканер",
  description = "Используйте вашу веб-камеру",
  loading = false,
  loadingText = "Обработка данных...",
}) => {
  const [isCapturing, setIsCapturing] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    return () => {
      stopWebcam();
    };
  }, []);

  const startWebcam = async () => {
    setCameraError(null);
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
      console.error("Error accessing webcam:", err);
      setCameraError(
        "Не удалось получить доступ к камере. Пожалуйста, проверьте разрешения."
      );
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

  const captureImage = () => {
    if (!canvasRef.current || !videoRef.current) return;

    try {
      const context = canvasRef.current.getContext("2d");
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(
          videoRef.current,
          0,
          0,
          canvasRef.current.width,
          canvasRef.current.height
        );

        const imageData = canvasRef.current.toDataURL("image/png");

        onCapture(imageData, videoRef.current);
      }
    } catch (error) {
      console.error("Ошибка при захвате изображения:", error);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Camera className="h-5 w-5" />
          <div>
            <h3 className="text-lg font-semibold">{title}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {description}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="relative aspect-video bg-black flex items-center justify-center">
          {cameraError && (
            <Alert variant="destructive" className="m-4">
              <div>
                <h4 className="font-medium">Ошибка камеры</h4>
                <AlertDescription>{cameraError}</AlertDescription>
              </div>
            </Alert>
          )}

          {!isCapturing && !cameraError && (
            <div className="text-center p-8">
              <Camera className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-gray-400">
                Нажмите кнопку "{buttonText}" для доступа к камере
              </p>
            </div>
          )}

          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover ${
              !isCapturing ? "hidden" : ""
            }`}
          />

          {loading && (
            <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center">
              <Loader2 className="h-12 w-12 text-blue-500 animate-spin mb-4" />
              <p className="text-white text-lg font-medium">{loadingText}</p>
            </div>
          )}

          <canvas ref={canvasRef} className="hidden" />
        </div>
      </CardContent>
      <CardFooter className="flex flex-col gap-4 p-6">
        {!isCapturing ? (
          <Button onClick={startWebcam} className="w-full" disabled={loading}>
            <Camera className="mr-2 h-4 w-4" />
            {buttonText}
          </Button>
        ) : (
          <Button
            onClick={captureImage}
            className="w-full"
            disabled={loading}
            variant="destructive"
          >
            <ShieldCheck className="mr-2 h-4 w-4" />
            {captureButtonText}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};

export default WebcamCapture;
