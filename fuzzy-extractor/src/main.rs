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
    
    fn serialize_helpers(&self, helpers: &(Vec<Vec<u8>>, Vec<Vec<u8>>, Vec<Vec<u8>>)) -> String {
        let (ciphers, masks, nonces) = helpers;
        
        let mut all_data = Vec::new();
        
        let num_helpers = ciphers.len() as u32;
        all_data.extend_from_slice(&num_helpers.to_be_bytes());
        
        if num_helpers > 0 {
            let cipher_len = ciphers[0].len() as u32;
            let mask_len = masks[0].len() as u32;
            let nonce_len = nonces[0].len() as u32;
            
            all_data.extend_from_slice(&cipher_len.to_be_bytes());
            all_data.extend_from_slice(&mask_len.to_be_bytes());
            all_data.extend_from_slice(&nonce_len.to_be_bytes());
            
            for i in 0..num_helpers as usize {
                all_data.extend_from_slice(&ciphers[i]);
                all_data.extend_from_slice(&masks[i]);
                all_data.extend_from_slice(&nonces[i]);
            }
        }
        
        base64::encode(&all_data)
    }
    
    fn deserialize_helpers(&self, data_base64: &str) -> Result<(Vec<Vec<u8>>, Vec<Vec<u8>>, Vec<Vec<u8>>), String> {
        let all_data = match base64::decode(data_base64) {
            Ok(data) => data,
            Err(_) => return Err("Base64 decoding error".to_string()),
        };
        
        if all_data.len() < 4 {
            return Err("Incorrect helper data: too short".to_string());
        }
        
        let num_helpers = u32::from_be_bytes([
            all_data[0], all_data[1], all_data[2], all_data[3]
        ]) as usize;
        
        if num_helpers == 0 {
            return Ok((Vec::new(), Vec::new(), Vec::new()));
        }
        
        if all_data.len() < 16 {
            return Err("Incorrect helper data: missing dimensions".to_string());
        }
        
        let cipher_len = u32::from_be_bytes([
            all_data[4], all_data[5], all_data[6], all_data[7]
        ]) as usize;
        
        let mask_len = u32::from_be_bytes([
            all_data[8], all_data[9], all_data[10], all_data[11]
        ]) as usize;
        
        let nonce_len = u32::from_be_bytes([
            all_data[12], all_data[13], all_data[14], all_data[15]
        ]) as usize;
        
        let helper_data_size = cipher_len + mask_len + nonce_len;
        let expected_data_size = 16 + num_helpers * helper_data_size;
        
        if all_data.len() != expected_data_size {
            return Err(format!(
                "Incorrect data: size mismatch. Expected: {}, received: {}",
                expected_data_size, all_data.len()
            ));
        }
        
        let mut ciphers = Vec::with_capacity(num_helpers);
        let mut masks = Vec::with_capacity(num_helpers);
        let mut nonces = Vec::with_capacity(num_helpers);
        
        let mut offset = 16;
        for _ in 0..num_helpers {
            let cipher_end = offset + cipher_len;
            let mask_end = cipher_end + mask_len;
            let nonce_end = mask_end + nonce_len;
            
            ciphers.push(all_data[offset..cipher_end].to_vec());
            masks.push(all_data[cipher_end..mask_end].to_vec());
            nonces.push(all_data[mask_end..nonce_end].to_vec());
            
            offset = nonce_end;
        }
        
        Ok((ciphers, masks, nonces))
    }
}