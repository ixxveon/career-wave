package kr.co.carrer.user.member.service;

import kr.co.carrer.user.member.dto.MemberStatusDto;

import java.util.UUID;

public interface UserMemberStatusService {
    MemberStatusDto.Response getMemberStatus(UUID memberId);
}
