use wasm_bindgen::prelude::*;
use web_sys::console;

// Базовые функции для тестирования
#[wasm_bindgen]
pub fn hello_world() -> String {
    console::log_1(&"Hello from Rust WASM module!".into());
    return "Hello World from Rust WASM!".to_string();
}

#[wasm_bindgen]
pub fn add(a: i32, b: i32) -> i32 {
    console::log_1(&JsValue::from_str(&format!("Adding {} and {}", a, b)));
    a + b
}

// Структура для хранения данных видеокадров
struct FrameData {
    frames_processed: usize,
    // В будущем здесь могут быть данные о кадрах для энтропии
}

// Класс для обработки видео
#[wasm_bindgen]
pub struct VideoProcessor {
    // Используем внутреннюю структуру для данных
    frame_data: FrameData,
}

#[wasm_bindgen]
impl VideoProcessor {
    #[wasm_bindgen(constructor)]
    pub fn new() -> VideoProcessor {
        console::log_1(&"VideoProcessor instance created!".into());
        VideoProcessor {
            frame_data: FrameData {
                frames_processed: 0,
                // Инициализация других полей
            },
        }
    }
    
    // В реальной имплементации - метод для обработки кадра
    // Используем &mut self для безопасного изменения состояния
    pub fn process_frame(&mut self, _frame_data: &str, frame_index: usize) -> bool {
        // Логируем операцию
        console::log_1(&JsValue::from_str(&format!("Processing frame #{}", frame_index)));
        
        // Увеличиваем счетчик обработанных кадров безопасно
        self.frame_data.frames_processed += 1;
        
        // Здесь был бы код для реальной обработки кадра
        // Например, извлечение энтропии или характерных признаков
        
        // Возвращаем успех
        true
    }
    
    // Метод для генерации мнемонической фразы
    // Используем &self (не mut), так как не меняем состояние
    pub fn generate_mnemonic(&self) -> String {
        // Получаем копию счетчика, чтобы не было проблем с заимствованием
        let frames_count = self.frame_data.frames_processed;
        
        console::log_1(&JsValue::from_str(&format!(
            "Generating mnemonic from {} processed frames",
            frames_count
        )));
        
        // В реальной имплементации, здесь был бы код для генерации мнемоника
        // на основе собранной энтропии из кадров
        
        // Захардкоженная мнемоническая фраза для демонстрации
        "wolf history deliver pear crisp badge elite donor cliff calm robust jewel".to_string()
    }
    
    // Метод для сброса состояния
    // Используем &mut self для безопасного изменения состояния
    pub fn reset(&mut self) {
        self.frame_data.frames_processed = 0;
        console::log_1(&"VideoProcessor state reset".into());
    }
    
    // Геттер для количества обработанных кадров
    // Используем &self (не mut), так как не меняем состояние
    pub fn get_frames_processed(&self) -> usize {
        self.frame_data.frames_processed
    }
}

// Инициализация модуля
#[wasm_bindgen(start)]
pub fn start() {
    console::log_1(&"No-Fuzzy Video Handler WASM module initialized!".into());
}