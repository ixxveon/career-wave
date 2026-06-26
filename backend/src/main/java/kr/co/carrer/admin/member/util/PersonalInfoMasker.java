package kr.co.carrer.admin.member.util;

public final class PersonalInfoMasker {

    private PersonalInfoMasker() {}

    public static String maskName(String name) {
        if (name == null || name.length() <= 1) return name;
        if (name.length() == 2) return name.charAt(0) + "*";
        return name.charAt(0) + "*" + name.charAt(name.length() - 1);
    }

    public static String maskEmail(String email) {
        if (email == null || !email.contains("@")) return email;
        String[] parts = email.split("@", 2);
        String local = parts[0];
        int show = Math.min(3, local.length());
        return local.substring(0, show) + "***@" + parts[1];
    }

    public static String maskLoginId(String loginId) {
        if (loginId == null) return null;
        int show = Math.min(3, Math.max(0, loginId.length() - 1));
        return loginId.substring(0, show) + "***";
    }
}
