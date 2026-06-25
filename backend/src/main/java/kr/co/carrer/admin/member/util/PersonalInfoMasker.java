package kr.co.carrer.admin.member.util;

public final class PersonalInfoMasker {

    private PersonalInfoMasker() {}

    public static String maskName(String name) {
        if (name == null || name.length() <= 1) return name;
        if (name.length() == 2) return name.charAt(0) + "*";
        return name.charAt(0) + "*".repeat(name.length() - 2) + name.charAt(name.length() - 1);
    }

    public static String maskEmail(String email) {
        if (email == null || !email.contains("@")) return email;
        String[] parts = email.split("@", 2);
        String local = parts[0];
        if (local.length() <= 2) return local + "**@" + parts[1];
        return local.substring(0, 2) + "*".repeat(local.length() - 2) + "@" + parts[1];
    }
}
