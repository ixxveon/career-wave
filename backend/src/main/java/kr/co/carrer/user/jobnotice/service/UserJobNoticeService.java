package kr.co.carrer.user.jobnotice.service;

import kr.co.carrer.user.jobnotice.dto.JobNoticeDTO;
import kr.co.carrer.user.jobnotice.type.JobNoticeStatus;
import kr.co.carrer.user.jobnotice.type.CareerLevel;
import kr.co.carrer.user.jobnotice.type.CompanySize;
import kr.co.carrer.user.jobnotice.type.JobType;

import java.util.UUID;

public interface UserJobNoticeService {

    JobNoticeDTO.ResponseList getJobNotices(
            String keyword,
            JobType jobType,
            String jobCategory,
            CareerLevel careerLevel,
            String location,
            CompanySize companySize,
            String period,
            String sort,
            int page,
            int size,
            UUID memberId
    );

    JobNoticeDTO.ResponseDetail getJobNoticeDetail(Long jobNoticeId, UUID memberId);

    JobNoticeDTO.ResponseBookmark createBookmark(Long jobNoticeId, UUID memberId);

    JobNoticeDTO.ResponseBookmark deleteBookmark(Long jobNoticeId, UUID memberId);
}
