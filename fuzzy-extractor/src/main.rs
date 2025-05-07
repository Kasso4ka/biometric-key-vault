mod fuzzy;

use fuzzy::FuzzyExtractor;
use tiny_keccak::{Keccak, Hasher};
use serde::{Serialize, Deserialize};
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub struct FaceCryptoWallet {
    extractor: FuzzyExtractor,
}

#[derive(Serialize, Deserialize)]
struct HelperData {
    ciphers: Vec<Vec<u8>>,
    masks: Vec<Vec<u8>>,
    nonces: Vec<Vec<u8>>,
}

#[wasm_bindgen]
impl FaceCryptoWallet {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        let extractor = FuzzyExtractor::new(16, 8.0, 0.001);
        Self { extractor }
    }
    
    #[wasm_bindgen]
    pub fn convert_face_to_bytes(&self, face_embedding: &[f32]) -> Vec<u8> {
        let mut byte_array = Vec::with_capacity(16);
        
        for i in 0..16 {
            let start = i * 8;
            let mut byte_val = 0u8;
            
            for j in 0..8 {
                if start + j < face_embedding.len() && face_embedding[start + j] > 0.0 {
                    byte_val |= 1 << j;
                }
            }
            
            byte_array.push(byte_val);
        }
        
        byte_array
    }
    
    #[wasm_bindgen]
    pub fn generate_wallet(&self, face_embedding: &[f32]) -> JsValue {
        let face_bytes = self.convert_face_to_bytes(face_embedding);
        let (private_key, helpers) = self.extractor.generate(&face_bytes);
        let wallet_address = Self::generate_eth_address(&private_key);
        let helper_data = self.serialize_helpers(&helpers);
        
        let result = JsValue::from_serde(&serde_json::json!({
            "privateKey": hex::encode(&private_key),
            "walletAddress": wallet_address,
            "helperData": helper_data
        })).unwrap();
        
        result
    }
    
    #[wasm_bindgen]
    pub fn restore_wallet(&self, face_embedding: &[f32], helper_data: &str) -> JsValue {
        let face_bytes = self.convert_face_to_bytes(face_embedding);
        
        match self.deserialize_helpers(helper_data) {
            Ok(helpers) => {
                let restored_key = self.extractor.reproduce(&face_bytes, &helpers);
                let restored_address = Self::generate_eth_address(&restored_key);
                
                let result = JsValue::from_serde(&serde_json::json!({
                    "success": true,
                    "privateKey": hex::encode(&restored_key),
                    "walletAddress": restored_address
                })).unwrap();
                
                result
            },
            Err(e) => {
                let result = JsValue::from_serde(&serde_json::json!({
                    "success": false,
                    "error": e
                })).unwrap();
                
                result
            }
        }
    }
    
    fn generate_eth_address(private_key: &[u8]) -> String {
        let mut keccak = Keccak::v256();
        let mut hash = [0u8; 32];
        keccak.update(private_key);
        keccak.finalize(&mut hash);
        
        let address = &hash[12..32];
        
        format!("0x{}", hex::encode(address))
    }
    
}