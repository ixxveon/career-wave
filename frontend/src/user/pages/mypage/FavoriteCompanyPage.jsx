import { Link } from 'react-router-dom';
import { Building2, Search, Star, MapPin, BriefcaseBusiness } from 'lucide-react';
import './MyPage.css';

function FavoriteCompanyPage() {
    const favoriteCompanies = [
        { id: 1, name: '네이버', position: '백엔드 개발자', status: '채용 중', location: '경기 성남시' },
        { id: 2, name: '카카오', position: '프론트엔드 개발자', status: '채용 중', location: '경기 성남시' },
        { id: 3, name: '토스', position: '풀스택 개발자', status: '채용 중', location: '서울 강남구' },
    ];

    return (
        <div className="cw-favorite-page">
            <div className="cw-favorite-header">
                <h2>관심 기업</h2>
                <p>관심 기업으로 등록한 회사의 채용 소식을 확인해보세요.</p>
            </div>

            <div className="cw-favorite-toolbar">
                <button className="is-active">관심기업 {favoriteCompanies.length}</button>
                <button>스크랩 0</button>

                <div className="cw-favorite-search">
                    <input placeholder="기업명 또는 직무 검색" />
                    <Search size={18} />
                </div>
            </div>

            <div className="cw-favorite-grid">
                {favoriteCompanies.map((company) => (
                    <article className="cw-favorite-card" key={company.id}>
                        <div className="cw-favorite-card-top">
                            <div className="cw-favorite-logo">
                                <Building2 size={24} />
                            </div>
                            <button className="cw-favorite-star">
                                <Star size={18} fill="#facc15" color="#facc15" />
                            </button>
                        </div>

                        <span className="cw-favorite-badge">{company.status}</span>
                        <h3>{company.name}</h3>

                        <div className="cw-favorite-info">
                            <p>
                                <BriefcaseBusiness size={15} />
                                {company.position}
                            </p>
                            <p>
                                <MapPin size={15} />
                                {company.location}
                            </p>
                        </div>

                        <div className="cw-favorite-card-bottom">
                            <Link to="/jobs">채용공고 보기</Link>
                        </div>
                    </article>
                ))}
            </div>
        </div>
    );
}

export default FavoriteCompanyPage;
