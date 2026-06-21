package kr.co.carrer.admin.payment.type;

public enum PaymentType {
    MANUAL("직접 결제"),
    AUTO_RENEWAL("자동 갱신");

    private final String label;

    PaymentType(String label) { this.label = label; }

    public String label() { return label; }
}
