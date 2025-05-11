import { useEffect, useState } from "react";
import init, { VideoProcessor } from "no-fuzzy-video-handler";

class NoFuzzyFaceToMnemonicService {
  private videoProcessor: VideoProcessor | null = null;
  private initialized = false;
  private collectedFrames: number = 0;
  private maxFrames: number = 150;
  private initializationPromise: Promise<boolean> | null = null;

  async initialize(): Promise<boolean> {
    if (this.initialized) return true;

    // Если инициализация уже запущена, возвращаем существующий промис
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    // Создаем промис инициализации
    this.initializationPromise = new Promise<boolean>(
      async (resolve, reject) => {
        try {
          console.log("Initializing NoFuzzyFaceToMnemonicService...");
          await init();
          console.log(
            "WASM module initialized, creating VideoProcessor instance..."
          );

          try {
            this.videoProcessor = new VideoProcessor();
            this.initialized = true;
            this.collectedFrames = 0;
            console.log(
              "NoFuzzyFaceToMnemonicService initialization completed successfully"
            );
            resolve(true);
          } catch (err) {
            console.error("Error creating VideoProcessor instance:", err);
            reject(new Error(`Failed to create VideoProcessor: ${err}`));
          }
        } catch (error) {
          console.error(
            "Failed to initialize NoFuzzyFaceToMnemonicService:",
            error
          );
          reject(error);
        } finally {
          // Очищаем промис инициализации, если он завершен
          this.initializationPromise = null;
        }
      }
    );

    return this.initializationPromise;
  }

  async helloWorld(): Promise<string> {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      if (!this.videoProcessor) {
        throw new Error("VideoProcessor is not initialized");
      }

      return this.videoProcessor.process_hello_world();
    } catch (error) {
      console.error("Error calling hello world:", error);
      throw error;
    }
  }

  async calculateSum(a: number, b: number): Promise<number> {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      if (!this.videoProcessor) {
        throw new Error("VideoProcessor is not initialized");
      }

      return this.videoProcessor.calculate_sum(a, b);
    } catch (error) {
      console.error("Error calculating sum:", error);
      throw error;
    }
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

      if (!this.videoProcessor) {
        throw new Error("VideoProcessor is not initialized");
      }

      // Кадр передаем без префикса data:image/...
      const base64Data = frameData.split(",")[1] || frameData;

      // Создаем локальную копию процессора, чтобы избежать проблем с параллельным доступом
      const processor = this.videoProcessor;

      // Обрабатываем кадр через WASM модуль
      try {
        // console.log(`Processing frame ${frameIndex} through WASM...`);
        const success = processor.process_frame(base64Data, frameIndex);
        if (!success) {
          throw new Error(
            `WASM processing returned false for frame ${frameIndex}`
          );
        }

        // Получаем обновленный счетчик кадров
        this.collectedFrames = processor.get_frames_processed();
        // console.log(`Frame ${frameIndex} processed. Total processed frames: ${this.collectedFrames}`);
      } catch (err) {
        console.error("WASM error processing frame:", err);
        throw new Error(`WASM error: ${err}`);
      }

      return;
    } catch (error) {
      console.error("Error processing video frame:", error);
      throw error;
    }
  }

  /**
   * Генерирует мнемоническую фразу на основе собранных кадров
   * @returns Мнемоническая фраза из 12 или 24 слов
   */
  async generateMnemonic(): Promise<string> {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      if (!this.videoProcessor) {
        throw new Error("VideoProcessor is not initialized");
      }

      // Получаем текущий счетчик обработанных кадров
      this.collectedFrames = this.videoProcessor.get_frames_processed();
      console.log(`Generating mnemonic from ${this.collectedFrames} frames...`);

      if (this.collectedFrames === 0) {
        throw new Error(
          "Не обработано ни одного кадра. Невозможно сгенерировать мнемонику."
        );
      }

      // Симулируем задержку обработки для UI
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Создаем локальную копию процессора, чтобы избежать проблем с параллельным доступом
      const processor = this.videoProcessor;

      // Вызываем метод генерации мнемоника из WASM модуля
      let mnemonic: string;
      try {
        mnemonic = processor.generate_mnemonic();
        console.log("Mnemonic generated successfully");
      } catch (err) {
        console.error("WASM error generating mnemonic:", err);
        throw new Error(`WASM error: ${err}`);
      }

      // Сбрасываем состояние модуля
      try {
        processor.reset();
        this.collectedFrames = 0;
        console.log("VideoProcessor state reset after mnemonic generation");
      } catch (resetErr) {
        console.warn(
          "Warning: Failed to reset VideoProcessor state:",
          resetErr
        );
        // Продолжаем выполнение, не выбрасывая ошибку
      }

      return mnemonic;
    } catch (error) {
      console.error("Error generating mnemonic:", error);
      throw error;
    }
  }

  /**
   * Сбрасывает состояние обработчика кадров
   */
  resetFrameProcessing(): void {
    if (this.videoProcessor) {
      try {
        this.videoProcessor.reset();
        console.log("VideoProcessor state reset");
      } catch (err) {
        console.error("Error resetting VideoProcessor state:", err);
      }
    }
    this.collectedFrames = 0;
  }
}

// React hook для использования сервиса в компонентах
export function useNoFuzzyFaceToMnemonic() {
  const [service] = useState(new NoFuzzyFaceToMnemonicService());
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        const success = await service.initialize();
        if (mounted) {
          setIsReady(success);
        }
      } catch (err) {
        console.error("Error initializing service:", err);
        if (mounted) {
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      }
    }

    init();

    return () => {
      mounted = false;
    };
  }, [service]);

  return { service, isReady, error };
}

// Экспортируем singleton для использования вне React компонентов
const noFuzzyFaceToMnemonicService = new NoFuzzyFaceToMnemonicService();
export default noFuzzyFaceToMnemonicService;
