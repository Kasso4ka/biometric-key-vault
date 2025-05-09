import { Copy, Key, Search } from "lucide-react";
import { Card, CardContent, CardHeader } from "../ui/card";
import { useState } from "react";
import { Label } from "../ui/label";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import WebcamCapture from "../WebCamera";
import faceDetectionService from "@/services/FaceDetectionService";
import fuzzyExtractorService from "../../services/FuzzyExtractorService";
import { Alert, AlertDescription } from "../ui/alert";
import { getWalletData } from "@/utils/API";

interface WalletData {
  privateKey: string;
  walletAddress: string;
  helperData?: string;
}

interface HelperData {
  walletAddress: string;
  helperData: string;
}

const RestoreFromDB: React.FC = () => {
  const [isRestoring, setIsRestoring] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [helperData, setHelperData] = useState<HelperData | null>(null);
  const [walletAddress, setWalletAddress] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleAddressSearch = async () => {
    if (!walletAddress) {
      setError("Пожалуйста, введите адрес кошелька");
      return;
    }

    setError(null);
    setSuccessMessage(null);
    setHelperData(null);
    setIsSearching(true);

    try {
      const data = await getWalletData(walletAddress);

      if (!data) {
        setError(
          `Helper data для кошелька ${walletAddress.substring(
            0,
            8
          )}... не найдена в базе данных`
        );
        setIsSearching(false);
        return;
      }

      setHelperData({
        walletAddress: data.address,
        helperData: data.helperData,
      });

      setSuccessMessage(
        `Данные кошелька ${data.address.substring(
          0,
          8
        )}... успешно загружены из базы данных`
      );
    } catch (err) {
      console.error("Error fetching helper data:", err);
      setError("Произошла ошибка при поиске данных кошелька");
    } finally {
      setIsSearching(false);
    }
  };

  const handleCapture = async (
    imageData: string,
    videoElement: HTMLVideoElement
  ) => {
    if (!helperData) {
      setError(
        "Пожалуйста, найдите вспомогательные данные перед восстановлением"
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

  const resetSearch = () => {
    setWalletAddress("");
    setHelperData(null);
    setSuccessMessage(null);
    setError(null);
    setWalletData(null);
  };

  return (
    <div>
      <div className="animate-fade-in-slide">
        <Card className="mt-2 mb-4">
          <CardContent>
            <h2 className="text-xl font-semibold mb-2">
              Восстановление кошелька из базы данных
            </h2>
            <p>
              Для восстановления доступа введите адрес кошелька, чтобы найти
              вспомогательные данные в базе, а затем отсканируйте ваше лицо.
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
              disabledText="Найдите данные кошелька в базе перед сканированием"
            />
          </div>
        </div>

        <div className="animate-fade-in-slide flex flex-col gap-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                <div>
                  <h3 className="text-lg font-semibold">
                    Поиск данных кошелька
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Введите адрес кошелька для поиска в базе данных
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label
                    htmlFor="wallet-address"
                    className="text-sm block mb-2"
                  >
                    Адрес кошелька
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="wallet-address"
                      type="text"
                      value={walletAddress}
                      onChange={(e) => setWalletAddress(e.target.value)}
                      placeholder="0x..."
                      className="flex-1"
                    />
                    {walletAddress && (
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={resetSearch}
                        title="Сбросить"
                      >
                        ✕
                      </Button>
                    )}
                  </div>

                  <div className="mt-4">
                    <Button
                      onClick={handleAddressSearch}
                      className="w-full"
                      disabled={!walletAddress || isSearching}
                    >
                      {isSearching ? (
                        <span className="flex items-center">
                          <svg
                            className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            ></circle>
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            ></path>
                          </svg>
                          Поиск...
                        </span>
                      ) : (
                        <span className="flex items-center">
                          <Search className="mr-2 h-4 w-4" />
                          Найти данные кошелька
                        </span>
                      )}
                    </Button>
                  </div>

                  {helperData && (
                    <p className="text-xs text-green-600 dark:text-green-400 mt-2">
                      Данные для кошелька{" "}
                      {helperData.walletAddress.substring(0, 8)}... найдены в
                      базе
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
                        Приватный ключ появится здесь
                      </span>
                    )}
                    {walletData && (
                      <Button
                        size="sm"
                        variant="ghost"
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

export default RestoreFromDB;
