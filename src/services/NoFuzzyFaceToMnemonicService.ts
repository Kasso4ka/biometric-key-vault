class NoFuzzyFaceToMnemonicService {
  private initialized = false;
  private collectedFrames: number = 0;
  private initializationPromise: Promise<boolean> | null = null;

  private frames: string[] = [];

  // Если нужно, заменить на адрес поднятого бэкенда (к примеру http://localhost:8000)
  private readonly apiUrl = "https://pr4is3ks.online/api/process_images";

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

  async processVideoFrame(
    frameData: string,
    frameIndex: number
  ): Promise<void> {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      const base64Data = frameData.split(",")[1] || frameData;

      if (frameIndex >= this.frames.length) {
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

      const validFrames = this.frames.filter((frame) => !!frame);

      console.log(`Sending ${validFrames.length} frames to the API...`);

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

      this.resetFrameProcessing();

      return data.mnemonic;
    } catch (error) {
      console.error("Error generating mnemonic:", error);
      throw error;
    }
  }

  resetFrameProcessing(): void {
    this.frames = [];
    this.collectedFrames = 0;
    console.log("Frame processing state reset");
  }

  getFramesProcessed(): number {
    return this.collectedFrames;
  }
}

const noFuzzyFaceToMnemonicService = new NoFuzzyFaceToMnemonicService();
export default noFuzzyFaceToMnemonicService;
