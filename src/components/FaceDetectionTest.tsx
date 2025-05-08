import React, { useRef, useState, useEffect } from "react";
import faceDetectionService from "../services/FaceDetectionService";
import fuzzyExtractorService from "../services/FuzzyExtractorService";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardFooter } from "./ui/card";
import { Alert, AlertDescription } from "./ui/alert";
import * as faceapi from "face-api.js";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";

const FaceDetectionTest: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isCapturing, setIsCapturing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [faceEmbedding, setFaceEmbedding] = useState<Float32Array | null>(null);
  const [faceBytes, setFaceBytes] = useState<Uint8Array | null>(null);

  const [walletData, setWalletData] = useState<{
    privateKey: string;
    walletAddress: string;
    helperData: string;
  } | null>(null);
  const [restoredWallet, setRestoredWallet] = useState<{
    success: boolean;
    privateKey?: string;
    walletAddress?: string;
    error?: string;
  } | null>(null);
  const [walletLoading, setWalletLoading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>("detect");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const initServices = async () => {
      try {
        setIsLoading(true);
        await faceDetectionService.loadModels();
        await fuzzyExtractorService.initialize();
        setIsLoading(false);
      } catch (err) {
        console.error("Error during initialization:", err);
        setError("Failed to load required models");
        setIsLoading(false);
      }
    };

    initServices();
  }, []);

  const startWebcam = async () => {
    setError(null);
    setSuccessMessage(null);
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

    setError(null);
    setSuccessMessage(null);
    setWalletData(null);
    setRestoredWallet(null);

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

      setSuccessMessage("Лицо успешно распознано и эмбеддинг получен!");
    } catch (err) {
      console.error("Error while processing image:", err);
      setError("An error occurred while processing the image");
    }
  };

  const generateWallet = async () => {
    if (!faceEmbedding) {
      setError("Сначала получите эмбеддинг лица");
      return;
    }

    setError(null);
    setSuccessMessage(null);
    setWalletLoading(true);

    try {
      const wallet = await fuzzyExtractorService.generateWallet(faceEmbedding);

      if (wallet) {
        setWalletData(wallet);
        fuzzyExtractorService.saveHelperData(wallet.helperData);
        setSuccessMessage("Кошелек успешно создан!");
      } else {
        setError("Не удалось создать кошелек");
      }
    } catch (err) {
      console.error("Error generating wallet:", err);
      setError("Произошла ошибка при генерации кошелька");
    } finally {
      setWalletLoading(false);
    }
  };

  const restoreWallet = async () => {
    if (!faceEmbedding) {
      setError("Сначала получите эмбеддинг лица");
      return;
    }

    setError(null);
    setSuccessMessage(null);
    setWalletLoading(true);

    try {
      const helperData = fuzzyExtractorService.getHelperData();

      if (!helperData) {
        setError(
          "Данные для восстановления не найдены. Сначала создайте кошелек."
        );
        setWalletLoading(false);
        return;
      }

      const wallet = await fuzzyExtractorService.restoreWallet(
        faceEmbedding,
        helperData
      );

      setRestoredWallet(wallet);

      if (wallet.success) {
        setSuccessMessage("Кошелек успешно восстановлен!");
      } else {
        setError(`Ошибка восстановления кошелька: ${wallet.error}`);
      }
    } catch (err) {
      console.error("Error restoring wallet:", err);
      setError("Произошла ошибка при восстановлении кошелька");
    } finally {
      setWalletLoading(false);
    }
  };

  const hasStoredWallet = fuzzyExtractorService.hasStoredHelperData();

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <h2 className="text-xl font-semibold">Биометрический криптокошелек</h2>
        <p className="text-gray-500">
          {isLoading
            ? "Загрузка необходимых модулей..."
            : "Система готова к использованию"}
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        <Tabs
          defaultValue="detect"
          onValueChange={setActiveTab}
          value={activeTab}
        >
          <TabsList className="grid grid-cols-3 mb-4">
            <TabsTrigger value="detect">Распознавание</TabsTrigger>
            <TabsTrigger value="generate">Создание кошелька</TabsTrigger>
            <TabsTrigger value="restore">Восстановление</TabsTrigger>
          </TabsList>

          <TabsContent value="detect" className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {successMessage && (
              <Alert
                variant="default"
                className="bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-900"
              >
                <AlertDescription className="text-green-700 dark:text-green-400">
                  {successMessage}
                </AlertDescription>
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
                className={
                  isCapturing ? "w-full h-full object-cover" : "hidden"
                }
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
                    Распознать лицо
                  </Button>

                  <Button
                    onClick={stopWebcam}
                    variant="outline"
                    className="flex-1"
                  >
                    Остановить камеру
                  </Button>
                </>
              )}
            </div>

            {faceEmbedding && (
              <div className="mt-4">
                <div className="flex gap-2 mb-4">
                  <Button
                    onClick={() => setActiveTab("generate")}
                    className="flex-1"
                  >
                    Создать кошелек
                  </Button>
                  <Button
                    onClick={() => setActiveTab("restore")}
                    className="flex-1"
                    disabled={!hasStoredWallet}
                  >
                    Восстановить кошелек
                  </Button>
                </div>

                <div className="space-y-3">
                  <div>
                    <h3 className="font-medium mb-1">Эмбеддинг лица:</h3>
                    <div className="bg-gray-100 dark:bg-gray-800 p-2 rounded-md max-h-32 overflow-y-auto">
                      <pre className="text-xs">
                        {JSON.stringify(
                          Array.from(faceEmbedding).slice(0, 20),
                          null,
                          1
                        )}{" "}
                        ...
                      </pre>
                    </div>
                  </div>

                  {faceBytes && (
                    <div>
                      <h3 className="font-medium mb-1">
                        Байты для генерации ключа:
                      </h3>
                      <div className="bg-gray-100 dark:bg-gray-800 p-2 rounded-md">
                        <pre className="text-xs">
                          Hex:{" "}
                          {Array.from(faceBytes)
                            .map((b) => b.toString(16).padStart(2, "0"))
                            .join(" ")}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="generate" className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {successMessage && (
              <Alert
                variant="default"
                className="bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-900"
              >
                <AlertDescription className="text-green-700 dark:text-green-400">
                  {successMessage}
                </AlertDescription>
              </Alert>
            )}

            {!faceEmbedding ? (
              <div className="text-center py-8">
                <p className="mb-4">Сначала необходимо распознать ваше лицо</p>
                <Button onClick={() => setActiveTab("detect")}>
                  Перейти к распознаванию
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
                  <p className="mb-4">
                    Нажмите кнопку ниже, чтобы создать новый криптокошелек на
                    основе биометрии вашего лица
                  </p>
                  <Button
                    onClick={generateWallet}
                    disabled={walletLoading || !faceEmbedding}
                    className="w-full"
                  >
                    {walletLoading ? "Генерация..." : "Создать кошелек"}
                  </Button>
                </div>

                {walletData && (
                  <div className="space-y-3 p-4 border rounded-lg">
                    <div>
                      <h3 className="font-medium mb-1">Адрес кошелька:</h3>
                      <div className="bg-gray-100 dark:bg-gray-800 p-2 rounded-md break-all">
                        {walletData.walletAddress}
                      </div>
                    </div>
                    <div>
                      <h3 className="font-medium mb-1">Приватный ключ:</h3>
                      <div className="bg-gray-100 dark:bg-gray-800 p-2 rounded-md break-all overflow-auto">
                        {walletData.privateKey}
                      </div>
                    </div>
                    <div>
                      <h3 className="font-medium mb-1">
                        Вспомогательные данные:
                      </h3>
                      <div className="bg-gray-100 dark:bg-gray-800 p-2 rounded-md break-all overflow-auto max-h-20">
                        {walletData.helperData.slice(0, 40)}...
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        *Эти данные сохранены в локальном хранилище браузера для
                        последующего восстановления
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="restore" className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {successMessage && (
              <Alert
                variant="default"
                className="bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-900"
              >
                <AlertDescription className="text-green-700 dark:text-green-400">
                  {successMessage}
                </AlertDescription>
              </Alert>
            )}

            {!faceEmbedding ? (
              <div className="text-center py-8">
                <p className="mb-4">Сначала необходимо распознать ваше лицо</p>
                <Button onClick={() => setActiveTab("detect")}>
                  Перейти к распознаванию
                </Button>
              </div>
            ) : !hasStoredWallet ? (
              <div className="text-center py-8">
                <p className="mb-4">
                  В локальном хранилище не найдены данные для восстановления
                  кошелька
                </p>
                <Button onClick={() => setActiveTab("generate")}>
                  Создать новый кошелек
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
                  <p className="mb-4">
                    Восстановите доступ к вашему криптокошельку с помощью
                    биометрии лица
                  </p>
                  <Button
                    onClick={restoreWallet}
                    disabled={walletLoading || !faceEmbedding}
                    className="w-full"
                  >
                    {walletLoading
                      ? "Восстановление..."
                      : "Восстановить кошелек"}
                  </Button>
                </div>

                {restoredWallet && restoredWallet.success && (
                  <div className="space-y-3 p-4 border rounded-lg">
                    <div>
                      <h3 className="font-medium mb-1">Адрес кошелька:</h3>
                      <div className="bg-gray-100 dark:bg-gray-800 p-2 rounded-md break-all">
                        {restoredWallet.walletAddress}
                      </div>
                    </div>
                    <div>
                      <h3 className="font-medium mb-1">Приватный ключ:</h3>
                      <div className="bg-gray-100 dark:bg-gray-800 p-2 rounded-md break-all overflow-auto">
                        {restoredWallet.privateKey}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default FaceDetectionTest;
