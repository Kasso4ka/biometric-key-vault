import { Copy, ShieldCheck } from "lucide-react";
import { Card, CardContent } from "../ui/card";
import { useState, useEffect, useCallback } from "react";
import NoFuzzyWebCamera from "../NoFuzzyWebCamera";
import { Alert, AlertDescription } from "../ui/alert";
import { Button } from "../ui/button";
import noFuzzyFaceToMnemonicService from "@/services/NoFuzzyFaceToMnemonicService";

const GenerateOrRecover: React.FC = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [mnemonic, setMnemonic] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recordedFramesCount, setRecordedFramesCount] = useState(0);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isServiceReady, setIsServiceReady] = useState(false);

  // Инициализация WASM сервиса
  useEffect(() => {
    let mounted = true;

    const initService = async () => {
      try {
        console.log("Initializing service from component...");
        const result = await noFuzzyFaceToMnemonicService.initialize();
        console.log("Service initialization result:", result);
        if (mounted) {
          setIsServiceReady(result);
        }
      } catch (err) {
        console.error("Error initializing service from component:", err);
        if (mounted) {
          setError(
            "Ошибка инициализации модуля обработки видео. Пожалуйста, обновите страницу."
          );
        }
      }
    };

    initService();

    return () => {
      mounted = false;
    };
  }, []);

  // Обработчик получения кадра из NoFuzzyWebCamera
  const handleFrameReceived = useCallback(
    async (imageData: string, frameIndex: number) => {
      // console.log(`Frame received: ${frameIndex}`);

      // Обновляем счетчик кадров
      setRecordedFramesCount(frameIndex + 1);

      // Отправляем кадр в WASM модуль
      try {
        await noFuzzyFaceToMnemonicService.processVideoFrame(
          imageData,
          frameIndex
        );
      } catch (err: any) {
        console.error("Error processing video frame:", err);
        setError(`Ошибка обработки кадра ${frameIndex}: ${err.message}`);
      }
    },
    []
  );

  // Обработчик окончания записи
  const handleRecordingComplete = useCallback(async () => {
    console.log("Recording complete, generating mnemonic...");

    setIsProcessing(true);
    setError(null);
    setSuccessMessage(null);

    try {
      // Получаем мнемоник из WASM модуля
      const generatedMnemonic =
        await noFuzzyFaceToMnemonicService.generateMnemonic();
      console.log("Mnemonic generated:", generatedMnemonic);

      setMnemonic(generatedMnemonic);
      setSuccessMessage("Мнемоническая фраза успешно сгенерирована!");
    } catch (err: any) {
      console.error("Error generating mnemonic:", err);
      setError(`Ошибка генерации мнемонической фразы: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  }, []);

  // Функция копирования в буфер обмена
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setSuccessMessage("Мнемоническая фраза скопирована в буфер обмена!");
    setTimeout(() => {
      if (
        successMessage === "Мнемоническая фраза скопирована в буфер обмена!"
      ) {
        setSuccessMessage(null);
      }
    }, 3000);
  };

  return (
    <div>
      <div className="animate-fade-in-slide">
        <Card className="mt-2 mb-4">
          <CardContent>
            <h2 className="text-xl font-semibold mb-2">
              Генерация мнемонической фразы
            </h2>
            <p className="mb-2">
              Запишите короткое видео с вашей камеры для создания мнемонической
              фразы. Весь процесс происходит полностью офлайн, в вашем браузере,
              без отправки данных на сервер.
            </p>
            <p>
              <strong>Как это работает:</strong> Система запишет 150 кадров с
              вашей камеры, проанализирует их и на основе уникальных
              характеристик сгенерирует мнемоническую фразу для криптовалютного
              кошелька. Сохраните эту фразу в надежном месте - она является
              ключом к вашим средствам.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-8 md:grid-cols-[1fr_50%]">
        <div className="animate-fade-in-scale">
          <NoFuzzyWebCamera
            maxFrames={150}
            onFrameReceived={handleFrameReceived}
            onRecordingComplete={handleRecordingComplete}
            loading={isProcessing}
            title="Запись кадров"
            description="Используйте вашу веб-камеру для создания мнемонической фразы"
            recordingButtonText="Начать захват кадров"
            stopRecordingText="Остановить захват"
            disabled={!isServiceReady}
            disabledText="Инициализация модуля обработки..."
          />

          {recordedFramesCount > 0 && recordedFramesCount < 150 && (
            <div className="mt-2 text-center">
              <p className="text-sm">
                Получено кадров: {recordedFramesCount} / 150
              </p>
              <div className="w-full bg-gray-200 dark:bg-gray-700 h-2 mt-1 rounded-full overflow-hidden">
                <div
                  className="bg-blue-500 h-full transition-all duration-300 ease-in-out"
                  style={{ width: `${(recordedFramesCount / 150) * 100}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>

        <div className="animate-fade-in-slide">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <ShieldCheck className="h-5 w-5" />
                <h3 className="text-lg font-semibold">Мнемоническая фраза</h3>
              </div>

              <div className="mb-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Ваша мнемоническая фраза - это секретный ключ к вашему
                  криптокошельку. Сохраните её в надежном месте и никому не
                  показывайте.
                </p>
              </div>

              <div className="relative">
                <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-md font-mono text-sm break-all min-h-[100px] flex items-center justify-between">
                  {mnemonic ? (
                    <div className="animate-fade-in w-full">{mnemonic}</div>
                  ) : (
                    <span className="text-gray-400 w-full text-center">
                      Мнемоническая фраза появится здесь после записи видео
                    </span>
                  )}

                  {mnemonic && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="ml-2 flex-shrink-0"
                      onClick={() => copyToClipboard(mnemonic)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>

              <div className="mt-4 bg-amber-50 dark:bg-amber-900/20 p-4 rounded-md border border-amber-200 dark:border-amber-800">
                <p className="font-medium mb-2">Важная информация:</p>
                <ul className="list-disc pl-5 space-y-1 text-sm">
                  <li>Никогда не делитесь своей мнемонической фразой</li>
                  <li>Запишите её на бумаге и храните в безопасном месте</li>
                  <li>Все вычисления происходят только в вашем браузере</li>
                  <li>Мы не храним вашу мнемоническую фразу или видеоданные</li>
                </ul>
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

export default GenerateOrRecover;
