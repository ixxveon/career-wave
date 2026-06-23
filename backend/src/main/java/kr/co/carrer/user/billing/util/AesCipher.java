package kr.co.carrer.user.billing.util;

import kr.co.carrer.global.exception.CustomException;
import kr.co.carrer.user.billing.exception.BillingErrorCode;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.Cipher;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.security.SecureRandom;
import java.util.Base64;

// billingKey AES-256/GCM 암호화 전용 — 복호화 결과를 로그·응답에 절대 출력 금지
@Component
public class AesCipher {

    private static final String ALGORITHM = "AES/GCM/NoPadding";
    private static final int IV_LENGTH = 12;
    private static final int TAG_LENGTH_BIT = 128;

    private final SecretKey secretKey;

    public AesCipher(@Value("${toss.billing-key-encryption-key}") String base64Key) {
        byte[] keyBytes = Base64.getDecoder().decode(base64Key);
        if (keyBytes.length != 32) {
            throw new IllegalStateException("AES-256 key must be exactly 32 bytes, got " + keyBytes.length);
        }
        this.secretKey = new SecretKeySpec(keyBytes, "AES");
    }

    // 출력: Base64(IV_12B + ciphertext)
    public String encrypt(String plaintext) {
        try {
            byte[] iv = new byte[IV_LENGTH];
            new SecureRandom().nextBytes(iv);
            Cipher cipher = Cipher.getInstance(ALGORITHM);
            cipher.init(Cipher.ENCRYPT_MODE, secretKey, new GCMParameterSpec(TAG_LENGTH_BIT, iv));
            byte[] ciphertext = cipher.doFinal(plaintext.getBytes());
            byte[] combined = new byte[IV_LENGTH + ciphertext.length];
            System.arraycopy(iv, 0, combined, 0, IV_LENGTH);
            System.arraycopy(ciphertext, 0, combined, IV_LENGTH, ciphertext.length);
            return Base64.getEncoder().encodeToString(combined);
        } catch (Exception e) {
            throw new CustomException(BillingErrorCode.BILLING_KEY_CIPHER_FAILED);
        }
    }

    public String decrypt(String base64Encoded) {
        try {
            byte[] combined = Base64.getDecoder().decode(base64Encoded);
            byte[] iv = new byte[IV_LENGTH];
            byte[] ciphertext = new byte[combined.length - IV_LENGTH];
            System.arraycopy(combined, 0, iv, 0, IV_LENGTH);
            System.arraycopy(combined, IV_LENGTH, ciphertext, 0, ciphertext.length);
            Cipher cipher = Cipher.getInstance(ALGORITHM);
            cipher.init(Cipher.DECRYPT_MODE, secretKey, new GCMParameterSpec(TAG_LENGTH_BIT, iv));
            return new String(cipher.doFinal(ciphertext));
        } catch (Exception e) {
            throw new CustomException(BillingErrorCode.BILLING_KEY_CIPHER_FAILED);
        }
    }
}
