import { Copy, Download, Key } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader } from "../ui/card";
import { useState } from "react";
import { Label } from "../ui/label";
import { Button } from "../ui/button";
import WebcamCapture from "../WebCamera";
import faceDetectionService from "@/services/FaceDetectionService";
import fuzzyExtractorService from "../../services/FuzzyExtractorService";
import { Alert, AlertDescription } from "../ui/alert";

interface WalletData {
  privateKey: string;
  walletAddress: string;
  helperData: string;
}

const Restore: React.FC = ({}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleCapture = async (
    imageData: string,
    videoElement: HTMLVideoElement
  ) => {
    setError(null);
    setSuccessMessage(null);
    setWalletData(null);
    setIsGenerating(true);

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
            setIsGenerating(false);
            return;
          }

          const wallet = await fuzzyExtractorService.generateWallet(embedding);

          if (wallet) {
            setWalletData(wallet);
            fuzzyExtractorService.saveHelperData(wallet.helperData);
            setSuccessMessage("Кошелек успешно создан!");
          } else {
            setError("Не удалось создать кошелек");
          }
        } catch (err) {
          console.error("Error processing image and generating wallet:", err);
          setError(
            "Произошла ошибка при обработке изображения и генерации кошелька"
          );
        } finally {
          setIsGenerating(false);
        }
      };

      img.src = imageData;
    } catch (err) {
      console.error("Error in handleCapture:", err);
      setError("Произошла ошибка при захвате изображения");
      setIsGenerating(false);
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

  const saveHelperDataInDb = () => {
    console.log("Helper data saved!");
  };

  return (
    <div>
      <Card className="mt-2 mb-4">
        <CardContent>Информация о сервисе </CardContent>
      </Card>
      <div className="grid gap-8 md:grid-cols-[1fr_400px]">
        <div className="animate-fade-in-scale">
          <WebcamCapture onCapture={handleCapture} loading={isGenerating} />
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
              {walletData && (
                <div className="w-full flex flex-col gap-4 ">
                  <Button onClick={downloadHelperData} className="w-full">
                    <Download className="mr-2 h-4 w-4" />
                    Скачать helper data
                  </Button>
                  <Button onClick={saveHelperDataInDb} className="w-full">
                    Сохранить helper data в БД
                  </Button>
                </div>
              )}
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Restore;
