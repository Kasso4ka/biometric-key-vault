import * as faceapi from "face-api.js";

class FaceDetectionService {
  private modelsLoaded: boolean = false;

  async loadModels(): Promise<void> {
    if (this.modelsLoaded) return;

    try {
      const MODEL_URL = "/models";

      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(
          `${MODEL_URL}/tiny_face_detector`
        ),
        faceapi.nets.faceLandmark68Net.loadFromUri(
          `${MODEL_URL}/face_landmark_68`
        ),
        faceapi.nets.faceRecognitionNet.loadFromUri(
          `${MODEL_URL}/face_recognition`
        ),
      ]);

      this.modelsLoaded = true;
    } catch (error) {
      console.error("Failed to load face recognition models:", error);
      throw new Error("Failed to load face recognition models");
    }
  }

  async getFaceEmbedding(
    imageElement: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement
  ): Promise<Float32Array | null> {
    if (!this.modelsLoaded) {
      await this.loadModels();
    }

    try {
      const options = new faceapi.TinyFaceDetectorOptions({
        inputSize: 416,
        scoreThreshold: 0.5,
      });

      const result = await faceapi
        .detectSingleFace(imageElement, options)
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!result) {
        console.warn("Face not found");
        return null;
      }

      return result.descriptor;
    } catch (error) {
      console.error("Error getting face embedding:", error);
      throw new Error("Error getting face embedding");
    }
  }
}

const faceDetectionService = new FaceDetectionService();

export default faceDetectionService;
