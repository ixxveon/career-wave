package kr.co.carrer.user.member.entity;

import kr.co.carrer.user.member.type.TermsDocumentCode;

import java.io.Serializable;
import java.util.Objects;

public class TermsDocumentId implements Serializable {
    private TermsDocumentCode documentCode;
    private String version;

    public TermsDocumentId() {
    }

    public TermsDocumentId(TermsDocumentCode documentCode, String version) {
        this.documentCode = documentCode;
        this.version = version;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof TermsDocumentId that)) return false;
        return documentCode == that.documentCode && Objects.equals(version, that.version);
    }

    @Override
    public int hashCode() {
        return Objects.hash(documentCode, version);
    }
}
