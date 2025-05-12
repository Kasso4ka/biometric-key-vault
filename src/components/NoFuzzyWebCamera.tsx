import { Camera, Loader2, ShieldCheck, Video, StopCircle } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader } from "./ui/card";
import { Alert, AlertDescription } from "./ui/alert";
import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "./ui/button";

interface NoFuzzyWebCameraProps {
  buttonText?: string;
  recordingButtonText?: string;
  stopRecordingText?: string;
  title?: string;
  description?: string;
  loading?: boolean;
  loadingText?: string;
  disabled?: boolean;
  disabledText?: string;
  maxRecordingTimeMs?: number; // максимальное время записи в миллисекундах
  maxFrames?: number; // максимальное количество кадров для захвата
  onFrameReceived?: (imageData: string, frameIndex: number) => void; // колбэк получения кадра
  onRecordingComplete?: () => void; // колбэк завершения записи
}

const NoFuzzyWebCamera: React.FC<NoFuzzyWebCameraProps> = ({
  buttonText = "Начать сканирование",
  recordingButtonText = "Начать запись",
  stopRecordingText = "Остановить запись",
  title = "Запись видео",
  description = "Используйте вашу веб-камеру для записи видео",
  loading = false,
  loadingText = "Обработка данных...",
  disabled = false,
  disabledText = "Функция недоступна",
  maxRecordingTimeMs = 20000, // 10 секунд по умолчанию
  maxFrames = 150, // 150 кадров по умолчанию
  onFrameReceived = () => {}, // пустая функция по умолчанию
  onRecordingComplete = () => {}, // пустая функция по умолчанию
}) => {
  const [isCapturing, setIsCapturing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturedFrames, setCapturedFrames] = useState(0);
  const [browserSupport, setBrowserSupport] = useState<{
    canvas: boolean;
    getUserMedia: boolean;
  }>({
    canvas: false,
    getUserMedia: false,
  });

  // Проверяем поддержку браузером
  useEffect(() => {
    setBrowserSupport({
      canvas: !!document.createElement("canvas").getContext("2d"),
      getUserMedia: !!(
        navigator.mediaDevices && navigator.mediaDevices.getUserMedia
      ),
    });
  }, []);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const frameCountRef = useRef<number>(0);
  const isCapturingRef = useRef<boolean>(false);
  const completedRef = useRef<boolean>(false);

  // Используем useCallback для onRecordingCompletedHandler, чтобы избежать лишних вызовов
  const onRecordingCompletedHandler = useCallback(() => {
    // Проверяем, не был ли уже вызван колбэк
    if (completedRef.current) return;

    // Устанавливаем флаг, что колбэк был вызван
    completedRef.current = true;

    console.log(
      `Calling onRecordingComplete with ${frameCountRef.current} frames`
    );

    // Вызываем колбэк завершения записи
    onRecordingComplete();
  }, [onRecordingComplete]);

  useEffect(() => {
    return () => {
      stopWebcam();
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const startWebcam = async () => {
    setCameraError(null);
    try {
      // Сбрасываем флаг завершения
      completedRef.current = false;

      // Запрашиваем доступ к устройствам
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsCapturing(true);

        // Проверяем, есть ли видеодорожки в потоке
        const videoTracks = stream.getVideoTracks();
        if (videoTracks.length === 0) {
          throw new Error("Не удалось получить доступ к видеопотоку");
        }

        console.log("Запущена камера:", videoTracks[0].label);
      }
    } catch (err: any) {
      console.error("Error accessing webcam:", err);

      let errorMessage =
        "Не удалось получить доступ к камере. Пожалуйста, проверьте разрешения.";

      // Специфичные сообщения об ошибках
      if (
        err.name === "NotAllowedError" ||
        err.name === "PermissionDeniedError"
      ) {
        errorMessage =
          "Доступ к камере отклонен. Пожалуйста, разрешите доступ в настройках браузера.";
      } else if (
        err.name === "NotFoundError" ||
        err.name === "DevicesNotFoundError"
      ) {
        errorMessage =
          "Камера не найдена. Пожалуйста, подключите веб-камеру и обновите страницу.";
      } else if (
        err.name === "NotReadableError" ||
        err.name === "TrackStartError"
      ) {
        errorMessage =
          "Камера уже используется другим приложением. Закройте его и попробуйте снова.";
      } else if (err.name === "OverconstrainedError") {
        errorMessage =
          "Заданные параметры камеры не поддерживаются вашим устройством.";
      } else if (err.message) {
        errorMessage = err.message;
      }

      setCameraError(errorMessage);
    }
  };

  const stopWebcam = () => {
    if (streamRef.current) {
      const tracks = streamRef.current.getTracks();
      tracks.forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setIsCapturing(false);

    if (isRecording) {
      stopFrameCapture();
    }
  };

  const startFrameCapture = () => {
    if (!streamRef.current || !videoRef.current) return;

    // Сбрасываем флаг завершения при старте новой записи
    completedRef.current = false;

    setRecordingTime(0);
    setCapturedFrames(0);
    frameCountRef.current = 0;
    setIsRecording(true);
    isCapturingRef.current = true;

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      setCameraError("Не удалось создать контекст canvas для захвата кадров");
      isCapturingRef.current = false;
      setIsRecording(false);
      return;
    }

    const video = videoRef.current;

    // Ожидаем, пока видео полностью загрузится для получения правильных размеров
    const checkVideoReady = () => {
      if (video.videoWidth > 0 && video.videoHeight > 0) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        startCapturingFrames(canvas, ctx, video);
      } else {
        setTimeout(checkVideoReady, 100);
      }
    };

    checkVideoReady();
  };

  const startCapturingFrames = (
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D,
    video: HTMLVideoElement
  ) => {
    console.log(
      `Starting frame capture: Canvas size ${canvas.width}x${canvas.height}`
    );

    // Запускаем таймер для отображения времени записи и захвата кадров
    timerRef.current = setInterval(() => {
      if (!isCapturingRef.current) return;

      setRecordingTime((prev) => {
        const newTime = prev + 100;
        if (newTime >= maxRecordingTimeMs) {
          stopFrameCapture();
        }
        return newTime;
      });

      // Захватываем кадр
      if (frameCountRef.current < maxFrames && isCapturingRef.current) {
        try {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageData = canvas.toDataURL("image/jpeg", 0.8); // JPEG для уменьшения размера

          // Увеличиваем счетчик перед отправкой кадра
          const currentFrame = frameCountRef.current;
          frameCountRef.current = currentFrame + 1;

          // Безопасно обновляем состояние React
          // Это обновление не должно вызывать побочных эффектов
          setCapturedFrames(currentFrame + 1);

          // Отправляем кадр через колбэк после обновления счетчиков
          onFrameReceived(imageData, currentFrame);

          console.log(`Captured frame ${currentFrame + 1}/${maxFrames}`);

          // Если достигли максимального числа кадров, останавливаем захват
          if (currentFrame + 1 >= maxFrames) {
            console.log(`Reached max frames (${maxFrames}), stopping capture`);
            stopFrameCapture();
          }
        } catch (err) {
          console.error("Ошибка при захвате кадра:", err);
          setCameraError("Ошибка при захвате кадра. Проверьте работу камеры.");
          stopFrameCapture();
        }
      }
    }, 100); // захватываем кадр каждые 100 мс (~ 10 FPS)
  };

  const stopFrameCapture = () => {
    console.log(
      `Stopping frame capture, captured ${frameCountRef.current} frames`
    );

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    isCapturingRef.current = false;
    setIsRecording(false);

    // Если запись была остановлена и были захвачены кадры
    if (frameCountRef.current > 0) {
      // Используем setTimeout, чтобы избежать обновления состояния во время рендеринга
      setTimeout(() => {
        onRecordingCompletedHandler();
      }, 100);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Video className="h-5 w-5" />
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
                {`Нажмите кнопку "${buttonText}" для доступа к камере`}
              </p>
            </div>
          )}

          {/* Отображение видео с камеры */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover ${
              !isCapturing ? "hidden" : ""
            }`}
          />

          {/* Индикатор записи */}
          {isRecording && (
            <div className="absolute top-2 right-2 bg-red-600 text-white px-3 py-1 rounded-full flex items-center gap-2">
              <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
              <span>
                Кадр {capturedFrames} / {maxFrames}
              </span>
            </div>
          )}

          {loading && (
            <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center">
              <Loader2 className="h-12 w-12 text-blue-500 animate-spin mb-4" />
              <p className="text-white text-lg font-medium">{loadingText}</p>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex flex-col gap-4 p-6">
        {!isCapturing ? (
          <Button
            onClick={startWebcam}
            className="w-full"
            disabled={loading || disabled}
          >
            <Camera className="mr-2 h-4 w-4" />
            {buttonText}
          </Button>
        ) : isCapturing && !isRecording ? (
          <Button
            onClick={startFrameCapture}
            className="w-full"
            disabled={loading || disabled}
          >
            <Video className="mr-2 h-4 w-4" />
            {recordingButtonText}
          </Button>
        ) : isCapturing && isRecording ? (
          <Button
            onClick={stopFrameCapture}
            variant="destructive"
            className="w-full"
            disabled={loading || disabled || capturedFrames < maxFrames}
          >
            <StopCircle className="mr-2 h-4 w-4" />
            {stopRecordingText}
          </Button>
        ) : null}

        {disabled && (
          <p className="text-xs text-amber-600 dark:text-amber-400 text-center">
            {disabledText}
          </p>
        )}

        {(!browserSupport.canvas || !browserSupport.getUserMedia) && (
          <Alert variant="destructive" className="mt-2">
            <AlertDescription>
              <p className="font-medium">
                Ваш браузер не поддерживает необходимые API:
              </p>
              <ul className="text-sm mt-1">
                {!browserSupport.canvas && (
                  <li>Canvas API не поддерживается</li>
                )}
                {!browserSupport.getUserMedia && (
                  <li>getUserMedia API не поддерживается</li>
                )}
              </ul>
              <p className="text-sm mt-2">
                Рекомендуем использовать последние версии Chrome, Firefox или
                Edge.
              </p>
            </AlertDescription>
          </Alert>
        )}
      </CardFooter>
    </Card>
  );
};

export default NoFuzzyWebCamera;
