import init, { FaceCryptoWallet } from "fuzzy-extractor";

interface WalletData {
  privateKey: string;
  walletAddress: string;
  helperData: string;
}

interface RestoredWallet {
  success: boolean;
  privateKey?: string;
  walletAddress?: string;
  error?: string;
}

class FuzzyExtractorService {
  private faceCryptoWallet: FaceCryptoWallet | null = null;
  private initialized = false;

  async initialize(): Promise<boolean> {
    if (this.initialized) return true;

    try {
      await init();
      this.faceCryptoWallet = new FaceCryptoWallet();
      this.initialized = true;
      return true;
    } catch (error) {
      console.error("Failed to initialize CryptoWalletService:", error);
      return false;
    }
  }

  ensureCorrectEmbeddingSize(embedding: Float32Array): Float32Array {
    const requiredLength = 128;

    if (embedding.length < requiredLength) {
      const paddedEmbedding = new Float32Array(requiredLength);
      paddedEmbedding.set(embedding);
      return paddedEmbedding;
    }

    return embedding;
  }

  async generateWallet(
    faceEmbedding: Float32Array
  ): Promise<WalletData | null> {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      if (!this.faceCryptoWallet) {
        throw new Error("FaceCryptoWallet is not initialized");
      }
      console.log(faceEmbedding);
      const processedEmbedding = this.ensureCorrectEmbeddingSize(faceEmbedding);

      console.log(
        "Processing face embedding of length:",
        processedEmbedding.length
      );

      try {
        const wallet =
          this.faceCryptoWallet.generate_wallet(processedEmbedding);
        console.log(wallet.get("walletAddress"));

        return {
          privateKey: wallet.get("privateKey"),
          walletAddress: wallet.get("walletAddress"),
          helperData: wallet.get("helperData"),
        };
      } catch (e) {
        console.error("WASM error during wallet generation:", e);
        throw new Error(
          "WASM module error: " + (e instanceof Error ? e.message : String(e))
        );
      }
    } catch (error) {
      console.error("Error generating wallet:", error);
      return null;
    }
  }

  async restoreWallet(
    faceEmbedding: Float32Array,
    helperData: string
  ): Promise<RestoredWallet> {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      if (!this.faceCryptoWallet) {
        throw new Error("FaceCryptoWallet is not initialized");
      }

      const processedEmbedding = this.ensureCorrectEmbeddingSize(faceEmbedding);

      try {
        const wallet = this.faceCryptoWallet.restore_wallet(
          processedEmbedding,
          helperData
        );
        return {
          success: wallet.get("success"),
          privateKey: wallet.get("privateKey"),
          walletAddress: wallet.get("walletAddress"),
        };
      } catch (e) {
        console.error("WASM error during wallet restoration:", e);
        return {
          success: false,
          error:
            "WASM module error: " +
            (e instanceof Error ? e.message : String(e)),
        };
      }
    } catch (error) {
      console.error("Error restoring wallet:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  saveHelperData(helperData: string): void {
    localStorage.setItem("face_wallet_helper_data", helperData);
  }

  getHelperData(): string | null {
    return localStorage.getItem("face_wallet_helper_data");
  }

  hasStoredHelperData(): boolean {
    return localStorage.getItem("face_wallet_helper_data") !== null;
  }
}

export default new FuzzyExtractorService();
