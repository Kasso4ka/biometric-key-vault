import { Copy, Download, Key } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader } from "../ui/card";
import { useState } from "react";
import { Label } from "../ui/label";
import { Button } from "../ui/button";
import WebcamCapture from "../WebCamera";

interface WalletData {
  privateKey: string;
  walletAddress: string;
  helperData: string;
}

const Generate: React.FC = ({}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [walletData, setWalletData] = useState<WalletData | null>(null);

  const handleCapture = async (
    imageData: string,
    videoElement: HTMLVideoElement
  ) => {
    setIsGenerating(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      setWalletData({
        privateKey:
          "0x4a8c23f13bcf372b4c981a1a5c5d4c67405927c0df8fe48d8313b6d56d0ba008",
        walletAddress: "0x87D2914a95f86CB1d17d4e2125EF0Bc42FFC3267",
        helperData:
          "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJiaW9tZXRyaWNIYXNoIjoiMHg4NjVhNTYiLCJleHAiOjE3MTkwNTQ1NjB9",
      });
    } catch (error) {
      console.error("Ошибка генерации ключа:", error);
    } finally {
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
    <div className="grid gap-8 md:grid-cols-[1fr_400px]">
      <div className="animate-fade-in-scale">
        <WebcamCapture onCapture={handleCapture} loading={isGenerating} />
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
              <div className="w-full">
                <Button onClick={downloadHelperData} className="w-full">
                  <Download className="mr-2 h-4 w-4" />
                  Скачать вспомогательные данные в виде файла
                </Button>
                <Button onClick={saveHelperDataInDb} className="w-full">
                  <Download className="mr-2 h-4 w-4" />
                  Сохранить вспомогательные данные в базе данных для
                  восстановления по адресу кошелька
                </Button>
              </div>
            )}
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default Generate;
