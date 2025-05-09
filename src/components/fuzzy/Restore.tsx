import { Copy, Key, Upload } from "lucide-react";
import { Card, CardContent, CardHeader } from "../ui/card";
import { useState, useRef } from "react";
import { Label } from "../ui/label";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import WebcamCapture from "../WebCamera";
import faceDetectionService from "@/services/FaceDetectionService";
import fuzzyExtractorService from "../../services/FuzzyExtractorService";
import { Alert, AlertDescription } from "../ui/alert";

interface WalletData {
  privateKey: string;
  walletAddress: string;
  helperData?: string;
}

interface HelperData {
  walletAddress: string;
  helperData: string;
}

const Restore: React.FC = () => {
  const [isRestoring, setIsRestoring] = useState(false);
  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [helperData, setHelperData] = useState<HelperData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [helperFileName, setHelperFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setHelperFileName(file.name);
    setError(null);

    try {
      const text = await file.text();
      const data = JSON.parse(text) as HelperData;

      if (!data.walletAddress || !data.helperData) {
        throw new Error(
          "Неверный формат файла. Отсутствуют необходимые данные."
        );
      }

      setHelperData(data);
      setSuccessMessage(
        `Данные кошелька ${data.walletAddress.substring(
          0,
          8
        )}... успешно загружены`
      );
    } catch (err) {
      console.error("Error parsing helper data file:", err);
      setError("Не удалось прочитать файл с вспомогательными данными");
      setHelperData(null);
      setHelperFileName(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleCapture = async (
    imageData: string,
    videoElement: HTMLVideoElement
  ) => {
    if (!helperData) {
      setError(
        "Пожалуйста, загрузите файл с вспомогательными данными перед восстановлением"
      );
      return;
    }

    setError(null);
    setSuccessMessage(null);
    setWalletData(null);
    setIsRestoring(true);

    try {
      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = videoElement.videoWidth;
      tempCanvas.height = videoElement.videoHeight;
      const context = tempCanvas.getContext("2d");

      if (!context) {
        throw new Error("Could not get canvas context");
      }

      const img = new Image();

      img.onload = async () => {
        context.drawImage(img, 0, 0, tempCanvas.width, tempCanvas.height);

        try {
          const embedding = await faceDetectionService.getFaceEmbedding(
            tempCanvas
          );

          if (!embedding) {
            setError(
              "Лицо не обнаружено. Убедитесь, что ваше лицо чётко видно в кадре."
            );
            setIsRestoring(false);
            return;
          }

          const restoredWallet = await fuzzyExtractorService.restoreWallet(
            embedding,
            helperData.helperData
          );

          if (
            restoredWallet.success &&
            restoredWallet.privateKey &&
            restoredWallet.walletAddress
          ) {
            setWalletData({
              privateKey: restoredWallet.privateKey,
              walletAddress: restoredWallet.walletAddress,
            });
            setSuccessMessage("Кошелек успешно восстановлен!");
          } else {
            setError(
              "Не удалось восстановить кошелек. Возможно, лицо не соответствует или данные повреждены."
            );
          }
        } catch (err) {
          console.error("Error processing image and restoring wallet:", err);
          setError(
            "Произошла ошибка при обработке изображения и восстановлении кошелька"
          );
        } finally {
          setIsRestoring(false);
        }
      };

      img.src = imageData;
    } catch (err) {
      console.error("Error in handleCapture:", err);
      setError("Произошла ошибка при захвате изображения");
      setIsRestoring(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const resetHelperData = () => {
    setHelperData(null);
    setHelperFileName(null);
    setSuccessMessage(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div>
      <div className="animate-fade-in-slide">
        <Card className="mt-2 mb-4">
          <CardContent>
            <h2 className="text-xl font-semibold mb-2">
              Восстановление кошелька
            </h2>
            <p>
              Для восстановления доступа к кошельку загрузите файл с
              вспомогательными данными и затем отсканируйте ваше лицо.
            </p>
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-8 md:grid-cols-[1fr_50%]">
        <div className="space-y-6">
          <div className="animate-fade-in-scale">
            <WebcamCapture
              onCapture={handleCapture}
              loading={isRestoring}
              title="Биометрический сканер для восстановления"
              description="Используйте вашу веб-камеру для восстановления доступа к кошельку"
              buttonText="Начать сканирование"
              captureButtonText="Восстановить кошелек"
              loadingText="Восстановление кошелька..."
              disabled={!helperData}
              disabledText="Загрузите файл с helper data перед сканированием"
            />
          </div>
        </div>

        <div className="animate-fade-in-slide flex flex-col gap-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                <div>
                  <h3 className="text-lg font-semibold">
                    Вспомогательные данные
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Загрузите файл с вспомогательными данными
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="helper-file" className="text-sm block mb-2">
                    JSON файл с вспомогательными данными
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="helper-file"
                      ref={fileInputRef}
                      type="file"
                      accept=".json"
                      onChange={handleFileUpload}
                      className="flex-1"
                    />
                    {helperFileName && (
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={resetHelperData}
                        title="Сбросить"
                      >
                        ✕
                      </Button>
                    )}
                  </div>

                  {helperFileName && (
                    <p className="text-xs text-gray-500 mt-2">
                      Загружен файл: {helperFileName}
                    </p>
                  )}

                  {helperData && (
                    <p className="text-xs text-green-600 dark:text-green-400 mt-2">
                      Адрес кошелька: {helperData.walletAddress}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                <div>
                  <h3 className="text-lg font-semibold">Данные кошелька</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Информация о восстановленном криптокошельке
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm text-gray-500 dark:text-gray-400 mb-1 block">
                  Приватный ключ
                </Label>
                <div className="">
                  <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-md font-mono text-sm break-all min-h-[60px] flex items-center justify-between">
                    {walletData ? (
                      <span className="animate-fade-in">
                        {walletData.privateKey}
                      </span>
                    ) : (
                      <span className="text-gray-400">
                        Приватный ключ появится
                      </span>
                    )}
                    {walletData && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="right-2 top-2"
                        onClick={() => copyToClipboard(walletData.privateKey)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <Label className="text-sm text-gray-500 dark:text-gray-400 mb-1 block">
                  Адрес кошелька
                </Label>
                <div className="relative">
                  <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-md font-mono text-sm break-all min-h-[60px] flex items-center justify-between">
                    {walletData ? (
                      <span className="animate-fade-in">
                        {walletData.walletAddress}
                      </span>
                    ) : (
                      <span className="text-gray-400">
                        Адрес кошелька появится здесь
                      </span>
                    )}
                    {walletData && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="right-2 top-2"
                        onClick={() =>
                          copyToClipboard(walletData.walletAddress)
                        }
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {successMessage && (
            <Alert
              variant="default"
              className="mt-4 bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800"
            >
              <AlertDescription>{successMessage}</AlertDescription>
            </Alert>
          )}
        </div>
      </div>
    </div>
  );
};

export default Restore;
