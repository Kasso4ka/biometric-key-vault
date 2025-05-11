import {
  Camera,
  Loader2,
  ShieldCheck,
  Video,
  StopCircle,
  Download,
} from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader } from "./ui/card";
import { Alert, AlertDescription } from "./ui/alert";
import { useEffect, useRef, useState } from "react";
import { Button } from "./ui/button";

interface VideoRecorderProps {
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
}

const VideoRecorder: React.FC<VideoRecorderProps> = ({
  buttonText = "Начать сканирование",
  recordingButtonText = "Начать запись",
  stopRecordingText = "Остановить запись",
  title = "Запись видео",
  description = "Используйте вашу веб-камеру для записи видео",
  loading = false,
  loadingText = "Обработка данных...",
  disabled = false,
  disabledText = "Функция недоступна",
  maxRecordingTimeMs = 10000, // 10 секунд по умолчанию
}) => {
  const [isCapturing, setIsCapturing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedVideo, setRecordedVideo] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [browserSupport, setBrowserSupport] = useState<{
    mediaRecorder: boolean;
    getUserMedia: boolean;
  }>({
    mediaRecorder: false,
    getUserMedia: false,
  });

  // Проверяем поддержку браузером
  useEffect(() => {
    setBrowserSupport({
      mediaRecorder: "MediaRecorder" in window,
      getUserMedia: !!(
        navigator.mediaDevices && navigator.mediaDevices.getUserMedia
      ),
    });
  }, []);

  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

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
      // Проверяем поддержку MediaRecorder API
      if (!window.MediaRecorder) {
        throw new Error("MediaRecorder API не поддерживается в вашем браузере");
      }

      // Запрашиваем доступ к устройствам
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: true, // включаем запись звука
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsCapturing(true);
        setRecordedVideo(null); // сбрасываем предыдущее видео при новом запуске камеры

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
      stopRecording();
    }
  };

  const startRecording = () => {
    if (!streamRef.current) return;

    recordedChunksRef.current = [];
    setRecordingTime(0);

    try {
      // Проверка поддерживаемых MIME-типов
      const getMimeType = () => {
        const types = [
          "video/webm",
          "video/webm;codecs=vp9",
          "video/webm;codecs=vp8",
          "video/webm;codecs=h264",
          "video/mp4",
          "video/mp4;codecs=h264",
        ];

        for (const type of types) {
          if (MediaRecorder.isTypeSupported(type)) {
            console.log("Используется MIME-тип:", type);
            return type;
          }
        }

        return ""; // Если ни один тип не поддерживается, будет использован дефолтный
      };

      const mimeType = getMimeType();
      const options = mimeType ? { mimeType } : undefined;
      const mediaRecorder = new MediaRecorder(streamRef.current, options);

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, {
          type: "video/webm",
        });
        const videoURL = URL.createObjectURL(blob);
        setRecordedVideo(videoURL);
        setIsRecording(false);
      };

      // Запускаем таймер для отображения времени записи
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => {
          const newTime = prev + 100;
          if (newTime >= maxRecordingTimeMs) {
            stopRecording();
          }
          return newTime;
        });
      }, 100);

      mediaRecorder.start(100); // собираем данные каждые 100 мс
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);

      // Устанавливаем таймаут для автоматической остановки записи
      setTimeout(() => {
        if (mediaRecorderRef.current?.state === "recording") {
          stopRecording();
        }
      }, maxRecordingTimeMs);
    } catch (error) {
      console.error("Ошибка при начале записи:", error);
      setCameraError(
        "Не удалось начать запись. Проверьте поддержку в вашем браузере."
      );
    }
  };

  const stopRecording = () => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === "recording"
    ) {
      mediaRecorderRef.current.stop();
    }

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const downloadVideo = () => {
    if (!recordedVideo) return;

    // Определяем расширение файла в зависимости от типа записанных данных
    const blob = recordedChunksRef.current[0];
    let extension = "webm";

    if (blob && blob.type) {
      if (blob.type.includes("mp4")) {
        extension = "mp4";
      }
    }

    const a = document.createElement("a");
    a.href = recordedVideo;
    a.download = `recorded-video-${new Date().toISOString()}.${extension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Форматирование времени для отображения
  const formatTime = (timeMs: number) => {
    const seconds = Math.floor(timeMs / 1000);
    const milliseconds = Math.floor((timeMs % 1000) / 10);
    return `${seconds}.${milliseconds.toString().padStart(2, "0")}`;
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

          {!isCapturing && !recordedVideo && !cameraError && (
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
              !isCapturing || recordedVideo ? "hidden" : ""
            }`}
          />

          {/* Отображение записанного видео */}
          {recordedVideo && (
            <video
              src={recordedVideo}
              controls
              className="w-full h-full object-contain"
            />
          )}

          {/* Индикатор записи */}
          {isRecording && (
            <div className="absolute top-2 right-2 bg-red-600 text-white px-3 py-1 rounded-full flex items-center gap-2">
              <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
              <span>
                {formatTime(recordingTime)} / {formatTime(maxRecordingTimeMs)}
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
        {!isCapturing && !recordedVideo ? (
          <Button
            onClick={startWebcam}
            className="w-full"
            disabled={loading || disabled}
          >
            <Camera className="mr-2 h-4 w-4" />
            {buttonText}
          </Button>
        ) : isCapturing && !isRecording && !recordedVideo ? (
          <Button
            onClick={startRecording}
            className="w-full"
            disabled={loading || disabled}
          >
            <Video className="mr-2 h-4 w-4" />
            {recordingButtonText}
          </Button>
        ) : isCapturing && isRecording ? (
          <Button
            onClick={stopRecording}
            variant="destructive"
            className="w-full"
            disabled={loading || disabled}
          >
            <StopCircle className="mr-2 h-4 w-4" />
            {stopRecordingText}
          </Button>
        ) : null}

        {recordedVideo && (
          <div className="w-full flex gap-2">
            <Button
              onClick={downloadVideo}
              className="flex-1"
              variant="outline"
            >
              <Download className="mr-2 h-4 w-4" />
              Скачать видео
            </Button>
            <Button
              onClick={() => {
                setRecordedVideo(null);
                startWebcam();
              }}
              className="flex-1"
            >
              <Camera className="mr-2 h-4 w-4" />
              Снова запустить камеру
            </Button>
          </div>
        )}

        {disabled && (
          <p className="text-xs text-amber-600 dark:text-amber-400 text-center">
            {disabledText}
          </p>
        )}

        {(!browserSupport.mediaRecorder || !browserSupport.getUserMedia) && (
          <Alert variant="destructive" className="mt-2">
            <AlertDescription>
              <p className="font-medium">
                Ваш браузер не поддерживает необходимые API:
              </p>
              <ul className="text-sm mt-1">
                {!browserSupport.mediaRecorder && (
                  <li>MediaRecorder API не поддерживается</li>
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

export default VideoRecorder;
