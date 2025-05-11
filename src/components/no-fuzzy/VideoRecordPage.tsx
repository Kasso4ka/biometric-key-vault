import { FileVideo } from "lucide-react";
import { Card, CardContent } from "../ui/card";
import VideoRecorder from "../VideoRecorder";

const VideoRecordPage: React.FC = () => {
  return (
    <div>
      <div className="animate-fade-in-slide">
        <Card className="mt-2 mb-4">
          <CardContent>
            <h2 className="text-xl font-semibold mb-2">Запись видео</h2>
            <p>
              Запишите видео с вашей веб-камеры для дальнейшего использования.
              После записи вы можете скачать видеофайл или начать запись заново.
            </p>
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-8 md:grid-cols-[1fr_50%]">
        <div className="animate-fade-in-scale">
          <VideoRecorder maxRecordingTimeMs={30000} />{" "}
          {/* 30 секунд максимальной записи */}
        </div>

        <div className="animate-fade-in-slide">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <FileVideo className="h-5 w-5" />
                <h3 className="text-lg font-semibold">Информация</h3>
              </div>

              <div className="space-y-4 text-sm">
                <p>
                  Этот модуль позволяет записывать видео с веб-камеры. Вы можете
                  использовать записанное видео для последующей обработки
                  нейронной сетью или сохранить его на своем устройстве.
                </p>

                <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-md border border-amber-200 dark:border-amber-800">
                  <p className="font-medium mb-2">Обратите внимание:</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Максимальная продолжительность записи - 30 секунд</li>
                    <li>Видео сохраняется в формате WebM</li>
                    <li>
                      Для работы требуется разрешение на доступ к камере и
                      микрофону
                    </li>
                    <li>Видео не отправляется на сервер автоматически</li>
                  </ul>
                </div>

                <p>После записи видео вы можете:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Просмотреть его прямо в браузере</li>
                  <li>Скачать видеофайл на ваше устройство</li>
                  <li>Начать запись заново</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default VideoRecordPage;
