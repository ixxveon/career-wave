import { useState } from 'react';
import '../../styles/admin.css';

interface Member {
  id: string;
  name: string;
  email: string;
  role: string;
  plan: 'FREE' | 'PREMIUM';
  joinedAt: string;
  lastLogin: string;
  status: string;
}

const dummyMembers: Member[] = [
  { id: 'U-1001', name: '김민지',  email: 'minji@email.com',   role: 'ROLE_USER',   plan: 'PREMIUM', joinedAt: '2026.05.02', lastLogin: '2026.05.21', status: '정상' },
  { id: 'U-1002', name: '이준호',  email: 'junho@email.com',   role: 'ROLE_MENTOR', plan: 'FREE',    joinedAt: '2026.05.01', lastLogin: '2026.05.20', status: '정상' },
  { id: 'U-1003', name: '박서연',  email: 'seoyeon@email.com', role: 'ROLE_USER',   plan: 'FREE',    joinedAt: '2026.04.28', lastLogin: '2026.05.18', status: '7일 정지' },
  { id: 'U-1004', name: '최도윤',  email: 'doyoon@email.com',  role: 'ROLE_USER',   plan: 'PREMIUM', joinedAt: '2026.04.20', lastLogin: '2026.05.21', status: '정상' },
];

export default function UserManagementPage() {
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [checkedIds, setCheckedIds] = useState<string[]>([]);
  const [searchKeyword, setSearchKeyword] = useState('');

  const filtered = dummyMembers.filter(
    (m) =>
      m.name.includes(searchKeyword) ||
      m.email.includes(searchKeyword) ||
      m.id.includes(searchKeyword)
  );

  const toggleAll = (checked: boolean) => {
    setCheckedIds(checked ? dummyMembers.map((m) => m.id) : []);
  };

  const toggleOne = (id: string, checked: boolean) => {
    setCheckedIds((prev) =>
      checked ? [...prev, id] : prev.filter((v) => v !== id)
    );
  };

  return (
    <section>
      <header className="admin-header">
        <div>
          <h2>회원 관리</h2>
          <p>가입 회원 및 권한 상태를 관리합니다.</p>
        </div>
      </header>

      <div className="admin-card" style={{ padding: '24px' }}>
        <div className="memberPage">
          <section className="memberSummaryGrid">
            <article className="memberSummaryCard">
              <p>전체 회원</p><h3>12,840</h3><span>누적 가입 회원</span>
            </article>
            <article className="memberSummaryCard">
              <p>오늘 신규 가입</p><h3>128</h3><span>어제 대비 +14명</span>
            </article>
            <article className="memberSummaryCard">
              <p>프리미엄 회원</p><h3>2,430</h3><span>구독 활성 상태</span>
            </article>
            <article className="memberSummaryCard">
              <p>정지 회원</p><h3>18</h3><span>제재 처리 대상</span>
            </article>
          </section>

          <section className="admin-card memberFilter">
            <input
              type="text"
              placeholder="이름, 이메일, 회원 ID 검색"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
            />
            <select>
              <option>권한 전체</option>
              <option>ROLE_USER</option>
              <option>ROLE_MENTOR</option>
            </select>
            <select>
              <option>구독 전체</option>
              <option>FREE</option>
              <option>PREMIUM</option>
            </select>
            <select>
              <option>상태 전체</option>
              <option>정상</option>
              <option>3일 정지</option>
              <option>7일 정지</option>
              <option>영구 정지</option>
            </select>
          </section>

          <section className="admin-card memberTableCard">
            <div className="memberTableHeader">
              <h3>회원 목록</h3>
              <button>회원 데이터 내보내기</button>
            </div>

            <table className="memberTable">
              <thead>
                <tr>
                  <th>
                    <input
                      type="checkbox"
                      checked={checkedIds.length === dummyMembers.length}
                      onChange={(e) => toggleAll(e.target.checked)}
                    />
                  </th>
                  <th>회원 ID</th>
                  <th>이름</th>
                  <th>이메일</th>
                  <th>권한</th>
                  <th>구독</th>
                  <th>가입일</th>
                  <th>최근 접속</th>
                  <th>상태</th>
                  <th>관리</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((member) => (
                  <tr key={member.id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={checkedIds.includes(member.id)}
                        onChange={(e) => toggleOne(member.id, e.target.checked)}
                      />
                    </td>
                    <td>{member.id}</td>
                    <td>{member.name}</td>
                    <td>{member.email}</td>
                    <td>{member.role}</td>
                    <td>
                      <span className={`planBadge ${member.plan.toLowerCase()}`}>
                        {member.plan}
                      </span>
                    </td>
                    <td>{member.joinedAt}</td>
                    <td>{member.lastLogin}</td>
                    <td>
                      <span className={`statusBadge ${member.status === '정상' ? 'normal' : 'blocked'}`}>
                        {member.status}
                      </span>
                    </td>
                    <td>
                      <button className="tableBtn" onClick={() => setSelectedMember(member)}>
                        상세보기
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="pagination">
              <button>{'<'}</button>
              <button className="activePage">1</button>
              <button>2</button>
              <button>3</button>
              <button>{'>'}</button>
            </div>

            {selectedMember && (
              <div className="modalOverlay" onClick={() => setSelectedMember(null)}>
                <div className="memberModal" onClick={(e) => e.stopPropagation()}>
                  <div className="modalHeader">
                    <div>
                      <h3>{selectedMember.name} 상세 정보</h3>
                      <p>{selectedMember.id} · {selectedMember.email}</p>
                    </div>
                    <button onClick={() => setSelectedMember(null)}>닫기</button>
                  </div>

                  <div className="modalInfoGrid">
                    <div><span>권한</span><strong>{selectedMember.role}</strong></div>
                    <div><span>구독 상태</span><strong>{selectedMember.plan}</strong></div>
                    <div><span>가입일</span><strong>{selectedMember.joinedAt}</strong></div>
                    <div><span>최근 접속</span><strong>{selectedMember.lastLogin}</strong></div>
                    <div><span>현재 상태</span><strong>{selectedMember.status}</strong></div>
                    <div><span>신고 받은 횟수</span><strong>0건</strong></div>
                  </div>

                  <div className="modalAction">
                    <button>활동 정지</button>
                    <button>권한 변경</button>
                    <button onClick={() => setSelectedMember(null)}>닫기</button>
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </section>
  );
}
