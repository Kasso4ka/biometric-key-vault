use rand::RngCore;
use rand::rngs::OsRng;
use pbkdf2::pbkdf2;
use hmac::Hmac;
use sha2::Sha256;

pub struct FuzzyExtractor {
    length: usize,        
    sec_len: usize,       
    nonce_len: usize,     
    num_helpers: usize,   
}

impl FuzzyExtractor {
    pub fn new(length: usize, ham_err: f64, rep_err: f64) -> Self {
        let sec_len = 2;
        let nonce_len = 16;
        
        let bits = length * 8;
        let const_val = ham_err / (bits as f64).ln();
        let num_helpers = ((bits as f64).powf(const_val)) * ((2.0 / rep_err).log2());
        
        let num_helpers = num_helpers.round() as usize;
        
        Self {
            length,
            sec_len,
            nonce_len,
            num_helpers,
        }
    }
    
    pub fn generate(&self, value: &[u8]) -> (Vec<u8>, (Vec<Vec<u8>>, Vec<Vec<u8>>, Vec<Vec<u8>>)) {
        let mut key = vec![0u8; self.length];
        OsRng.fill_bytes(&mut key);
        
        let mut key_pad = Vec::with_capacity(self.length + self.sec_len);
        key_pad.extend_from_slice(&key);
        key_pad.extend(vec![0u8; self.sec_len]);
        
        let mut nonces = Vec::with_capacity(self.num_helpers);
        let mut masks = Vec::with_capacity(self.num_helpers);
        let mut digests = Vec::with_capacity(self.num_helpers);
        let mut ciphers = Vec::with_capacity(self.num_helpers);
        
        for _ in 0..self.num_helpers {
            let mut nonce = vec![0u8; self.nonce_len];
            OsRng.fill_bytes(&mut nonce);
            nonces.push(nonce);
            
            let mut mask = vec![0u8; self.length];
            OsRng.fill_bytes(&mut mask);
            masks.push(mask);
        }
        
        for i in 0..self.num_helpers {
            let vector = Self::bitwise_and(&masks[i], value);
            
            let mut digest = vec![0u8; self.length + self.sec_len];
            pbkdf2::<Hmac<Sha256>>(
                &vector,
                &nonces[i],
                1,
                &mut digest,
            );
            
            digests.push(digest.clone());
            
            let cipher = Self::bitwise_xor(&digest, &key_pad);
            ciphers.push(cipher);
        }
        
        (key, (ciphers, masks, nonces))
    }
    
    pub fn reproduce(&self, value: &[u8], helpers: &(Vec<Vec<u8>>, Vec<Vec<u8>>, Vec<Vec<u8>>)) -> Vec<u8> {
        if value.len() != self.length {
            return vec![0u8; self.length];
        }
        
        let (ciphers, masks, nonces) = helpers;
        
        for i in 0..self.num_helpers.min(masks.len()) {
            let vector = Self::bitwise_and(&masks[i], value);
            
            let mut digest = vec![0u8; self.length + self.sec_len];
            pbkdf2::<Hmac<Sha256>>(
                &vector,
                &nonces[i],
                1,
                &mut digest,
            );
            
            let plain = Self::bitwise_xor(&digest, &ciphers[i]);
            
            let mut check_sum = 0u8;
            for j in self.length..plain.len() {
                check_sum |= plain[j];
            }

            if check_sum == 0 {
                return plain[..self.length].to_vec();
            }
        }
        
        let mut random_key = vec![0u8; self.length];
        OsRng.fill_bytes(&mut random_key);
        random_key
    }
    
    fn bitwise_and(mask: &[u8], value: &[u8]) -> Vec<u8> {
        mask.iter()
            .zip(value.iter().chain(std::iter::repeat(&0)))
            .map(|(m, v)| m & v)
            .collect()
    }
    
    fn bitwise_xor(a: &[u8], b: &[u8]) -> Vec<u8> {
        a.iter()
            .zip(b.iter())
            .map(|(a, b)| a ^ b)
            .collect()
    }
}