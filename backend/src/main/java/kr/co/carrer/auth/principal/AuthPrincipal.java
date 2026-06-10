package kr.co.carrer.auth.principal;

import kr.co.carrer.auth.jwt.AccountType;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.List;

public class AuthPrincipal implements UserDetails {

    private final String id;
    private final AccountType accountType;
    private final String roleType;
    private final String adminRole;

    public AuthPrincipal(String id, AccountType accountType, String roleType, String adminRole) {
        this.id = id;
        this.accountType = accountType;
        this.roleType = roleType;
        this.adminRole = adminRole;
    }

    public String getId() { return id; }
    public AccountType getAccountType() { return accountType; }
    public String getRoleType() { return roleType; }
    public String getAdminRole() { return adminRole; }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority(roleType));
    }

    @Override public String getPassword() { return null; }
    @Override public String getUsername() { return id; }
}
