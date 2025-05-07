import {
  Camera,
  Copy,
  Download,
  Key,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader } from "../ui/card";
import { Alert, AlertDescription } from "../ui/alert";
import { useRef, useState } from "react";
import { Label } from "../ui/label";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { Button } from "../ui/button";

interface WalletData {
  privateKey: string;
  walletAddress: string;
  helperData: string;
}

const Generate: React.FC = ({}) => {
  const [isCapturing, setIsCapturing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [storageMethod, setStorageMethod] = useState("file");
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [walletData, setWalletData] = useState<WalletData | null>(null);

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

  // Stop webcam stream
  const stopWebcam = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      const tracks = stream.getTracks();
      tracks.forEach((track) => track.stop());
      videoRef.current.srcObject = null;
      setIsCapturing(false);
    }
  };

  // Capture frame and generate key
  const captureAndGenerate = async () => {
    if (!canvasRef.current || !videoRef.current) return;

    setIsGenerating(true);

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
      }
    } catch (error) {
      console.error("Error generating key:", error);
    } finally {
      setIsGenerating(false);
      stopWebcam();
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
  };

  const downloadHelperData = () => {
    if (!walletData) return;

    const element = document.createElement("a");

    const file = new Blob(
      [
        JSON.stringify(
          {
            walletAddress: walletData.walletAddress,
            helperData: walletData.helperData,
          },
          null,
          2
        ),
      ],
      { type: "application/json" }
    );

    element.href = URL.createObjectURL(file);
    element.download = `wallet-helper-${walletData.walletAddress.substring(
      0,
      8
    )}.json`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="grid gap-8 md:grid-cols-[1fr_400px]">
      <div className="animate-fade-in-scale">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              <div>
                <h3 className="text-lg font-semibold">Биометрический сканер</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Используйте вашу веб-камеру для создания уникального
                  криптокошелька
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
                    Нажмите кнопку "Начать сканирование" для доступа к камере
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

              {isGenerating && (
                <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center">
                  <Loader2 className="h-12 w-12 text-blue-500 animate-spin mb-4" />
                  <p className="text-white text-lg font-medium">
                    Анализ биометрических данных...
                  </p>
                </div>
              )}

              <canvas ref={canvasRef} className="hidden" />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4 p-6">
            <div className="w-full">
              <Label className="mb-2 block">
                Сохранение вспомогательных данных
              </Label>
              <RadioGroup
                value={storageMethod}
                onValueChange={setStorageMethod}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="file" id="file" />
                  <Label htmlFor="file">Скачать файл</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="database" id="database" />
                  <Label htmlFor="database">Сохранить в базе</Label>
                </div>
              </RadioGroup>
            </div>

            {!isCapturing ? (
              <Button
                onClick={startWebcam}
                className="w-full"
                disabled={isGenerating}
              >
                <Camera className="mr-2 h-4 w-4" />
                Начать сканирование
              </Button>
            ) : (
              <Button
                onClick={captureAndGenerate}
                className="w-full"
                disabled={isGenerating}
                variant="destructive"
              >
                <ShieldCheck className="mr-2 h-4 w-4" />
                Сгенерировать кошелек
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>

      <div className="animate-fade-in-slide">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              <div>
                <h3 className="text-lg font-semibold">Данные кошелька</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Информация о вашем криптокошельке
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm text-gray-500 dark:text-gray-400 mb-1 block">
                Приватный ключ
              </Label>
              <div className="relative">
                <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-md font-mono text-sm break-all min-h-[60px] flex items-center">
                  {walletData ? (
                    <span className="animate-fade-in">
                      {walletData.privateKey}
                    </span>
                  ) : (
                    <span className="text-gray-400">
                      Приватный ключ появится здесь
                    </span>
                  )}
                </div>
                {walletData && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="absolute right-2 top-2"
                    onClick={() =>
                      copyToClipboard(walletData.privateKey, "Приватный ключ")
                    }
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            <div>
              <Label className="text-sm text-gray-500 dark:text-gray-400 mb-1 block">
                Адрес кошелька
              </Label>
              <div className="relative">
                <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-md font-mono text-sm break-all min-h-[60px] flex items-center">
                  {walletData ? (
                    <span className="animate-fade-in">
                      {walletData.walletAddress}
                    </span>
                  ) : (
                    <span className="text-gray-400">
                      Адрес кошелька появится здесь
                    </span>
                  )}
                </div>
                {walletData && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="absolute right-2 top-2"
                    onClick={() =>
                      copyToClipboard(
                        walletData.walletAddress,
                        "Адрес кошелька"
                      )
                    }
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
          <CardFooter>
            {storageMethod === "file" && walletData && (
              <Button onClick={downloadHelperData} className="w-full">
                <Download className="mr-2 h-4 w-4" />
                Скачать вспомогательные данные
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default Generate;
