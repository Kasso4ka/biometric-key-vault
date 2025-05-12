// Заменяем импорт WASM модуля на новый интерфейс для работы с API
// import init, { VideoProcessor } from "no-fuzzy-video-handler";

class NoFuzzyFaceToMnemonicService {
  private initialized = false;
  private collectedFrames: number = 0;
  private initializationPromise: Promise<boolean> | null = null;

  // Массив для хранения base64 данных изображений
  private frames: string[] = [];

  // Захардкодим URL API сервиса
  private readonly apiUrl =
    "https://d2af-212-47-146-31.ngrok-free.app/process_images";

  async initialize(): Promise<boolean> {
    if (this.initialized) return true;

    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = new Promise<boolean>(async (resolve) => {
      try {
        console.log(
          "Initializing NoFuzzyFaceToMnemonicService with API integration..."
        );
        this.frames = [];
        this.collectedFrames = 0;
        this.initialized = true;
        console.log(
          "NoFuzzyFaceToMnemonicService initialization completed successfully"
        );
        resolve(true);
      } catch (error) {
        console.error(
          "Failed to initialize NoFuzzyFaceToMnemonicService:",
          error
        );
        resolve(false);
      } finally {
        this.initializationPromise = null;
      }
    });

    return this.initializationPromise;
  }

  /**
   * Обрабатывает кадр видео и добавляет его в коллекцию для генерации мнемоника
   * @param frameData Base64 строка с изображением кадра
   * @param frameIndex Индекс кадра в последовательности
   */
  async processVideoFrame(
    frameData: string,
    frameIndex: number
  ): Promise<void> {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      // Кадр передаем без префикса data:image/...
      const base64Data = frameData.split(",")[1] || frameData;

      // Сохраняем кадр в массив по индексу
      if (frameIndex >= this.frames.length) {
        // Расширяем массив, если нужно
        this.frames.length = frameIndex + 1;
      }
      this.frames[frameIndex] = base64Data;
      this.collectedFrames++;

      console.log(
        `Frame ${frameIndex} stored. Total frames: ${this.collectedFrames}`
      );

      return;
    } catch (error) {
      console.error("Error processing video frame:", error);
      throw error;
    }
  }

  /**
   * Генерирует мнемоническую фразу на основе собранных кадров через API
   * @returns Мнемоническая фраза из 12 или 24 слов
   */
  async generateMnemonic(): Promise<string> {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      console.log(`Generating mnemonic from ${this.collectedFrames} frames...`);

      if (this.collectedFrames === 0 || this.frames.length === 0) {
        throw new Error(
          "Не обработано ни одного кадра. Невозможно сгенерировать мнемонику."
        );
      }

      // Получаем только валидные кадры (не undefined)
      const validFrames = this.frames.filter((frame) => !!frame);

      console.log(`Sending ${validFrames.length} frames to the API...`);

      // Отправляем запрос на API
      console.log(validFrames);
      const response = await fetch(this.apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          images: validFrames,
        }),
      });

      if (!response.ok) {
        throw new Error(
          `API вернул ошибку: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();

      if (!data.mnemonic) {
        throw new Error("API не вернул мнемоническую фразу");
      }

      console.log("Mnemonic received successfully from API");

      // Сбрасываем состояние после получения мнемоники
      this.resetFrameProcessing();

      return data.mnemonic;
    } catch (error) {
      console.error("Error generating mnemonic:", error);
      throw error;
    }
  }

  /**
   * Сбрасывает состояние обработчика кадров
   */
  resetFrameProcessing(): void {
    this.frames = [];
    this.collectedFrames = 0;
    console.log("Frame processing state reset");
  }

  /**
   * Возвращает количество обработанных кадров
   */
  getFramesProcessed(): number {
    return this.collectedFrames;
  }
}

// Экспортируем singleton для использования вне React компонентов
const noFuzzyFaceToMnemonicService = new NoFuzzyFaceToMnemonicService();
export default noFuzzyFaceToMnemonicService;
